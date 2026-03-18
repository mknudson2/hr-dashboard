"""Populate sample events data for testing."""
import sqlite3
import os
from datetime import datetime, timedelta
import random

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get some sample employee IDs and departments
cursor.execute("SELECT employee_id, department FROM employees WHERE status = 'Active' LIMIT 20")
employees = cursor.fetchall()

print(f"Found {len(employees)} employees for event assignment...")

# Sample event templates
today = datetime.now().date()

events_to_create = [
    # Performance Reviews - Q1 2026
    {
        "title": "Q1 2026 Performance Reviews",
        "description": "Quarterly performance review cycle for all departments",
        "event_type": "Performance Review",
        "category": "HR Process",
        "start_date": today + timedelta(days=15),
        "end_date": today + timedelta(days=30),
        "is_recurring": True,
        "recurrence_pattern": "Quarterly",
        "status": "scheduled",
        "organizer": "HR Department",
        "reminder_days": 14,
        "priority": "high",
        "notes": "All managers must complete reviews by end date"
    },
    # Annual Benefits Open Enrollment
    {
        "title": "2026 Benefits Open Enrollment",
        "description": "Annual benefits enrollment period for medical, dental, vision, and retirement plans",
        "event_type": "Open Enrollment",
        "category": "Benefits",
        "start_date": today + timedelta(days=45),
        "end_date": today + timedelta(days=75),
        "is_recurring": True,
        "recurrence_pattern": "Yearly",
        "status": "scheduled",
        "organizer": "Benefits Team",
        "reminder_days": 30,
        "priority": "critical",
        "notes": "Benefits information sessions scheduled throughout enrollment period"
    },
    # Q1 Bonus Distribution
    {
        "title": "Q4 2025 Bonus Payments",
        "description": "Distribution of Q4 performance bonuses",
        "event_type": "Bonus Distribution",
        "category": "Compensation",
        "start_date": today + timedelta(days=7),
        "end_date": today + timedelta(days=7),
        "is_recurring": True,
        "recurrence_pattern": "Quarterly",
        "status": "scheduled",
        "organizer": "Payroll Department",
        "reminder_days": 7,
        "priority": "high",
        "notes": "Bonuses will be distributed with regular payroll"
    },
    # Training Sessions
    {
        "title": "Leadership Development Training",
        "description": "Management skills workshop for team leads and supervisors",
        "event_type": "Training Session",
        "category": "Development",
        "start_date": today + timedelta(days=20),
        "end_date": today + timedelta(days=20),
        "is_recurring": False,
        "status": "scheduled",
        "location": "Conference Room A",
        "organizer": "L&D Team",
        "reminder_days": 7,
        "priority": "medium",
        "notes": "8:00 AM - 5:00 PM. Lunch provided."
    },
    {
        "title": "Compliance Training - Anti-Harassment",
        "description": "Required annual harassment prevention training for all employees",
        "event_type": "Training Session",
        "category": "Compliance",
        "start_date": today + timedelta(days=10),
        "end_date": today + timedelta(days=25),
        "is_recurring": True,
        "recurrence_pattern": "Yearly",
        "status": "scheduled",
        "organizer": "Compliance Officer",
        "reminder_days": 14,
        "priority": "critical",
        "notes": "Online training module - all employees must complete"
    },
    # Company Meetings
    {
        "title": "All-Hands Town Hall",
        "description": "Quarterly company-wide meeting with CEO and leadership team",
        "event_type": "Company Meeting",
        "category": "General",
        "start_date": today + timedelta(days=5),
        "end_date": today + timedelta(days=5),
        "is_recurring": True,
        "recurrence_pattern": "Quarterly",
        "status": "scheduled",
        "location": "Main Auditorium / Virtual",
        "organizer": "Executive Team",
        "reminder_days": 3,
        "priority": "high",
        "notes": "Q&A session to follow presentation"
    },
    # Holidays
    {
        "title": "Memorial Day",
        "description": "Company holiday - office closed",
        "event_type": "Holiday",
        "category": "Time Off",
        "start_date": datetime(2026, 5, 25).date(),
        "end_date": datetime(2026, 5, 25).date(),
        "is_recurring": True,
        "recurrence_pattern": "Yearly",
        "status": "scheduled",
        "reminder_days": 7,
        "priority": "medium",
        "notes": "Paid holiday for all full-time employees"
    },
    {
        "title": "Independence Day",
        "description": "Company holiday - office closed",
        "event_type": "Holiday",
        "category": "Time Off",
        "start_date": datetime(2026, 7, 3).date(),
        "end_date": datetime(2026, 7, 3).date(),
        "is_recurring": True,
        "recurrence_pattern": "Yearly",
        "status": "scheduled",
        "reminder_days": 7,
        "priority": "medium",
        "notes": "Paid holiday for all full-time employees (observed)"
    },
    # Compliance Deadlines
    {
        "title": "EEO-1 Report Due",
        "description": "Annual EEO-1 Component 1 filing deadline",
        "event_type": "Compliance",
        "category": "Legal",
        "start_date": datetime(2026, 5, 31).date(),
        "end_date": datetime(2026, 5, 31).date(),
        "is_recurring": True,
        "recurrence_pattern": "Yearly",
        "status": "scheduled",
        "organizer": "HR Compliance",
        "reminder_days": 30,
        "priority": "critical",
        "notes": "Federal reporting requirement"
    },
    {
        "title": "I-9 Audit",
        "description": "Quarterly internal I-9 audit",
        "event_type": "Compliance",
        "category": "Legal",
        "start_date": today + timedelta(days=30),
        "end_date": today + timedelta(days=35),
        "is_recurring": True,
        "recurrence_pattern": "Quarterly",
        "status": "scheduled",
        "organizer": "HR Compliance",
        "reminder_days": 14,
        "priority": "high",
        "notes": "Review all I-9 forms for completeness and accuracy"
    },
    # Team Events
    {
        "title": "Engineering Team Offsite",
        "description": "Engineering department quarterly team building event",
        "event_type": "Team Event",
        "category": "Culture",
        "start_date": today + timedelta(days=40),
        "end_date": today + timedelta(days=41),
        "is_recurring": True,
        "recurrence_pattern": "Quarterly",
        "status": "scheduled",
        "location": "Lake Resort",
        "organizer": "Engineering Manager",
        "department": "Engineering",
        "reminder_days": 14,
        "priority": "medium",
        "notes": "Transportation provided. RSVP by 2 weeks prior."
    },
    {
        "title": "Company Summer Picnic",
        "description": "Annual summer celebration for all employees and families",
        "event_type": "Team Event",
        "category": "Culture",
        "start_date": datetime(2026, 7, 11).date(),
        "end_date": datetime(2026, 7, 11).date(),
        "is_recurring": True,
        "recurrence_pattern": "Yearly",
        "status": "scheduled",
        "location": "City Park Pavilion",
        "organizer": "Culture Committee",
        "reminder_days": 21,
        "priority": "medium",
        "notes": "Food, games, and activities for all ages"
    },
]

# Add some department-specific events
departments = list(set([emp[1] for emp in employees if emp[1]]))[:5]
for dept in departments:
    events_to_create.append({
        "title": f"{dept} Department Meeting",
        "description": f"Monthly {dept} department sync",
        "event_type": "Company Meeting",
        "category": "General",
        "start_date": today + timedelta(days=random.randint(3, 20)),
        "end_date": today + timedelta(days=random.randint(3, 20)),
        "is_recurring": True,
        "recurrence_pattern": "Monthly",
        "status": "scheduled",
        "department": dept,
        "organizer": f"{dept} Manager",
        "reminder_days": 3,
        "priority": "medium",
        "notes": "Monthly department sync and updates"
    })

# Add some employee-specific events (performance reviews, onboarding, etc.)
for emp_id, dept in employees[:10]:
    # Individual performance review
    events_to_create.append({
        "title": f"Performance Review - Employee {emp_id}",
        "description": "Annual performance review meeting",
        "event_type": "Performance Review",
        "category": "HR Process",
        "start_date": today + timedelta(days=random.randint(15, 30)),
        "end_date": today + timedelta(days=random.randint(15, 30)),
        "is_recurring": False,
        "status": "scheduled",
        "employee_id": emp_id,
        "department": dept,
        "organizer": "Manager",
        "reminder_days": 7,
        "priority": "high",
        "notes": "1-on-1 performance discussion"
    })

print(f"\nCreating {len(events_to_create)} events...")

created_count = 0
for event in events_to_create:
    cursor.execute("""
        INSERT INTO events (
            title, description, event_type, category,
            start_date, end_date, is_recurring, recurrence_pattern, recurrence_end_date,
            status, location, organizer, participants,
            employee_id, department, reminder_days, priority, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event.get("title"),
        event.get("description"),
        event.get("event_type"),
        event.get("category"),
        event.get("start_date"),
        event.get("end_date"),
        event.get("is_recurring", False),
        event.get("recurrence_pattern"),
        event.get("recurrence_end_date"),
        event.get("status", "scheduled"),
        event.get("location"),
        event.get("organizer"),
        event.get("participants"),
        event.get("employee_id"),
        event.get("department"),
        event.get("reminder_days"),
        event.get("priority", "medium"),
        event.get("notes")
    ))
    created_count += 1

    if created_count % 10 == 0:
        print(f"  Created {created_count} events...")

# Commit changes
conn.commit()
conn.close()

print(f"\n✓ Successfully created {created_count} events!")
print("  Event types included:")
print("  - Performance Reviews")
print("  - Open Enrollment")
print("  - Bonus Distributions")
print("  - Training Sessions")
print("  - Company Meetings")
print("  - Holidays")
print("  - Compliance Deadlines")
print("  - Team Events")
print("  - Department Meetings")
