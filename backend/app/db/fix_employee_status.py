"""Fix employee status - set to Terminated if they have offboarding tasks"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db import models


def fix_employee_status():
    """Set employee status to Terminated if they have offboarding tasks"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find all distinct employee IDs with offboarding tasks
        offboarding_employee_ids = db.query(models.OffboardingTask.employee_id).filter(
            (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
        ).distinct().all()

        print(f"Found {len(offboarding_employee_ids)} employees with offboarding tasks")

        updated_count = 0

        for (emp_id,) in offboarding_employee_ids:
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == emp_id
            ).first()

            if employee and employee.status != "Terminated":
                print(f"  Updating {employee.first_name} {employee.last_name} ({emp_id}) from '{employee.status}' to 'Terminated'")
                employee.status = "Terminated"
                updated_count += 1

        db.commit()
        print(f"\n✅ Successfully updated {updated_count} employees to 'Terminated' status")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Fixing employee status for those with offboarding tasks...")
    print("=" * 60)
    fix_employee_status()
