import os, json
import boto3
from botocore.config import Config
import shortuuid
from aws_lambda_powertools import Logger


BUCKET = os.environ["BUCKET"]
REGION = os.environ["REGION"]


s3 = boto3.client(
    "s3",
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(
        s3={"addressing_style": "virtual"}, region_name=REGION, signature_version="s3v4"
    ),
)
logger = Logger()


def s3_key_exists(bucket, key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except:
        return False


@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    user_id = event["requestContext"]["authorizer"]["claims"]["sub"]
    file_name_full = event["queryStringParameters"]["file_name"]
    file_name, extension = os.path.splitext(file_name_full)

    exists = s3_key_exists(BUCKET, f"{user_id}/{file_name_full}/{file_name_full}")

    logger.info(
        {
            "user_id": user_id,
            "file_name_full": file_name_full,
            "file_name": file_name,
            "exists": exists,
        }
    )

    if exists:
        suffix = shortuuid.ShortUUID().random(length=4)
        # Separate the filename and extension for CSV file
        base_name, extension = os.path.splitext(file_name_full)
        key = f"{user_id}/{base_name}-{suffix}{extension}/{base_name}-{suffix}{extension}"
    else:
        key = f"{user_id}/{file_name}{extension}/{file_name}{extension}"

    print("key after condition" , key)


    if extension.lower() == ".pdf":
        content_type = "application/pdf"
    elif extension.lower() == ".csv":
        content_type = "text/csv"
    elif extension.lower() == ".txt":
        content_type = "text/plain"
    elif extension.lower() == ".docx":
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        content_type = "application/octet-stream"

    print("content type" , content_type)

    presigned_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": BUCKET,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=300,
        HttpMethod="PUT",
    )

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps({"presignedurl": presigned_url}),
    }
