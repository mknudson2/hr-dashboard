"""Add archived column to offboarding_tasks and archival_reason to task_details"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.database import SQLALCHEMY_DATABASE_URL


def add_archived_column():
    """Add archived column to offboarding_tasks"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    with engine.connect() as connection:
        # Add archived column (Boolean, default False)
        try:
            connection.execute(text("""
                ALTER TABLE offboarding_tasks
                ADD COLUMN archived INTEGER DEFAULT 0
            """))
            connection.commit()
            print("✅ Added 'archived' column to offboarding_tasks table")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("⚠️  'archived' column already exists")
            else:
                raise e


if __name__ == "__main__":
    print("Adding archived column to offboarding_tasks...")
    print("=" * 60)
    add_archived_column()
    print("✅ Migration completed!")
