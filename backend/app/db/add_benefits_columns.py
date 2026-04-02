"""Add comprehensive benefits columns to employees table."""
import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List of columns to add
columns_to_add = [
    # Health Insurance
    ("medical_plan", "TEXT"),
    ("medical_tier", "TEXT"),
    ("medical_ee_cost", "REAL"),
    ("medical_er_cost", "REAL"),

    ("dental_plan", "TEXT"),
    ("dental_tier", "TEXT"),
    ("dental_ee_cost", "REAL"),
    ("dental_er_cost", "REAL"),

    ("vision_plan", "TEXT"),
    ("vision_tier", "TEXT"),
    ("vision_ee_cost", "REAL"),
    ("vision_er_cost", "REAL"),

    # Retirement
    ("retirement_plan_type", "TEXT"),
    ("retirement_ee_contribution_pct", "REAL"),
    ("retirement_ee_contribution_amount", "REAL"),
    ("retirement_er_match_pct", "REAL"),
    ("retirement_er_match_amount", "REAL"),
    ("retirement_vesting_schedule", "TEXT"),
    ("retirement_vested_pct", "REAL"),

    # HSA/FSA
    ("hsa_ee_contribution", "REAL"),
    ("hsa_er_contribution", "REAL"),
    ("fsa_contribution", "REAL"),
    ("dependent_care_fsa", "REAL"),

    # Life Insurance
    ("life_insurance_coverage", "REAL"),
    ("life_insurance_ee_cost", "REAL"),
    ("life_insurance_er_cost", "REAL"),

    # Disability
    ("disability_std", "BOOLEAN DEFAULT 0"),
    ("disability_std_cost", "REAL"),
    ("disability_ltd", "BOOLEAN DEFAULT 0"),
    ("disability_ltd_cost", "REAL"),

    # Other Benefits
    ("other_benefits", "TEXT"),
    ("commuter_benefits", "REAL"),
    ("wellness_stipend", "REAL"),
]

logger.info("Adding %d benefits columns to employees table...", len(columns_to_add))

# Add each column if it doesn't exist
added_count = 0
existing_count = 0

for column_name, column_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE employees ADD COLUMN {column_name} {column_type}")
        logger.info("Added column: %s", column_name)
        added_count += 1
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            logger.info("Column already exists: %s", column_name)
            existing_count += 1
        else:
            logger.error("Error adding %s: %s", column_name, e)

# Commit changes
conn.commit()
conn.close()

logger.info("Database migration completed!")
logger.info("Added %d new columns", added_count)
logger.info("Skipped %d existing columns", existing_count)
