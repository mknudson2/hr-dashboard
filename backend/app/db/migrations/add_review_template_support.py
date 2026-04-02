"""
Database Migration: Add review template support columns

Adds:
- performance_reviews.template_id (FK to review_templates)
- performance_reviews.dynamic_ratings (JSON text)
- performance_reviews.dynamic_responses (JSON text)
- review_templates.text_fields (JSON text)
- review_cycles.template_id (FK to review_templates)

Run this script to update the database schema:
    python -m app.db.migrations.add_review_template_support
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
    """Add new columns for review template support"""

    migrations = [
        # PerformanceReview columns
        ("performance_reviews", "template_id",
         "ALTER TABLE performance_reviews ADD COLUMN template_id INTEGER REFERENCES review_templates(id);"),
        ("performance_reviews", "dynamic_ratings",
         "ALTER TABLE performance_reviews ADD COLUMN dynamic_ratings TEXT;"),
        ("performance_reviews", "dynamic_responses",
         "ALTER TABLE performance_reviews ADD COLUMN dynamic_responses TEXT;"),

        # ReviewTemplate columns
        ("review_templates", "text_fields",
         "ALTER TABLE review_templates ADD COLUMN text_fields TEXT;"),

        # ReviewCycle columns
        ("review_cycles", "template_id",
         "ALTER TABLE review_cycles ADD COLUMN template_id INTEGER REFERENCES review_templates(id);"),
    ]

    with engine.connect() as conn:
        for table_name, column_name, migration_sql in migrations:
            # Check if column already exists
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            existing_columns = {row[1] for row in result}

            if column_name in existing_columns:
                logger.info(f"⊘ Skipped (already exists): {table_name}.{column_name}")
            else:
                try:
                    conn.execute(text(migration_sql))
                    conn.commit()
                    logger.info(f"Added column: {table_name}.{column_name}")
                except Exception as e:
                    logger.error(f"Error adding {table_name}.{column_name}: {e}")
                    conn.rollback()


def downgrade():
    """Remove the new columns (rollback)"""

    rollbacks = [
        "ALTER TABLE performance_reviews DROP COLUMN IF EXISTS template_id;",
        "ALTER TABLE performance_reviews DROP COLUMN IF EXISTS dynamic_ratings;",
        "ALTER TABLE performance_reviews DROP COLUMN IF EXISTS dynamic_responses;",
        "ALTER TABLE review_templates DROP COLUMN IF EXISTS text_fields;",
        "ALTER TABLE review_cycles DROP COLUMN IF EXISTS template_id;",
    ]

    with engine.connect() as conn:
        for rollback in rollbacks:
            try:
                conn.execute(text(rollback))
                conn.commit()
                logger.info(f"Rolled back: {rollback.strip()[:60]}...")
            except Exception as e:
                logger.error(f"Error: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Review Template Support Migration')
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
