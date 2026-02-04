"""
Populate onboarding_tasks table with sample data for recent hires.

This script creates onboarding tasks for employees hired within the last 90 days.
"""

import sqlite3
import os
from datetime import datetime, timedelta

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

print(f"Populating onboarding data at: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear existing onboarding tasks
cursor.execute("DELETE FROM onboarding_tasks")
conn.commit()
print("Cleared existing onboarding tasks")

# Get recent hires (hired within last 90 days from Feb 3, 2026)
reference_date = datetime(2026, 2, 3).date()
ninety_days_ago = reference_date - timedelta(days=90)

cursor.execute("""
    SELECT employee_id, first_name, last_name, department, hire_date
    FROM employees
    WHERE hire_date >= ? AND status = 'Active'
    ORDER BY hire_date DESC
""", (ninety_days_ago.isoformat(),))

recent_hires = cursor.fetchall()
print(f"Found {len(recent_hires)} recent hires for onboarding")

# Standard onboarding tasks template
standard_tasks = [
    {"name": "Send welcome email", "category": "HR", "days": -1, "role": "HR Manager", "priority": "High"},
    {"name": "Prepare workstation", "category": "IT", "days": -1, "role": "IT Admin", "priority": "High"},
    {"name": "Assign equipment", "category": "IT", "days": 0, "role": "IT Admin", "priority": "High"},
    {"name": "Complete I-9 form", "category": "HR", "days": 0, "role": "New Hire", "priority": "Critical"},
    {"name": "Review company policies", "category": "HR", "days": 0, "role": "New Hire", "priority": "High"},
    {"name": "Setup email and accounts", "category": "IT", "days": 0, "role": "IT Admin", "priority": "High"},
    {"name": "Team introduction meeting", "category": "Manager", "days": 0, "role": "Direct Manager", "priority": "High"},
    {"name": "Benefits enrollment", "category": "HR", "days": 7, "role": "New Hire", "priority": "High"},
    {"name": "30-day check-in", "category": "Manager", "days": 30, "role": "Direct Manager", "priority": "Medium"},
    {"name": "60-day review", "category": "Manager", "days": 60, "role": "Direct Manager", "priority": "Medium"},
    {"name": "90-day review", "category": "Manager", "days": 90, "role": "Direct Manager", "priority": "High"},
]

task_count = 0
year = 2026

try:
    for emp_id, first_name, last_name, department, hire_date_str in recent_hires:
        hire_date = datetime.strptime(hire_date_str, "%Y-%m-%d").date()
        days_since_hire = (reference_date - hire_date).days

        print(f"\nCreating tasks for {first_name} {last_name} (ID: {emp_id}, hired {hire_date_str}, {days_since_hire} days ago)")

        for task_template in standard_tasks:
            task_count += 1
            task_id = f"OB-TASK-{year}-{str(task_count).zfill(4)}"

            # Calculate due date
            task_due_date = hire_date + timedelta(days=task_template["days"])

            # Determine status based on due date
            if task_due_date < reference_date - timedelta(days=7):
                # Task is more than a week past due - mark as completed
                status = "Completed"
                completed_date = task_due_date.isoformat()
            elif task_due_date < reference_date:
                # Task is past due but recent - mark as in progress
                status = "In Progress"
                completed_date = None
            else:
                # Task is in the future
                status = "Not Started"
                completed_date = None

            cursor.execute("""
                INSERT INTO onboarding_tasks (
                    task_id, employee_id, task_name, category,
                    assigned_to_role, due_date, days_from_start, priority,
                    status, completed_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                emp_id,
                task_template["name"],
                task_template["category"],
                task_template["role"],
                task_due_date.isoformat(),
                task_template["days"],
                task_template["priority"],
                status,
                completed_date,
                datetime.now().isoformat()
            ))

            print(f"  - {task_template['name']} ({status})")

    conn.commit()
    print(f"\nSuccessfully created {task_count} onboarding tasks for {len(recent_hires)} employees")

except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
    raise

finally:
    conn.close()
