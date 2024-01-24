import os
import requests
from pathlib import Path
import boto3
from langchain.embeddings import BedrockEmbeddings
from langchain.document_loaders import PyPDFLoader
from langchain.indexes import VectorstoreIndexCreator
from langchain.vectorstores import FAISS

# apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMwNDk0ODk2OCwiYWFpIjoxMSwidWlkIjo1MzYwNjYxMSwiaWFkIjoiMjAyMy0xMi0yN1QwNjoxNzozNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTAxNjc0NzQsInJnbiI6InVzZTEifQ.SuBD-nDd-nRCE80EvqOraaz3zaxIMn1LXxph1l2wYOE'  # Replace with your actual API key
# boardId = '4941039207'  # Replace with your actual board ID
BUCKET = 'test-bucket-operisoft-genai'  # Replace with your actual S3 bucket name


s3 = boto3.client('s3')

# Create a bedrock-runtime client
bedrock_runtime = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1",
)

def download_file(file):
    id, public_url, name = file['id'], file['public_url'], file['name']

    try:
        response = requests.get(public_url)
        response.raise_for_status()

        tmp_file_path = '/tmp/' + name
        with open(tmp_file_path, 'wb') as f:
            f.write(response.content)

        print(f"Download completed for file: {name} + {tmp_file_path} ")

        # Create loader and embeddings
        loader = PyPDFLoader(tmp_file_path)
        embeddings = BedrockEmbeddings(model_id="amazon.titan-embed-text-v1", client=bedrock_runtime, region_name="us-east-1")
        print(f"here is embed: {embeddings}")

        index_creator = VectorstoreIndexCreator(vectorstore_cls=FAISS, embedding=embeddings)
        index_from_loader = index_creator.from_loaders([loader])

        # Save embeddings to S3
        s3_key_prefix = f"{name.split('.')[0]}"
        index_from_loader.vectorstore.save_local("/tmp")
        s3.upload_file("/tmp/index.faiss", BUCKET, f"{s3_key_prefix}/index.faiss")
        s3.upload_file("/tmp/index.pkl", BUCKET, f"{s3_key_prefix}/index.pkl")

    except Exception as e:
        print(f"Error processing file: {name}, {e}")
        raise e

def lambda_handler(event, context):
    try:
        public_url = event['public_url']
        name = event['name']
        file = {'public_url': public_url, 'name': name}
        download_file(file)
        print('API call successfully made. File details:\n', files)
        return {
            'statusCode': 200,
            'body': files
        }
    except Exception as e:
        print('There was an error:', e)
        raise e
