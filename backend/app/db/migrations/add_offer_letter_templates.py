"""
Database Migration: Add Offer Letter Templates
Creates offer_letter_templates table and adds template FK columns to offer_letters.

Run: python -m app.db.migrations.add_offer_letter_templates
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text, inspect
from app.db.database import engine


def upgrade():
    """Create offer_letter_templates table and add FK columns to offer_letters."""

    with engine.connect() as conn:
        # --- 1. Create offer_letter_templates table ---
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS offer_letter_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id VARCHAR UNIQUE,
                name VARCHAR NOT NULL,
                description VARCHAR,
                html_content TEXT NOT NULL,
                predefined_placeholders JSON,
                fillable_placeholders JSON,
                is_active BOOLEAN DEFAULT 1,
                is_default BOOLEAN DEFAULT 0,
                created_by VARCHAR,
                last_modified_by VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """))
        conn.commit()
        print("  Created table: offer_letter_templates")

        # --- 2. Add FK columns to offer_letters ---
        inspector = inspect(engine)
        existing_cols = [c["name"] for c in inspector.get_columns("offer_letters")]

        if "offer_letter_template_id" not in existing_cols:
            conn.execute(text("""
                ALTER TABLE offer_letters
                ADD COLUMN offer_letter_template_id INTEGER REFERENCES offer_letter_templates(id)
            """))
            conn.commit()
            print("  Added column: offer_letters.offer_letter_template_id")
        else:
            print("  Column offer_letters.offer_letter_template_id already exists")

        if "email_template_id" not in existing_cols:
            conn.execute(text("""
                ALTER TABLE offer_letters
                ADD COLUMN email_template_id INTEGER REFERENCES custom_email_templates(id)
            """))
            conn.commit()
            print("  Added column: offer_letters.email_template_id")
        else:
            print("  Column offer_letters.email_template_id already exists")

        # --- 3. Create index on template_id ---
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_offer_letter_templates_template_id
            ON offer_letter_templates(template_id)
        """))
        conn.commit()
        print("  Created index: ix_offer_letter_templates_template_id")

    print("\nMigration complete: offer_letter_templates")


if __name__ == "__main__":
    upgrade()
