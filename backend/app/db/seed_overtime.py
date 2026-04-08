"""Seed overtime (PTORecord) data for the Overtime Tracking & Reporting page.

Per FLSA, only full-time, non-exempt (hourly) employees accrue overtime.
Since the employee table has no explicit wage_type/exemption field, we
classify by job title: positions with nonexempt keywords (Coordinator,
Specialist, Representative, etc.) that do NOT contain exempt keywords
(Manager, Director, Senior, Lead, etc.) are overtime-eligible.

For each eligible employee, we generate YTD biweekly overtime records with
random-but-deterministic hours at time-and-a-half.

Table name is historical: `pto_records` backs the Overtime page
(/pto/summary, /pto/records) — fields are labeled pto_hours/pto_cost but
represent overtime hours/cost.

Idempotent: skips if any PTORecord rows already exist.
"""
import logging
import random
from datetime import date, timedelta
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)


# Non-exempt (overtime-eligible) position keywords
NONEXEMPT_KEYWORDS = frozenset({
    "coordinator", "specialist", "representative", "agent",
    "administrator", "paralegal", "recruiter", "support",
    "content creator", "clerk", "technician", "assistant",
})

# Exempt (salaried) position keywords — override nonexempt matches
EXEMPT_KEYWORDS = frozenset({
    "manager", "director", "counsel", "officer", "controller",
    "senior", "lead", "executive", "partner", "engineer",
    "architect", "analyst", "accountant",
})


def _is_overtime_eligible(position: str | None) -> bool:
    """Classify an employee as FLSA non-exempt by job title."""
    if not position:
        return False
    pos = position.lower()
    if any(kw in pos for kw in EXEMPT_KEYWORDS):
        return False
    return any(kw in pos for kw in NONEXEMPT_KEYWORDS)


def _biweekly_pay_period_dates(start_year: int, today: date) -> list[date]:
    """Return all biweekly pay period end dates from Jan 1 through today."""
    # First pay period ends on the first Saturday on/after Jan 4.
    # (Typical: biweekly period starts Sunday, ends 2nd Saturday.)
    period_end = date(start_year, 1, 10)
    # Adjust to Saturday if not already
    while period_end.weekday() != 5:  # 5 = Saturday
        period_end += timedelta(days=1)

    periods = []
    while period_end <= today:
        periods.append(period_end)
        period_end += timedelta(days=14)
    return periods


def seed_overtime_data() -> None:
    """Seed YTD overtime records for all FT non-exempt employees (idempotent)."""
    db = SessionLocal()
    try:
        existing = db.query(models.PTORecord).count()
        if existing > 0:
            logger.info(
                "Overtime records already seeded (%d) — skipping", existing
            )
            return

        # Deterministic pseudo-randomness
        rng = random.Random(73)

        today = date.today()
        pay_periods = _biweekly_pay_period_dates(today.year, today)
        if not pay_periods:
            logger.warning("No YTD biweekly pay periods — skipping overtime seed")
            return

        # Find overtime-eligible employees (FT, active, non-exempt title)
        candidates = db.query(models.Employee).filter(
            models.Employee.status == "Active",
            models.Employee.type == "FT",
        ).all()
        eligible = [e for e in candidates if _is_overtime_eligible(e.position)]

        records_created = 0
        for emp in eligible:
            hourly_rate = float(emp.hourly_wage or (emp.wage or 50000) / 2080)
            # Overtime is paid at 1.5x regular rate
            ot_rate = round(hourly_rate * 1.5, 2)

            # Each employee has a different overtime profile:
            # 60-80% chance of overtime each pay period, 1-12 hours when it happens
            # A subset (20%) are "high-OT" employees with 5-14 hours regularly
            is_high_ot = rng.random() < 0.2
            participation_rate = rng.uniform(0.6, 0.85)

            for period_end in pay_periods:
                if rng.random() > participation_rate:
                    continue  # No overtime this period

                if is_high_ot:
                    hours = round(rng.uniform(5.0, 14.0), 2)
                else:
                    hours = round(rng.uniform(1.0, 10.0), 2)

                cost = round(hours * ot_rate, 2)

                record = models.PTORecord(
                    employee_id=emp.employee_id,
                    cost_center=emp.cost_center or "Unassigned",
                    pay_period_date=period_end,
                    pto_hours=hours,
                    pto_cost=cost,
                    hourly_rate=ot_rate,
                    notes="Overtime @ 1.5x" + (" (high-OT employee)" if is_high_ot else ""),
                )
                db.add(record)
                records_created += 1

        db.commit()
        logger.info(
            "Seeded Overtime: %d records across %d employees over %d pay periods",
            records_created, len(eligible), len(pay_periods),
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_overtime_data()
