"""
Database Migration: Unify applicant pipeline with requisition lifecycle.

- Adds lifecycle_stage_key to pipeline_stages (maps to RequisitionLifecycleStage.stage_key)
- Adds disposition_stage_id, withdrawn_at, withdrawn_reason to applications
- Renames/reorders default pipeline stages to align with lifecycle
- Adds "Offer Accepted" stage

Run: python -m app.db.migrations.unify_pipeline_lifecycle
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from sqlalchemy import text
from app.db.database import engine

logger = logging.getLogger(__name__)


def upgrade():
    """Unify applicant pipeline stages with requisition lifecycle."""

    with engine.connect() as conn:
        # --- 1. Add lifecycle_stage_key to pipeline_stages ---
        result = conn.execute(text("PRAGMA table_info(pipeline_stages)"))
        existing_cols = {row[1] for row in result}

        if "lifecycle_stage_key" not in existing_cols:
            conn.execute(text(
                "ALTER TABLE pipeline_stages ADD COLUMN lifecycle_stage_key VARCHAR;"
            ))
            conn.commit()
            logger.info("Added column: pipeline_stages.lifecycle_stage_key")
        else:
            logger.info("Skipped (already exists): pipeline_stages.lifecycle_stage_key")

        # --- 2. Add new columns to applications ---
        result = conn.execute(text("PRAGMA table_info(applications)"))
        existing_cols = {row[1] for row in result}

        app_migrations = [
            ("disposition_stage_id",
             "ALTER TABLE applications ADD COLUMN disposition_stage_id INTEGER REFERENCES pipeline_stages(id);"),
            ("withdrawn_at",
             "ALTER TABLE applications ADD COLUMN withdrawn_at DATETIME;"),
            ("withdrawn_reason",
             "ALTER TABLE applications ADD COLUMN withdrawn_reason VARCHAR;"),
        ]
        for col_name, sql in app_migrations:
            if col_name in existing_cols:
                logger.info(f"Skipped (already exists): applications.{col_name}")
            else:
                conn.execute(text(sql))
                conn.commit()
                logger.info(f"Added column: applications.{col_name}")

        # --- 3. Backfill disposition_stage_id for rejected applications ---
        result = conn.execute(text(
            "UPDATE applications SET disposition_stage_id = current_stage_id "
            "WHERE status = 'Rejected' AND disposition_stage_id IS NULL AND current_stage_id IS NOT NULL"
        ))
        conn.commit()
        logger.info(f"Backfilled disposition_stage_id for {result.rowcount} rejected applications")

        # --- 4. Update existing default pipeline stages ---
        # Check if pipeline_stages table exists and has data
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_stages'"
        ))
        if not result.fetchone():
            logger.warning("pipeline_stages table not found — skipping stage updates")
            return

        # Get the default template ID
        result = conn.execute(text(
            "SELECT id FROM pipeline_templates WHERE is_default = 1 LIMIT 1"
        ))
        row = result.fetchone()
        if not row:
            logger.warning("No default pipeline template found — skipping stage updates")
            return

        template_id = row[0]
        logger.info(f"Updating stages for default template (id={template_id})")

        # Update HR Screening Interview — set lifecycle key
        conn.execute(text(
            "UPDATE pipeline_stages SET lifecycle_stage_key = 'hr_interview' "
            "WHERE template_id = :tid AND name = 'HR Screening Interview'"
        ), {"tid": template_id})

        # Rename "Technical Interview" → "Tech Screen", set assessment type + lifecycle key
        conn.execute(text(
            "UPDATE pipeline_stages SET name = 'Tech Screen', stage_type = 'assessment', "
            "order_index = 4, lifecycle_stage_key = 'tech_screen', is_required = 0 "
            "WHERE template_id = :tid AND name = 'Technical Interview'"
        ), {"tid": template_id})

        # Rename "Team Interview" → "HM Interview", set lifecycle key
        conn.execute(text(
            "UPDATE pipeline_stages SET name = 'HM Interview', order_index = 3, "
            "lifecycle_stage_key = 'hiring_manager_interview' "
            "WHERE template_id = :tid AND name = 'Team Interview'"
        ), {"tid": template_id})

        # Rename "Offer" → "Offer Extended", set lifecycle key
        conn.execute(text(
            "UPDATE pipeline_stages SET name = 'Offer Extended', order_index = 5, "
            "lifecycle_stage_key = 'offer_extended' "
            "WHERE template_id = :tid AND name = 'Offer'"
        ), {"tid": template_id})

        # Soft-deprecate "Reference Check" — move to high order_index, mark optional
        conn.execute(text(
            "UPDATE pipeline_stages SET order_index = 99, is_required = 0 "
            "WHERE template_id = :tid AND name = 'Reference Check'"
        ), {"tid": template_id})

        # Add "Offer Accepted" stage if it doesn't exist
        result = conn.execute(text(
            "SELECT id FROM pipeline_stages WHERE template_id = :tid AND name = 'Offer Accepted'"
        ), {"tid": template_id})
        if not result.fetchone():
            conn.execute(text(
                "INSERT INTO pipeline_stages (template_id, name, stage_type, order_index, "
                "is_required, auto_advance, days_sla, lifecycle_stage_key) "
                "VALUES (:tid, 'Offer Accepted', 'offer_accepted', 6, 1, 0, 3, 'offer_response')"
            ), {"tid": template_id})
            logger.info("Added new stage: Offer Accepted")
        else:
            logger.info("Skipped (already exists): Offer Accepted stage")

        # Ensure Application Review has order_index=1
        conn.execute(text(
            "UPDATE pipeline_stages SET order_index = 1 "
            "WHERE template_id = :tid AND name = 'Application Review'"
        ), {"tid": template_id})

        # Ensure HR Screening Interview has order_index=2
        conn.execute(text(
            "UPDATE pipeline_stages SET order_index = 2 "
            "WHERE template_id = :tid AND name = 'HR Screening Interview'"
        ), {"tid": template_id})

        conn.commit()
        logger.info("Pipeline stages updated successfully")

        # Print final state
        result = conn.execute(text(
            "SELECT name, stage_type, order_index, is_required, lifecycle_stage_key "
            "FROM pipeline_stages WHERE template_id = :tid ORDER BY order_index"
        ), {"tid": template_id})
        logger.info("Final pipeline stages:")
        for row in result:
            logger.info(f"{row[2]}. {row[0]} ({row[1]}) → lifecycle:{row[4] or '—'} required:{row[3]}")


def downgrade():
    """Revert stage renames (best-effort)."""

    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT id FROM pipeline_templates WHERE is_default = 1 LIMIT 1"
        ))
        row = result.fetchone()
        if not row:
            return

        template_id = row[0]

        conn.execute(text(
            "UPDATE pipeline_stages SET name = 'Technical Interview', stage_type = 'interview', "
            "order_index = 3, lifecycle_stage_key = NULL, is_required = 1 "
            "WHERE template_id = :tid AND name = 'Tech Screen'"
        ), {"tid": template_id})

        conn.execute(text(
            "UPDATE pipeline_stages SET name = 'Team Interview', order_index = 4, "
            "lifecycle_stage_key = NULL "
            "WHERE template_id = :tid AND name = 'HM Interview'"
        ), {"tid": template_id})

        conn.execute(text(
            "UPDATE pipeline_stages SET name = 'Offer', order_index = 6, "
            "lifecycle_stage_key = NULL "
            "WHERE template_id = :tid AND name = 'Offer Extended'"
        ), {"tid": template_id})

        conn.execute(text(
            "UPDATE pipeline_stages SET order_index = 5, is_required = 0 "
            "WHERE template_id = :tid AND name = 'Reference Check'"
        ), {"tid": template_id})

        conn.execute(text(
            "UPDATE pipeline_stages SET lifecycle_stage_key = NULL "
            "WHERE template_id = :tid AND name = 'HR Screening Interview'"
        ), {"tid": template_id})

        # Delete Offer Accepted stage
        conn.execute(text(
            "DELETE FROM pipeline_stages WHERE template_id = :tid AND name = 'Offer Accepted'"
        ), {"tid": template_id})

        conn.commit()
        logger.info("Reverted pipeline stages to previous state")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Unify Pipeline Lifecycle Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        logger.info("Rolling back migration...")
        downgrade()
    else:
        logger.info("Running migration...")
        upgrade()
    logger.info("Done!")
