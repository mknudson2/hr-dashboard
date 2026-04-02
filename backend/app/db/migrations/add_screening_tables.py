"""
Migration: Add background screening tables for TazWorks integration.

Tables created:
- screening_orders: Tracks screening orders submitted via TazWorks
- screening_searches: Individual search components within an order
- screening_certifications: FCRA certification audit trail
- screening_attachments: Compliance documents and attachments
- screening_webhook_log: Incoming webhook event audit log

This migration is idempotent — safe to run multiple times.
"""

import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "data", "hr_dashboard.db"
)


def run_migration():
    """Create screening tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # screening_orders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS screening_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL,
            client_guid TEXT NOT NULL,
            applicant_guid TEXT NOT NULL UNIQUE,
            order_guid TEXT UNIQUE,
            product_guid TEXT NOT NULL,
            product_name TEXT,
            status TEXT NOT NULL DEFAULT 'initiated',
            decision TEXT,
            report_url TEXT,
            quickapp_link TEXT,
            ordered_by_user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            completed_at DATETIME
        )
    """)

    # Indexes for screening_orders
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_orders_candidate_id ON screening_orders (candidate_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_orders_order_guid ON screening_orders (order_guid)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_orders_status ON screening_orders (status)")

    # screening_searches
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS screening_searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES screening_orders(id),
            order_search_guid TEXT NOT NULL UNIQUE,
            search_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'processing',
            display_name TEXT,
            display_value TEXT,
            modified_date DATETIME
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_searches_order_id ON screening_searches (order_id)")

    # screening_certifications
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS screening_certifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES screening_orders(id),
            user_id INTEGER NOT NULL,
            certification_text_hash TEXT NOT NULL,
            certified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT NOT NULL,
            user_agent TEXT
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_certs_order_id ON screening_certifications (order_id)")

    # screening_attachments
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS screening_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES screening_orders(id),
            attachment_guid TEXT,
            doc_type TEXT NOT NULL,
            file_name TEXT,
            storage_path TEXT,
            content_type TEXT,
            retrieved_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_attach_order_id ON screening_attachments (order_id)")

    # screening_webhook_log
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS screening_webhook_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            order_guid TEXT,
            payload_hash TEXT NOT NULL UNIQUE,
            payload_json TEXT,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed BOOLEAN DEFAULT 0
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_screening_webhook_order_guid ON screening_webhook_log (order_guid)")

    conn.commit()
    conn.close()
    logger.info("Screening tables migration complete.")


if __name__ == "__main__":
    run_migration()
