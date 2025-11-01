"""Seed wage history data for employees."""
from datetime import date, timedelta
import random
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models

# Create tables
models.Base.metadata.create_all(bind=engine)


def seed_wage_history():
    """Add wage history records for employees."""
    db: Session = SessionLocal()

    try:
        # Get all employees
        employees = db.query(models.Employee).all()

        print(f"Creating wage history for {len(employees)} employees...")

        change_reasons = [
            "Initial Hire",
            "Merit Increase",
            "Annual Review",
            "Promotion",
            "Cost of Living Adjustment",
            "Market Adjustment",
            "Performance Bonus",
        ]

        wage_history_records = []

        for emp in employees:
            if not emp.hire_date or not emp.wage:
                continue

            # Starting wage (80-90% of current wage)
            starting_wage = emp.wage * random.uniform(0.80, 0.90)
            current_date = emp.hire_date
            current_wage = starting_wage

            # Add initial hire record
            wage_history_records.append(
                models.WageHistory(
                    employee_id=emp.employee_id,
                    effective_date=current_date,
                    wage=round(current_wage, 2),
                    change_reason="Initial Hire",
                    change_amount=0,
                    change_percentage=0,
                )
            )

            # Add 1-4 wage changes depending on tenure
            today = date.today()
            years_employed = (today - emp.hire_date).days / 365.25

            # Number of raises based on tenure
            num_raises = min(int(years_employed), 4)

            if num_raises > 0:
                # Distribute raises over the tenure
                days_between_raises = (today - emp.hire_date).days / (num_raises + 1)

                for i in range(num_raises):
                    # Calculate next review date
                    days_offset = int(days_between_raises * (i + 1))
                    review_date = emp.hire_date + timedelta(days=days_offset)

                    # Don't add future raises
                    if review_date > today:
                        break

                    # Random raise between 2-8%
                    raise_percentage = random.uniform(2, 8)
                    raise_amount = current_wage * (raise_percentage / 100)
                    new_wage = current_wage + raise_amount

                    reason = random.choice([
                        "Merit Increase",
                        "Annual Review",
                        "Promotion" if i == num_raises - 1 else "Merit Increase",
                        "Cost of Living Adjustment",
                        "Market Adjustment",
                    ])

                    wage_history_records.append(
                        models.WageHistory(
                            employee_id=emp.employee_id,
                            effective_date=review_date,
                            wage=round(new_wage, 2),
                            change_reason=reason,
                            change_amount=round(raise_amount, 2),
                            change_percentage=round(raise_percentage, 2),
                        )
                    )

                    current_wage = new_wage

        # Bulk insert
        db.bulk_save_objects(wage_history_records)
        db.commit()

        print(f"✅ Created {len(wage_history_records)} wage history records")

    except Exception as e:
        print(f"❌ Error seeding wage history: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_wage_history()
