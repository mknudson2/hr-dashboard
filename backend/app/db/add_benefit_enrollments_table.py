"""Create benefit_enrollments table for storing per-line carrier enrollment data."""
import sqlite3
import os

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Creating benefit_enrollments table...")

try:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS benefit_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT NOT NULL REFERENCES employees(employee_id),
            file_upload_id INTEGER REFERENCES file_uploads(id),

            carrier TEXT,
            benefit_type TEXT NOT NULL,
            plan_name TEXT,
            carrier_plan_code TEXT,
            plan_policy_number TEXT,

            coverage_level TEXT,
            approved_benefit_amount REAL,
            requested_benefit_amount REAL,

            effective_date DATE,
            end_date DATE,
            enrollment_type TEXT,
            sign_date DATE,
            is_cobra BOOLEAN DEFAULT 0,
            declined_reason TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_benefit_enrollments_employee_id
        ON benefit_enrollments(employee_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_benefit_enrollments_file_upload_id
        ON benefit_enrollments(file_upload_id)
    """)

    conn.commit()
    print("  benefit_enrollments table created successfully!")

except sqlite3.OperationalError as e:
    if "already exists" in str(e).lower():
        print("  benefit_enrollments table already exists, skipping.")
    else:
        print(f"  Error: {e}")

# Add new columns (idempotent — skips if already present)
new_columns = [
    ("benefit_amount", "REAL"),
    ("relationship", "TEXT"),
    ("ee_cost", "REAL"),
    ("er_cost", "REAL"),
    ("payroll_code", "TEXT"),
    ("pre_tax_code", "TEXT"),
    ("post_tax_code", "TEXT"),
    ("employer_code", "TEXT"),
    ("hsa_limit_level", "TEXT"),
]

print("\nAdding new columns to benefit_enrollments...")
added = 0
for col_name, col_type in new_columns:
    try:
        cursor.execute(f"ALTER TABLE benefit_enrollments ADD COLUMN {col_name} {col_type}")
        print(f"  + Added: {col_name}")
        added += 1
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print(f"  - Already exists: {col_name}")
        else:
            print(f"  ! Error adding {col_name}: {e}")

conn.commit()
conn.close()
print(f"\nMigration completed! ({added} columns added)")
