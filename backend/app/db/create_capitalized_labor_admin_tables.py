#!/usr/bin/env python3
"""Create capitalized labor admin tables for the Admin/HR view.

This script creates the following tables:
- employee_labor_rates: Point-in-time fully burdened labor rates
- labor_data_imports: Track imported time and payroll data files
- capitalization_periods: Reporting periods with locking and approval
- employee_capitalization_summaries: Pre-aggregated employee-level data

It also adds new columns to the time_entries table.
"""

from datetime import date, datetime, timedelta
from calendar import monthrange
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import Base, engine
from db import models
import logging

logger = logging.getLogger(__name__)


def create_capitalized_labor_admin_tables():
    """Create the admin tables for capitalized labor management."""
    logger.info("Creating capitalized labor admin tables...")
    logger.info("=" * 60)

    try:
        # Create all tables (will only create new ones)
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/updated successfully!")

        # Create session
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()

        try:
            # Check if we need to add columns to time_entries
            logger.info("Checking for schema updates...")

            # Use raw SQL to check if columns exist and add them if not
            with engine.connect() as conn:
                # Check if labor_rate_at_entry column exists
                result = conn.execute(text("""
                    SELECT COUNT(*) as cnt FROM pragma_table_info('time_entries')
                    WHERE name = 'labor_rate_at_entry'
                """))
                row = result.fetchone()
                if row and row[0] == 0:
                    logger.info("Adding labor_rate_at_entry column to time_entries...")
                    conn.execute(text("""
                        ALTER TABLE time_entries
                        ADD COLUMN labor_rate_at_entry FLOAT
                    """))
                    conn.commit()
                    logger.info("labor_rate_at_entry column added")

                # Check if fully_burdened_cost column exists
                result = conn.execute(text("""
                    SELECT COUNT(*) as cnt FROM pragma_table_info('time_entries')
                    WHERE name = 'fully_burdened_cost'
                """))
                row = result.fetchone()
                if row and row[0] == 0:
                    logger.info("Adding fully_burdened_cost column to time_entries...")
                    conn.execute(text("""
                        ALTER TABLE time_entries
                        ADD COLUMN fully_burdened_cost FLOAT
                    """))
                    conn.commit()
                    logger.info("fully_burdened_cost column added")

                # Check if import_source_id column exists
                result = conn.execute(text("""
                    SELECT COUNT(*) as cnt FROM pragma_table_info('time_entries')
                    WHERE name = 'import_source_id'
                """))
                row = result.fetchone()
                if row and row[0] == 0:
                    logger.info("Adding import_source_id column to time_entries...")
                    conn.execute(text("""
                        ALTER TABLE time_entries
                        ADD COLUMN import_source_id INTEGER REFERENCES labor_data_imports(id)
                    """))
                    conn.commit()
                    logger.info("import_source_id column added")

            logger.info("Schema updates complete!")

            # Create initial capitalization periods for the current year
            logger.info("Checking for initial period setup...")
            existing_periods = db.query(models.CapitalizationPeriod).first()

            if not existing_periods:
                logger.info("Creating initial capitalization periods for 2025...")
                current_year = 2025

                # Create monthly periods for 2025
                for month in range(1, 13):
                    # Calculate start and end dates
                    start_date = date(current_year, month, 1)
                    # Get last day of month using monthrange
                    _, last_day = monthrange(current_year, month)
                    end_date = date(current_year, month, last_day)

                    period = models.CapitalizationPeriod(
                        period_id=f"CAP-{current_year}-{month:02d}",
                        period_type="monthly",
                        year=current_year,
                        month=month,
                        start_date=start_date,
                        end_date=end_date,
                        status="open" if month >= datetime.now().month else "closed"
                    )
                    db.add(period)
                    logger.info(f"Created period: CAP-{current_year}-{month:02d}")

                # Create quarterly periods
                for quarter in range(1, 5):
                    start_month = (quarter - 1) * 3 + 1
                    end_month = quarter * 3
                    start_date = date(current_year, start_month, 1)
                    # Get last day of the quarter's last month
                    _, last_day = monthrange(current_year, end_month)
                    end_date = date(current_year, end_month, last_day)

                    period = models.CapitalizationPeriod(
                        period_id=f"CAP-{current_year}-Q{quarter}",
                        period_type="quarterly",
                        year=current_year,
                        quarter=quarter,
                        start_date=start_date,
                        end_date=end_date,
                        status="open"
                    )
                    db.add(period)
                    logger.info(f"Created period: CAP-{current_year}-Q{quarter}")

                # Create annual period
                annual_period = models.CapitalizationPeriod(
                    period_id=f"CAP-{current_year}-ANNUAL",
                    period_type="annual",
                    year=current_year,
                    start_date=date(current_year, 1, 1),
                    end_date=date(current_year, 12, 31),
                    status="open"
                )
                db.add(annual_period)
                logger.info(f"Created period: CAP-{current_year}-ANNUAL")

                db.commit()
                logger.info("Initial periods created!")
            else:
                logger.warning("Periods already exist. Skipping initial setup.")

            logger.info("=" * 60)
            logger.info("Capitalized Labor Admin tables setup complete!")
            logger.info("New tables created:")
            logger.info("- employee_labor_rates")
            logger.info("- labor_data_imports")
            logger.info("- capitalization_periods")
            logger.info("- employee_capitalization_summaries")
            logger.info("Time entries table updated with:")
            logger.info("- labor_rate_at_entry")
            logger.info("- fully_burdened_cost")
            logger.info("- import_source_id")

        except Exception as e:
            logger.error(f"Error during setup: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


if __name__ == "__main__":
    create_capitalized_labor_admin_tables()
