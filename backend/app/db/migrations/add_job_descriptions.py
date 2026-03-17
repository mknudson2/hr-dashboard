"""
Database Migration: Add Job Description library
Creates job_descriptions table and adds job_description_id FK to job_requisitions.

Run: python -m app.db.migrations.add_job_descriptions
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine


def upgrade():
    """Create job_descriptions table and add FK column to job_requisitions."""

    with engine.connect() as conn:
        # --- 1. Create job_descriptions table ---
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job_descriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                position_title VARCHAR NOT NULL UNIQUE,
                description TEXT,
                requirements TEXT,
                preferred_qualifications TEXT,
                responsibilities TEXT,
                skills_tags TEXT,
                file_upload_id INTEGER REFERENCES file_uploads(id),
                status VARCHAR DEFAULT 'Active',
                created_by INTEGER REFERENCES users(id),
                approved_by INTEGER REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """))
        conn.commit()
        print("  Created table: job_descriptions")

        # Index on position_title
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_job_description_position_title
            ON job_descriptions(position_title)
        """))
        conn.commit()
        print("  Created index: ix_job_description_position_title")

        # --- 2. Add company_position column to job_descriptions ---
        try:
            result = conn.execute(text("PRAGMA table_info(job_descriptions)"))
            existing_cols = {row[1] for row in result}

            if "company_position" not in existing_cols:
                conn.execute(text(
                    "ALTER TABLE job_descriptions ADD COLUMN company_position VARCHAR;"
                ))
                conn.commit()
                print("  Added column: job_descriptions.company_position")
            else:
                print("  Skipped (already exists): job_descriptions.company_position")
        except Exception as e:
            print(f"  Skipped company_position column: {e}")
            conn.rollback()

        # --- 3. Add job_description_id FK to job_requisitions ---
        try:
            result = conn.execute(text("PRAGMA table_info(job_requisitions)"))
            existing_cols = {row[1] for row in result}

            if "job_description_id" not in existing_cols:
                conn.execute(text(
                    "ALTER TABLE job_requisitions ADD COLUMN job_description_id INTEGER REFERENCES job_descriptions(id);"
                ))
                conn.commit()
                print("  Added column: job_requisitions.job_description_id")
            else:
                print("  Skipped (already exists): job_requisitions.job_description_id")
        except Exception as e:
            print(f"  Skipped FK column (table may not exist yet): {e}")
            conn.rollback()


def downgrade():
    """Drop job_descriptions table. FK column left in place (SQLite limitation)."""
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS job_descriptions"))
        conn.commit()
        print("  Dropped table: job_descriptions")
        print("  Note: job_requisitions.job_description_id column retained (SQLite).")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Job Descriptions Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        print("Rolling back migration...")
        downgrade()
    else:
        print("Running migration...")
        upgrade()
    print("Done!")
