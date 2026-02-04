"""
Populate turnover/terminations table with realistic cost data.

This creates termination records for employees who have termination dates,
with calculated turnover costs based on:
- Severance: 2 weeks pay per year of service (voluntary) or 4 weeks (involuntary)
- Unused PTO Payout: Based on employee's unused PTO hours
- Recruitment Cost: 25% of annual salary (industry average)
- Training Cost: 15% of annual salary for replacement training
"""

import sqlite3
import os
import random
from datetime import datetime

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

print(f"Populating turnover data at: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear existing terminations
cursor.execute("DELETE FROM terminations")
conn.commit()
print("Cleared existing termination records")

# Get all terminated employees
cursor.execute("""
    SELECT
        employee_id, first_name, last_name, department, team,
        hire_date, termination_date, termination_type,
        wage, type, pto_allotted, pto_used, position,
        benefits_cost, tenure_years, cost_center
    FROM employees
    WHERE termination_date IS NOT NULL AND termination_date != ''
    AND status = 'Terminated'
    ORDER BY termination_date DESC
""")

terminated_employees = cursor.fetchall()
print(f"Found {len(terminated_employees)} terminated employees")

# Termination reasons by type
voluntary_reasons = [
    "Resignation - New Opportunity",
    "Resignation - Relocation",
    "Resignation - Career Change",
    "Resignation - Personal Reasons",
    "Resignation - Return to School",
    "Retirement",
]

involuntary_reasons = [
    "Performance Issues",
    "Position Elimination",
    "Restructuring",
    "Policy Violation",
    "Attendance Issues",
]

# Reference date for calculations
reference_date = datetime(2026, 2, 3).date()

try:
    created_count = 0

    for emp in terminated_employees:
        (employee_id, first_name, last_name, department, team,
         hire_date_str, termination_date_str, termination_type,
         wage, emp_type, pto_allotted, pto_used, position,
         benefits_cost, tenure_years, cost_center) = emp

        # Parse dates
        hire_date = datetime.strptime(hire_date_str, "%Y-%m-%d").date() if hire_date_str else None
        termination_date = datetime.strptime(termination_date_str, "%Y-%m-%d").date() if termination_date_str else None

        if not termination_date:
            continue

        # Skip future terminations for YTD calculations display
        # But still create records for all

        # Calculate tenure at termination
        if hire_date and termination_date:
            tenure_at_term = (termination_date - hire_date).days / 365.25
        else:
            tenure_at_term = tenure_years or 1

        # Determine termination type if not set
        if not termination_type:
            termination_type = "Voluntary" if random.random() < 0.6 else "Involuntary"

        # Select reason based on type
        if termination_type == "Voluntary":
            reason = random.choice(voluntary_reasons)
        else:
            reason = random.choice(involuntary_reasons)

        # Calculate annual wage (assuming wage field is annual for FT, needs conversion for hourly)
        annual_wage = wage or 60000

        # Calculate hourly wage (assuming 2080 work hours per year)
        hourly_wage = annual_wage / 2080

        # Calculate benefits cost (use stored or estimate at 15% of wage)
        annual_benefits = benefits_cost or (annual_wage * 0.15)

        # Employer taxes (FICA 7.65% + FUTA/SUTA ~2%)
        employer_taxes = annual_wage * 0.0965

        # Total compensation
        total_compensation = annual_wage + annual_benefits + employer_taxes

        # === TURNOVER COSTS ===

        # 1. Severance Cost
        # Voluntary: 0-2 weeks per year of service
        # Involuntary: 2-4 weeks per year of service
        weekly_wage = annual_wage / 52
        if termination_type == "Voluntary":
            # Most voluntary departures don't get severance, some get small amount
            if random.random() < 0.3:  # 30% get some severance
                severance_weeks = tenure_at_term * random.uniform(0.5, 1.5)
            else:
                severance_weeks = 0
        else:
            # Involuntary typically gets severance
            severance_weeks = tenure_at_term * random.uniform(2, 4)

        severance_cost = round(weekly_wage * severance_weeks, 2)

        # 2. Unused PTO Payout
        # Based on employee's unused PTO hours
        unused_pto_hours = (pto_allotted or 80) - (pto_used or 0)
        if unused_pto_hours < 0:
            unused_pto_hours = 0
        unused_pto_payout = round(unused_pto_hours * hourly_wage, 2)

        # 3. Recruitment Cost
        # Industry average: 20-30% of annual salary
        # Higher for senior/specialized roles
        if department in ["Engineering", "IT", "Product"]:
            recruitment_pct = random.uniform(0.25, 0.35)
        elif department in ["Sales", "Marketing"]:
            recruitment_pct = random.uniform(0.20, 0.30)
        else:
            recruitment_pct = random.uniform(0.15, 0.25)

        recruitment_cost = round(annual_wage * recruitment_pct, 2)

        # 4. Training Cost
        # Cost to train replacement: 10-20% of annual salary
        # Higher for technical roles
        if department in ["Engineering", "IT", "Product"]:
            training_pct = random.uniform(0.15, 0.25)
        else:
            training_pct = random.uniform(0.10, 0.15)

        training_cost = round(annual_wage * training_pct, 2)

        # Total turnover cost
        total_turnover_cost = severance_cost + unused_pto_payout + recruitment_cost + training_cost

        # Employment type
        employment_type = "Full Time" if emp_type == "FT" else "Part Time"

        # Rehire eligible (voluntary usually yes, involuntary depends)
        if termination_type == "Voluntary":
            rehire_eligible = True
        else:
            rehire_eligible = reason not in ["Policy Violation", "Attendance Issues"]

        # Generate notes
        notes = f"{termination_type} termination - {reason}"

        # Supervisor (random from common names)
        supervisors = ["Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim", "Jennifer Martinez"]
        supervisor = random.choice(supervisors)

        # Insert termination record
        cursor.execute("""
            INSERT INTO terminations (
                employee_id, termination_date, termination_type, termination_reason,
                position, supervisor, department, cost_center, team, employment_type,
                annual_wage, hourly_wage, benefits_cost_annual, employer_taxes_annual,
                total_compensation, severance_cost, unused_pto_payout,
                recruitment_cost, training_cost, total_turnover_cost,
                rehire_eligible, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            employee_id, termination_date.isoformat(), termination_type, reason,
            position or f"{department} Associate", supervisor, department, cost_center, team, employment_type,
            round(annual_wage, 2), round(hourly_wage, 2), round(annual_benefits, 2), round(employer_taxes, 2),
            round(total_compensation, 2), severance_cost, unused_pto_payout,
            recruitment_cost, training_cost, round(total_turnover_cost, 2),
            rehire_eligible, notes
        ))

        created_count += 1
        print(f"  {first_name} {last_name} ({employee_id}): ${total_turnover_cost:,.0f} turnover cost")

    conn.commit()

    # Summary statistics
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN termination_type = 'Voluntary' THEN 1 ELSE 0 END) as voluntary,
            SUM(CASE WHEN termination_type = 'Involuntary' THEN 1 ELSE 0 END) as involuntary,
            SUM(total_turnover_cost) as total_cost,
            AVG(total_turnover_cost) as avg_cost
        FROM terminations
    """)
    stats = cursor.fetchone()

    print(f"\n{'='*60}")
    print(f"Successfully created {created_count} termination records")
    print(f"{'='*60}")
    print(f"  Voluntary: {stats[1]}")
    print(f"  Involuntary: {stats[2]}")
    print(f"  Total Turnover Cost: ${stats[3]:,.2f}")
    print(f"  Average Cost per Termination: ${stats[4]:,.2f}")
    print(f"{'='*60}")

except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
    raise

finally:
    conn.close()
