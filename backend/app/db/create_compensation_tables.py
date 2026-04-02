"""
Create all compensation-related tables
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.db.models import Base, Bonus, BonusCondition, EquityGrant, CompensationReview, WageIncreaseCycle
import logging

logger = logging.getLogger(__name__)

# Get database path
DB_PATH = Path(__file__).parent.parent.parent / "hr_dashboard.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

logger.info(f"Database path: {DB_PATH}")
logger.info(f"Database URL: {DATABASE_URL}")

# Create engine
engine = create_engine(DATABASE_URL, echo=True)


def create_tables():
    """Create all compensation tables"""
    logger.info("Creating compensation tables...")

    try:
        # Create all tables defined in Base metadata
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("All compensation tables created successfully!")

    except Exception as e:
        logger.error(f"\n Failed to create tables: {e}")
        raise


if __name__ == "__main__":
    create_tables()
