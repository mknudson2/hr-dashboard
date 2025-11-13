import os
import math
import pandas as pd
from pandas import isna
from sqlalchemy.orm import Session
from app.db import models, database
from typing import Dict, Tuple
from datetime import datetime

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
# Single File Processing (for API integration)
# -------------------------------------------------------------------
def process_single_file(file_path: str, file_upload_id: int, db: Session) -> Tuple[bool, str, Dict]:
    """
    Process a single employee data file and import to database.

    Args:
        file_path: Absolute path to the file
        file_upload_id: ID of the FileUpload record to update
        db: Database session

    Returns:
        Tuple of (success, message, stats)
    """
    try:
        # Update status to processing
        file_upload = db.query(models.FileUpload).filter(
            models.FileUpload.id == file_upload_id
        ).first()

        if not file_upload:
            return False, f"File upload record {file_upload_id} not found", {}

        file_upload.status = 'processing'
        file_upload.processing_started_at = datetime.now()
        db.commit()

        # Create processing log
        log = models.FileProcessingLog(
            file_upload_id=file_upload_id,
            log_level='info',
            log_message='Starting employee data import',
            created_at=datetime.now()
        )
        db.add(log)
        db.commit()

        # Read file based on extension
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        df.columns = df.columns.str.strip()

        # Log columns detected
        log = models.FileProcessingLog(
            file_upload_id=file_upload_id,
            log_level='info',
            log_message=f'Detected {len(df.columns)} columns: {", ".join(df.columns.tolist())}',
            log_details={'columns': df.columns.tolist(), 'row_count': len(df)},
            created_at=datetime.now()
        )
        db.add(log)
        db.commit()

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
        failed_count = 0

        for idx, row in df.iterrows():
            employee_id = str(safe_value(row.get("employee_id")))

            if not employee_id or employee_id.lower() == "none":
                skipped_count += 1
                log = models.FileProcessingLog(
                    file_upload_id=file_upload_id,
                    log_level='warning',
                    log_message='Missing Employee ID',
                    row_number=int(idx) + 2,  # +2 for header and 0-index
                    created_at=datetime.now()
                )
                db.add(log)
                continue

            try:
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

            except Exception as row_error:
                failed_count += 1
                log = models.FileProcessingLog(
                    file_upload_id=file_upload_id,
                    log_level='error',
                    log_message=f'Failed to process employee: {str(row_error)}',
                    log_details={'employee_id': employee_id, 'error': str(row_error)},
                    row_number=int(idx) + 2,
                    created_at=datetime.now()
                )
                db.add(log)

        # Commit all inserts/updates
        db.commit()

        # Update file upload record
        file_upload.status = 'completed'
        file_upload.processing_completed_at = datetime.now()
        file_upload.records_processed = processed_count
        file_upload.records_failed = failed_count
        file_upload.records_skipped = skipped_count
        file_upload.target_table = 'employees'
        db.commit()

        # Create import history record
        import_history = models.DataImportHistory(
            file_upload_id=file_upload_id,
            target_table='employees',
            records_imported=processed_count,
            records_updated=processed_count,  # Could track this separately
            records_failed=failed_count,
            import_started_at=file_upload.processing_started_at,
            import_completed_at=file_upload.processing_completed_at,
            imported_by=file_upload.uploaded_by,
            import_notes=f'Processed {processed_count} employees, {skipped_count} skipped, {failed_count} failed'
        )
        db.add(import_history)
        db.commit()

        # Final success log
        log = models.FileProcessingLog(
            file_upload_id=file_upload_id,
            log_level='info',
            log_message=f'Import completed successfully',
            log_details={
                'processed': processed_count,
                'skipped': skipped_count,
                'failed': failed_count
            },
            created_at=datetime.now()
        )
        db.add(log)
        db.commit()

        stats = {
            'processed': processed_count,
            'skipped': skipped_count,
            'failed': failed_count,
            'total': len(df)
        }

        return True, f"Successfully processed {processed_count} employees", stats

    except Exception as e:
        # Update file upload to failed status
        if file_upload:
            file_upload.status = 'failed'
            file_upload.processing_completed_at = datetime.now()
            file_upload.error_message = str(e)
            db.commit()

        # Log error
        log = models.FileProcessingLog(
            file_upload_id=file_upload_id,
            log_level='error',
            log_message=f'Import failed: {str(e)}',
            log_details={'error': str(e)},
            created_at=datetime.now()
        )
        db.add(log)
        db.commit()

        return False, f"Error processing file: {str(e)}", {}


# -------------------------------------------------------------------
# Entry Point
# -------------------------------------------------------------------
if __name__ == "__main__":
    models.Base.metadata.create_all(bind=database.engine)
    process_paylocity_files()
