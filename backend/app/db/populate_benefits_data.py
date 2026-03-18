"""Populate dummy benefits data for testing."""
import sqlite3
import os
import random

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Sample data options
medical_plans = ["PPO Gold", "PPO Silver", "HMO Bronze", "HMO Silver", "HDHP"]
dental_plans = ["Dental PPO", "Dental HMO", "Basic Dental"]
vision_plans = ["Vision Standard", "Vision Premium", None]  # Some may opt out
tiers = ["Employee Only", "Employee + Spouse", "Employee + Children", "Family"]
retirement_types = ["401k", "401k Roth", "Both"]
vesting_schedules = ["Immediate", "3 Year Cliff", "5 Year Graded"]

# Get all active employees
cursor.execute("""
    SELECT employee_id, annual_wage, type
    FROM employees
    WHERE status = 'Active' AND annual_wage IS NOT NULL
""")
employees = cursor.fetchall()

print(f"Found {len(employees)} active employees to update...")

updated_count = 0

for emp_id, annual_wage, emp_type in employees:
    # Medical Insurance (most employees have this)
    has_medical = random.random() > 0.05  # 95% have medical
    if has_medical:
        medical_plan = random.choice(medical_plans)
        medical_tier = random.choice(tiers)

        # Calculate costs based on tier
        if medical_tier == "Employee Only":
            medical_ee_cost = round(random.uniform(100, 250), 2)
            medical_er_cost = round(random.uniform(400, 600), 2)
        elif medical_tier == "Employee + Spouse":
            medical_ee_cost = round(random.uniform(300, 500), 2)
            medical_er_cost = round(random.uniform(800, 1200), 2)
        elif medical_tier == "Employee + Children":
            medical_ee_cost = round(random.uniform(350, 550), 2)
            medical_er_cost = round(random.uniform(900, 1300), 2)
        else:  # Family
            medical_ee_cost = round(random.uniform(500, 800), 2)
            medical_er_cost = round(random.uniform(1200, 1800), 2)
    else:
        medical_plan = None
        medical_tier = None
        medical_ee_cost = None
        medical_er_cost = None

    # Dental Insurance (80% have dental)
    has_dental = random.random() > 0.20
    if has_dental:
        dental_plan = random.choice(dental_plans)
        dental_tier = medical_tier if has_medical else random.choice(tiers)

        if dental_tier == "Employee Only":
            dental_ee_cost = round(random.uniform(10, 30), 2)
            dental_er_cost = round(random.uniform(30, 50), 2)
        elif dental_tier in ["Employee + Spouse", "Employee + Children"]:
            dental_ee_cost = round(random.uniform(30, 60), 2)
            dental_er_cost = round(random.uniform(60, 100), 2)
        else:  # Family
            dental_ee_cost = round(random.uniform(50, 90), 2)
            dental_er_cost = round(random.uniform(90, 150), 2)
    else:
        dental_plan = None
        dental_tier = None
        dental_ee_cost = None
        dental_er_cost = None

    # Vision Insurance (70% have vision)
    has_vision = random.random() > 0.30
    if has_vision:
        vision_plan = random.choice([p for p in vision_plans if p is not None])
        vision_tier = medical_tier if has_medical else random.choice(tiers)

        if vision_tier == "Employee Only":
            vision_ee_cost = round(random.uniform(5, 15), 2)
            vision_er_cost = round(random.uniform(10, 20), 2)
        else:
            vision_ee_cost = round(random.uniform(15, 30), 2)
            vision_er_cost = round(random.uniform(25, 45), 2)
    else:
        vision_plan = None
        vision_tier = None
        vision_ee_cost = None
        vision_er_cost = None

    # Retirement (90% participate)
    has_retirement = random.random() > 0.10
    if has_retirement:
        retirement_plan_type = random.choice(retirement_types)
        retirement_ee_contribution_pct = round(random.uniform(3, 15), 1)  # 3% to 15%
        retirement_ee_contribution_amount = round((annual_wage / 12) * (retirement_ee_contribution_pct / 100), 2)

        # Employer typically matches up to 6%
        retirement_er_match_pct = round(random.uniform(3, 6), 1)
        actual_match_pct = min(retirement_ee_contribution_pct, retirement_er_match_pct)
        retirement_er_match_amount = round((annual_wage / 12) * (actual_match_pct / 100), 2)

        retirement_vesting_schedule = random.choice(vesting_schedules)

        # Calculate vested percentage based on tenure
        cursor.execute("SELECT tenure_years FROM employees WHERE employee_id = ?", (emp_id,))
        tenure_result = cursor.fetchone()
        tenure_years = tenure_result[0] if tenure_result and tenure_result[0] else 0

        if retirement_vesting_schedule == "Immediate":
            retirement_vested_pct = 100.0
        elif retirement_vesting_schedule == "3 Year Cliff":
            retirement_vested_pct = 100.0 if tenure_years >= 3 else 0.0
        else:  # 5 Year Graded
            if tenure_years >= 5:
                retirement_vested_pct = 100.0
            else:
                retirement_vested_pct = min(tenure_years * 20, 100.0)  # 20% per year
    else:
        retirement_plan_type = None
        retirement_ee_contribution_pct = None
        retirement_ee_contribution_amount = None
        retirement_er_match_pct = None
        retirement_er_match_amount = None
        retirement_vesting_schedule = None
        retirement_vested_pct = None

    # HSA (only for HDHP plans, about 20% of employees)
    has_hsa = medical_plan == "HDHP" and random.random() > 0.30
    if has_hsa:
        hsa_ee_contribution = round(random.uniform(100, 300), 2)
        hsa_er_contribution = round(random.uniform(50, 150), 2)
    else:
        hsa_ee_contribution = None
        hsa_er_contribution = None

    # FSA (about 15% have FSA, mutually exclusive with HSA)
    has_fsa = not has_hsa and random.random() > 0.85
    fsa_contribution = round(random.uniform(50, 200), 2) if has_fsa else None

    # Dependent Care FSA (about 10% with children)
    has_dependent_care = random.random() > 0.90
    dependent_care_fsa = round(random.uniform(200, 400), 2) if has_dependent_care else None

    # Life Insurance (all employees get basic, some buy supplemental)
    basic_coverage = round(annual_wage, -3)  # Round to nearest thousand
    supplemental = random.random() > 0.70  # 30% buy supplemental

    life_insurance_coverage = basic_coverage + (100000 if supplemental else 0)
    life_insurance_ee_cost = round(random.uniform(10, 30), 2) if supplemental else 0.0
    life_insurance_er_cost = round(basic_coverage * 0.0005, 2)  # $0.50 per $1000

    # Disability (employer paid for most)
    disability_std = True  # Most companies provide STD
    disability_std_cost = round(random.uniform(15, 30), 2)  # Employer paid

    disability_ltd = random.random() > 0.20  # 80% have LTD
    disability_ltd_cost = round(random.uniform(20, 40), 2) if disability_ltd else None

    # Other benefits (occasional)
    has_commuter = random.random() > 0.85  # 15% use commuter benefits
    commuter_benefits = round(random.uniform(50, 150), 2) if has_commuter else None

    has_wellness = random.random() > 0.70  # 30% have wellness stipend
    wellness_stipend = round(random.uniform(25, 100), 2) if has_wellness else None

    # Update the employee record
    cursor.execute("""
        UPDATE employees
        SET medical_plan = ?,
            medical_tier = ?,
            medical_ee_cost = ?,
            medical_er_cost = ?,
            dental_plan = ?,
            dental_tier = ?,
            dental_ee_cost = ?,
            dental_er_cost = ?,
            vision_plan = ?,
            vision_tier = ?,
            vision_ee_cost = ?,
            vision_er_cost = ?,
            retirement_plan_type = ?,
            retirement_ee_contribution_pct = ?,
            retirement_ee_contribution_amount = ?,
            retirement_er_match_pct = ?,
            retirement_er_match_amount = ?,
            retirement_vesting_schedule = ?,
            retirement_vested_pct = ?,
            hsa_ee_contribution = ?,
            hsa_er_contribution = ?,
            fsa_contribution = ?,
            dependent_care_fsa = ?,
            life_insurance_coverage = ?,
            life_insurance_ee_cost = ?,
            life_insurance_er_cost = ?,
            disability_std = ?,
            disability_std_cost = ?,
            disability_ltd = ?,
            disability_ltd_cost = ?,
            commuter_benefits = ?,
            wellness_stipend = ?
        WHERE employee_id = ?
    """, (
        medical_plan, medical_tier, medical_ee_cost, medical_er_cost,
        dental_plan, dental_tier, dental_ee_cost, dental_er_cost,
        vision_plan, vision_tier, vision_ee_cost, vision_er_cost,
        retirement_plan_type, retirement_ee_contribution_pct, retirement_ee_contribution_amount,
        retirement_er_match_pct, retirement_er_match_amount, retirement_vesting_schedule, retirement_vested_pct,
        hsa_ee_contribution, hsa_er_contribution, fsa_contribution, dependent_care_fsa,
        life_insurance_coverage, life_insurance_ee_cost, life_insurance_er_cost,
        disability_std, disability_std_cost, disability_ltd, disability_ltd_cost,
        commuter_benefits, wellness_stipend,
        emp_id
    ))

    updated_count += 1

    if updated_count % 50 == 0:
        print(f"  Updated {updated_count} employees...")

# Commit changes
conn.commit()
conn.close()

print(f"\n✓ Successfully updated {updated_count} employees!")
print("  - Added medical, dental, vision insurance elections")
print("  - Added 401k/retirement contributions and vesting")
print("  - Added HSA/FSA elections")
print("  - Added life and disability insurance")
print("  - Added commuter and wellness benefits")
