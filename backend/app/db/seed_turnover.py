"""Seed turnover data: Termination records and Internal Changes.

Creates:
- Termination records for all employees marked as status='Terminated', with
  realistic cost calculations (severance, PTO payout, recruitment, training).
- A handful of Internal Change records (promotions, transfers, merit increases)
  for active employees, so the turnover dashboard's "Internal Changes (YTD)"
  card and "Internal Changes" tab are populated.

Idempotent: skips if any Termination rows already exist.
"""
import logging
import random
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)


# Termination reason pools
VOLUNTARY_REASONS = [
    "Resignation - New Opportunity",
    "Resignation - Relocation",
    "Resignation - Career Change",
    "Resignation - Personal Reasons",
    "Resignation - Return to School",
    "Retirement",
]

INVOLUNTARY_REASONS = [
    "Performance Issues",
    "Position Elimination",
    "Restructuring",
    "Policy Violation",
    "Attendance Issues",
]

SUPERVISORS = [
    "Sarah Johnson",
    "Michael Chen",
    "Emily Rodriguez",
    "David Kim",
    "Jennifer Martinez",
]


# Internal change specs (active employees, realistic promotions/transfers).
# Each spec drives one InternalChange row.
# (employee_id, change_month, change_day, change_type, change_reason,
#  position_after, department_after, team_after, cost_center_after,
#  wage_multiplier)  — wage_after = wage_before * multiplier.
INTERNAL_CHANGE_SPECS = [
    # Promotion — Davíð: HR Coordinator -> Senior HR Coordinator (15% raise)
    ("2001", 1, 15, "Position Change", "Promotion",
     "Senior HR Coordinator", "HR", "Southeast", "02-HR", 1.15),
    # Promotion — Sigurður: Senior Developer -> Lead Developer (12% raise)
    ("2002", 2, 1, "Position Change", "Promotion",
     "Lead Developer", "IT", "Core", "04-IT", 1.12),
    # Lateral transfer — Pétur: Product Analyst -> Marketing Analyst (no raise)
    ("2005", 1, 22, "Department Transfer", "Lateral Move",
     "Analyst", "Marketing", "Analytics", "06-Mar", 1.00),
    # Merit increase — Eiríkur: HR Manager (8% raise, same role)
    ("2013", 2, 14, "Compensation Change", "Merit Increase",
     "HR Manager", "HR", "Infrastructure", "02-HR", 1.08),
    # Promotion — Elín: Senior Accountant -> Finance Manager (18% raise)
    ("2015", 3, 3, "Position Change", "Promotion",
     "Finance Manager", "Finance", "Support", "05-Fin", 1.18),
    # Promotion — Sigurður Þ.: Legal Counsel -> Senior Legal Counsel (10% raise)
    ("2017", 2, 28, "Position Change", "Promotion",
     "Senior Legal Counsel", "Legal", "Compliance", "010-Leg", 1.10),
    # Demotion/reorg — Rögnvaldur: Brand Manager -> Brand Specialist (12% cut)
    ("2016", 3, 10, "Position Change", "Reorganization",
     "Brand Specialist", "Marketing", "Infrastructure", "06-Mar", 0.88),
    # Department transfer — Snorri: Marketing -> Sales (5% raise)
    ("2018", 3, 18, "Department Transfer", "Lateral Move",
     "Account Executive", "Sales", "East", "03-Sal", 1.05),
]


def _calculate_turnover_costs(
    emp: models.Employee, rng: random.Random
) -> tuple[float, float, float, float, float, float, float, float, float]:
    """Return (annual_wage, hourly_wage, annual_benefits, employer_taxes,
    total_compensation, severance_cost, unused_pto_payout, recruitment_cost,
    training_cost) for a terminated employee.
    """
    annual_wage = float(emp.wage or 60000.0)
    hourly_wage = annual_wage / 2080.0

    annual_benefits = float(emp.benefits_cost or (annual_wage * 0.15))
    employer_taxes = annual_wage * 0.0965  # FICA + FUTA/SUTA
    total_compensation = annual_wage + annual_benefits + employer_taxes

    # Tenure in years (from hire_date to termination_date)
    if emp.hire_date and emp.termination_date:
        tenure_years = max(
            (emp.termination_date - emp.hire_date).days / 365.25, 0.25
        )
    else:
        tenure_years = 1.0

    # Severance
    weekly_wage = annual_wage / 52.0
    term_type = emp.termination_type or "Voluntary"
    if term_type == "Voluntary":
        if rng.random() < 0.3:
            severance_weeks = tenure_years * rng.uniform(0.5, 1.5)
        else:
            severance_weeks = 0.0
    else:
        severance_weeks = tenure_years * rng.uniform(2.0, 4.0)
    severance_cost = round(weekly_wage * severance_weeks, 2)

    # Unused PTO payout
    unused_pto_hours = max(
        float(emp.pto_allotted or 80) - float(emp.pto_used or 0), 0.0
    )
    unused_pto_payout = round(unused_pto_hours * hourly_wage, 2)

    # Recruitment cost (dept-based %)
    dept = emp.department or ""
    if dept in {"Engineering", "IT", "Product"}:
        recruitment_pct = rng.uniform(0.25, 0.35)
    elif dept in {"Sales", "Marketing"}:
        recruitment_pct = rng.uniform(0.20, 0.30)
    else:
        recruitment_pct = rng.uniform(0.15, 0.25)
    recruitment_cost = round(annual_wage * recruitment_pct, 2)

    # Training cost
    if dept in {"Engineering", "IT", "Product"}:
        training_pct = rng.uniform(0.15, 0.25)
    else:
        training_pct = rng.uniform(0.10, 0.15)
    training_cost = round(annual_wage * training_pct, 2)

    return (
        round(annual_wage, 2),
        round(hourly_wage, 2),
        round(annual_benefits, 2),
        round(employer_taxes, 2),
        round(total_compensation, 2),
        severance_cost,
        unused_pto_payout,
        recruitment_cost,
        training_cost,
    )


def _seed_terminations(db, rng: random.Random) -> int:
    """Create Termination rows for all status='Terminated' employees."""
    terminated = db.query(models.Employee).filter(
        models.Employee.status == "Terminated",
        models.Employee.termination_date.isnot(None),
    ).order_by(models.Employee.termination_date.desc()).all()

    created = 0
    for emp in terminated:
        term_type = emp.termination_type or (
            "Voluntary" if rng.random() < 0.6 else "Involuntary"
        )
        reason = rng.choice(
            VOLUNTARY_REASONS if term_type == "Voluntary" else INVOLUNTARY_REASONS
        )

        (annual_wage, hourly_wage, annual_benefits, employer_taxes,
         total_compensation, severance_cost, unused_pto_payout,
         recruitment_cost, training_cost) = _calculate_turnover_costs(emp, rng)

        total_turnover_cost = round(
            severance_cost + unused_pto_payout + recruitment_cost + training_cost,
            2,
        )

        if term_type == "Voluntary":
            rehire_eligible = True
        else:
            rehire_eligible = reason not in {"Policy Violation", "Attendance Issues"}

        employment_type = "Full Time" if (emp.type or "FT") == "FT" else "Part Time"

        termination = models.Termination(
            employee_id=emp.employee_id,
            termination_date=emp.termination_date,
            termination_type=term_type,
            termination_reason=reason,
            position=emp.position or f"{emp.department or 'General'} Associate",
            supervisor=rng.choice(SUPERVISORS),
            department=emp.department,
            cost_center=emp.cost_center,
            team=emp.team,
            employment_type=employment_type,
            annual_wage=annual_wage,
            hourly_wage=hourly_wage,
            benefits_cost_annual=annual_benefits,
            employer_taxes_annual=employer_taxes,
            total_compensation=total_compensation,
            severance_cost=severance_cost,
            unused_pto_payout=unused_pto_payout,
            recruitment_cost=recruitment_cost,
            training_cost=training_cost,
            total_turnover_cost=total_turnover_cost,
            rehire_eligible=rehire_eligible,
            notes=f"{term_type} termination - {reason}",
        )
        db.add(termination)
        created += 1

    return created


def _seed_internal_changes(db, rng: random.Random) -> int:
    """Create InternalChange rows for active employees (promotions, transfers)."""
    from datetime import date
    current_year = date.today().year

    created = 0
    for spec in INTERNAL_CHANGE_SPECS:
        (employee_id, month, day, change_type, change_reason,
         position_after, department_after, team_after, cost_center_after,
         wage_multiplier) = spec

        emp = db.query(models.Employee).filter(
            models.Employee.employee_id == employee_id
        ).first()
        if not emp:
            logger.warning("Employee %s not found — skipping internal change", employee_id)
            continue

        wage_before = float(emp.wage or 60000.0)
        wage_after = round(wage_before * wage_multiplier, 2)

        benefits_before = float(emp.benefits_cost or (wage_before * 0.15))
        benefits_after = round(wage_after * (benefits_before / wage_before), 2) if wage_before else benefits_before
        taxes_before = round(wage_before * 0.0965, 2)
        taxes_after = round(wage_after * 0.0965, 2)
        total_comp_before = round(wage_before + benefits_before + taxes_before, 2)
        total_comp_after = round(wage_after + benefits_after + taxes_after, 2)

        comp_change_amount = round(wage_after - wage_before, 2)
        comp_change_pct = round((wage_after - wage_before) / wage_before * 100, 2) if wage_before else 0.0
        annual_cost_impact = round(total_comp_after - total_comp_before, 2)

        change = models.InternalChange(
            employee_id=employee_id,
            change_date=date(current_year, month, day),
            change_type=change_type,
            change_reason=change_reason,
            position_before=emp.position,
            supervisor_before=rng.choice(SUPERVISORS),
            department_before=emp.department,
            cost_center_before=emp.cost_center,
            team_before=emp.team,
            employment_type_before="Full Time" if (emp.type or "FT") == "FT" else "Part Time",
            position_after=position_after,
            supervisor_after=rng.choice(SUPERVISORS),
            department_after=department_after,
            cost_center_after=cost_center_after,
            team_after=team_after,
            employment_type_after="Full Time" if (emp.type or "FT") == "FT" else "Part Time",
            annual_wage_before=round(wage_before, 2),
            hourly_wage_before=round(wage_before / 2080, 2),
            benefits_cost_before=round(benefits_before, 2),
            employer_taxes_before=taxes_before,
            total_compensation_before=total_comp_before,
            annual_wage_after=wage_after,
            hourly_wage_after=round(wage_after / 2080, 2),
            benefits_cost_after=benefits_after,
            employer_taxes_after=taxes_after,
            total_compensation_after=total_comp_after,
            compensation_change_amount=comp_change_amount,
            compensation_change_percentage=comp_change_pct,
            annual_cost_impact=annual_cost_impact,
            notes=f"{change_reason} - {change_type}",
        )
        db.add(change)
        created += 1

    return created


def seed_turnover_data() -> None:
    """Seed Termination and InternalChange data (idempotent)."""
    db = SessionLocal()
    try:
        existing_terminations = db.query(models.Termination).count()
        if existing_terminations > 0:
            logger.info(
                "Turnover data already seeded (%d terminations) — skipping",
                existing_terminations,
            )
            return

        # Deterministic pseudo-randomness for reproducible seed data
        rng = random.Random(42)

        termination_count = _seed_terminations(db, rng)
        change_count = _seed_internal_changes(db, rng)

        db.commit()
        logger.info(
            "Seeded Turnover: %d terminations, %d internal changes",
            termination_count,
            change_count,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_turnover_data()
