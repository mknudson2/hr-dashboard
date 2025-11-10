"""
Migration script to add bonus conditions support
Adds is_conditional field to bonuses table and creates bonus_conditions table
"""

from sqlalchemy import create_engine, Boolean, Integer, String, Date, Float, DateTime, ForeignKey, Column, text
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Get database path
DB_PATH = Path(__file__).parent.parent.parent / "hr_dashboard.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)


def migrate():
    """Add bonus conditions support"""
    print("Starting migration to add bonus conditions support...")

    db = SessionLocal()

    try:
        # Add is_conditional column to bonuses table
        print("\n1. Adding is_conditional column to bonuses table...")
        try:
            db.execute(text("""
                ALTER TABLE bonuses
                ADD COLUMN is_conditional BOOLEAN DEFAULT 0
            """))
            db.commit()
            print("   ✓ Added is_conditional column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("   - Column already exists, skipping")
                db.rollback()
            else:
                raise

        # Create bonus_conditions table
        print("\n2. Creating bonus_conditions table...")
        try:
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS bonus_conditions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bonus_id INTEGER NOT NULL,
                    condition_text TEXT NOT NULL,
                    is_completed BOOLEAN DEFAULT 0,
                    completion_date DATE,
                    completed_by TEXT,
                    target_value TEXT,
                    actual_value TEXT,
                    due_date DATE,
                    weight REAL,
                    notes TEXT,
                    display_order INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (bonus_id) REFERENCES bonuses (id)
                )
            """))
            db.commit()
            print("   ✓ Created bonus_conditions table")
        except Exception as e:
            print(f"   Error creating table: {e}")
            db.rollback()

        # Create index on bonus_id
        print("\n3. Creating index on bonus_id...")
        try:
            db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_bonus_conditions_bonus_id
                ON bonus_conditions (bonus_id)
            """))
            db.commit()
            print("   ✓ Created index on bonus_id")
        except Exception as e:
            print(f"   Error creating index: {e}")
            db.rollback()

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
