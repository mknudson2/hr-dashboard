"""
Populate positions and benefits data for all employees.
Run from the backend directory: python -m app.db.populate_positions_benefits
"""

import random
from datetime import datetime
from app.db.database import SessionLocal
from app.db import models
import logging

logger = logging.getLogger(__name__)

# Position titles by department
POSITIONS_BY_DEPARTMENT = {
    "Engineering": [
        "Software Engineer", "Senior Software Engineer", "Staff Engineer",
        "Engineering Manager", "DevOps Engineer", "QA Engineer",
        "Frontend Developer", "Backend Developer", "Full Stack Developer",
        "Data Engineer", "Platform Engineer", "Site Reliability Engineer"
    ],
    "IT": [
        "IT Specialist", "Systems Administrator", "Network Administrator",
        "IT Support Technician", "IT Manager", "Security Analyst",
        "Database Administrator", "Help Desk Analyst", "IT Project Manager"
    ],
    "Finance": [
        "Financial Analyst", "Senior Financial Analyst", "Accountant",
        "Senior Accountant", "Controller", "Finance Manager",
        "Accounts Payable Specialist", "Accounts Receivable Specialist",
        "Payroll Specialist", "Tax Analyst", "Budget Analyst"
    ],
    "HR": [
        "HR Generalist", "HR Manager", "HR Business Partner",
        "Recruiter", "Senior Recruiter", "Talent Acquisition Manager",
        "Benefits Administrator", "Compensation Analyst", "HR Coordinator",
        "HRIS Analyst", "Training Specialist"
    ],
    "Sales": [
        "Sales Representative", "Senior Sales Representative", "Account Executive",
        "Sales Manager", "Regional Sales Manager", "Business Development Rep",
        "Sales Operations Analyst", "Account Manager", "Sales Director"
    ],
    "Marketing": [
        "Marketing Specialist", "Marketing Manager", "Content Strategist",
        "Digital Marketing Manager", "Brand Manager", "Marketing Analyst",
        "Product Marketing Manager", "Social Media Manager", "SEO Specialist"
    ],
    "Operations": [
        "Operations Manager", "Operations Analyst", "Project Manager",
        "Business Analyst", "Process Improvement Specialist", "Operations Coordinator",
        "Supply Chain Analyst", "Logistics Coordinator", "Facilities Manager"
    ],
    "Legal": [
        "Legal Counsel", "Paralegal", "Contracts Manager",
        "Compliance Officer", "Legal Assistant", "Corporate Attorney"
    ],
    "Customer Service": [
        "Customer Service Representative", "Customer Service Manager",
        "Support Specialist", "Account Specialist", "Client Success Manager",
        "Customer Experience Manager"
    ],
    "Product": [
        "Product Manager", "Senior Product Manager", "Product Owner",
        "Product Analyst", "UX Designer", "UI Designer", "Product Designer"
    ],
    "Research": [
        "Research Analyst", "Senior Research Analyst", "Research Scientist",
        "Data Scientist", "Research Manager"
    ]
}

# Default positions for departments not listed
DEFAULT_POSITIONS = [
    "Specialist", "Senior Specialist", "Analyst", "Senior Analyst",
    "Coordinator", "Manager", "Director", "Associate"
]

# Medical plan options
MEDICAL_PLANS = [
    {"plan": "PPO Gold", "ee_cost": 400, "er_cost": 1000},
    {"plan": "PPO Silver", "ee_cost": 300, "er_cost": 800},
    {"plan": "PPO Bronze", "ee_cost": 200, "er_cost": 600},
    {"plan": "HMO Premium", "ee_cost": 250, "er_cost": 750},
    {"plan": "HMO Standard", "ee_cost": 150, "er_cost": 550},
    {"plan": "HDHP", "ee_cost": 100, "er_cost": 400},
]

TIERS = ["Employee Only", "Employee + Spouse", "Employee + Children", "Family"]
TIER_MULTIPLIERS = {"Employee Only": 1.0, "Employee + Spouse": 1.8, "Employee + Children": 1.6, "Family": 2.5}

# Dental plan options
DENTAL_PLANS = [
    {"plan": "Delta Dental PPO", "ee_cost": 25, "er_cost": 40},
    {"plan": "Delta Dental HMO", "ee_cost": 15, "er_cost": 30},
    {"plan": "Guardian Dental", "ee_cost": 20, "er_cost": 35},
]

# Vision plan options
VISION_PLANS = [
    {"plan": "VSP Choice", "ee_cost": 10, "er_cost": 15},
    {"plan": "VSP Premium", "ee_cost": 15, "er_cost": 20},
    {"plan": "EyeMed", "ee_cost": 12, "er_cost": 18},
]

def get_position_for_department(department: str) -> str:
    """Get a random position title appropriate for the department."""
    positions = POSITIONS_BY_DEPARTMENT.get(department, DEFAULT_POSITIONS)
    return random.choice(positions)

def populate_data():
    """Populate positions and benefits for all employees."""
    db = SessionLocal()

    try:
        # Get all active employees
        employees = db.query(models.Employee).filter(
            models.Employee.status != "Terminated"
        ).all()

        logger.info(f"Found {len(employees)} active employees to update")

        updated_count = 0

        for emp in employees:
            # Set position if not already set
            if not emp.position:
                emp.position = get_position_for_department(emp.department or "Operations")

            # Set benefits if not already set
            if not emp.medical_plan:
                # Choose random medical plan
                medical = random.choice(MEDICAL_PLANS)
                tier = random.choice(TIERS)
                multiplier = TIER_MULTIPLIERS[tier]

                emp.medical_plan = medical["plan"]
                emp.medical_tier = tier
                emp.medical_ee_cost = round(medical["ee_cost"] * multiplier, 2)
                emp.medical_er_cost = round(medical["er_cost"] * multiplier, 2)

            if not emp.dental_plan:
                # Choose random dental plan
                dental = random.choice(DENTAL_PLANS)
                tier = emp.medical_tier or random.choice(TIERS)  # Match medical tier
                multiplier = TIER_MULTIPLIERS[tier]

                emp.dental_plan = dental["plan"]
                emp.dental_tier = tier
                emp.dental_ee_cost = round(dental["ee_cost"] * multiplier, 2)
                emp.dental_er_cost = round(dental["er_cost"] * multiplier, 2)

            if not emp.vision_plan:
                # Choose random vision plan
                vision = random.choice(VISION_PLANS)
                tier = emp.medical_tier or random.choice(TIERS)
                multiplier = TIER_MULTIPLIERS[tier]

                emp.vision_plan = vision["plan"]
                emp.vision_tier = tier
                emp.vision_ee_cost = round(vision["ee_cost"] * multiplier, 2)
                emp.vision_er_cost = round(vision["er_cost"] * multiplier, 2)

            if not emp.retirement_plan_type:
                # Set 401k with random contribution
                emp.retirement_plan_type = random.choice(["401k", "401k Roth", "Both"])
                emp.retirement_ee_contribution_pct = random.choice([3, 4, 5, 6, 8, 10])
                emp.retirement_er_match_pct = 4.0  # Company matches up to 4%
                emp.retirement_vesting_schedule = "Immediate"
                emp.retirement_vested_pct = 100.0

                # Calculate monthly amounts based on salary
                if emp.wage:
                    monthly_salary = emp.wage / 12
                    emp.retirement_ee_contribution_amount = round(monthly_salary * (emp.retirement_ee_contribution_pct / 100), 2)
                    match_pct = min(emp.retirement_ee_contribution_pct, emp.retirement_er_match_pct)
                    emp.retirement_er_match_amount = round(monthly_salary * (match_pct / 100), 2)

            if not emp.life_insurance_coverage:
                # Life insurance - typically 1-2x salary, employer paid
                if emp.wage:
                    emp.life_insurance_coverage = round(emp.wage * random.choice([1, 1.5, 2]), 0)
                else:
                    emp.life_insurance_coverage = 100000
                emp.life_insurance_ee_cost = 0  # Employer paid
                emp.life_insurance_er_cost = 20  # Flat employer cost

            if not emp.disability_std:
                # Short-term and long-term disability
                emp.disability_std = True
                emp.disability_std_cost = 15
                emp.disability_ltd = True
                emp.disability_ltd_cost = 30

            # HSA for HDHP plans
            if emp.medical_plan == "HDHP" and not emp.hsa_ee_contribution:
                emp.hsa_ee_contribution = random.choice([100, 150, 200, 250])
                emp.hsa_er_contribution = 83.33  # $1000/year employer contribution

            # FSA for non-HDHP plans
            if emp.medical_plan != "HDHP" and not emp.fsa_contribution:
                if random.random() > 0.5:  # 50% chance of FSA enrollment
                    emp.fsa_contribution = random.choice([100, 150, 200])

            # Dependent care FSA (random enrollment)
            if not emp.dependent_care_fsa and random.random() > 0.7:
                emp.dependent_care_fsa = random.choice([200, 300, 400, 500])

            updated_count += 1

            if updated_count % 50 == 0:
                logger.info(f"Updated {updated_count} employees...")

        db.commit()
        logger.info(f"\nSuccessfully updated {updated_count} employees with positions and benefits data")

        # Show a sample
        sample = db.query(models.Employee).filter(
            models.Employee.status != "Terminated"
        ).limit(5).all()

        logger.info("Sample of updated employees:")
        for emp in sample:
            logger.info(f"{emp.first_name} {emp.last_name} ({emp.department})")
            logger.info(f"Position: {emp.position}")
            logger.info(f"Medical: {emp.medical_plan} ({emp.medical_tier}) - EE: ${emp.medical_ee_cost}/mo, ER: ${emp.medical_er_cost}/mo")
            logger.info(f"Dental: {emp.dental_plan} - EE: ${emp.dental_ee_cost}/mo")
            logger.info(f"Vision: {emp.vision_plan} - EE: ${emp.vision_ee_cost}/mo")
            logger.info(f"401k: {emp.retirement_ee_contribution_pct}% (ER match: {emp.retirement_er_match_pct}%)")

    except Exception as e:
        db.rollback()
        logger.error(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Populating positions and benefits data...")
    logger.info("=" * 60)
    populate_data()
