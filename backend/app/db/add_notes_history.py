"""Add notes_history column to offboarding_tasks table"""
import logging
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

logger = logging.getLogger(__name__)


def add_notes_history_column():
    """Add notes_history JSON column to offboarding_tasks"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    with engine.connect() as connection:
        # Add notes_history column
        try:
            connection.execute(text("""
                ALTER TABLE offboarding_tasks
                ADD COLUMN notes_history TEXT
            """))
            connection.commit()
            logger.info("Added notes_history column to offboarding_tasks table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                logger.info("notes_history column already exists")
            else:
                raise e


if __name__ == "__main__":
    logger.info("Adding notes_history column to offboarding_tasks table...")
    add_notes_history_column()
    logger.info("Migration completed successfully!")
