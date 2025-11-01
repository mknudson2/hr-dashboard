import os
import math
import pandas as pd
from pandas import isna
from app.db import models, database

# --- Directory paths ---
UPLOAD_DIR = "./data/paylocity_uploads/"
PROCESSED_DIR = "./data/processed/"


# -------------------------------------------------------------------
# Utility Functions
# -------------------------------------------------------------------
def ensure_directories():
    """Ensure upload and processed directories exist."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)


def safe_value(v):
    """
    Convert Pandas NaN/NaT and numpy float('nan') to None
    to prevent SQLite ValueErrors.
    """
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isna(v):
        return None
    return v


# -------------------------------------------------------------------
# Main Ingestion Function
# -------------------------------------------------------------------
def process_paylocity_files():
    """Process Paylocity employee data files and import to database."""
    ensure_directories()
    db = database.SessionLocal()

    try:
        files = [f for f in os.listdir(
            UPLOAD_DIR) if f.endswith(('.xlsx', '.csv'))]

        if not files:
            print("No files to process.")
            return

        for file in files:
            path = os.path.join(UPLOAD_DIR, file)
            print(f"Processing {file}...")

            try:
                # Read file based on extension
                if file.endswith('.csv'):
                    df = pd.read_csv(path)
                else:
                    df = pd.read_excel(path)

                df.columns = df.columns.str.strip()

                # Normalize column names (adapt for your Paylocity format)
                column_map = {
                    "Employee Id": "employee_id",
                    "Preferred/First Name": "first_name",
                    "Last Name": "last_name",
                    "Type": "type",
                    "Worked CostCenter": "cost_center",
                    "Worked Department": "department",
                    "Worked Team": "team",
                    "Hire Date": "hire_date",
                    "Term Date": "termination_date",
                    "Termination Type": "termination_type",
                    "Status": "status",
                    "Location": "location",
                    "Rate": "wage"
                }

                df = df.rename(
                    columns={k: v for k, v in column_map.items() if k in df.columns})

                # Convert date columns
                for col in ["hire_date", "termination_date"]:
                    if col in df.columns:
                        df[col] = pd.to_datetime(df[col], errors='coerce')

                # Replace NaN and NaT with None
                df = df.where(pd.notnull(df), None)

                processed_count = 0
                skipped_count = 0

                for _, row in df.iterrows():
                    employee_id = str(safe_value(row.get("employee_id")))

                    if not employee_id or employee_id.lower() == "none":
                        skipped_count += 1
                        continue

                    # Clean all row values
                    cleaned = {k: safe_value(v) for k, v in row.items()}

                    # Check if employee already exists
                    existing = db.query(models.Employee).filter(
                        models.Employee.employee_id == employee_id
                    ).first()

                    if existing:
                        # Update existing employee record
                        for key, value in cleaned.items():
                            if hasattr(existing, key) and value is not None:
                                setattr(existing, key, value)
                        processed_count += 1
                    else:
                        # Create a new employee record
                        emp = models.Employee(
                            employee_id=employee_id,
                            first_name=cleaned.get("first_name"),
                            last_name=cleaned.get("last_name"),
                            status=cleaned.get("status"),
                            type=cleaned.get("type"),
                            location=cleaned.get("location"),
                            department=cleaned.get("department"),
                            cost_center=cleaned.get("cost_center"),
                            team=cleaned.get("team"),
                            hire_date=cleaned.get("hire_date"),
                            termination_date=cleaned.get("termination_date"),
                            termination_type=cleaned.get("termination_type"),
                            wage=cleaned.get("wage"),
                            benefits_cost=cleaned.get("benefits_cost"),
                            tenure_years=cleaned.get("tenure_years")
                        )
                        db.add(emp)
                        processed_count += 1

                # Commit all inserts/updates for this file
                db.commit()

                # Move processed file
                processed_path = os.path.join(PROCESSED_DIR, file)
                os.rename(path, processed_path)

                print(f"✓ {file} processed successfully.")
                print(f"  → {processed_count} employees imported/updated")
                if skipped_count:
                    print(
                        f"  → {skipped_count} rows skipped (missing Employee ID)")
                print(f"  File moved to {PROCESSED_DIR}\n")

            except Exception as e:
                db.rollback()
                print(f"❌ Error processing {file}: {e}")
                print(f"  File left in upload directory for review\n")

    finally:
        db.close()


# -------------------------------------------------------------------
# Entry Point
# -------------------------------------------------------------------
if __name__ == "__main__":
    models.Base.metadata.create_all(bind=database.engine)
    process_paylocity_files()
