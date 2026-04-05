"""Seed sample FMLA data for testing HR Dashboard and Employee Portal.

Creates FMLA cases, leave entries, case notes, and time submissions
for a mix of employees (including test_employee) so both the HR portal
(admin view) and Employee Portal (self-service view) are populated.

Shared data model: both portals read from models.FMLACase, FMLALeaveEntry,
and FMLATimeSubmission, so seeding once shows up everywhere.
"""
import logging
from datetime import date, datetime, timedelta
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)


# Employees to create FMLA cases for
# (employee_id, case_spec_list) - case_spec: dict with type, status, start/end, hours_used, etc.
FMLA_CASE_SPECS = [
    # test_employee = Davíð (2001) — active continuous case, mid-leave
    ("2001", [{
        "leave_type": "Employee Medical",
        "reason": "Post-surgical recovery",
        "status": "Active",
        "start_offset_days": -30,
        "end_offset_days": 60,
        "intermittent": False,
        "hours_used": 160.0,
        "entries": [
            ("Full Day", 8, -28), ("Full Day", 8, -27), ("Full Day", 8, -26),
            ("Full Day", 8, -25), ("Full Day", 8, -21), ("Full Day", 8, -20),
            ("Full Day", 8, -19), ("Full Day", 8, -18), ("Full Day", 8, -14),
            ("Full Day", 8, -13), ("Full Day", 8, -12), ("Full Day", 8, -11),
            ("Full Day", 8, -7),  ("Full Day", 8, -6),  ("Full Day", 8, -5),
            ("Full Day", 8, -4),  ("Full Day", 8, -3),  ("Full Day", 8, -1),
            ("Full Day", 8,  0),  ("Full Day", 8,  1),
        ],
        "notes": "Approved continuous leave. Return-to-work projected in 6 weeks.",
        "supervisor_notes": [
            "Initial request reviewed and approved by HR.",
            "Certification received from provider on schedule.",
        ],
    }]),
    # Sigurður (2002) — intermittent family care (test_supervisor's own case)
    ("2002", [{
        "leave_type": "Family Care",
        "reason": "Parent's chemotherapy appointments",
        "status": "Active",
        "start_offset_days": -60,
        "end_offset_days": 120,
        "intermittent": True,
        "hours_used": 48.0,
        "entries": [
            ("Partial Day", 4, -55), ("Partial Day", 4, -48), ("Full Day", 8, -41),
            ("Partial Day", 4, -34), ("Full Day", 8, -27), ("Partial Day", 4, -20),
            ("Full Day", 8, -13), ("Partial Day", 4, -6), ("Partial Day", 4, -2),
        ],
        "notes": "Intermittent leave for ongoing chemo support.",
        "supervisor_notes": ["Intermittent schedule agreed with supervisor."],
    }]),
    # Þóra (2000) — bonding leave, upcoming
    ("2000", [{
        "leave_type": "Bonding",
        "reason": "New child bonding leave",
        "status": "Approved",
        "start_offset_days": 14,
        "end_offset_days": 98,
        "intermittent": False,
        "hours_used": 0.0,
        "entries": [],
        "notes": "Bonding leave scheduled. All paperwork in order.",
        "supervisor_notes": ["Coverage plan confirmed with team."],
    }]),
    # Kristín (2003) — closed medical case, returned to work
    ("2003", [{
        "leave_type": "Employee Medical",
        "reason": "Recovery from broken arm",
        "status": "Closed",
        "start_offset_days": -180,
        "end_offset_days": -120,
        "intermittent": False,
        "hours_used": 240.0,
        "return_to_work_offset": -118,
        "entries": [],  # Bulk hours already used
        "notes": "Returned to work ahead of schedule.",
        "supervisor_notes": [
            "Case opened after workplace incident report.",
            "Return-to-work clearance received from physician.",
        ],
    }]),
    # Sólveig (2004) — pending certification
    ("2004", [{
        "leave_type": "Military Family",
        "reason": "Spouse deployment qualifying exigency",
        "status": "Pending",
        "start_offset_days": 21,
        "end_offset_days": 56,
        "intermittent": False,
        "hours_used": 0.0,
        "entries": [],
        "notes": "Awaiting military orders documentation.",
        "supervisor_notes": [],
    }]),
    # Pétur (2005) — denied
    ("2005", [{
        "leave_type": "Family Care",
        "reason": "Sibling care request",
        "status": "Denied",
        "start_offset_days": -7,
        "end_offset_days": 21,
        "intermittent": False,
        "hours_used": 0.0,
        "entries": [],
        "notes": "Sibling does not qualify under FMLA family member definition.",
        "supervisor_notes": ["Denial reason communicated to employee."],
    }]),
    # Ingibjörg (2007) — reduced schedule active
    ("2007", [{
        "leave_type": "Employee Medical",
        "reason": "Chronic condition management",
        "status": "Active",
        "start_offset_days": -45,
        "end_offset_days": 135,
        "intermittent": False,
        "reduced_schedule": True,
        "hours_used": 72.0,
        "entries": [
            ("Partial Day", 4, -42), ("Partial Day", 4, -41), ("Partial Day", 4, -40),
            ("Partial Day", 4, -35), ("Partial Day", 4, -34), ("Partial Day", 4, -33),
            ("Partial Day", 4, -28), ("Partial Day", 4, -27), ("Partial Day", 4, -26),
            ("Partial Day", 4, -21), ("Partial Day", 4, -20), ("Partial Day", 4, -19),
            ("Partial Day", 4, -14), ("Partial Day", 4, -13), ("Partial Day", 4, -12),
            ("Partial Day", 4, -7),  ("Partial Day", 4, -6),  ("Partial Day", 4, -5),
        ],
        "notes": "Reduced-schedule leave: 4-hour days.",
        "supervisor_notes": ["Schedule accommodation documented."],
    }]),
]


# Time submissions for employees (to populate supervisor review queue)
TIME_SUBMISSIONS = [
    # Davíð submissions routed to their supervisor
    {"employee_id": "2001", "case_index": 0, "date_offset": 1, "hours": 8,
     "entry_type": "Full Day", "status": "pending",
     "reason": "Continued post-surgical recovery"},
    {"employee_id": "2001", "case_index": 0, "date_offset": 2, "hours": 8,
     "entry_type": "Full Day", "status": "pending",
     "reason": "Follow-up physical therapy"},
    {"employee_id": "2001", "case_index": 0, "date_offset": -1, "hours": 8,
     "entry_type": "Full Day", "status": "approved",
     "reason": "Recovery day"},
    # Sigurður intermittent
    {"employee_id": "2002", "case_index": 0, "date_offset": 3, "hours": 4,
     "entry_type": "Partial Day", "status": "pending",
     "reason": "Chemo appointment accompaniment"},
    # Ingibjörg reduced schedule
    {"employee_id": "2007", "case_index": 0, "date_offset": 0, "hours": 4,
     "entry_type": "Partial Day", "status": "approved",
     "reason": "Scheduled reduced-day"},
]


def seed_fmla_data():
    """Seed sample FMLA cases, leave entries, case notes, time submissions."""
    db = SessionLocal()
    try:
        existing = db.query(models.FMLACase).count()
        if existing > 0:
            logger.info("FMLA cases already seeded (%d) — skipping", existing)
            return

        today = date.today()
        year = today.year
        case_counter = 0

        # Link test_employee's supervisor to test_supervisor so portal routing works
        test_emp = db.query(models.Employee).filter(
            models.Employee.employee_id == "2001"
        ).first()
        if test_emp:
            test_emp.supervisor = "Sigurður Sæmundsson"

        for employee_id, cases in FMLA_CASE_SPECS:
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == employee_id
            ).first()
            if not employee:
                logger.warning("Employee %s not found — skipping", employee_id)
                continue

            for spec in cases:
                case_counter += 1
                hours_approved = spec.get("hours_approved", 480.0)
                hours_used = spec.get("hours_used", 0.0)
                start_date = today + timedelta(days=spec["start_offset_days"])
                end_date = today + timedelta(days=spec["end_offset_days"])
                rtw = spec.get("return_to_work_offset")
                return_to_work_date = today + timedelta(days=rtw) if rtw is not None else None

                case = models.FMLACase(
                    case_number=f"FMLA-{year}-{case_counter:04d}",
                    employee_id=employee_id,
                    status=spec["status"],
                    leave_type=spec["leave_type"],
                    reason=spec["reason"],
                    request_date=start_date - timedelta(days=14),
                    start_date=start_date,
                    end_date=end_date,
                    certification_date=start_date - timedelta(days=7)
                        if spec["status"] in ("Active", "Approved", "Closed") else None,
                    return_to_work_date=return_to_work_date,
                    hours_approved=hours_approved,
                    hours_used=hours_used,
                    hours_remaining=hours_approved - hours_used,
                    intermittent=spec.get("intermittent", False),
                    reduced_schedule=spec.get("reduced_schedule", False),
                    notes=spec.get("notes"),
                )
                db.add(case)
                db.flush()

                # Leave entries
                for entry_type, hours, day_offset in spec.get("entries", []):
                    entry = models.FMLALeaveEntry(
                        case_id=case.id,
                        leave_date=today + timedelta(days=day_offset),
                        hours_taken=hours,
                        entry_type=entry_type,
                    )
                    db.add(entry)

                # Case notes (using FMLACaseNote with date field)
                for i, note_text in enumerate(spec.get("supervisor_notes", [])):
                    note = models.FMLACaseNote(
                        case_id=case.id,
                        note_text=note_text,
                        created_at=start_date + timedelta(days=i * 3),
                    )
                    db.add(note)

        db.flush()

        # Time submissions — need to link to a supervisor User
        for sub in TIME_SUBMISSIONS:
            # Find the employee's case
            cases = db.query(models.FMLACase).filter(
                models.FMLACase.employee_id == sub["employee_id"]
            ).order_by(models.FMLACase.id).all()
            if not cases or sub["case_index"] >= len(cases):
                continue
            case = cases[sub["case_index"]]

            # Find supervisor by employee's supervisor name
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == sub["employee_id"]
            ).first()
            supervisor_user = None
            if employee and employee.supervisor:
                supervisor_user = db.query(models.User).filter(
                    models.User.full_name == employee.supervisor
                ).first()

            leave_date = today + timedelta(days=sub["date_offset"])
            is_reviewed = sub["status"] != "pending"
            submission = models.FMLATimeSubmission(
                case_id=case.id,
                employee_id=sub["employee_id"],
                leave_date=leave_date,
                hours_requested=sub["hours"],
                entry_type=sub["entry_type"],
                employee_notes=sub["reason"],
                status=sub["status"],
                submitted_at=datetime.now() - timedelta(days=1),
                reviewed_at=datetime.now() if is_reviewed else None,
                reviewed_by=supervisor_user.id if supervisor_user and is_reviewed else None,
                approved_hours=sub["hours"] if sub["status"] == "approved" else None,
            )
            db.add(submission)

        db.commit()
        case_count = db.query(models.FMLACase).count()
        entry_count = db.query(models.FMLALeaveEntry).count()
        note_count = db.query(models.FMLACaseNote).count()
        sub_count = db.query(models.FMLATimeSubmission).count()
        logger.info(
            "Seeded FMLA: %d cases, %d leave entries, %d case notes, %d time submissions",
            case_count, entry_count, note_count, sub_count
        )
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_fmla_data()
