"""
Database Migration: Add recruiting lifecycle system
Adds custom_tags to employees, new columns to job_requisitions,
and creates requisition_lifecycle_stages, lifecycle_stage_notes,
lifecycle_stage_documents, and interview_compliance_tips tables.

Run this script to update the database schema:
    python -m app.db.migrations.add_recruiting_lifecycle
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine


def upgrade():
    """Add recruiting lifecycle tables and columns."""

    with engine.connect() as conn:
        # --- 1. Add custom_tags to employees ---
        result = conn.execute(text("PRAGMA table_info(employees)"))
        existing_cols = {row[1] for row in result}

        employee_migrations = [
            ("custom_tags", "ALTER TABLE employees ADD COLUMN custom_tags TEXT;"),
        ]
        for col_name, sql in employee_migrations:
            if col_name in existing_cols:
                print(f"  Skipped (already exists): employees.{col_name}")
            else:
                conn.execute(text(sql))
                conn.commit()
                print(f"  Added column: employees.{col_name}")

        # --- 2. Add new columns to job_requisitions ---
        result = conn.execute(text("PRAGMA table_info(job_requisitions)"))
        existing_cols = {row[1] for row in result}

        requisition_migrations = [
            ("posting_channels", "ALTER TABLE job_requisitions ADD COLUMN posting_channels TEXT;"),
            ("skills_tags", "ALTER TABLE job_requisitions ADD COLUMN skills_tags TEXT;"),
            ("urgency", "ALTER TABLE job_requisitions ADD COLUMN urgency VARCHAR;"),
            ("target_salary", "ALTER TABLE job_requisitions ADD COLUMN target_salary FLOAT;"),
            ("position_supervisor", "ALTER TABLE job_requisitions ADD COLUMN position_supervisor VARCHAR;"),
            ("visibility_user_ids", "ALTER TABLE job_requisitions ADD COLUMN visibility_user_ids TEXT;"),
            ("request_source", "ALTER TABLE job_requisitions ADD COLUMN request_source VARCHAR DEFAULT 'manual';"),
            ("requires_early_tech_screen", "ALTER TABLE job_requisitions ADD COLUMN requires_early_tech_screen BOOLEAN DEFAULT 0;"),
        ]
        for col_name, sql in requisition_migrations:
            if col_name in existing_cols:
                print(f"  Skipped (already exists): job_requisitions.{col_name}")
            else:
                conn.execute(text(sql))
                conn.commit()
                print(f"  Added column: job_requisitions.{col_name}")

        # Rename preferred_salary -> target_salary if needed
        if "preferred_salary" in existing_cols and "target_salary" not in existing_cols:
            conn.execute(text("ALTER TABLE job_requisitions RENAME COLUMN preferred_salary TO target_salary"))
            conn.commit()
            print("  Renamed column: job_requisitions.preferred_salary -> target_salary")

        # --- 3. Create requisition_lifecycle_stages table ---
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requisition_lifecycle_stages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requisition_id INTEGER NOT NULL REFERENCES job_requisitions(id),
                stage_key VARCHAR NOT NULL,
                stage_label VARCHAR NOT NULL,
                order_index INTEGER NOT NULL,
                status VARCHAR DEFAULT 'pending',
                entered_at DATETIME,
                completed_at DATETIME,
                completed_by INTEGER REFERENCES users(id),
                approval_status VARCHAR,
                approval_notes TEXT,
                outcome VARCHAR,
                outcome_notes TEXT,
                hr_representative_present BOOLEAN,
                hr_representative_id INTEGER REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """))
        conn.commit()
        print("  Created table: requisition_lifecycle_stages")

        # Create index
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_lifecycle_stage_requisition_order
            ON requisition_lifecycle_stages(requisition_id, order_index)
        """))
        conn.commit()

        # --- 4. Create lifecycle_stage_notes table ---
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lifecycle_stage_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lifecycle_stage_id INTEGER NOT NULL REFERENCES requisition_lifecycle_stages(id),
                author_id INTEGER NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                highlights TEXT,
                recommendation VARCHAR,
                recommendation_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """))
        conn.commit()
        print("  Created table: lifecycle_stage_notes")

        # --- 5. Create lifecycle_stage_documents table ---
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS lifecycle_stage_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lifecycle_stage_id INTEGER NOT NULL REFERENCES requisition_lifecycle_stages(id),
                uploaded_by INTEGER NOT NULL REFERENCES users(id),
                file_upload_id INTEGER REFERENCES file_uploads(id),
                filename VARCHAR NOT NULL,
                description VARCHAR,
                file_path VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
        print("  Created table: lifecycle_stage_documents")

        # --- 6. Create interview_compliance_tips table ---
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS interview_compliance_tips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                content TEXT NOT NULL,
                severity VARCHAR DEFAULT 'info',
                order_index INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
        print("  Created table: interview_compliance_tips")

        # --- 7. Seed default compliance tips ---
        result = conn.execute(text("SELECT COUNT(*) FROM interview_compliance_tips"))
        count = result.scalar()
        if count == 0:
            tips = [
                ("legal", "Avoid Illegal Questions", "Never ask about age, marital status, pregnancy, religion, national origin, disability, or genetic information. These are protected under federal law (Title VII, ADA, GINA).", "critical", 1),
                ("legal", "Protected Characteristics", "Do not ask questions that could reveal protected characteristics: race, color, religion, sex, national origin, age (40+), disability, or genetic information.", "critical", 2),
                ("legal", "ADA Accommodations", "You may ask if the candidate can perform the essential functions of the job with or without reasonable accommodation. Do not ask about the nature or severity of a disability.", "warning", 3),
                ("legal", "Citizenship Questions", "You may ask 'Are you authorized to work in the United States?' but never 'What country are you from?' or 'What is your native language?'", "critical", 4),
                ("bias", "Consistent Evaluation", "Ask all candidates the same core questions in the same order. Use a standardized scorecard to reduce unconscious bias and ensure fair comparison.", "warning", 5),
                ("bias", "Avoid Affinity Bias", "Be aware of the tendency to favor candidates who are similar to you. Focus on job-relevant qualifications and competencies, not personal similarities.", "info", 6),
                ("bias", "Halo/Horn Effect", "Don't let one strong (or weak) attribute overshadow the overall evaluation. Score each criterion independently based on evidence from the interview.", "info", 7),
                ("behavioral", "Use STAR Method", "Ask behavioral questions using the STAR format (Situation, Task, Action, Result). This elicits concrete examples rather than hypothetical answers.", "info", 8),
                ("behavioral", "Probe for Specifics", "When candidates give vague answers, probe with follow-up questions: 'Can you give me a specific example?' or 'What was your specific role in that?'", "info", 9),
                ("documentation", "Document Objectively", "Record specific, observable behaviors and statements. Avoid subjective language like 'seemed nervous' or 'felt like a good fit.' Use quotes when possible.", "warning", 10),
                ("documentation", "Take Notes During Interview", "Take brief notes during the interview and complete your scorecard immediately afterward while details are fresh. Delayed scoring leads to recall bias.", "info", 11),
                ("documentation", "Justify Your Recommendation", "Always provide specific reasons for your hire/no-hire recommendation tied to job requirements. 'Not a culture fit' is not sufficient justification.", "warning", 12),
                ("general", "Respect Candidate Time", "Start on time, stick to the scheduled duration, and allow time for the candidate's questions. A positive experience reflects well on the organization.", "info", 13),
                ("general", "Sell the Opportunity", "Remember that interviews are two-way. Share what makes the role and team great. Top candidates are evaluating you and the company too.", "info", 14),
                ("general", "Maintain Confidentiality", "Interview notes and candidate information are confidential. Do not discuss candidates with anyone outside the hiring committee.", "warning", 15),
            ]
            for category, title, content, severity, order_idx in tips:
                conn.execute(text(
                    "INSERT INTO interview_compliance_tips (category, title, content, severity, order_index) VALUES (:cat, :title, :content, :sev, :idx)"
                ), {"cat": category, "title": title, "content": content, "sev": severity, "idx": order_idx})
            conn.commit()
            print(f"  Seeded {len(tips)} compliance tips")
        else:
            print(f"  Skipped seeding compliance tips ({count} already exist)")


def downgrade():
    """Rollback the migration."""
    with engine.connect() as conn:
        tables = [
            "lifecycle_stage_documents",
            "lifecycle_stage_notes",
            "requisition_lifecycle_stages",
            "interview_compliance_tips",
        ]
        for table in tables:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                conn.commit()
                print(f"  Dropped table: {table}")
            except Exception as e:
                print(f"  Error dropping {table}: {e}")

        # Note: SQLite doesn't support DROP COLUMN easily, so new columns on
        # employees and job_requisitions are left in place on rollback.
        print("  Note: New columns on employees and job_requisitions are retained.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Recruiting Lifecycle Migration')
    parser.add_argument(
        '--rollback',
        action='store_true',
        help='Rollback the migration (drop new tables)'
    )

    args = parser.parse_args()

    if args.rollback:
        print("Rolling back migration...")
        downgrade()
        print("Migration rolled back successfully!")
    else:
        print("Running migration...")
        upgrade()
        print("Migration completed successfully!")
