"""
Migration: ATS Phase 0 — Architecture & Scaffolding.

New tables:
- scorecard_templates: Reusable scorecard templates for pipeline stages
- requisition_stakeholders: Formalized stakeholder access roles on requisitions
- applicant_messages: Bidirectional messaging between applicant and HR/HM
- approval_chains: Configurable approval chain definitions
- approval_steps: Individual steps in approval chains
- approval_requests: Approval request instances
- interviewer_availability: Self-scheduling time slots

Column additions:
- applicants: open_to_other_roles, pool_opted_in_at
- applications: sourced_from_application_id, negotiation_round
- offer_letters: version, version_notes, previous_offer_id
- pipeline_stages: scorecard_template_id

Backfill:
- Insert candidate_selection lifecycle stage for existing requisitions

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


def _column_exists(cursor, table, column):
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def _table_exists(cursor, table):
    """Check if a table exists."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def run_migration():
    """Run all ATS Phase 0 schema changes."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ===== Section 1: New standalone tables =====

    # scorecard_templates
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scorecard_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            template_type TEXT NOT NULL DEFAULT 'hm',
            sections TEXT NOT NULL,
            recommendation_options TEXT,
            red_flags TEXT,
            suggested_questions TEXT,
            is_active INTEGER DEFAULT 1,
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )
    """)
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_scorecard_templates_template_id ON scorecard_templates (template_id)")

    # approval_chains
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_chains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            chain_type TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            is_default INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )
    """)

    # approval_steps
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chain_id INTEGER NOT NULL REFERENCES approval_chains(id),
            order_index INTEGER NOT NULL,
            approver_type TEXT NOT NULL,
            approver_user_id INTEGER REFERENCES users(id),
            approver_role TEXT,
            is_required INTEGER DEFAULT 1,
            timeout_hours INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_approval_step_chain_order ON approval_steps (chain_id, order_index)")

    # ===== Section 2: Tables with FKs to existing tables =====

    # requisition_stakeholders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS requisition_stakeholders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requisition_id INTEGER NOT NULL REFERENCES job_requisitions(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            role TEXT NOT NULL,
            assigned_by INTEGER REFERENCES users(id),
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    """)
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_stakeholder_unique ON requisition_stakeholders (requisition_id, user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_stakeholder_req ON requisition_stakeholders (requisition_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_stakeholder_user ON requisition_stakeholders (user_id)")

    # applicant_messages
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS applicant_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE NOT NULL,
            application_id INTEGER NOT NULL REFERENCES applications(id),
            thread_id TEXT NOT NULL,
            parent_message_id INTEGER REFERENCES applicant_messages(id),
            sender_type TEXT NOT NULL,
            sender_applicant_id INTEGER REFERENCES applicants(id),
            sender_user_id INTEGER REFERENCES users(id),
            subject TEXT,
            body TEXT NOT NULL,
            body_html TEXT,
            is_internal INTEGER DEFAULT 0,
            is_read INTEGER DEFAULT 0,
            read_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_message_id ON applicant_messages (message_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_message_thread ON applicant_messages (thread_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_message_application ON applicant_messages (application_id)")

    # approval_requests
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_type TEXT NOT NULL,
            resource_id INTEGER NOT NULL,
            chain_id INTEGER NOT NULL REFERENCES approval_chains(id),
            current_step_id INTEGER NOT NULL REFERENCES approval_steps(id),
            status TEXT DEFAULT 'Pending',
            requested_by INTEGER REFERENCES users(id),
            acted_by INTEGER REFERENCES users(id),
            acted_at DATETIME,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_approval_resource ON approval_requests (resource_type, resource_id)")

    # interviewer_availability
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interviewer_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            time_zone TEXT,
            slot_duration_minutes INTEGER DEFAULT 60,
            is_booked INTEGER DEFAULT 0,
            booked_interview_id INTEGER REFERENCES interviews(id),
            requisition_id INTEGER REFERENCES job_requisitions(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_availability_user_time ON interviewer_availability (user_id, start_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_availability_req ON interviewer_availability (requisition_id)")

    # ===== Section 3: ALTER existing tables =====

    # applicants: add cross-role consideration columns
    if not _column_exists(cursor, "applicants", "open_to_other_roles"):
        cursor.execute("ALTER TABLE applicants ADD COLUMN open_to_other_roles INTEGER DEFAULT 0")
    if not _column_exists(cursor, "applicants", "pool_opted_in_at"):
        cursor.execute("ALTER TABLE applicants ADD COLUMN pool_opted_in_at DATETIME")

    # applications: add cross-role sourcing + negotiation round
    if not _column_exists(cursor, "applications", "sourced_from_application_id"):
        cursor.execute("ALTER TABLE applications ADD COLUMN sourced_from_application_id INTEGER REFERENCES applications(id)")
    if not _column_exists(cursor, "applications", "negotiation_round"):
        cursor.execute("ALTER TABLE applications ADD COLUMN negotiation_round INTEGER DEFAULT 0")

    # offer_letters: add versioning columns
    if not _column_exists(cursor, "offer_letters", "version"):
        cursor.execute("ALTER TABLE offer_letters ADD COLUMN version INTEGER DEFAULT 1")
    if not _column_exists(cursor, "offer_letters", "version_notes"):
        cursor.execute("ALTER TABLE offer_letters ADD COLUMN version_notes TEXT")
    if not _column_exists(cursor, "offer_letters", "previous_offer_id"):
        cursor.execute("ALTER TABLE offer_letters ADD COLUMN previous_offer_id INTEGER REFERENCES offer_letters(id)")

    # pipeline_stages: add scorecard_template_id
    if not _column_exists(cursor, "pipeline_stages", "scorecard_template_id"):
        cursor.execute("ALTER TABLE pipeline_stages ADD COLUMN scorecard_template_id INTEGER REFERENCES scorecard_templates(id)")

    # ===== Section 4: Backfill candidate_selection lifecycle stage =====

    if _table_exists(cursor, "requisition_lifecycle_stages"):
        # Check if any requisition already has candidate_selection
        cursor.execute("""
            SELECT COUNT(*) FROM requisition_lifecycle_stages
            WHERE stage_key = 'candidate_selection'
        """)
        has_candidate_selection = cursor.fetchone()[0] > 0

        if not has_candidate_selection:
            # Shift all stages with order_index >= 5 up by 1
            cursor.execute("""
                UPDATE requisition_lifecycle_stages
                SET order_index = order_index + 1
                WHERE order_index >= 5
            """)

            # Insert candidate_selection for each existing requisition
            cursor.execute("""
                SELECT DISTINCT requisition_id FROM requisition_lifecycle_stages
            """)
            req_ids = [row[0] for row in cursor.fetchall()]

            for req_id in req_ids:
                cursor.execute("""
                    INSERT INTO requisition_lifecycle_stages
                    (requisition_id, stage_key, stage_label, order_index, status)
                    VALUES (?, 'candidate_selection', 'Candidate Selection', 5, 'pending')
                """, (req_id,))

            logger.info(f"Backfilled candidate_selection stage for {len(req_ids)} requisitions")

    conn.commit()
    conn.close()
    logger.info("ATS Phase 0 migration completed successfully.")


if __name__ == "__main__":
    run_migration()
