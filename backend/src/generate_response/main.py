import os
import json
import boto3
from aws_lambda_powertools import Logger
from langchain_aws import ChatBedrock
from sqlalchemy import create_engine, text
from tenacity import retry, wait_exponential, stop_after_attempt
from langchain_community.utilities import SQLDatabase
from langchain_experimental.agents import create_pandas_dataframe_agent
import re
import botocore
import time
import pandas as pd
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from langchain.memory import ConversationBufferMemory
from langchain_community.embeddings import BedrockEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate

 
MEMORY_TABLE = os.environ["MEMORY_TABLE"]
BUCKET = os.environ["BUCKET"]
username = os.environ["USERNAME"]
password = os.environ["PASSWORD"]
host     = os.environ["HOST"]
port     = os.environ["PORT"]
database = os.environ["DATABASE"]

engine = create_engine(f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}")
 
s3 = boto3.client("s3")
logger = Logger()



def is_retryable_exception(e):
    if isinstance(e, botocore.exceptions.ClientError):
        if "ThrottlingException" in str(e):
            return True
    if "Throttling" in str(e) or "Rate exceeded" in str(e):
        return True
    if "InternalServerError" in str(e) or "ModelError" in str(e):
        return True
    return False

class RetryableChatBedrock(ChatBedrock):
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=60),
        stop=stop_after_attempt(20),
        retry=lambda rs: is_retryable_exception(rs.outcome.exception()),
        reraise=True
    )
    def invoke(self, *args, **kwargs):
        return super().invoke(*args, **kwargs)

    def stream(self, *args, **kwargs):
        while True:
            try:
                for token in super().stream(*args, **kwargs):
                    yield token
                break
            except Exception as e:
                if is_retryable_exception(e):
                    print(f"Retryable error in stream: {e}, sleeping...")
                    time.sleep(10)
                    continue
                else:
                    raise

llm = RetryableChatBedrock(
    model_id="anthropic.claude-3-haiku-20240307-v1:0",
    region_name="ap-south-1",
    model_kwargs={"temperature": 0, "max_tokens": 4000}
)

# ---------------- SQL Generator ----------------
def generate_sql_with_llm(question: str, schema: str) -> str:
    prompt = f"""
You are a SQL generator.

Schema:
{schema}

Task:
Write a SQL query that retrieves only the *relevant subset* of data required 
to answer the question. The query should filter by time ranges, product IDs, 
categories, or other conditions implied in the question. 

Rules:
- You MUST NOT compute derived metrics like percentages, ratios, 
  differences, or accuracy scores. Leave those for Python.
- Keep the query efficient by returning only necessary rows and columns.
- Do NOT return extra explanations or text — only SQL.
- don't use keywords as alias.
- if someone ask about how many table in this database or excel or sheet then take database_name as excel_rag.
- if column name contain space then wrap it in backticks (`).
- if column name contain "/" then wrap it in backticks (`).

Question:
{question}

SQL Query:
"""
    resp = llm.invoke(prompt).content.strip()
    print(resp)
    match = re.search(r"(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?;", resp, re.IGNORECASE)
    if match:
        check=False
        return match.group(0).strip(),check
    else:
        check=True
        print("check",check)
        return resp,check

# ---------------- Run SQL ----------------
def execute_sql(query: str) -> pd.DataFrame:
    """Run SQL query against DB, return DataFrame."""
    with engine.connect() as conn:
        result = conn.execute(text(query))
        rows = result.fetchall()
        columns = result.keys()
        df = pd.DataFrame(rows, columns=columns)

        # ✅ Optional: Prevent overload if query returns too many rows
        if len(df) > 2000:
            print(f"⚠️ Large result ({len(df)} rows), truncating to first 2000 rows.")
            df = df.head(2000)

        return df

# ---------------- Pandas Agent ----------------
def run_dataframe_agent(question: str, df: pd.DataFrame, llm) -> str:
    instruction = f"""
You are a data analysis assistant. You must compute the final answer from the DataFrame provided.
Do NOT describe the DataFrame or repeat columns. Instead:
- Perform necessary calculations (e.g., sums, percentages, counts, groupings).
- Return only the final computed answer clearly and concisely (not as code).
- For inventory aging buckets, compute totals or relevant metrics as required by the question.
"""
    pandas_agent = create_pandas_dataframe_agent(
        llm,
        df,
        verbose=True,
        allow_dangerous_code=True  

    )
    result = pandas_agent.invoke({"input": instruction + "\n\nQuestion: " + question})
    return result["output"]

# ---------------- Pipeline ----------------
def pipeline(question: str, max_retries: int = 5, check: bool=False) -> str:
    current_question = question
    db = SQLDatabase(engine)
    schema = db.get_table_info()


    for attempt in range(max_retries):
        print(f"\n🔄 Attempt {attempt+1} ----------------------")
        
        # Generate SQL
        try:
            sql, check = generate_sql_with_llm(current_question, schema)
            print(f"Generated SQL:\n{sql}")
        except Exception as e:
            print(f"❌ SQL Generation Error: {e}")
            continue

        # Execute SQL
        try:
            if check:
                print("⚠️ Please correct the SQL query as it seems invalid.")
                return sql
            df = execute_sql(sql)
        except Exception as e:
            print(f"❌ SQL Execution Error: {e}")
            current_question = f"""
Original Question: {question}
The last SQL failed with error: {e}
Schema Info: {schema}
Be aware of column names with spaces must be in backticks (`) if name contain "/" then wrap it in backticks (`).
Please fix the SQL query and try again. Only return SQL.
"""
            continue

        # Handle empty result
        if df.empty:
            negation_prompt = f"""
Original Question: {question}

The SQL query returned no rows from the database. 
Based on this, provide a concise answer in natural language:
- Negate the condition in the question if appropriate (e.g., 'No, the condition is not met').
- If timing, stock levels, or additional info is missing, mention it clearly.
- Return only the final answer, do not include SQL or data.
- be aware of output parser structure.
"""
            llm_response = llm.invoke(negation_prompt).content.strip()
            return llm_response

        # ✅ Skip Pandas Agent if it's a metadata query
        if "INFORMATION_SCHEMA" in sql.upper():
            print("⚠️ Metadata query detected — returning raw SQL result.")

            # Convert DataFrame into records
            raw_result = df.to_dict(orient="records")

            # Now normalize into a string
            if isinstance(raw_result, list):
                # Join list items as pretty JSON lines
                answer = "\n".join([
                    json.dumps(item, indent=2) if not isinstance(item, str) else item
                    for item in raw_result
                ])
            elif isinstance(raw_result, dict):
                # Dict as pretty JSON string
                answer = json.dumps(raw_result, indent=2)
            else:
                # Numbers, strings, etc.
                answer = str(raw_result)

            return answer

        # Run Pandas agent otherwise
        try:
            if df.shape[1] == 1:
                return df.iloc[0, 0]

            final_answer = run_dataframe_agent(question, df, llm)
            return final_answer
        except Exception as e:
            print(f"❌ Pandas Agent Error: {e}")
            match = re.search(r"Could not parse LLM output:\s*`(.*?)`\s*For troubleshooting", str(e), re.DOTALL)

            if match:
                return match.group(1).strip()
            return str(e)

    return "NO result found"


 
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    event_body = json.loads(event["body"])
    logger.info(f"Event Body: {event_body}")
    file_name = event_body["fileName"]
    human_input = event_body["prompt"]
    conversation_id = event["pathParameters"]["conversationid"]
    model_id = event_body.get("model_id")
    language=event_body.get("language")
    if not language:
        language="en"
    print(language)
    logger.info(f"Received model_id: {model_id}")
    if not model_id:
        model_id="anthropic.claude-3-haiku-20240307-v1:0"
    #print(model_id)
 
    user = event["requestContext"]["authorizer"]["claims"]["sub"]
    ext = os.path.splitext(file_name)[1].lower()

    message_history = DynamoDBChatMessageHistory(
        table_name=MEMORY_TABLE, session_id=conversation_id
    )

    memory = ConversationBufferMemory(
        memory_key="chat_history",
        chat_memory=message_history,
        input_key="question",
        output_key="answer",
        return_messages=True,
    )
    if ext in [".csv", ".xlsx"]:
        answer = pipeline(human_input)
        res= {}
        res["answer"]=answer
        memory.save_context({"question": human_input}, {"answer": answer})
    else:
        s3.download_file(BUCKET, f"uploads/{user}/{file_name}/index.faiss", "/tmp/index.faiss")
        s3.download_file(BUCKET, f"uploads/{user}/{file_name}/index.pkl", "/tmp/index.pkl")
    
        bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name="us-east-1",
        )
    
        embeddings = BedrockEmbeddings(
            model_id="amazon.titan-embed-text-v1",
            client=bedrock_runtime,
            region_name="us-east-1",
        )
    
        # if MODEL_TYPE == "CLAUDE":
        llm = ChatBedrock(
            model_id="anthropic.claude-3-haiku-20240307-v1:0",  # or sonnet/opus
            client=bedrock_runtime,
            model_kwargs={"temperature": 0.7, "max_tokens": 1000}
        )
        condense_question_llm = ChatBedrock(
            model_id="anthropic.claude-3-haiku-20240307-v1:0",
            client=bedrock_runtime,
            model_kwargs={"temperature": 0.7, "max_tokens": 500}
        )



        faiss_index = FAISS.load_local("/tmp", embeddings,allow_dangerous_deserialization=True)
        list=['.mp4','.mov','.m4v']
        if ext in list:
            print("video")
            template = """You are an AI assistant tasked with summarizing video transcripts and answering questions about them. Using the following transcript of a video, provide a detailed and relevant response to the human's input. Please respond directly to the user's input, using the information from the video transcript. Do not mention that you're summarizing a transcript or that you have limited context. Just provide the relevant information as if you're directly answering the user's question or request. Do not mention the words like unfortunately or you do not have content.
    
            following is the video transcript:
            {context}
    
            Human: {question}
    
            Assistant: """
            custom_prompt=PromptTemplate(template=template, input_variables=["context", "question"])
            chat_history=[]
            qa = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=faiss_index.as_retriever(search_kwargs={"k": 7}),
                return_source_documents=True,
                combine_docs_chain_kwargs={"prompt": custom_prompt}
            )
            res = qa({"question": human_input,"chat_history":chat_history})
            #if language.lower() != 'en':
            print("translation")
            translate = boto3.client('translate')
            try:
                translation = translate.translate_text(
                    Text=res["answer"],
                    SourceLanguageCode='en',
                    TargetLanguageCode=language
                )
                translated_text = translation['TranslatedText']
                res["answer"] = translated_text
                print(res["answer"])
                memory.save_context({"question": human_input}, {"answer": translated_text})
            except Exception as e:
                logger.error(f"Translation error: {str(e)}")
        else:
            text_template = """You are an AI assistant tasked with answering questions using the following document content. 
Always provide your response in English language only. 
Give a clear, helpful, and detailed answer to the human's question based strictly on the given content. 
Do not mention that this is from a document.

Document content:
{context}

Human: {question}

Assistant:"""

            custom_text_prompt = PromptTemplate(
                template=text_template, 
                input_variables=["context", "question"]
            )

            # ConversationalRetrievalChain with custom prompt
            qa = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=faiss_index.as_retriever(),
                memory=memory,
                return_source_documents=True,
                combine_docs_chain_kwargs={"prompt": custom_text_prompt}
            )

            res = qa({"question": human_input})
            # answer = res["answer"]
    
        logger.info(res)
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
 
        "body": json.dumps(res["answer"])
    }
