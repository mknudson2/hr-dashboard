"""Add new compensation columns to employees table."""
import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

# Get the database path - go up to backend, then into data directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List of columns to add
columns_to_add = [
    ("position", "TEXT"),
    ("supervisor", "TEXT"),
    ("annual_wage", "REAL"),
    ("hourly_wage", "REAL"),
    ("benefits_cost_annual", "REAL"),
    ("employer_taxes_annual", "REAL"),
    ("total_compensation", "REAL"),
]

# Add each column if it doesn't exist
for column_name, column_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE employees ADD COLUMN {column_name} {column_type}")
        logger.info("Added column: %s", column_name)
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            logger.info("Column already exists: %s", column_name)
        else:
            logger.error("Error adding %s: %s", column_name, e)

# Commit changes
conn.commit()
conn.close()

logger.info("Database migration completed!")
