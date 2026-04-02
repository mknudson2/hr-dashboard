"""Create events table for tracking HR events."""
import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create events table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    )
""")

logger.info("Created events table")

# Create event types reference table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_types (
        type_id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_name TEXT UNIQUE NOT NULL,
        category TEXT,
        default_duration_days INTEGER,
        default_reminder_days INTEGER,
        color_code TEXT,
        description TEXT
    )
""")

logger.info("Created event_types table")

# Insert default event types
event_types_data = [
    ("Performance Review", "HR Process", 1, 14, "#3B82F6", "Annual or quarterly performance review"),
    ("Open Enrollment", "Benefits", 30, 30, "#10B981", "Annual benefits enrollment period"),
    ("Bonus Distribution", "Compensation", 1, 7, "#F59E0B", "Quarterly or annual bonus payments"),
    ("Training Session", "Development", 1, 7, "#8B5CF6", "Employee training and development"),
    ("Company Meeting", "General", 1, 3, "#6366F1", "All-hands or department meetings"),
    ("Holiday", "Time Off", 1, 7, "#EF4444", "Company holidays"),
    ("Deadline", "Administrative", 1, 7, "#EC4899", "Important HR deadlines"),
    ("Interview", "Recruitment", 1, 1, "#14B8A6", "Candidate interviews"),
    ("Onboarding", "Recruitment", 3, 5, "#06B6D4", "New hire onboarding"),
    ("Exit Interview", "Offboarding", 1, 3, "#F97316", "Employee exit interviews"),
    ("Team Event", "Culture", 1, 7, "#A855F7", "Team building and social events"),
    ("Compliance", "Legal", 1, 14, "#DC2626", "Compliance deadlines and audits"),
]

for event_type in event_types_data:
    try:
        cursor.execute("""
            INSERT INTO event_types (type_name, category, default_duration_days, default_reminder_days, color_code, description)
            VALUES (?, ?, ?, ?, ?, ?)
        """, event_type)
        logger.info(f"- Added event type: {event_type[0]}")
    except sqlite3.IntegrityError:
        logger.info(f"- Event type already exists: {event_type[0]}")

# Commit changes
conn.commit()
conn.close()

logger.info(f"\n Events database schema created successfully!")
logger.info("- events table created")
logger.info("- event_types table created")
logger.info(f"- {len(event_types_data)} event types configured")
