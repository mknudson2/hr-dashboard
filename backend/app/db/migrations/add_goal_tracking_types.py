"""
Migration script to add enhanced goal tracking types.
Adds new columns to performance_goals table and creates new tables:
- goal_progress_entries
- goal_progress_attachments
- goal_milestones

Run this script to update an existing database.
"""

import sqlite3
import os
from datetime import datetime

# Path to the database - check multiple possible locations
def find_database():
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "hr_dashboard.db"),
        "/Users/michaelknudson/Desktop/hr-dashboard/backend/data/hr_dashboard.db",
        "/Users/michaelknudson/Desktop/hr-dashboard/backend/app/db/hr_dashboard.db",
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return possible_paths[0]  # Default to first path

DB_PATH = find_database()


def run_migration():
    print(f"Running migration on database: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print("Database file not found. Creating tables will happen on first app start.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Add new columns to performance_goals table
        print("Adding new columns to performance_goals table...")

        new_columns = [
            ("tracking_type", "VARCHAR(50) DEFAULT 'percentage'"),
            ("counter_current", "INTEGER DEFAULT 0"),
            ("counter_target", "INTEGER"),
            ("average_values", "JSON"),
            ("average_target", "REAL"),
            ("milestones_total", "INTEGER DEFAULT 0"),
            ("milestones_completed", "INTEGER DEFAULT 0"),
        ]

        for col_name, col_type in new_columns:
            try:
                cursor.execute(f"ALTER TABLE performance_goals ADD COLUMN {col_name} {col_type}")
                print(f"  Added column: {col_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  Column {col_name} already exists, skipping")
                else:
                    raise

        # Create goal_progress_entries table
        print("\nCreating goal_progress_entries table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS goal_progress_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_id INTEGER NOT NULL,
                entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by VARCHAR(255),
                progress_percentage REAL,
                value REAL,
                notes TEXT,
                previous_progress REAL,
                new_progress REAL,
                FOREIGN KEY (goal_id) REFERENCES performance_goals(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_progress_entries_goal_id ON goal_progress_entries(goal_id)")
        print("  Table created successfully")

        # Create goal_progress_attachments table
        print("\nCreating goal_progress_attachments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS goal_progress_attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                progress_entry_id INTEGER NOT NULL,
                file_upload_id INTEGER,
                attachment_type VARCHAR(50),
                file_name VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR(100),
                description VARCHAR(500),
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (progress_entry_id) REFERENCES goal_progress_entries(id) ON DELETE CASCADE,
                FOREIGN KEY (file_upload_id) REFERENCES file_uploads(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_progress_attachments_entry_id ON goal_progress_attachments(progress_entry_id)")
        print("  Table created successfully")

        # Create goal_milestones table
        print("\nCreating goal_milestones table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS goal_milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                sequence_order INTEGER DEFAULT 0,
                due_date DATE,
                completed_date DATE,
                status VARCHAR(50) DEFAULT 'pending',
                completed_by VARCHAR(255),
                completion_notes TEXT,
                weight REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (goal_id) REFERENCES performance_goals(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON goal_milestones(goal_id)")
        print("  Table created successfully")

        # Create storage directory for goal attachments
        attachments_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "goal_attachments")
        os.makedirs(attachments_dir, exist_ok=True)
        print(f"\nCreated attachments directory: {attachments_dir}")

        conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
