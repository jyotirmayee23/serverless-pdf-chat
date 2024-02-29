import os
import json
from datetime import datetime
import boto3
import shortuuid
import urllib
from aws_lambda_powertools import Logger

DOCUMENT_TABLE = os.environ["DOCUMENT_TABLE"]
MEMORY_TABLE = os.environ["MEMORY_TABLE"]
QUEUE = os.environ["QUEUE"]
BUCKET = os.environ["BUCKET"]

ddb = boto3.resource("dynamodb")
document_table = ddb.Table(DOCUMENT_TABLE)
memory_table = ddb.Table(MEMORY_TABLE)
sqs = boto3.client("sqs")
s3 = boto3.client("s3")
logger = Logger()

@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    key = urllib.parse.unquote_plus(event["Records"][0]["s3"]["object"]["key"])
    split = key.split("/")
    user_id = split[0]
    file_name = split[1]

    # file_name_encoded = urllib.parse.quote(file_name)
    file_name_encoded = file_name.replace(" ", "+")
    print("file_name_encoded", file_name_encoded)

    # print("file name ", file_name)
    # print("key ", key)

    document_id = shortuuid.uuid()

    s3.download_file(BUCKET, key, f"/tmp/{file_name}")

    # Construct the S3 object URL
    s3_object_url = f"https://{BUCKET}.s3.amazonaws.com/{user_id}/{file_name_encoded}/{file_name_encoded}"


    print("s3 object url" , s3_object_url)

    timestamp = datetime.utcnow()
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    document = {
        "userid": user_id,
        "documentid": document_id,
        "filename": file_name,
        "created": timestamp_str,
        "filesize": str(event["Records"][0]["s3"]["object"]["size"]),
        "docstatus": "UPLOADED",
        "conversations": [],
        "s3_object_url": s3_object_url  # Store the S3 object URL in the document
    }

    conversation_id = shortuuid.uuid()
    conversation = {"conversationid": conversation_id, "created": timestamp_str}
    print("conversation 1", conversation)
    document["conversations"].append(conversation)

    document_table.put_item(Item=document)

    conversation = {"SessionId": conversation_id, "History": []}
    print("conversation", conversation)
    memory_table.put_item(Item=conversation)

    message = {
        "documentid": document_id,
        "key": key,
        "user": user_id,
        "s3_object_url": s3_object_url  # Include the S3 object URL in the SQS message
    }
    sqs.send_message(QueueUrl=QUEUE, MessageBody=json.dumps(message))
