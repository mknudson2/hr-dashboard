"""
Seed interview availability slots for applicant self-scheduling demo.
Idempotent — skips if slots already exist.

Creates user accounts for recruiting employees, then generates 30-minute
availability slots for those recruiters across the next 3 weeks.
"""
import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)

# Employees with Recruiting/Recruiter in their position title
_RECRUITER_EMPLOYEES = [
    {"employee_id": "181", "name": "Þórdís Einarsson", "email": "thordis.einarsson@company.com", "username": "thordis.einarsson"},
    {"employee_id": "460", "name": "Erla Magnússon", "email": "erla.magnusson@company.com", "username": "erla.magnusson"},
    {"employee_id": "2040", "name": "Sólveig Haraldsson", "email": "solveig.haraldsson@company.com", "username": "solveig.haraldsson"},
]


def _ensure_recruiter_users(db: Session) -> list[models.User]:
    """Create user accounts for recruiter employees if they don't exist."""
    import bcrypt as _bcrypt

    users = []
    for rec in _RECRUITER_EMPLOYEES:
        existing = db.query(models.User).filter(
            models.User.employee_id == rec["employee_id"],
        ).first()
        if existing:
            users.append(existing)
            continue

        # Also check by username/email to avoid duplicates
        existing = db.query(models.User).filter(
            (models.User.username == rec["username"]) | (models.User.email == rec["email"]),
        ).first()
        if existing:
            users.append(existing)
            continue

        user = models.User(
            username=rec["username"],
            email=rec["email"],
            password_hash=_bcrypt.hashpw("Welcome1!".encode("utf-8"), _bcrypt.gensalt()).decode("utf-8"),
            full_name=rec["name"],
            role="manager",
            employee_id=rec["employee_id"],
            is_active=True,
            password_must_change=False,
            allowed_portals=json.dumps(["hr", "employee-portal"]),
        )
        db.add(user)
        db.flush()
        users.append(user)
        logger.info(f"Created recruiter user: {rec['name']} (employee_id={rec['employee_id']})")

    return users


def seed_interview_availability(db: Session) -> None:
    """Create demo interviewer availability slots for the next 3 weeks.

    Only uses employees with Recruiting/Recruiter in their position title.
    Slots are 30 minutes each, scoped globally (requisition_id=None).
    """
    existing_count = db.query(models.InterviewerAvailability).count()
    if existing_count > 0:
        logger.info(f"Interview slots already seeded ({existing_count} exist), skipping")
        return

    recruiter_users = _ensure_recruiter_users(db)
    if not recruiter_users:
        logger.warning("No recruiter users available for interview slot seeding")
        return

    # Time slot templates (hour, minute) in ET local time
    # Stored as naive datetimes — JS displays them as-is via toLocaleTimeString
    # Last slot starts at 16:30 (4:30 PM), ending at 17:00 (5:00 PM)
    time_templates_a = [(9, 0), (10, 30), (12, 0), (14, 0), (16, 0)]    # 9 AM, 10:30 AM, 12 PM, 2 PM, 4 PM
    time_templates_b = [(9, 30), (11, 0), (13, 0), (15, 0), (16, 30)]   # 9:30 AM, 11 AM, 1 PM, 3 PM, 4:30 PM
    time_templates_c = [(10, 0), (11, 30), (12, 30), (14, 30), (16, 0)] # 10 AM, 11:30 AM, 12:30 PM, 2:30 PM, 4 PM

    all_templates = [time_templates_a, time_templates_b, time_templates_c]

    now = datetime.utcnow()
    start_date = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    slots_created = 0
    for day_offset in range(21):  # 3 weeks covers ~15 business days
        day = start_date + timedelta(days=day_offset)
        if day.weekday() >= 5:  # Skip weekends
            continue

        for i, user in enumerate(recruiter_users):
            templates = all_templates[i % len(all_templates)]
            for hour, minute in templates:
                slot_start = day.replace(hour=hour, minute=minute)
                slot_end = slot_start + timedelta(minutes=30)

                avail = models.InterviewerAvailability(
                    user_id=user.id,
                    start_time=slot_start,
                    end_time=slot_end,
                    time_zone="America/New_York",
                    slot_duration_minutes=30,
                    is_booked=False,
                    requisition_id=None,
                )
                db.add(avail)
                slots_created += 1

    db.commit()
    logger.info(f"Seeded {slots_created} interview availability slots for {len(recruiter_users)} recruiters")
