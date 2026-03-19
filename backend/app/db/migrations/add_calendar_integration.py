"""
Migration: Add calendar integration support.

Creates the calendar_connections table and adds calendar-related columns
to the interviews table.

Idempotent — safe to run multiple times.
"""

import logging
from sqlalchemy import inspect, Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func

logger = logging.getLogger(__name__)


def run_migration(engine):
    """Add calendar integration tables and columns."""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # --- 1. Create calendar_connections table ---
    if "calendar_connections" not in existing_tables:
        from sqlalchemy import MetaData, Table
        metadata = MetaData()

        Table(
            "calendar_connections", metadata,
            Column("id", Integer, primary_key=True, index=True, autoincrement=True),
            Column("user_id", Integer, ForeignKey("users.id"), unique=True, nullable=False),
            Column("provider", String, nullable=False),
            Column("access_token", Text, nullable=True),
            Column("refresh_token", Text, nullable=True),
            Column("token_expiry", DateTime, nullable=True),
            Column("calendar_email", String, nullable=True),
            Column("scopes", String, nullable=True),
            Column("is_active", Boolean, default=True),
            Column("last_sync_error", String, nullable=True),
            Column("created_at", DateTime, server_default=func.now()),
            Column("updated_at", DateTime, onupdate=func.now()),
        )

        metadata.create_all(engine)
        logger.info("Created calendar_connections table")

        # Add index
        with engine.connect() as conn:
            conn.execute(Index("ix_calendar_connection_user", "user_id").create(engine))
            conn.commit()
    else:
        logger.info("calendar_connections table already exists — skipping")

    # --- 2. Add columns to interviews table ---
    if "interviews" in existing_tables:
        existing_columns = [c["name"] for c in inspector.get_columns("interviews")]

        new_columns = {
            "calendar_event_id": "VARCHAR",
            "calendar_provider": "VARCHAR",
            "meeting_link_auto": "BOOLEAN DEFAULT 0",
            "ics_sent": "BOOLEAN DEFAULT 0",
        }

        with engine.connect() as conn:
            for col_name, col_type in new_columns.items():
                if col_name not in existing_columns:
                    conn.execute(
                        __import__("sqlalchemy").text(
                            f"ALTER TABLE interviews ADD COLUMN {col_name} {col_type}"
                        )
                    )
                    logger.info(f"Added column interviews.{col_name}")
                else:
                    logger.info(f"Column interviews.{col_name} already exists — skipping")
            conn.commit()

    logger.info("Calendar integration migration complete")
