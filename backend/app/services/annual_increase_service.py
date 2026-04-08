"""
Annual Wage Increase Service — business logic for annual increase cycles.

Handles:
- Cycle creation / auto-population
- Eligibility computation (lookback + wage matrix exemption)
- Budget area assignment (President/SVP/VP hierarchy)
- Projection calculation
- Submission / approval workflow
"""

import logging
from datetime import date, datetime
from typing import Optional, Tuple, List

from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.db import models
from app.services.org_chain_service import (
    resolve_title_level,
    walk_chain_down,
    _get_direct_reports_for_employee,
)
from app.db.pto_calendar_models import TITLE_HIERARCHY

logger = logging.getLogger(__name__)


# Title levels that qualify as decision makers for annual increases.
# VPs own their department's budget area. SVPs and President oversee
# Leadership/Senior Leadership (their direct reports minus VPs' areas).
DECISION_MAKER_LEVELS = {"president", "svp", "vp"}


def get_default_lookback_date(fiscal_year: int) -> date:
    """Default lookback: October 1 of the previous year."""
    return date(fiscal_year - 1, 10, 1)


def get_or_create_annual_cycle(
    db: Session, fiscal_year: int
) -> Tuple[models.WageIncreaseCycle, bool]:
    """
    Get or create the annual wage increase cycle for a fiscal year.
    Returns (cycle, created) tuple.
    """
    existing = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.fiscal_year == fiscal_year,
        models.WageIncreaseCycle.is_annual_auto == True,  # noqa: E712
    ).first()

    if existing:
        return existing, False

    # Count existing cycles to generate cycle_id
    count = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.fiscal_year == fiscal_year,
    ).count()

    cycle = models.WageIncreaseCycle(
        cycle_id=f"WIC-{fiscal_year}-{count + 1:03d}",
        name=f"{fiscal_year} Annual Wage Increase",
        fiscal_year=fiscal_year,
        cycle_type="Annual",
        effective_date=date(fiscal_year, 1, 1),
        status="Planning",
        is_annual_auto=True,
        target_increase_percentage=3.0,
        min_increase_percentage=0.0,
        max_increase_percentage=10.0,
    )
    db.add(cycle)
    db.flush()

    # Create default settings
    settings = models.AnnualIncreaseCycleSettings(
        cycle_id=cycle.id,
        lookback_date=get_default_lookback_date(fiscal_year),
        wage_matrix_exempt=True,
    )
    db.add(settings)
    db.commit()
    db.refresh(cycle)

    logger.info("Created annual wage increase cycle for fiscal year %d: %s", fiscal_year, cycle.cycle_id)
    return cycle, True


def get_cycle_settings(db: Session, cycle_id: int) -> Optional[models.AnnualIncreaseCycleSettings]:
    """Get settings for an annual increase cycle."""
    return db.query(models.AnnualIncreaseCycleSettings).filter(
        models.AnnualIncreaseCycleSettings.cycle_id == cycle_id
    ).first()


def compute_eligibility(
    db: Session,
    employee: models.Employee,
    lookback_date: date,
    wage_matrix_exempt: bool,
) -> Tuple[bool, Optional[str]]:
    """
    Determine if an employee is eligible for the annual wage increase.

    Ineligible if:
    1. Hired after the lookback date
    2. Received a wage increase after the lookback date
       (unless wage_matrix_exempt is True and the increase is a wage matrix
        increase for a Service Center employee)

    Returns (is_eligible, ineligibility_reason).
    """
    # Check hire date
    if employee.hire_date and employee.hire_date > lookback_date:
        return False, "Hired after lookback"

    # Check for wage increases after lookback date
    increases = db.query(models.WageHistory).filter(
        models.WageHistory.employee_id == employee.employee_id,
        models.WageHistory.effective_date > lookback_date,
        models.WageHistory.change_reason != "New Hire",
    ).all()

    if increases:
        # Filter out wage matrix increases if exempt
        if wage_matrix_exempt:
            # Wage matrix increases only apply to Service Center employees
            emp_team = (employee.team or "").lower().strip()
            emp_dept = (employee.department or "").lower().strip()
            is_service_center = "service center" in emp_team or "service center" in emp_dept

            if is_service_center:
                non_matrix = [
                    inc for inc in increases
                    if not (inc.change_reason and "wage matrix" in inc.change_reason.lower())
                ]
                if non_matrix:
                    return False, "Increase after lookback"
                # All increases were wage matrix — still eligible
                return True, None
            else:
                # Not service center — any increase makes ineligible
                return False, "Increase after lookback"
        else:
            return False, "Increase after lookback"

    return True, None


def _get_hours_divisor(employment_type: str | None) -> int:
    """Full Time = 2080 hrs/year, Part Time = 1040 hrs/year."""
    if employment_type and "part" in employment_type.lower():
        return 1040
    return 2080


def _snapshot_employee(employee: models.Employee) -> dict:
    """Capture current compensation snapshot for an entry.

    current_base_rate = hourly rate (annual / 2080 for FT, annual / 1040 for PT).
    current_annual_wage = annualized salary.
    """
    annual_wage = employee.annual_wage or employee.wage or 0.0
    emp_type = employee.employment_type or employee.type
    divisor = _get_hours_divisor(emp_type)
    base_rate = round(annual_wage / divisor, 2) if annual_wage else 0.0
    return {
        "current_base_rate": base_rate,
        "current_annual_wage": annual_wage,
        "wage_type": employee.wage_type,
        "employment_type": employee.employment_type or employee.type,
        "position": employee.position,
        "supervisor_name": employee.supervisor,
        "team": employee.team,
    }


def calculate_projections(entry: models.AnnualIncreaseEntry) -> None:
    """Update projected values based on current rate and increase percentage.

    projected_base_rate = projected_annual / 2080 (FT) or / 1040 (PT).
    total_difference = projected_annual - current_annual.
    """
    pct = entry.increase_percentage or 0.0
    multiplier = 1.0 + (pct / 100.0)
    entry.projected_annual_wage = round(entry.current_annual_wage * multiplier, 2)
    divisor = _get_hours_divisor(entry.employment_type)
    entry.projected_base_rate = round(entry.projected_annual_wage / divisor, 2) if entry.projected_annual_wage else 0.0
    entry.total_difference = round(entry.projected_annual_wage - entry.current_annual_wage, 2)


def _parse_budget_area_label(position: Optional[str], employee: models.Employee) -> str:
    """
    Extract the budget area label from a leadership position.

    Position format: "Title, Team, Department"
    e.g. "Vice President, Leadership, Finance" → "Finance"
         "Senior Vice President, Senior Leadership, Technology" → "Technology"
         "President, Executive, Executive" → "Leadership / Senior Leadership"
    """
    if not position:
        return f"{employee.first_name} {employee.last_name}"

    parts = [p.strip() for p in position.split(",")]
    if len(parts) >= 3:
        return parts[2]
    if len(parts) == 2:
        return parts[1]
    return f"{employee.first_name} {employee.last_name}"


def _find_decision_makers(db: Session) -> List[models.Employee]:
    """Find all active employees with President/SVP/VP positions."""
    all_active = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    leaders = []
    for emp in all_active:
        level = resolve_title_level(emp.position)
        if level and level in DECISION_MAKER_LEVELS:
            leaders.append(emp)

    # Sort by hierarchy rank descending (president first, then svp, then vp)
    leaders.sort(key=lambda e: TITLE_HIERARCHY.get(resolve_title_level(e.position) or "", 0), reverse=True)
    return leaders


def populate_budget_areas(db: Session, cycle_id: int) -> int:
    """
    Populate budget areas and entries for an annual increase cycle.
    Finds all President/SVP/VP employees, resolves their reports,
    and creates budget areas + entries with eligibility computed.

    Returns number of entries created.
    """
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if not cycle:
        return 0

    settings = get_cycle_settings(db, cycle_id)
    if not settings:
        return 0

    # Clear existing areas and entries for this cycle
    db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.cycle_id == cycle_id
    ).delete()
    db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle_id
    ).delete()
    db.flush()

    # Get all active employees
    all_active = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()
    active_map = {e.employee_id: e for e in all_active}

    # Find decision makers — process VPs first (bottom-up) so they claim
    # their department employees before SVPs/President
    decision_makers = _find_decision_makers(db)
    # Sort: VPs first, then SVPs, then President (reverse of default)
    decision_makers.sort(key=lambda e: TITLE_HIERARCHY.get(resolve_title_level(e.position) or "", 0))
    assigned_employee_ids: set = set()
    # Decision makers themselves are not assigned to budget areas
    dm_ids = {dm.employee_id for dm in decision_makers}
    total_entries = 0

    # Create budget areas for each decision maker
    for leader in decision_makers:
        level = resolve_title_level(leader.position)
        reports = walk_chain_down(db, leader)

        # Only include reports that haven't been assigned yet and are not decision makers
        unassigned_reports = [
            r for r in reports
            if r.employee_id not in assigned_employee_ids and r.employee_id not in dm_ids
        ]

        # Always create budget areas for SVPs even if no unassigned reports,
        # because SVP areas aggregate VP areas when the SVP dashboard is enabled
        if not unassigned_reports and level != "svp":
            continue

        area = models.AnnualIncreaseBudgetArea(
            cycle_id=cycle_id,
            decision_maker_employee_id=leader.employee_id,
            area_label=_parse_budget_area_label(leader.position, leader),
            title_level=level,
        )
        db.add(area)
        db.flush()

        eligible_count = 0
        ineligible_count = 0
        total_budget = 0.0
        total_allocated = 0.0

        for report in unassigned_reports:
            assigned_employee_ids.add(report.employee_id)
            is_eligible, reason = compute_eligibility(
                db, report, settings.lookback_date, settings.wage_matrix_exempt
            )

            snapshot = _snapshot_employee(report)
            entry = models.AnnualIncreaseEntry(
                cycle_id=cycle_id,
                budget_area_id=area.id,
                employee_id=report.employee_id,
                is_eligible=is_eligible,
                ineligibility_reason=reason,
                increase_percentage=3.0 if is_eligible else 0.0,
                **snapshot,
            )
            calculate_projections(entry)
            db.add(entry)

            if is_eligible:
                eligible_count += 1
                annual = snapshot["current_annual_wage"]
                total_budget += round(annual * 0.03, 2)
                total_allocated += entry.total_difference
            else:
                ineligible_count += 1

            total_entries += 1

        area.eligible_count = eligible_count
        area.ineligible_count = ineligible_count
        area.total_budget = round(total_budget, 2)
        area.total_allocated = round(total_allocated, 2)

    # Create "General / Unassigned" area for employees not under any decision maker
    unassigned = [
        e for e in all_active
        if e.employee_id not in assigned_employee_ids and e.employee_id not in dm_ids
    ]

    if unassigned:
        general_area = models.AnnualIncreaseBudgetArea(
            cycle_id=cycle_id,
            decision_maker_employee_id=None,
            area_label="General / Unassigned",
            title_level=None,
        )
        db.add(general_area)
        db.flush()

        eligible_count = 0
        ineligible_count = 0
        total_budget = 0.0
        total_allocated = 0.0

        for emp in unassigned:
            is_eligible, reason = compute_eligibility(
                db, emp, settings.lookback_date, settings.wage_matrix_exempt
            )

            snapshot = _snapshot_employee(emp)
            entry = models.AnnualIncreaseEntry(
                cycle_id=cycle_id,
                budget_area_id=general_area.id,
                employee_id=emp.employee_id,
                is_eligible=is_eligible,
                ineligibility_reason=reason,
                increase_percentage=3.0 if is_eligible else 0.0,
                **snapshot,
            )
            calculate_projections(entry)
            db.add(entry)

            if is_eligible:
                eligible_count += 1
                annual = snapshot["current_annual_wage"]
                total_budget += round(annual * 0.03, 2)
                total_allocated += entry.total_difference
            else:
                ineligible_count += 1

            total_entries += 1

        general_area.eligible_count = eligible_count
        general_area.ineligible_count = ineligible_count
        general_area.total_budget = round(total_budget, 2)
        general_area.total_allocated = round(total_allocated, 2)

    # Update SVP area stats by aggregating from child VP areas
    all_areas = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle_id
    ).all()
    area_by_dm = {a.decision_maker_employee_id: a for a in all_areas if a.decision_maker_employee_id}

    for area in all_areas:
        if area.title_level != "svp" or not area.decision_maker_employee_id:
            continue
        svp_emp = active_map.get(area.decision_maker_employee_id)
        if not svp_emp:
            continue
        # Find VP areas whose decision maker's supervisor is this SVP
        child_vp_areas = []
        for vp_area in all_areas:
            if vp_area.title_level != "vp" or not vp_area.decision_maker_employee_id:
                continue
            vp_emp = active_map.get(vp_area.decision_maker_employee_id)
            if not vp_emp:
                continue
            # Check if this VP reports to this SVP
            if vp_emp.supervisor == f"{svp_emp.first_name} {svp_emp.last_name}" or vp_emp.supervisor == svp_emp.employee_id:
                child_vp_areas.append(vp_area)
        # Aggregate stats from child VP areas
        area.eligible_count = sum(a.eligible_count for a in child_vp_areas)
        area.ineligible_count = sum(a.ineligible_count for a in child_vp_areas)
        area.total_budget = round(sum(a.total_budget for a in child_vp_areas), 2)
        area.total_allocated = round(sum(a.total_allocated for a in child_vp_areas), 2)

    db.flush()

    # Update cycle totals (exclude SVP areas to avoid double-counting)
    non_svp_areas = [a for a in all_areas if a.title_level != "svp"]

    cycle.total_budget = round(sum(a.total_budget for a in non_svp_areas), 2)
    cycle.budget_used = round(sum(a.total_allocated for a in non_svp_areas), 2)
    cycle.budget_remaining = round(cycle.total_budget - cycle.budget_used, 2)

    total_eligible = sum(a.eligible_count for a in non_svp_areas)
    total_ineligible = sum(a.ineligible_count for a in non_svp_areas)
    cycle.total_employees_eligible = total_eligible
    cycle.total_employees_reviewed = 0
    cycle.total_employees_approved = 0

    db.commit()
    logger.info(
        "Populated %d entries across %d budget areas for cycle %s (%d eligible, %d ineligible)",
        total_entries, len(all_areas), cycle.cycle_id, total_eligible, total_ineligible,
    )
    return total_entries


def recalculate_cycle(db: Session, cycle_id: int) -> None:
    """Re-run eligibility and projections for all entries in a cycle."""
    settings = get_cycle_settings(db, cycle_id)
    if not settings:
        logger.warning("No settings found for cycle %d — cannot recalculate", cycle_id)
        return

    entries = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.cycle_id == cycle_id
    ).all()

    for entry in entries:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == entry.employee_id
        ).first()
        if not employee:
            continue

        # Skip overridden entries — keep them eligible
        if entry.eligibility_override:
            calculate_projections(entry)
            continue

        is_eligible, reason = compute_eligibility(
            db, employee, settings.lookback_date, settings.wage_matrix_exempt
        )
        entry.is_eligible = is_eligible
        entry.ineligibility_reason = reason
        if not is_eligible:
            entry.increase_percentage = 0.0
        calculate_projections(entry)

    # Recalculate budget area totals
    areas = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle_id
    ).all()

    # First pass: VP and other non-SVP areas (these have actual entries)
    for area in areas:
        if area.title_level == "svp":
            continue
        area_entries = [e for e in entries if e.budget_area_id == area.id]
        eligible = [e for e in area_entries if e.is_eligible or e.eligibility_override]
        ineligible = [e for e in area_entries if not e.is_eligible and not e.eligibility_override]

        area.eligible_count = len(eligible)
        area.ineligible_count = len(ineligible)
        area.total_budget = round(sum(e.current_annual_wage * 0.03 for e in eligible), 2)
        area.total_allocated = round(sum(e.total_difference for e in eligible), 2)

    # Second pass: SVP areas aggregate from child VP areas
    all_active = db.query(models.Employee).filter(models.Employee.status == "Active").all()
    active_map = {e.employee_id: e for e in all_active}
    for area in areas:
        if area.title_level != "svp" or not area.decision_maker_employee_id:
            continue
        svp_emp = active_map.get(area.decision_maker_employee_id)
        if not svp_emp:
            continue
        child_vp_areas = []
        for vp_area in areas:
            if vp_area.title_level != "vp" or not vp_area.decision_maker_employee_id:
                continue
            vp_emp = active_map.get(vp_area.decision_maker_employee_id)
            if not vp_emp:
                continue
            svp_name = f"{svp_emp.first_name} {svp_emp.last_name}"
            if vp_emp.supervisor == svp_name or vp_emp.supervisor == svp_emp.employee_id:
                child_vp_areas.append(vp_area)
        area.eligible_count = sum(a.eligible_count for a in child_vp_areas)
        area.ineligible_count = sum(a.ineligible_count for a in child_vp_areas)
        area.total_budget = round(sum(a.total_budget for a in child_vp_areas), 2)
        area.total_allocated = round(sum(a.total_allocated for a in child_vp_areas), 2)

    # Update cycle totals (exclude SVP areas to avoid double-counting)
    non_svp_areas = [a for a in areas if a.title_level != "svp"]
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id
    ).first()
    if cycle:
        cycle.total_budget = round(sum(a.total_budget for a in non_svp_areas), 2)
        cycle.budget_used = round(sum(a.total_allocated for a in non_svp_areas), 2)
        cycle.budget_remaining = round(cycle.total_budget - cycle.budget_used, 2)
        cycle.total_employees_eligible = sum(a.eligible_count for a in non_svp_areas)

    db.commit()
    logger.info("Recalculated cycle %d: %d entries processed", cycle_id, len(entries))


def update_entry_percentage(
    db: Session, entry_id: int, new_percentage: float
) -> Optional[models.AnnualIncreaseEntry]:
    """Update increase percentage for a single entry and recalculate projections."""
    entry = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.id == entry_id
    ).first()
    if not entry:
        return None

    entry.increase_percentage = new_percentage
    calculate_projections(entry)

    # Update budget area total_allocated
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == entry.budget_area_id
    ).first()
    if area:
        eligible_entries = db.query(models.AnnualIncreaseEntry).filter(
            models.AnnualIncreaseEntry.budget_area_id == area.id,
            (models.AnnualIncreaseEntry.is_eligible == True) | (models.AnnualIncreaseEntry.eligibility_override == True),  # noqa: E712
        ).all()
        area.total_allocated = round(sum(e.total_difference for e in eligible_entries), 2)

        # Update cycle totals
        cycle = db.query(models.WageIncreaseCycle).filter(
            models.WageIncreaseCycle.id == entry.cycle_id
        ).first()
        if cycle:
            all_areas = db.query(models.AnnualIncreaseBudgetArea).filter(
                models.AnnualIncreaseBudgetArea.cycle_id == cycle.id
            ).all()
            cycle.budget_used = round(sum(a.total_allocated for a in all_areas), 2)
            cycle.budget_remaining = round(cycle.total_budget - cycle.budget_used, 2)

    db.commit()
    db.refresh(entry)
    return entry


def request_eligibility_override(
    db: Session, entry_id: int, justification: str
) -> Optional[models.AnnualIncreaseEntry]:
    """Mark an ineligible entry as overridden with justification."""
    entry = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.id == entry_id
    ).first()
    if not entry:
        return None

    entry.eligibility_override = True
    entry.override_justification = justification
    entry.increase_percentage = 3.0
    calculate_projections(entry)

    # Update budget area counts and totals
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == entry.budget_area_id
    ).first()
    if area:
        area_entries = db.query(models.AnnualIncreaseEntry).filter(
            models.AnnualIncreaseEntry.budget_area_id == area.id
        ).all()
        eligible = [e for e in area_entries if e.is_eligible or e.eligibility_override]
        ineligible = [e for e in area_entries if not e.is_eligible and not e.eligibility_override]
        area.eligible_count = len(eligible)
        area.ineligible_count = len(ineligible)
        area.total_budget = round(sum(e.current_annual_wage * 0.03 for e in eligible), 2)
        area.total_allocated = round(sum(e.total_difference for e in eligible), 2)

    db.commit()
    db.refresh(entry)
    return entry


def submit_budget_area(
    db: Session, area_id: int, overage_justification: Optional[str] = None
) -> Optional[models.AnnualIncreaseBudgetArea]:
    """Submit a budget area sheet for approval."""
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == area_id
    ).first()
    if not area:
        return None

    area.submission_status = "submitted"
    area.submitted_at = datetime.utcnow()
    if overage_justification:
        area.overage_justification = overage_justification

    db.commit()
    db.refresh(area)
    logger.info("Budget area %d submitted for approval", area_id)
    return area


def approve_budget_area(
    db: Session, area_id: int, reviewed_by: str, notes: Optional[str] = None
) -> Optional[models.AnnualIncreaseBudgetArea]:
    """Approve a submitted budget area."""
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == area_id
    ).first()
    if not area:
        return None

    area.submission_status = "approved"
    area.reviewed_by = reviewed_by
    area.reviewed_at = datetime.utcnow()
    area.review_notes = notes

    db.commit()
    db.refresh(area)
    logger.info("Budget area %d approved by %s", area_id, reviewed_by)
    return area


def return_budget_area(
    db: Session, area_id: int, reviewed_by: str, notes: str
) -> Optional[models.AnnualIncreaseBudgetArea]:
    """Return a submitted budget area for adjustments."""
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == area_id
    ).first()
    if not area:
        return None

    area.submission_status = "returned"
    area.reviewed_by = reviewed_by
    area.reviewed_at = datetime.utcnow()
    area.review_notes = notes

    db.commit()
    db.refresh(area)
    logger.info("Budget area %d returned for adjustments by %s", area_id, reviewed_by)
    return area


def get_decision_maker_reports(
    db: Session,
    decision_maker: models.Employee,
    direct_only: bool = False,
) -> List[models.Employee]:
    """Get direct or all reports for a decision maker."""
    if direct_only:
        return _get_direct_reports_for_employee(db, decision_maker)
    return walk_chain_down(db, decision_maker)
