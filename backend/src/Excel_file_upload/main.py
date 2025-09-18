from sqlalchemy import create_engine, text
from langchain_community.utilities import SQLDatabase
import pandas as pd
import os
import json
import boto3

# ---------------- DB Connection ----------------
username = os.environ["USERNAME"]
password = os.environ["PASSWORD"]
host     = os.environ["HOST"]
port     = os.environ["PORT"]
database = os.environ["DATABASE"]

BUCKET = os.environ["BUCKET"]

s3 = boto3.client("s3")
DOCUMENT_TABLE = os.environ["DOCUMENT_TABLE"]

ddb = boto3.resource("dynamodb")
document_table = ddb.Table(DOCUMENT_TABLE)

print("🔧 Creating DB engine...")
engine = create_engine(f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}")
print("✅ DB engine created.")


# ---------------- Helper functions ----------------
def set_doc_status(user_id, document_id, status):
    print(f"🔄 Updating DynamoDB: user_id={user_id}, document_id={document_id}, status={status}")
    document_table.update_item(
        Key={"userid": user_id, "documentid": document_id},
        UpdateExpression="SET docstatus = :docstatus",
        ExpressionAttributeValues={":docstatus": status},
    )
    print("✅ DynamoDB updated.")


def csv_to_mysql(csv_file, db, engine):
    """
    Load CSV file into MySQL (replace table with filename).
    Detects the most likely header row automatically (like Excel).
    """
    print("📂 Starting CSV to MySQL...")

    # Drop old tables
    with engine.connect() as conn:
        print("⚙️ Dropping old tables...")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        tables = conn.execute(text("SHOW TABLES;")).fetchall()
        print(f"Found {len(tables)} tables.")
        for table in tables:
            print(f"🗑 Dropping table: {table[0]}")
            conn.execute(text(f"DROP TABLE IF EXISTS `{table[0]}`;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        print("✅ Old tables dropped.")

    table_name = os.path.basename(csv_file).replace(".csv", "").strip()
    print(f"📥 Reading CSV: {csv_file}")

    # Read raw CSV without header
    raw_df = pd.read_csv(csv_file, header=None)

    # Detect header row
    def detect_header_row(df):
        best_row, max_score = 0, -1
        for i in range(min(10, len(df))):  # check first 10 rows
            row = df.iloc[i]
            non_nulls = row.notnull().sum()
            unique_vals = row.nunique()
            score = non_nulls + unique_vals
            if score > max_score:
                max_score, best_row = score, i
        print(f"🔍 Detected header row at index {best_row}")
        return best_row

    header_row = detect_header_row(raw_df)

    # Re-read with detected header
    df = pd.read_csv(csv_file, header=header_row)
    print(f"✅ CSV loaded into DataFrame, shape={df.shape}, columns={list(df.columns)}")

    # Save to MySQL
    df.to_sql(table_name, con=engine, if_exists="replace", index=False)
    print(f"✅ Table created: {table_name}, rows inserted={len(df)}")

    return table_name



def excel_to_mysql(excel_file, db, engine):
    """
    Load all sheets of an Excel file into MySQL.
    Detects the most likely header row automatically.
    """
    print("📂 Starting Excel to MySQL...")
    table_names = []
    print(f"📥 Reading Excel file: {excel_file}")
    sheet_dfs = pd.read_excel(excel_file, sheet_name=None, header=None)
    print(f"✅ Excel loaded, sheets found: {list(sheet_dfs.keys())}")

    with engine.connect() as conn:
        print("⚙️ Dropping old tables...")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        tables = conn.execute(text("SHOW TABLES;")).fetchall()
        print(f"Found {len(tables)} tables.")
        for table in tables:
            print(f"🗑 Dropping table: {table[0]}")
            conn.execute(text(f"DROP TABLE IF EXISTS `{table[0]}`;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        print("✅ Old tables dropped.")

    def detect_header_row(df):
        best_row, max_score = 0, -1
        for i in range(min(10, len(df))):
            row = df.iloc[i]
            non_nulls = row.notnull().sum()
            unique_vals = row.nunique()
            score = non_nulls + unique_vals
            if score > max_score:
                max_score, best_row = score, i
        print(f"🔍 Detected header row at index {best_row}")
        return best_row

    for sheet_name, raw_df in sheet_dfs.items():
        print(f"\n📄 Processing sheet: {sheet_name}, shape={raw_df.shape}")
        header_row = detect_header_row(raw_df)
        df = pd.read_excel(excel_file, sheet_name=sheet_name, header=header_row)
        print(f"✅ DataFrame created, shape={df.shape}")
        df.to_sql(sheet_name, con=engine, if_exists="replace", index=False)
        print(f"✅ Data loaded into '{sheet_name}', rows inserted={len(df)}")
        table_names.append(sheet_name)

    print(f"\nAll sheets loaded: {table_names}")
    return table_names


# ---------------- Lambda Handler ----------------
def lambda_handler(event, context):
    print("🚀 Lambda triggered.")
    print("📦 Event received:", event)

    event_body = json.loads(event["Records"][0]["body"])
    print("📦 Event body parsed:", event_body)

    document_id = event_body["documentid"]
    key = event_body["key"]
    print(key)
    user_id = key.split("/")[1]
    file_name_full = key.split("/")[-1]

    print(f"🆔 document_id={document_id}, user_id={user_id}, file_name={file_name_full}")

    local_path = f"/tmp/{file_name_full}"

    try:
        set_doc_status(user_id, document_id, "PROCESSING")

        print(f"📥 Downloading {key} from S3 bucket {BUCKET} to {local_path}...")
        s3.download_file(BUCKET, key, local_path)
        print("✅ File downloaded.")

        file_extension = os.path.splitext(file_name_full)[1].lower()
        print(f"📄 File extension detected: {file_extension}")
        db = SQLDatabase(engine)
        print("✅ SQLDatabase object created.")

        if file_extension == ".csv":
            # print("⚙️ Processing as CSV...")
            table_name = csv_to_mysql(local_path, db, engine)
            print("CSV loaded:", table_name)

        elif file_extension == ".xlsx":
            print("⚙️ Processing as Excel...")
            table_names = excel_to_mysql(local_path, db, engine)
            print("Excel loaded:", table_names)

        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

        set_doc_status(user_id, document_id, "READY")
        print("✅ Document status set to READY.")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*"
            },
            "body": json.dumps({"Status": "Okay"}),
        }

    except Exception as e:
        print("❌ Error occurred:", str(e))
        set_doc_status(user_id, document_id, "FAILED")
        raise

    finally:
        print("🧹 Disposing DB engine...")
        engine.dispose()
        print("✅ Engine disposed.")
