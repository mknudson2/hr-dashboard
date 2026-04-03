"""
Populate comprehensive demo data for Employee Portal demonstration.
- Link test accounts properly for supervisor workflow demos
- Populate benefits data (health, dental, vision, 401k, etc.)
"""
import logging
import random

import bcrypt

from app.db import database, models

logger = logging.getLogger(__name__)


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# Benefits plan options
MEDICAL_PLANS = ["PPO Gold", "PPO Silver", "HDHP Bronze", "HMO Basic"]
MEDICAL_TIERS = ["Employee Only", "Employee + Spouse", "Employee + Children", "Family"]
DENTAL_PLANS = ["Delta Dental PPO", "MetLife DHMO", "Guardian PPO"]
VISION_PLANS = ["VSP Choice", "EyeMed Select", "Davis Vision"]

# Cost structures (monthly)
MEDICAL_COSTS = {
    "Employee Only": {"ee": 150, "er": 450},
    "Employee + Spouse": {"ee": 300, "er": 750},
    "Employee + Children": {"ee": 275, "er": 700},
    "Family": {"ee": 400, "er": 1000},
}
DENTAL_COSTS = {"ee": 25, "er": 40}
VISION_COSTS = {"ee": 10, "er": 15}

def populate_demo_data():
    db = database.SessionLocal()

    try:
        # 1. Create a user account for one of test_supervisor's direct reports
        logger.info("=== Setting up demo user accounts ===")

        test_supervisor_user = db.query(models.User).filter(
            models.User.username == 'test_supervisor'
        ).first()

        if test_supervisor_user and test_supervisor_user.employee_id:
            sup_emp = db.query(models.Employee).filter(
                models.Employee.employee_id == test_supervisor_user.employee_id
            ).first()

            if sup_emp:
                supervisor_name = f"{sup_emp.first_name} {sup_emp.last_name}"

                # Get direct reports
                reports = db.query(models.Employee).filter(
                    models.Employee.supervisor == supervisor_name
                ).all()

                if reports:
                    # Create user account for first direct report if not exists
                    first_report = reports[0]
                    existing_user = db.query(models.User).filter(
                        models.User.employee_id == first_report.employee_id
                    ).first()

                    if not existing_user:
                        # Create a new user for this employee
                        username = f"{first_report.first_name.lower()}_{first_report.last_name.lower()}"
                        new_user = models.User(
                            username=username,
                            email=f"{username}@company.com",
                            hashed_password=get_password_hash("password123"),
                            role="employee",
                            is_active=True,
                            employee_id=first_report.employee_id
                        )
                        db.add(new_user)
                        logger.info(f"Created user '{username}' for {first_report.first_name} {first_report.last_name}")
                        logger.info(f"This employee reports to test_supervisor ({supervisor_name})")
                    else:
                        logger.info(f"User already exists for {first_report.first_name} {first_report.last_name}: {existing_user.username}")

        # 2. Populate benefits data for employees
        logger.info("=== Populating benefits data ===")

        # Get all active employees
        employees = db.query(models.Employee).filter(
            models.Employee.status == "Active"
        ).all()

        benefits_updated = 0
        for emp in employees:
            # Skip if already has medical plan set
            if emp.medical_plan and emp.dental_plan:
                continue

            # Randomly assign benefits
            tier = random.choice(list(MEDICAL_TIERS))

            # Medical
            emp.medical_plan = random.choice(MEDICAL_PLANS)
            emp.medical_tier = tier
            emp.medical_ee_cost = MEDICAL_COSTS[tier]["ee"] * 12  # Annual
            emp.medical_er_cost = MEDICAL_COSTS[tier]["er"] * 12

            # Dental
            emp.dental_plan = random.choice(DENTAL_PLANS)
            emp.dental_tier = tier
            emp.dental_ee_cost = DENTAL_COSTS["ee"] * 12
            emp.dental_er_cost = DENTAL_COSTS["er"] * 12

            # Vision
            emp.vision_plan = random.choice(VISION_PLANS)
            emp.vision_tier = tier
            emp.vision_ee_cost = VISION_COSTS["ee"] * 12
            emp.vision_er_cost = VISION_COSTS["er"] * 12

            # 401k - random contribution between 3-10%
            emp.retirement_plan_type = random.choice(["401k", "401k Roth", "Both"])
            emp.retirement_contribution_pct = random.randint(3, 10)
            emp.retirement_er_match_pct = 4.0  # 4% employer match
            emp.retirement_er_match_limit = 6.0  # Up to 6% of salary

            # Calculate annual retirement contribution
            if emp.annual_wage:
                emp.retirement_ee_contribution = emp.annual_wage * (emp.retirement_contribution_pct / 100)
                emp.retirement_er_contribution = min(
                    emp.annual_wage * (emp.retirement_er_match_pct / 100),
                    emp.annual_wage * (emp.retirement_er_match_limit / 100)
                )

            # HSA for HDHP plans
            if "HDHP" in (emp.medical_plan or ""):
                emp.hsa_contribution = random.choice([100, 150, 200, 250]) * 12  # Annual

            # FSA for some employees
            if random.random() > 0.5:
                emp.fsa_contribution = random.choice([50, 100, 150]) * 12  # Annual healthcare FSA

            # Update total benefits cost
            total_ee_benefits = (
                (emp.medical_ee_cost or 0) +
                (emp.dental_ee_cost or 0) +
                (emp.vision_ee_cost or 0) +
                (emp.retirement_ee_contribution or 0) +
                (emp.fsa_contribution or 0)
            )
            total_er_benefits = (
                (emp.medical_er_cost or 0) +
                (emp.dental_er_cost or 0) +
                (emp.vision_er_cost or 0) +
                (emp.retirement_er_contribution or 0)
            )

            emp.benefits_cost = total_ee_benefits
            emp.benefits_cost_annual = total_er_benefits

            benefits_updated += 1

        logger.info(f"Updated benefits for {benefits_updated} employees")

        # 3. Ensure test accounts have good demo data
        logger.info("=== Ensuring test accounts have complete data ===")

        test_usernames = ['test_employee', 'test_supervisor', 'test_supervisor_employee']
        for username in test_usernames:
            user = db.query(models.User).filter(models.User.username == username).first()
            if user and user.employee_id:
                emp = db.query(models.Employee).filter(
                    models.Employee.employee_id == user.employee_id
                ).first()
                if emp:
                    # Ensure they have good benefits for demo
                    if not emp.medical_plan:
                        emp.medical_plan = "PPO Gold"
                        emp.medical_tier = "Family"
                        emp.medical_ee_cost = 400 * 12
                        emp.medical_er_cost = 1000 * 12

                        emp.dental_plan = "Delta Dental PPO"
                        emp.dental_tier = "Family"
                        emp.dental_ee_cost = 25 * 12
                        emp.dental_er_cost = 40 * 12

                        emp.vision_plan = "VSP Choice"
                        emp.vision_tier = "Family"
                        emp.vision_ee_cost = 10 * 12
                        emp.vision_er_cost = 15 * 12

                        emp.retirement_plan_type = "Both"
                        emp.retirement_contribution_pct = 6
                        emp.retirement_er_match_pct = 4.0
                        emp.retirement_er_match_limit = 6.0

                        if emp.annual_wage:
                            emp.retirement_ee_contribution = emp.annual_wage * 0.06
                            emp.retirement_er_contribution = emp.annual_wage * 0.04

                        emp.hsa_contribution = 200 * 12  # HSA

                        # Update totals
                        emp.benefits_cost = (
                            emp.medical_ee_cost + emp.dental_ee_cost + emp.vision_ee_cost +
                            (emp.retirement_ee_contribution or 0) + (emp.hsa_contribution or 0)
                        )
                        emp.benefits_cost_annual = (
                            emp.medical_er_cost + emp.dental_er_cost + emp.vision_er_cost +
                            (emp.retirement_er_contribution or 0)
                        )

                    logger.info(f"{username} ({emp.first_name} {emp.last_name}):")
                    logger.info(f"Medical: {emp.medical_plan} ({emp.medical_tier})")
                    logger.info(f"Employee: ${emp.medical_ee_cost:,.0f}/yr, Employer: ${emp.medical_er_cost:,.0f}/yr")
                    logger.info(f"401k: {emp.retirement_contribution_pct}% contribution")
                    logger.info(f"Total Employee Benefits Cost: ${emp.benefits_cost:,.0f}/yr")
                    logger.info(f"Total Employer Benefits Cost: ${emp.benefits_cost_annual:,.0f}/yr")

        db.commit()

        # Print final summary
        logger.info("=" * 60)
        logger.info("DEMO ACCOUNTS READY FOR PRESENTATION")
        logger.info("=" * 60)

        logger.info("Employee Portal Demo Scenarios:")
        logger.info("-" * 40)

        # Get the newly created user for demo
        george_user = db.query(models.User).filter(
            models.User.username.like('%sanchez%') |
            models.User.username.like('%george%')
        ).first()

        if george_user:
            logger.info(f"\n1. EMPLOYEE VIEW (reports to supervisor):")
            logger.info(f"Username: {george_user.username}")
            logger.info(f"Password: password123")
            logger.info(f"-> Can submit requests, view own compensation, see supervisor")

        logger.info(f"\n2. EMPLOYEE VIEW (HR Manager, no supervisor):")
        logger.info(f"Username: test_employee")
        logger.info(f"Password: password123")
        logger.info(f"-> View compensation, benefits, 23 direct reports")

        logger.info(f"\n3. SUPERVISOR VIEW:")
        logger.info(f"Username: test_supervisor")
        logger.info(f"Password: password123")
        logger.info(f"-> View team, approve requests, see direct reports")

        logger.info("HR Portal Access:")
        logger.info("-" * 40)
        logger.info(f"Username: test_supervisor (manager role)")
        logger.info(f"Password: password123")

    except Exception as e:
        db.rollback()
        logger.error(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate_demo_data()
