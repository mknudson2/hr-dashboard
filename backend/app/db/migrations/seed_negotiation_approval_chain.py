"""Seed default negotiation approval chain (Phase 3 §2.3)."""

import logging
from sqlalchemy import text
from app.db.database import engine

logger = logging.getLogger(__name__)

def run_migration():
    with engine.connect() as conn:
        # Check if chain already exists
        result = conn.execute(text(
            "SELECT id FROM approval_chains WHERE chain_type = 'negotiation' AND is_default = 1 LIMIT 1"
        ))
        if result.fetchone():
            logger.info("Default negotiation approval chain already exists, skipping")
            return

        # Create the chain
        conn.execute(text("""
            INSERT INTO approval_chains (name, chain_type, description, is_active, is_default)
            VALUES ('Negotiation Approval', 'negotiation', 'SVP approval required for negotiated offers', 1, 1)
        """))

        # Get the chain ID
        result = conn.execute(text(
            "SELECT id FROM approval_chains WHERE chain_type = 'negotiation' AND is_default = 1 LIMIT 1"
        ))
        chain_id = result.fetchone()[0]

        # Add approval steps
        conn.execute(text("""
            INSERT INTO approval_steps (chain_id, order_index, approver_type, approver_role, is_required)
            VALUES (:chain_id, 1, 'role', 'svp_hr', 1)
        """), {"chain_id": chain_id})

        conn.execute(text("""
            INSERT INTO approval_steps (chain_id, order_index, approver_type, approver_role, is_required)
            VALUES (:chain_id, 2, 'department_head', NULL, 1)
        """), {"chain_id": chain_id})

        conn.commit()
        logger.info("Seeded default negotiation approval chain with 2 steps")

if __name__ == "__main__":
    run_migration()
