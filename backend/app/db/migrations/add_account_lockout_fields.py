"""
Database Migration: Add account lockout fields to User table
Adds support for tracking failed login attempts and account lockout

Run this script to update the database schema:
    python -m app.db.migrations.add_account_lockout_fields
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine


def upgrade():
    """Add account lockout columns to users table"""

    migrations = [
        # Add failed_login_attempts column
        ("failed_login_attempts", "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;"),

        # Add locked_until column
        ("locked_until", "ALTER TABLE users ADD COLUMN locked_until DATETIME;"),
    ]

    with engine.connect() as conn:
        # Check which columns already exist
        result = conn.execute(text("PRAGMA table_info(users)"))
        existing_columns = {row[1] for row in result}

        for column_name, migration_sql in migrations:
            if column_name in existing_columns:
                print(f"⊘ Skipped (already exists): {column_name}")
            else:
                try:
                    conn.execute(text(migration_sql))
                    conn.commit()
                    print(f"✓ Added column: {column_name}")
                except Exception as e:
                    print(f"✗ Error adding {column_name}: {e}")
                    conn.rollback()


def downgrade():
    """Remove the account lockout columns (rollback)"""

    rollbacks = [
        """
        ALTER TABLE users
        DROP COLUMN IF EXISTS failed_login_attempts;
        """,

        """
        ALTER TABLE users
        DROP COLUMN IF EXISTS locked_until;
        """,
    ]

    with engine.connect() as conn:
        for rollback in rollbacks:
            try:
                conn.execute(text(rollback))
                conn.commit()
                print(f"✓ Rolled back: {rollback.strip()[:50]}...")
            except Exception as e:
                print(f"✗ Error: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Account Lockout Fields Migration')
    parser.add_argument(
        '--rollback',
        action='store_true',
        help='Rollback the migration (remove new columns)'
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
