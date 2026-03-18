"""Add wage_type column and populate it."""
from sqlalchemy import text
from .database import SessionLocal, engine
from . import models
import random

# Create tables if needed
models.Base.metadata.create_all(bind=engine)

def add_wage_type_column():
    """Add wage_type column and populate with data."""
    db = SessionLocal()

    try:
        # Add column if it doesn't exist
        print("Adding wage_type column...")
        try:
            db.execute(text("ALTER TABLE employees ADD COLUMN wage_type VARCHAR"))
            db.commit()
            print("✅ Column added successfully")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("ℹ️  Column already exists")
                db.rollback()
            else:
                raise

        # Update wage_type based on employee type
        # Simple rule: FT = mix of Salary/Hourly, PT = Hourly
        employees = db.query(models.Employee).all()

        print(f"Updating wage_type for {len(employees)} employees...")

        for emp in employees:
            if emp.type == "PT":
                emp.wage_type = "Hourly"
            elif emp.type == "FT":
                # Mix of salary and hourly for FT employees
                emp.wage_type = random.choice(["Salary", "Salary", "Hourly"])  # 2/3 salary, 1/3 hourly
            else:
                emp.wage_type = "Salary"  # Default

        db.commit()
        print(f"✅ Updated wage_type for all employees")

        # Show distribution
        salary_count = db.query(models.Employee).filter(models.Employee.wage_type == "Salary").count()
        hourly_count = db.query(models.Employee).filter(models.Employee.wage_type == "Hourly").count()
        print(f"\nDistribution:")
        print(f"  Salary: {salary_count}")
        print(f"  Hourly: {hourly_count}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_wage_type_column()
