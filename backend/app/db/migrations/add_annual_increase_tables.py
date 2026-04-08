"""
Migration: Add Annual Wage Increase tables and is_annual_auto column.

Tables created:
- annual_increase_cycle_settings
- annual_increase_budget_areas
- annual_increase_entries

Column added:
- wage_increase_cycles.is_annual_auto (Boolean, default False)

Idempotent — safe to run multiple times.
"""

import sqlite3
import logging
import os

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "hr_dashboard.db")


def run_migration(db_path: str = DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # ----------------------------------------------------------------
    # 1. Add is_annual_auto column to wage_increase_cycles
    # ----------------------------------------------------------------
    cursor.execute("PRAGMA table_info(wage_increase_cycles)")
    columns = {row[1] for row in cursor.fetchall()}
    if "is_annual_auto" not in columns:
        cursor.execute(
            "ALTER TABLE wage_increase_cycles ADD COLUMN is_annual_auto BOOLEAN DEFAULT 0"
        )
        logger.info("Added is_annual_auto column to wage_increase_cycles")
    else:
        logger.info("is_annual_auto column already exists on wage_increase_cycles")

    # ----------------------------------------------------------------
    # 2. annual_increase_cycle_settings
    # ----------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS annual_increase_cycle_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cycle_id INTEGER NOT NULL UNIQUE REFERENCES wage_increase_cycles(id),
            lookback_date DATE NOT NULL,
            wage_matrix_exempt BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    """)
    logger.info("Ensured annual_increase_cycle_settings table exists")

    # ----------------------------------------------------------------
    # 3. annual_increase_budget_areas
    # ----------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS annual_increase_budget_areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cycle_id INTEGER NOT NULL REFERENCES wage_increase_cycles(id),
            decision_maker_employee_id VARCHAR REFERENCES employees(employee_id),
            area_label VARCHAR NOT NULL,
            title_level VARCHAR,
            eligible_count INTEGER DEFAULT 0,
            ineligible_count INTEGER DEFAULT 0,
            total_budget FLOAT DEFAULT 0.0,
            total_allocated FLOAT DEFAULT 0.0,
            is_dashboard_enabled BOOLEAN DEFAULT 0,
            submission_status VARCHAR DEFAULT 'draft',
            submitted_at TIMESTAMP,
            overage_justification TEXT,
            reviewed_by VARCHAR,
            reviewed_at TIMESTAMP,
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    """)

    # Unique index on (cycle_id, decision_maker_employee_id)
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_annual_budget_cycle_decision
        ON annual_increase_budget_areas(cycle_id, decision_maker_employee_id)
    """)

    # Index on cycle_id
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_annual_budget_cycle
        ON annual_increase_budget_areas(cycle_id)
    """)

    logger.info("Ensured annual_increase_budget_areas table exists")

    # ----------------------------------------------------------------
    # 4. annual_increase_entries
    # ----------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS annual_increase_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cycle_id INTEGER NOT NULL REFERENCES wage_increase_cycles(id),
            budget_area_id INTEGER NOT NULL REFERENCES annual_increase_budget_areas(id),
            employee_id VARCHAR NOT NULL REFERENCES employees(employee_id),
            is_eligible BOOLEAN DEFAULT 1,
            ineligibility_reason VARCHAR,
            eligibility_override BOOLEAN DEFAULT 0,
            override_justification TEXT,
            current_base_rate FLOAT DEFAULT 0.0,
            current_annual_wage FLOAT DEFAULT 0.0,
            wage_type VARCHAR,
            employment_type VARCHAR,
            position VARCHAR,
            supervisor_name VARCHAR,
            team VARCHAR,
            increase_percentage FLOAT DEFAULT 3.0,
            projected_base_rate FLOAT DEFAULT 0.0,
            projected_annual_wage FLOAT DEFAULT 0.0,
            total_difference FLOAT DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    """)

    # Unique index on (cycle_id, employee_id)
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_annual_entry_cycle_employee
        ON annual_increase_entries(cycle_id, employee_id)
    """)

    # Index on budget_area_id
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_annual_entry_budget_area
        ON annual_increase_entries(budget_area_id)
    """)

    # Index on cycle_id
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_annual_entry_cycle
        ON annual_increase_entries(cycle_id)
    """)

    logger.info("Ensured annual_increase_entries table exists")

    conn.commit()
    conn.close()
    logger.info("Annual increase migration complete")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migration()
