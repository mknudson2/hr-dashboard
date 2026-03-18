"""
Script to create PIP-related tables (notes, milestones, audit, documents)
"""
import sqlite3
import os

# Get the database path
DB_PATH = os.path.join(os.path.dirname(__file__), "hr_dashboard.db")

def create_pip_tables():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create pip_notes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pip_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pip_id INTEGER NOT NULL,
            note_text TEXT NOT NULL,
            note_type TEXT DEFAULT 'General',
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pip_id) REFERENCES performance_improvement_plans(id)
        )
    """)

    # Create pip_milestones table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pip_milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pip_id INTEGER NOT NULL,
            milestone_title TEXT NOT NULL,
            description TEXT,
            due_date DATE NOT NULL,
            status TEXT DEFAULT 'Pending',
            completed_date DATE,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY (pip_id) REFERENCES performance_improvement_plans(id)
        )
    """)

    # Create pip_audit_trail table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pip_audit_trail (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pip_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            field_changed TEXT,
            old_value TEXT,
            new_value TEXT,
            changed_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pip_id) REFERENCES performance_improvement_plans(id)
        )
    """)

    # Create pip_documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pip_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pip_id INTEGER NOT NULL,
            document_name TEXT NOT NULL,
            document_type TEXT DEFAULT 'Supporting Document',
            file_path TEXT NOT NULL,
            file_size INTEGER,
            uploaded_by TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pip_id) REFERENCES performance_improvement_plans(id)
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_pip_notes_pip_id ON pip_notes(pip_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_pip_milestones_pip_id ON pip_milestones(pip_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_pip_audit_trail_pip_id ON pip_audit_trail(pip_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_pip_documents_pip_id ON pip_documents(pip_id)")

    conn.commit()
    conn.close()
    print("PIP tables created successfully!")

if __name__ == "__main__":
    create_pip_tables()
