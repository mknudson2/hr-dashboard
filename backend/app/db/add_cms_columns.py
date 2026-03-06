#!/usr/bin/env python3
"""
Add CMS columns to hr_resources table.

Adds parent_id, description, and metadata_json columns to support
hierarchical content management (handbook chapters/sections, benefit categories/plans, etc.)

Usage:
    python -m app.db.add_cms_columns
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL


def add_cms_columns():
    """Add CMS-related columns to hr_resources table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        try:
            conn.execute(text("""
                ALTER TABLE hr_resources ADD COLUMN parent_id INTEGER REFERENCES hr_resources(id)
            """))
            print("Added parent_id column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("parent_id column already exists")
            else:
                print(f"Error adding parent_id: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE hr_resources ADD COLUMN description TEXT
            """))
            print("Added description column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("description column already exists")
            else:
                print(f"Error adding description: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE hr_resources ADD COLUMN metadata_json TEXT
            """))
            print("Added metadata_json column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("metadata_json column already exists")
            else:
                print(f"Error adding metadata_json: {e}")

        # Create index on parent_id for efficient hierarchy queries
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_hr_resources_parent_id ON hr_resources(parent_id)
            """))
            print("Created parent_id index")
        except Exception as e:
            print(f"Index note: {e}")

        conn.commit()
        print("\nCMS columns migration completed successfully!")


if __name__ == "__main__":
    add_cms_columns()
