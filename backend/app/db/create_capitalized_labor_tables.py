#!/usr/bin/env python3
"""Create capitalized labor tracking tables"""

from datetime import date, timedelta, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import Base, engine, SQLALCHEMY_DATABASE_URL
from db import models
import logging

logger = logging.getLogger(__name__)


def create_capitalized_labor_tables():
    """Create capitalized labor tracking tables in the database"""
    logger.info("Creating capitalized labor tracking tables...")

    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Capitalized labor tables created successfully!")

        # Create session
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()

        try:
            # Check if we already have projects
            existing = db.query(models.Project).first()
            if existing:
                logger.warning("Projects already exist. Skipping sample data initialization.")
                return

            # Create sample data for testing
            logger.info("Creating sample data...")

            # Sample project 1: Software Development (capitalizable)
            project1 = models.Project(
                project_code="PROJ-2025-001",
                project_name="HR Dashboard Development",
                description="Development of comprehensive HR management dashboard system",
                is_capitalizable=True,
                capitalization_type="software_development",
                capitalization_start_date=date(2025, 1, 1),
                department="Engineering",
                cost_center="ENG-001",
                status="active",
                start_date=date(2025, 1, 1),
                total_budget=500000.00,
                labor_budget=350000.00,
                amortization_period_months=36
            )
            db.add(project1)

            # Sample project 2: Non-capitalizable project
            project2 = models.Project(
                project_code="PROJ-2025-002",
                project_name="General Maintenance & Support",
                description="Ongoing maintenance and support of existing systems",
                is_capitalizable=False,
                department="Engineering",
                cost_center="ENG-001",
                status="active",
                start_date=date(2025, 1, 1)
            )
            db.add(project2)

            # Sample project 3: Infrastructure (capitalizable)
            project3 = models.Project(
                project_code="PROJ-2025-003",
                project_name="Cloud Infrastructure Upgrade",
                description="Major cloud infrastructure upgrade and optimization",
                is_capitalizable=True,
                capitalization_type="asset_construction",
                capitalization_start_date=date(2025, 2, 1),
                department="IT Operations",
                cost_center="IT-001",
                status="active",
                start_date=date(2025, 2, 1),
                total_budget=200000.00,
                labor_budget=120000.00,
                amortization_period_months=60
            )
            db.add(project3)

            db.flush()

            # Create current pay period if none exists
            existing_period = db.query(models.PayPeriod).first()
            if not existing_period:
                # Create current pay period
                today = date.today()
                # Find the most recent Monday
                days_since_monday = today.weekday()
                period_start = today - timedelta(days=days_since_monday)
                period_end = period_start + timedelta(days=13)  # 2 weeks
                pay_date = period_end + timedelta(days=5)  # Friday after period end

                period = models.PayPeriod(
                    period_number=1,
                    year=today.year,
                    start_date=period_start,
                    end_date=period_end,
                    pay_date=pay_date,
                    status="open"
                )
                db.add(period)
                db.flush()
                logger.info(f"Created current pay period: {period_start} to {period_end}")

            db.commit()
            logger.info("Sample data created successfully!")
            logger.info("Created projects:")
            logger.info("1. HR Dashboard Development (Capitalizable)")
            logger.info("2. General Maintenance & Support (Non-capitalizable)")
            logger.info("3. Cloud Infrastructure Upgrade (Capitalizable)")

        except Exception as e:
            logger.error(f"Error creating sample data: {e}")
            db.rollback()
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


if __name__ == "__main__":
    create_capitalized_labor_tables()
