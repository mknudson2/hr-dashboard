"""
Database Migration: Add scorecard_analyses table
Creates the table for AI-generated scorecard synthesis results (Phase 3 §2.1).

Run: python -m app.db.migrations.add_scorecard_analysis_table
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine


def upgrade():
    """Create scorecard_analyses table."""

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scorecard_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id),
                scorecard_count INTEGER,
                consensus_strengths JSON,
                consensus_concerns JSON,
                disagreements JSON,
                red_flags JSON,
                overall_recommendation VARCHAR,
                confidence_level VARCHAR,
                summary TEXT,
                suggested_next_steps JSON,
                status VARCHAR DEFAULT 'Pending',
                error_message TEXT,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
        print("  Created table: scorecard_analyses")

        # Indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_scorecard_analysis_application_id
            ON scorecard_analyses(application_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_scorecard_analysis_status
            ON scorecard_analyses(status)
        """))
        conn.commit()
        print("  Created indexes on scorecard_analyses")


def downgrade():
    """Drop scorecard_analyses table."""
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS scorecard_analyses"))
        conn.commit()
        print("  Dropped table: scorecard_analyses")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Scorecard Analysis Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        print("Rolling back migration...")
        downgrade()
    else:
        print("Running migration...")
        upgrade()
    print("Done!")
