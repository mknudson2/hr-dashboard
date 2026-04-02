"""Populate dummy birth dates for testing."""
import sqlite3
import os
import random
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all employees
cursor.execute("""
    SELECT employee_id, hire_date
    FROM employees
    WHERE status = 'Active' OR status IS NULL
""")
employees = cursor.fetchall()

logger.info(f"Found {len(employees)} employees to update...")

updated_count = 0

for emp_id, hire_date_str in employees:
    # Generate a random birth date
    # Assume employees are between 22-65 years old
    age_years = random.randint(22, 65)

    # Calculate birth date (roughly)
    today = date.today()
    birth_year = today.year - age_years
    birth_month = random.randint(1, 12)

    # Handle different month lengths
    if birth_month in [1, 3, 5, 7, 8, 10, 12]:
        birth_day = random.randint(1, 31)
    elif birth_month in [4, 6, 9, 11]:
        birth_day = random.randint(1, 30)
    else:  # February
        birth_day = random.randint(1, 28)

    try:
        birth_date = date(birth_year, birth_month, birth_day)
    except ValueError:
        # If date is invalid, use the 1st
        birth_date = date(birth_year, birth_month, 1)

    # Randomly set some privacy preferences (most employees keep defaults)
    show_birthday = 1 if random.random() > 0.1 else 0  # 90% show birthday
    show_tenure = 1 if random.random() > 0.05 else 0  # 95% show tenure
    show_exact_dates = 1 if random.random() > 0.15 else 0  # 85% show exact dates

    # Update the employee record
    cursor.execute("""
        UPDATE employees
        SET birth_date = ?,
            show_birthday = ?,
            show_tenure = ?,
            show_exact_dates = ?
        WHERE employee_id = ?
    """, (birth_date.isoformat(), show_birthday, show_tenure, show_exact_dates, emp_id))

    updated_count += 1

    if updated_count % 50 == 0:
        logger.info(f"Updated {updated_count} employees...")

# Commit changes
conn.commit()
conn.close()

logger.info(f"\n Successfully updated {updated_count} employees!")
logger.info("- Added random birth dates (ages 22-65)")
logger.info("- Set privacy preferences (mostly showing data)")
