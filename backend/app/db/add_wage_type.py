"""Add wage_type column and populate it."""
import logging
import random
from sqlalchemy import text
from .database import SessionLocal, engine
from . import models

logger = logging.getLogger(__name__)

# Create tables if needed
models.Base.metadata.create_all(bind=engine)

def add_wage_type_column():
    """Add wage_type column and populate with data."""
    db = SessionLocal()

    try:
        # Add column if it doesn't exist
        logger.info("Adding wage_type column...")
        try:
            db.execute(text("ALTER TABLE employees ADD COLUMN wage_type VARCHAR"))
            db.commit()
            logger.info("Column added successfully")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                logger.info("Column already exists")
                db.rollback()
            else:
                raise

        # Update wage_type based on employee type
        # Simple rule: FT = mix of Salary/Hourly, PT = Hourly
        employees = db.query(models.Employee).all()

        logger.info("Updating wage_type for %d employees...", len(employees))

        for emp in employees:
            if emp.type == "PT":
                emp.wage_type = "Hourly"
            elif emp.type == "FT":
                # Mix of salary and hourly for FT employees
                emp.wage_type = random.choice(["Salary", "Salary", "Hourly"])  # 2/3 salary, 1/3 hourly
            else:
                emp.wage_type = "Salary"  # Default

        db.commit()
        logger.info("Updated wage_type for all employees")

        # Show distribution
        salary_count = db.query(models.Employee).filter(models.Employee.wage_type == "Salary").count()
        hourly_count = db.query(models.Employee).filter(models.Employee.wage_type == "Hourly").count()
        logger.info("Distribution:")
        logger.info("  Salary: %d", salary_count)
        logger.info("  Hourly: %d", hourly_count)

    except Exception as e:
        logger.error("Error: %s", e)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_wage_type_column()
