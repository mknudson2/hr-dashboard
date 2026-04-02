"""
Database Migration: Add allowed_portals field to User table
Controls which portals each user can access (hr, employee-portal).

Run this script to update the database schema:
    python -m app.db.migrations.add_allowed_portals
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine
import logging

logger = logging.getLogger(__name__)


def upgrade():
    """Add allowed_portals column and backfill based on existing roles."""

    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("PRAGMA table_info(users)"))
        existing_columns = {row[1] for row in result}

        if "allowed_portals" in existing_columns:
            logger.info("⊘ Skipped (already exists): allowed_portals")
        else:
            try:
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN allowed_portals TEXT DEFAULT '[\"employee-portal\"]';"
                ))
                conn.commit()
                logger.info("Added column: allowed_portals")
            except Exception as e:
                logger.error(f"Error adding allowed_portals: {e}")
                conn.rollback()
                return

        # Backfill: admin and manager users get both portals
        both_portals = json.dumps(["hr", "employee-portal"])
        employee_only = json.dumps(["employee-portal"])

        result = conn.execute(text("SELECT id, role, allowed_portals FROM users"))
        users = result.fetchall()

        for user_id, role, current_portals in users:
            if role in ("admin", "manager"):
                target = both_portals
            else:
                target = employee_only

            if current_portals != target:
                conn.execute(
                    text("UPDATE users SET allowed_portals = :portals WHERE id = :id"),
                    {"portals": target, "id": user_id}
                )

        conn.commit()
        logger.info(f"Backfilled allowed_portals for {len(users)} users")


if __name__ == "__main__":
    logger.info("Running migration: add_allowed_portals")
    logger.info("=" * 50)
    upgrade()
    logger.info("=" * 50)
    logger.info("Migration complete.")
