import os
import json
from aws_lambda_powertools import Logger
import boto3

MEMORY_TABLE = os.environ["MEMORY_TABLE"]

ddb = boto3.resource("dynamodb")
memory_table = ddb.Table(MEMORY_TABLE)
logger = Logger()

def clear_history(conversation_id):
    try:
        memory_table.update_item(
            Key={"SessionId": conversation_id},
            UpdateExpression="SET History = :empty",
            ExpressionAttributeValues={":empty": []}
        )
        return True
    except Exception as e:
        logger.error(f"Failed to clear history in conversation {conversation_id}: {str(e)}")
        return False

@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    # Parse the body of the event as JSON
    body = json.loads(event['body'])

    # Extract conversation_id from the parsed body
    conversation_id = body.get('conversation_id')
    
    if not conversation_id:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Bad Request. Conversation ID is required."})
        }

    # Clear the "History" field within the conversation identified by conversation_id
    success = clear_history(conversation_id)

    if success:
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            "body": json.dumps({"message": "History cleared from conversation successfully!"})
        }
    else:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Failed to clear history from conversation."})
        }
