import sqlite3
import os

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

print(f"Migrating database at: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Migrate events table
    print("\n1. Migrating events table...")

    # Check if the new schema already exists
    cursor.execute("PRAGMA table_info(events)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'id' not in columns:
        print("   Creating new events table with updated schema...")

        # Create new table
        cursor.execute("""
            CREATE TABLE events_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE,
                title TEXT NOT NULL,
                description TEXT,
                event_type TEXT NOT NULL,
                category TEXT,
                start_date DATE NOT NULL,
                end_date DATE,
                is_recurring BOOLEAN DEFAULT 0,
                recurrence_pattern TEXT,
                recurrence_end_date DATE,
                status TEXT DEFAULT 'scheduled',
                location TEXT,
                organizer TEXT,
                participants TEXT,
                employee_id INTEGER,
                department TEXT,
                reminder_days INTEGER,
                priority TEXT DEFAULT 'medium',
                notes TEXT,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
            )
        """)

        # Copy data from old table, converting old event_id to both id and event_id
        cursor.execute("""
            INSERT INTO events_new (
                id, event_id, title, description, event_type, category,
                start_date, end_date, is_recurring, recurrence_pattern, recurrence_end_date,
                status, location, organizer, participants, employee_id, department,
                reminder_days, priority, notes, tags, created_at, updated_at
            )
            SELECT
                event_id as id,
                'EVT-' || CAST(event_id AS TEXT) as event_id,
                title, description, event_type, category,
                start_date, end_date, is_recurring, recurrence_pattern, recurrence_end_date,
                status, location, organizer, participants, employee_id, department,
                reminder_days, priority, notes, tags, created_at, updated_at
            FROM events
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE events")
        cursor.execute("ALTER TABLE events_new RENAME TO events")

        print("   ✓ Events table migrated successfully")
    else:
        print("   Events table already has 'id' column, skipping...")

    # Migrate event_types table
    print("\n2. Migrating event_types table...")

    cursor.execute("PRAGMA table_info(event_types)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'id' not in columns:
        print("   Creating new event_types table with updated schema...")

        # Create new table
        cursor.execute("""
            CREATE TABLE event_types_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type_id TEXT UNIQUE,
                type_name TEXT UNIQUE NOT NULL,
                category TEXT,
                default_duration_days INTEGER,
                default_reminder_days INTEGER,
                color_code TEXT,
                description TEXT
            )
        """)

        # Copy data from old table
        cursor.execute("""
            INSERT INTO event_types_new (
                id, type_id, type_name, category,
                default_duration_days, default_reminder_days,
                color_code, description
            )
            SELECT
                type_id as id,
                'TYPE-' || CAST(type_id AS TEXT) as type_id,
                type_name, category,
                default_duration_days, default_reminder_days,
                color_code, description
            FROM event_types
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE event_types")
        cursor.execute("ALTER TABLE event_types_new RENAME TO event_types")

        print("   ✓ Event_types table migrated successfully")
    else:
        print("   Event_types table already has 'id' column, skipping...")

    # Commit changes
    conn.commit()
    print("\n✅ Migration completed successfully!")

except Exception as e:
    conn.rollback()
    print(f"\n❌ Migration failed: {e}")
    raise

finally:
    conn.close()
