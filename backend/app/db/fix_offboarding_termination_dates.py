"""
Fix missing termination dates for employees in offboarding.

Employees with offboarding tasks but no termination_date will have their
termination_date set to a date in 2026.
"""

import sqlite3
import os
from datetime import datetime, timedelta
import random

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

print(f"Fixing offboarding termination dates at: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find employees in offboarding without termination dates
cursor.execute("""
    SELECT DISTINCT t.employee_id, e.first_name, e.last_name, e.termination_date, e.status
    FROM offboarding_tasks t
    LEFT JOIN employees e ON t.employee_id = e.employee_id
    WHERE e.termination_date IS NULL OR e.termination_date = ''
""")

employees_to_fix = cursor.fetchall()
print(f"Found {len(employees_to_fix)} employees in offboarding without termination dates")

# Reference date: Feb 3, 2026
reference_date = datetime(2026, 2, 3).date()

try:
    for emp_id, first_name, last_name, term_date, status in employees_to_fix:
        # Generate a termination date between Feb 15 and Dec 31, 2026
        days_in_future = random.randint(12, 330)  # 12 to 330 days from Feb 3
        new_termination_date = reference_date + timedelta(days=days_in_future)

        print(f"  Setting termination date for {first_name} {last_name} (ID: {emp_id}): {new_termination_date}")

        # Update employee record
        cursor.execute("""
            UPDATE employees
            SET termination_date = ?,
                status = 'Terminated',
                termination_type = COALESCE(termination_type, 'Voluntary')
            WHERE employee_id = ?
        """, (new_termination_date.isoformat(), emp_id))

        # Update offboarding task due dates based on termination date
        cursor.execute("""
            UPDATE offboarding_tasks
            SET due_date = date(?, '+' || COALESCE(days_from_termination, 0) || ' days')
            WHERE employee_id = ? AND days_from_termination IS NOT NULL
        """, (new_termination_date.isoformat(), emp_id))

    conn.commit()
    print(f"\nSuccessfully fixed termination dates for {len(employees_to_fix)} employees")

except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
    raise

finally:
    conn.close()
