"""Add integration_configs table and seed defaults (Phase 3 §2.2)."""

import logging
from sqlalchemy import text
from app.db.database import engine

logger = logging.getLogger(__name__)

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS integration_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_type VARCHAR NOT NULL UNIQUE,
                display_name VARCHAR NOT NULL,
                description TEXT,
                is_enabled BOOLEAN DEFAULT 0,
                config JSON,
                status VARCHAR DEFAULT 'Not Configured',
                last_sync_at DATETIME,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """))

        # Seed default integrations (idempotent)
        for integration in [
            {
                "type": "ms_teams_calendar",
                "name": "Microsoft Teams Calendar",
                "desc": "Sync interview schedules with Microsoft Teams calendar for visibility across the organization.",
            },
            {
                "type": "ms_teams_notifications",
                "name": "Microsoft Teams Notifications",
                "desc": "Push recruiting notifications to Microsoft Teams channels and direct messages.",
            },
            {
                "type": "i9_portal",
                "name": "I-9 Employment Verification",
                "desc": "Integration with external I-9 verification portal for employment eligibility verification.",
            },
        ]:
            existing = conn.execute(text(
                "SELECT id FROM integration_configs WHERE integration_type = :t"
            ), {"t": integration["type"]}).fetchone()
            if not existing:
                conn.execute(text("""
                    INSERT INTO integration_configs (integration_type, display_name, description)
                    VALUES (:t, :n, :d)
                """), {"t": integration["type"], "n": integration["name"], "d": integration["desc"]})

        conn.commit()
        logger.info("Migration complete: integration_configs table with 3 seed rows")

if __name__ == "__main__":
    run_migration()
