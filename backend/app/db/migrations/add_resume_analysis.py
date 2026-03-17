"""
Database Migration: Add resume_analyses table
Creates the table for AI-generated resume analysis results.

Run: python -m app.db.migrations.add_resume_analysis
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine


def upgrade():
    """Create resume_analyses table."""

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS resume_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id),
                overall_score FLOAT,
                skills_match_score FLOAT,
                experience_match_score FLOAT,
                education_match_score FLOAT,
                strengths TEXT,
                weaknesses TEXT,
                red_flags TEXT,
                suggested_questions TEXT,
                summary TEXT,
                threshold_score FLOAT DEFAULT 70.0,
                threshold_label VARCHAR,
                status VARCHAR DEFAULT 'Pending',
                error_message TEXT,
                resume_text_length INTEGER,
                job_description_length INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )
        """))
        conn.commit()
        print("  Created table: resume_analyses")

        # Indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_resume_analysis_application_id
            ON resume_analyses(application_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_resume_analysis_status
            ON resume_analyses(status)
        """))
        conn.commit()
        print("  Created indexes on resume_analyses")


def downgrade():
    """Drop resume_analyses table."""
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS resume_analyses"))
        conn.commit()
        print("  Dropped table: resume_analyses")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Resume Analysis Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        print("Rolling back migration...")
        downgrade()
    else:
        print("Running migration...")
        upgrade()
    print("Done!")
