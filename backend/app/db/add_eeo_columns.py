"""
Add EEO (Equal Employment Opportunity) classification columns to employees table
"""
import logging
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

logger = logging.getLogger(__name__)

def add_eeo_columns():
    """Add EEO classification columns to employees table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    with engine.connect() as connection:
        # Add EEO columns
        columns_to_add = [
            ("eeo_job_category", "VARCHAR"),
            ("eeo_race_ethnicity", "VARCHAR"),
            ("eeo_gender", "VARCHAR"),
            ("eeo_veteran_status", "VARCHAR"),
            ("eeo_disability_status", "VARCHAR"),
        ]

        for column_name, column_type in columns_to_add:
            try:
                connection.execute(text(f"ALTER TABLE employees ADD COLUMN {column_name} {column_type}"))
                connection.commit()
                logger.info("Added column: %s", column_name)
            except Exception as e:
                if "duplicate column name" in str(e).lower():
                    logger.info("Column %s already exists, skipping", column_name)
                else:
                    logger.error("Error adding column %s: %s", column_name, e)

    logger.info("EEO columns migration completed successfully")

if __name__ == "__main__":
    add_eeo_columns()
