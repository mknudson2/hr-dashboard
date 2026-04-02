"""
Migration script to create wage increase cycle tables.

Run this to add the wage_increase_cycles table and update compensation_reviews.
"""
import sys
import os
from datetime import date

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import text
from app.db.database import engine, SessionLocal
from app.db import models
import logging

logger = logging.getLogger(__name__)

def create_tables():
    """Create the wage increase cycle tables."""
    logger.info("Creating wage increase cycle tables...")

    with engine.begin() as conn:
        # Create wage_increase_cycles table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS wage_increase_cycles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cycle_id VARCHAR UNIQUE NOT NULL,
                name VARCHAR NOT NULL,
                fiscal_year INTEGER NOT NULL,
                cycle_type VARCHAR DEFAULT 'Annual',
                planning_start_date DATE,
                planning_end_date DATE,
                effective_date DATE NOT NULL,
                total_budget FLOAT DEFAULT 0.0,
                budget_used FLOAT DEFAULT 0.0,
                budget_remaining FLOAT DEFAULT 0.0,
                budget_percentage FLOAT,
                status VARCHAR DEFAULT 'Planning',
                total_employees_eligible INTEGER DEFAULT 0,
                total_employees_reviewed INTEGER DEFAULT 0,
                total_employees_approved INTEGER DEFAULT 0,
                min_increase_percentage FLOAT,
                max_increase_percentage FLOAT,
                target_increase_percentage FLOAT,
                notes VARCHAR,
                guidelines VARCHAR,
                approved_by VARCHAR,
                approved_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """))

        logger.info("Created wage_increase_cycles table")

        # Add cycle_id column to compensation_reviews if it doesn't exist
        try:
            conn.execute(text("""
                ALTER TABLE compensation_reviews
                ADD COLUMN cycle_id INTEGER
                REFERENCES wage_increase_cycles(id)
            """))
            logger.info("Added cycle_id column to compensation_reviews")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                logger.info("cycle_id column already exists in compensation_reviews")
            else:
                logger.warning(f"Warning adding cycle_id: {e}")

def seed_sample_data():
    """Add sample wage increase cycle data."""
    db = SessionLocal()
    try:
        # Check if any cycles exist
        existing = db.query(models.WageIncreaseCycle).first()
        if existing:
            logger.warning("Sample data already exists. Skipping...")
            return

        # Create a sample cycle for 2025
        sample_cycle = models.WageIncreaseCycle(
            cycle_id="WIC-2025-001",
            name="2025 Annual Merit Increases",
            fiscal_year=2025,
            cycle_type="Annual",
            planning_start_date=date(2024, 11, 1),
            planning_end_date=date(2024, 12, 31),
            effective_date=date(2025, 1, 1),
            total_budget=500000.00,
            budget_used=0.0,
            budget_remaining=500000.00,
            budget_percentage=3.5,
            status="Planning",
            min_increase_percentage=0.0,
            max_increase_percentage=10.0,
            target_increase_percentage=3.5,
            guidelines="Annual merit increases based on performance. Target 3.5% average across the organization.",
            total_employees_eligible=0,
            total_employees_reviewed=0,
            total_employees_approved=0
        )

        db.add(sample_cycle)
        db.commit()
        logger.info("Created sample 2025 wage increase cycle")

    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Wage Increase Cycle Migration")
    logger.info("=" * 60)

    create_tables()
    seed_sample_data()

    logger.info("=" * 60)
    logger.info("Migration complete!")
    logger.info("=" * 60)
