"""Populate dummy compensation data for testing."""
import sqlite3
import os
import random

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Sample positions by department
positions_by_dept = {
    "IT": ["Software Engineer", "Senior Developer", "Systems Administrator", "IT Manager", "DevOps Engineer", "Database Administrator", "IT Support Specialist"],
    "HR": ["HR Manager", "HR Coordinator", "Recruiter", "Benefits Specialist", "HR Business Partner", "Talent Acquisition Specialist"],
    "Finance": ["Financial Analyst", "Accountant", "Finance Manager", "Senior Accountant", "Controller", "Financial Planning Analyst"],
    "Sales": ["Sales Representative", "Account Executive", "Sales Manager", "Business Development Manager", "Sales Coordinator"],
    "Marketing": ["Marketing Manager", "Marketing Specialist", "Content Creator", "Digital Marketing Specialist", "Brand Manager"],
    "Operations": ["Operations Manager", "Operations Coordinator", "Logistics Specialist", "Supply Chain Analyst", "Operations Analyst"],
    "Customer Service": ["Customer Service Representative", "Customer Success Manager", "Support Specialist", "Call Center Agent"],
    "Engineering": ["Mechanical Engineer", "Electrical Engineer", "Engineering Manager", "Design Engineer", "Project Engineer"],
    "Legal": ["Legal Counsel", "Paralegal", "Compliance Officer", "Contract Specialist"],
    "Admin": ["Administrative Assistant", "Office Manager", "Executive Assistant", "Receptionist"],
}

# Sample supervisor names
supervisors = [
    "Jennifer Smith", "Michael Johnson", "Sarah Williams", "David Brown", "Jessica Jones",
    "Robert Davis", "Lisa Miller", "James Wilson", "Maria Rodriguez", "John Martinez",
    "Patricia Anderson", "Christopher Taylor", "Nancy Thomas", "Daniel Moore", "Karen Jackson",
    "Matthew White", "Betty Harris", "Donald Martin", "Sandra Thompson", "Paul Garcia"
]

# Get all employees
cursor.execute("""
    SELECT employee_id, department, wage, wage_type, type
    FROM employees
    WHERE status = 'Active'
""")
employees = cursor.fetchall()

print(f"Found {len(employees)} active employees to update...")

updated_count = 0

for emp_id, department, wage, wage_type, emp_type in employees:
    # Skip if no wage data
    if not wage:
        continue

    # Determine position based on department
    dept_positions = positions_by_dept.get(department, ["Specialist", "Coordinator", "Manager", "Analyst"])
    position = random.choice(dept_positions)

    # Assign a random supervisor
    supervisor = random.choice(supervisors)

    # Calculate annual_wage from wage field
    # The wage field appears to be annual already
    annual_wage = wage

    # Calculate hourly_wage (assuming 2080 hours per year)
    hourly_wage = wage / 2080 if wage else None

    # Calculate employer taxes (approximately 7.65% FICA + 2-3% for unemployment/other)
    # Total ~10% of annual wage
    employer_taxes = round(annual_wage * 0.10, 2) if annual_wage else 0

    # Calculate total compensation (wage + benefits + taxes)
    # Get benefits_cost if it exists
    cursor.execute("SELECT benefits_cost FROM employees WHERE employee_id = ?", (emp_id,))
    result = cursor.fetchone()
    benefits_cost = result[0] if result and result[0] else 0

    total_comp = annual_wage + benefits_cost + employer_taxes if annual_wage else 0

    # Update the employee record
    cursor.execute("""
        UPDATE employees
        SET position = ?,
            supervisor = ?,
            annual_wage = ?,
            hourly_wage = ?,
            benefits_cost_annual = ?,
            employer_taxes_annual = ?,
            total_compensation = ?
        WHERE employee_id = ?
    """, (position, supervisor, annual_wage, round(hourly_wage, 2) if hourly_wage else None,
          benefits_cost, employer_taxes, round(total_comp, 2), emp_id))

    updated_count += 1

    if updated_count % 50 == 0:
        print(f"  Updated {updated_count} employees...")

# Commit changes
conn.commit()
conn.close()

print(f"\n✓ Successfully updated {updated_count} employees!")
print("  - Added positions based on departments")
print("  - Added random supervisors")
print("  - Calculated annual_wage from existing wage field")
print("  - Calculated hourly_wage (wage / 2080)")
print("  - Calculated employer_taxes_annual (~10% of wage)")
print("  - Calculated total_compensation (wage + benefits + taxes)")
