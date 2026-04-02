"""
Database Migration: Add new fields to FileUpload table
Adds support for file categories, parsing metadata, and processing logs

Run this script to update the database schema:
    python -m app.db.migrations.add_file_upload_fields
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from sqlalchemy import text
from app.db.database import engine

logger = logging.getLogger(__name__)


def upgrade():
    """Add new columns to file_uploads table"""

    migrations = [
        # Add file_category column
        ("file_category", "ALTER TABLE file_uploads ADD COLUMN file_category VARCHAR(100);"),

        # Add detected_columns column (JSON/TEXT)
        ("detected_columns", "ALTER TABLE file_uploads ADD COLUMN detected_columns TEXT;"),

        # Add row_count column
        ("row_count", "ALTER TABLE file_uploads ADD COLUMN row_count INTEGER;"),

        # Add processing_logs column (JSON/TEXT)
        ("processing_logs", "ALTER TABLE file_uploads ADD COLUMN processing_logs TEXT;"),
    ]

    with engine.connect() as conn:
        # Check which columns already exist
        result = conn.execute(text("PRAGMA table_info(file_uploads)"))
        existing_columns = {row[1] for row in result}

        for column_name, migration_sql in migrations:
            if column_name in existing_columns:
                logger.info(f"⊘ Skipped (already exists): {column_name}")
            else:
                try:
                    conn.execute(text(migration_sql))
                    conn.commit()
                    logger.info(f"Added column: {column_name}")
                except Exception as e:
                    logger.error(f"Error adding {column_name}: {e}")
                    conn.rollback()


def downgrade():
    """Remove the new columns (rollback)"""

    rollbacks = [
        """
        ALTER TABLE file_uploads
        DROP COLUMN IF EXISTS file_category;
        """,

        """
        ALTER TABLE file_uploads
        DROP COLUMN IF EXISTS detected_columns;
        """,

        """
        ALTER TABLE file_uploads
        DROP COLUMN IF EXISTS row_count;
        """,

        """
        ALTER TABLE file_uploads
        DROP COLUMN IF EXISTS processing_logs;
        """,
    ]

    with engine.connect() as conn:
        for rollback in rollbacks:
            try:
                conn.execute(text(rollback))
                conn.commit()
                logger.info(f"Rolled back: {rollback.strip()[:50]}...")
            except Exception as e:
                logger.error(f"Error: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='File Upload Fields Migration')
    parser.add_argument(
        '--rollback',
        action='store_true',
        help='Rollback the migration (remove new columns)'
    )

    args = parser.parse_args()

    if args.rollback:
        logger.info("Rolling back migration...")
        downgrade()
        logger.info("Migration rolled back successfully!")
    else:
        logger.info("Running migration...")
        upgrade()
        logger.info("Migration completed successfully!")
