"""
Annual Wage Increase API — endpoints for HR Hub and Employee Portal.

HR Hub: manage annual increase cycles, configure settings, review submissions.
Employee Portal: decision maker dashboards, adjust percentages, submit sheets.
"""

import logging
from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, Permissions
from app.services.annual_increase_service import (
    get_or_create_annual_cycle,
    get_cycle_settings,
    populate_budget_areas,
    recalculate_cycle,
    update_entry_percentage,
    request_eligibility_override,
    submit_budget_area,
    approve_budget_area,
    return_budget_area,
    _find_decision_makers,
    calculate_projections,
)
from app.services.org_chain_service import resolve_title_level

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/annual-increase",
    tags=["annual-increase"],
)


# =============================================================================
# SCHEMAS
# =============================================================================

class CycleSettingsUpdate(BaseModel):
    lookback_date: Optional[date] = None
    wage_matrix_exempt: Optional[bool] = None


class IncreasePercentageUpdate(BaseModel):
    increase_percentage: float


class EligibilityOverrideRequest(BaseModel):
    justification: str


class SubmitSheetRequest(BaseModel):
    overage_justification: Optional[str] = None


class ApproveSubmissionRequest(BaseModel):
    reviewed_by: str
    notes: Optional[str] = None


class ReturnSubmissionRequest(BaseModel):
    reviewed_by: str
    notes: str


class ToggleDashboardRequest(BaseModel):
    is_dashboard_enabled: bool


# =============================================================================
# HELPERS
# =============================================================================

def _serialize_entry(entry: models.AnnualIncreaseEntry) -> dict:
    return {
        "id": entry.id,
        "cycle_id": entry.cycle_id,
        "budget_area_id": entry.budget_area_id,
        "employee_id": entry.employee_id,
        "is_eligible": entry.is_eligible,
        "ineligibility_reason": entry.ineligibility_reason,
        "eligibility_override": entry.eligibility_override,
        "override_justification": entry.override_justification,
        "current_base_rate": entry.current_base_rate,
        "current_annual_wage": entry.current_annual_wage,
        "wage_type": entry.wage_type,
        "employment_type": entry.employment_type,
        "position": entry.position,
        "supervisor_name": entry.supervisor_name,
        "team": entry.team,
        "increase_percentage": entry.increase_percentage,
        "projected_base_rate": entry.projected_base_rate,
        "projected_annual_wage": entry.projected_annual_wage,
        "total_difference": entry.total_difference,
        "employee_name": None,  # Populated below
    }


def _enrich_entry_with_name(entry_dict: dict, db: Session) -> dict:
    emp = db.query(models.Employee.first_name, models.Employee.last_name).filter(
        models.Employee.employee_id == entry_dict["employee_id"]
    ).first()
    if emp:
        entry_dict["employee_name"] = f"{emp.first_name} {emp.last_name}"
    return entry_dict


def _serialize_budget_area(area: models.AnnualIncreaseBudgetArea) -> dict:
    return {
        "id": area.id,
        "cycle_id": area.cycle_id,
        "decision_maker_employee_id": area.decision_maker_employee_id,
        "area_label": area.area_label,
        "title_level": area.title_level,
        "eligible_count": area.eligible_count,
        "ineligible_count": area.ineligible_count,
        "total_budget": area.total_budget,
        "total_allocated": area.total_allocated,
        "difference": round(area.total_budget - area.total_allocated, 2),
        "is_dashboard_enabled": area.is_dashboard_enabled,
        "submission_status": area.submission_status,
        "submitted_at": area.submitted_at.isoformat() if area.submitted_at else None,
        "overage_justification": area.overage_justification,
        "reviewed_by": area.reviewed_by,
        "reviewed_at": area.reviewed_at.isoformat() if area.reviewed_at else None,
        "review_notes": area.review_notes,
    }


def _serialize_cycle(cycle: models.WageIncreaseCycle, settings: Optional[models.AnnualIncreaseCycleSettings] = None) -> dict:
    result = {
        "id": cycle.id,
        "cycle_id": cycle.cycle_id,
        "name": cycle.name,
        "fiscal_year": cycle.fiscal_year,
        "cycle_type": cycle.cycle_type,
        "effective_date": cycle.effective_date.isoformat() if cycle.effective_date else None,
        "status": cycle.status,
        "total_budget": cycle.total_budget,
        "budget_used": cycle.budget_used,
        "budget_remaining": cycle.budget_remaining,
        "total_employees_eligible": cycle.total_employees_eligible,
        "is_annual_auto": cycle.is_annual_auto,
        "target_increase_percentage": cycle.target_increase_percentage,
        "created_at": cycle.created_at.isoformat() if cycle.created_at else None,
    }
    if settings:
        result["settings"] = {
            "lookback_date": settings.lookback_date.isoformat() if settings.lookback_date else None,
            "wage_matrix_exempt": settings.wage_matrix_exempt,
        }
    return result


# =============================================================================
# HR HUB ENDPOINTS
# =============================================================================

@router.get("/cycles")
def list_annual_cycles(
    fiscal_year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_READ_ALL)),
):
    """List all annual wage increase cycles."""
    query = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.is_annual_auto == True  # noqa: E712
    )
    if fiscal_year:
        query = query.filter(models.WageIncreaseCycle.fiscal_year == fiscal_year)

    cycles = query.order_by(models.WageIncreaseCycle.fiscal_year.desc()).all()
    result = []
    for cycle in cycles:
        settings = get_cycle_settings(db, cycle.id)
        result.append(_serialize_cycle(cycle, settings))
    return result


@router.post("/cycles")
def create_annual_cycle(
    fiscal_year: int = Query(..., description="Fiscal year for the annual cycle"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Initialize an annual wage increase cycle for a fiscal year."""
    cycle, created = get_or_create_annual_cycle(db, fiscal_year)

    if not created:
        settings = get_cycle_settings(db, cycle.id)
        return {
            "message": f"Annual cycle for {fiscal_year} already exists",
            "created": False,
            "cycle": _serialize_cycle(cycle, settings),
        }

    # Populate budget areas and entries
    entry_count = populate_budget_areas(db, cycle.id)
    settings = get_cycle_settings(db, cycle.id)

    return {
        "message": f"Annual cycle created for {fiscal_year} with {entry_count} employee entries",
        "created": True,
        "cycle": _serialize_cycle(cycle, settings),
    }


@router.get("/cycles/{cycle_id}")
def get_annual_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_READ_ALL)),
):
    """Get annual cycle detail with summary stats."""
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id,
        models.WageIncreaseCycle.is_annual_auto == True,  # noqa: E712
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Annual increase cycle not found")

    settings = get_cycle_settings(db, cycle.id)
    return _serialize_cycle(cycle, settings)


@router.put("/cycles/{cycle_id}/settings")
def update_cycle_settings(
    cycle_id: int,
    update: CycleSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Update lookback date and/or wage matrix toggle for a cycle."""
    settings = get_cycle_settings(db, cycle_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Cycle settings not found")

    if update.lookback_date is not None:
        settings.lookback_date = update.lookback_date
    if update.wage_matrix_exempt is not None:
        settings.wage_matrix_exempt = update.wage_matrix_exempt
    settings.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(settings)
    return {
        "lookback_date": settings.lookback_date.isoformat(),
        "wage_matrix_exempt": settings.wage_matrix_exempt,
    }


@router.post("/cycles/{cycle_id}/recalculate")
def recalculate_annual_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Re-run eligibility and projections after settings change."""
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.id == cycle_id,
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")

    recalculate_cycle(db, cycle_id)
    settings = get_cycle_settings(db, cycle_id)
    return _serialize_cycle(cycle, settings)


@router.get("/cycles/{cycle_id}/budget-areas")
def list_budget_areas(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_READ_ALL)),
):
    """List all budget areas for a cycle with aggregates."""
    areas = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle_id
    ).all()
    return [_serialize_budget_area(a) for a in areas]


@router.put("/cycles/{cycle_id}/budget-areas/{area_id}/toggle-dashboard")
def toggle_area_dashboard(
    cycle_id: int,
    area_id: int,
    body: ToggleDashboardRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Enable or disable the decision maker dashboard for a budget area."""
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == area_id,
        models.AnnualIncreaseBudgetArea.cycle_id == cycle_id,
    ).first()
    if not area:
        raise HTTPException(status_code=404, detail="Budget area not found")

    area.is_dashboard_enabled = body.is_dashboard_enabled
    db.commit()

    # Create notification for the decision maker if enabling
    if body.is_dashboard_enabled and area.decision_maker_employee_id:
        try:
            from app.api.in_app_notifications import create_notification
            # Find the user record for this decision maker
            dm_user = db.query(models.User).filter(
                models.User.employee_id == area.decision_maker_employee_id
            ).first()
            if dm_user:
                create_notification(
                    db=db,
                    title="Annual Wage Increase Review Assigned",
                    message=f"You have been assigned to review the annual wage increase for your reports.",
                    notification_type="annual_increase",
                    action_url="/annual-increase",
                    user_id=dm_user.id,
                    priority="high",
                )
        except Exception:
            logger.exception("Failed to create notification for decision maker")

    db.refresh(area)
    return _serialize_budget_area(area)


@router.get("/cycles/{cycle_id}/employees")
def list_cycle_employees(
    cycle_id: int,
    eligible: Optional[bool] = None,
    budget_area_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_READ_ALL)),
):
    """List employee entries for a cycle, filterable by eligibility and budget area."""
    query = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.cycle_id == cycle_id
    )

    if eligible is not None:
        if eligible:
            query = query.filter(
                or_(
                    models.AnnualIncreaseEntry.is_eligible == True,  # noqa: E712
                    models.AnnualIncreaseEntry.eligibility_override == True,  # noqa: E712
                )
            )
        else:
            query = query.filter(
                models.AnnualIncreaseEntry.is_eligible == False,  # noqa: E712
                models.AnnualIncreaseEntry.eligibility_override == False,  # noqa: E712
            )

    if budget_area_id:
        query = query.filter(models.AnnualIncreaseEntry.budget_area_id == budget_area_id)

    entries = query.all()

    result = []
    for entry in entries:
        entry_dict = _serialize_entry(entry)
        _enrich_entry_with_name(entry_dict, db)
        result.append(entry_dict)

    # Apply search filter (on name, employee_id, position)
    if search:
        search_lower = search.lower()
        result = [
            r for r in result
            if (r.get("employee_name") and search_lower in r["employee_name"].lower())
            or (r.get("employee_id") and search_lower in r["employee_id"].lower())
            or (r.get("position") and search_lower in r["position"].lower())
        ]

    return result


@router.put("/cycles/{cycle_id}/employees/{entry_id}")
def update_employee_increase(
    cycle_id: int,
    entry_id: int,
    body: IncreasePercentageUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Update increase percentage for an employee entry."""
    entry = update_entry_percentage(db, entry_id, body.increase_percentage)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry_dict = _serialize_entry(entry)
    _enrich_entry_with_name(entry_dict, db)
    return entry_dict


@router.get("/cycles/{cycle_id}/leadership")
def list_leadership_for_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_READ_ALL)),
):
    """List all President/SVP/VP employees for the checkbox UI."""
    leaders = _find_decision_makers(db)

    # Get existing budget areas for this cycle to show enabled status
    areas = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle_id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id.isnot(None),
    ).all()
    area_map = {a.decision_maker_employee_id: a for a in areas}

    # Build lookup of leader employee_ids for parent resolution
    leader_ids = {l.employee_id for l in leaders}

    result = []
    for leader in leaders:
        level = resolve_title_level(leader.position)
        area = area_map.get(leader.employee_id)

        # Find parent: walk up supervisor chain to find nearest leader
        parent_id = None
        if leader.supervisor:
            from app.services.org_chain_service import find_employee_by_supervisor_field
            sup = find_employee_by_supervisor_field(db, leader.supervisor)
            if sup and sup.employee_id in leader_ids:
                parent_id = sup.employee_id

        # Parse area label from position
        from app.services.annual_increase_service import _parse_budget_area_label
        area_label = _parse_budget_area_label(leader.position, leader)

        result.append({
            "employee_id": leader.employee_id,
            "name": f"{leader.first_name} {leader.last_name}",
            "position": leader.position,
            "title_level": level,
            "area_label": area_label,
            "budget_area_id": area.id if area else None,
            "is_dashboard_enabled": area.is_dashboard_enabled if area else False,
            "parent_employee_id": parent_id,
        })

    return result


# =============================================================================
# SUBMISSIONS / APPROVAL ENDPOINTS (HR HUB)
# =============================================================================

@router.get("/submissions")
def list_submissions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_READ_ALL)),
):
    """List submitted budget areas pending approval."""
    query = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.submission_status != "draft"
    )
    if status:
        query = query.filter(models.AnnualIncreaseBudgetArea.submission_status == status)

    areas = query.order_by(models.AnnualIncreaseBudgetArea.submitted_at.desc()).all()
    return [_serialize_budget_area(a) for a in areas]


@router.post("/submissions/{area_id}/approve")
def approve_submission(
    area_id: int,
    body: ApproveSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Approve a submitted budget area sheet."""
    area = approve_budget_area(db, area_id, body.reviewed_by, body.notes)
    if not area:
        raise HTTPException(status_code=404, detail="Budget area not found")

    # Notify decision maker of approval
    if area.decision_maker_employee_id:
        try:
            from app.api.in_app_notifications import create_notification
            dm_user = db.query(models.User).filter(
                models.User.employee_id == area.decision_maker_employee_id
            ).first()
            if dm_user:
                create_notification(
                    db=db,
                    title="Annual Increase Sheet Approved",
                    message="Your annual wage increase submissions have been approved.",
                    notification_type="annual_increase",
                    action_url="/annual-increase",
                    user_id=dm_user.id,
                    priority="normal",
                )
        except Exception:
            logger.exception("Failed to create approval notification")

    return _serialize_budget_area(area)


@router.post("/submissions/{area_id}/return")
def return_submission(
    area_id: int,
    body: ReturnSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.COMPENSATION_WRITE)),
):
    """Return a submitted budget area for adjustments."""
    area = return_budget_area(db, area_id, body.reviewed_by, body.notes)
    if not area:
        raise HTTPException(status_code=404, detail="Budget area not found")

    # Notify decision maker of return
    if area.decision_maker_employee_id:
        try:
            from app.api.in_app_notifications import create_notification
            dm_user = db.query(models.User).filter(
                models.User.employee_id == area.decision_maker_employee_id
            ).first()
            if dm_user:
                create_notification(
                    db=db,
                    title="Annual Increase Sheet Returned",
                    message=f"Your annual wage increase sheet has been returned for adjustments. Notes: {body.notes}",
                    notification_type="annual_increase",
                    action_url="/annual-increase",
                    user_id=dm_user.id,
                    priority="high",
                )
        except Exception:
            logger.exception("Failed to create return notification")

    return _serialize_budget_area(area)


# =============================================================================
# EMPLOYEE PORTAL ENDPOINTS (Decision Makers)
# =============================================================================

@router.get("/portal/annual-increase/active")
def get_active_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
):
    """Get the current user's active annual increase dashboard data."""
    if not current_user.employee_id:
        raise HTTPException(status_code=403, detail="No employee record linked to this user")

    # Find the most recent annual cycle
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.is_annual_auto == True,  # noqa: E712
    ).order_by(models.WageIncreaseCycle.fiscal_year.desc()).first()

    if not cycle:
        return {"active": False, "message": "No annual increase cycle found"}

    # Find this user's budget area
    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle.id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
        models.AnnualIncreaseBudgetArea.is_dashboard_enabled == True,  # noqa: E712
    ).first()

    if not area:
        return {"active": False, "message": "No active annual increase dashboard for you"}

    settings = get_cycle_settings(db, cycle.id)

    return {
        "active": True,
        "cycle": _serialize_cycle(cycle, settings),
        "budget_area": _serialize_budget_area(area),
    }


@router.get("/portal/annual-increase/employees")
def get_portal_employees(
    eligible: Optional[bool] = None,
    supervisor: Optional[str] = None,
    direct_only: bool = False,
    position: Optional[str] = None,
    team: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
):
    """Get employee entries for the decision maker's budget area."""
    if not current_user.employee_id:
        raise HTTPException(status_code=403, detail="No employee record linked")

    # Find active cycle and this user's budget area
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.is_annual_auto == True,  # noqa: E712
    ).order_by(models.WageIncreaseCycle.fiscal_year.desc()).first()

    if not cycle:
        return []

    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle.id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
        models.AnnualIncreaseBudgetArea.is_dashboard_enabled == True,  # noqa: E712
    ).first()

    if not area:
        return []

    query = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.budget_area_id == area.id,
    )

    if eligible is not None:
        if eligible:
            query = query.filter(
                or_(
                    models.AnnualIncreaseEntry.is_eligible == True,  # noqa: E712
                    models.AnnualIncreaseEntry.eligibility_override == True,  # noqa: E712
                )
            )
        else:
            query = query.filter(
                models.AnnualIncreaseEntry.is_eligible == False,  # noqa: E712
                models.AnnualIncreaseEntry.eligibility_override == False,  # noqa: E712
            )

    if position:
        query = query.filter(models.AnnualIncreaseEntry.position.ilike(f"%{position}%"))

    if team:
        query = query.filter(models.AnnualIncreaseEntry.team.ilike(f"%{team}%"))

    if supervisor:
        query = query.filter(models.AnnualIncreaseEntry.supervisor_name.ilike(f"%{supervisor}%"))

    entries = query.all()

    # If direct_only, filter to only direct reports
    if direct_only and current_user.employee_id:
        dm_employee = db.query(models.Employee).filter(
            models.Employee.employee_id == current_user.employee_id
        ).first()
        if dm_employee:
            from app.services.org_chain_service import _get_direct_reports_for_employee
            direct_ids = {r.employee_id for r in _get_direct_reports_for_employee(db, dm_employee)}
            entries = [e for e in entries if e.employee_id in direct_ids]

    result = []
    for entry in entries:
        entry_dict = _serialize_entry(entry)
        _enrich_entry_with_name(entry_dict, db)
        result.append(entry_dict)

    # Apply text search
    if search:
        search_lower = search.lower()
        result = [
            r for r in result
            if (r.get("employee_name") and search_lower in r["employee_name"].lower())
            or (r.get("employee_id") and search_lower in r["employee_id"].lower())
            or (r.get("position") and search_lower in r["position"].lower())
        ]

    return result


@router.put("/portal/annual-increase/employees/{entry_id}")
def portal_update_increase(
    entry_id: int,
    body: IncreasePercentageUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
):
    """Decision maker adjusts increase percentage for an employee."""
    # Verify the entry belongs to this decision maker's budget area
    entry = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.id == entry_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == entry.budget_area_id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
    ).first()
    if not area:
        raise HTTPException(status_code=403, detail="Not authorized to modify this entry")

    if area.submission_status in ("submitted", "approved"):
        raise HTTPException(status_code=400, detail="Cannot modify a submitted or approved sheet")

    updated = update_entry_percentage(db, entry_id, body.increase_percentage)
    if not updated:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry_dict = _serialize_entry(updated)
    _enrich_entry_with_name(entry_dict, db)
    return entry_dict


@router.post("/portal/annual-increase/employees/{entry_id}/request-eligibility")
def portal_request_eligibility(
    entry_id: int,
    body: EligibilityOverrideRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
):
    """Decision maker requests an ineligible employee be treated as eligible."""
    entry = db.query(models.AnnualIncreaseEntry).filter(
        models.AnnualIncreaseEntry.id == entry_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.id == entry.budget_area_id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
    ).first()
    if not area:
        raise HTTPException(status_code=403, detail="Not authorized to modify this entry")

    updated = request_eligibility_override(db, entry_id, body.justification)
    if not updated:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry_dict = _serialize_entry(updated)
    _enrich_entry_with_name(entry_dict, db)

    # Also return updated budget area
    db.refresh(area)
    return {
        "entry": entry_dict,
        "budget_area": _serialize_budget_area(area),
    }


@router.post("/portal/annual-increase/submit")
def portal_submit_sheet(
    body: SubmitSheetRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
):
    """Submit the decision maker's annual increase sheet for approval."""
    if not current_user.employee_id:
        raise HTTPException(status_code=403, detail="No employee record linked")

    # Find active cycle and budget area
    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.is_annual_auto == True,  # noqa: E712
    ).order_by(models.WageIncreaseCycle.fiscal_year.desc()).first()

    if not cycle:
        raise HTTPException(status_code=404, detail="No active annual cycle")

    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle.id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
    ).first()

    if not area:
        raise HTTPException(status_code=404, detail="No budget area found for your account")

    if area.submission_status == "approved":
        raise HTTPException(status_code=400, detail="Sheet already approved")

    result = submit_budget_area(db, area.id, body.overage_justification)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to submit sheet")

    # Notify SVP of HR (all admin users)
    try:
        from app.api.in_app_notifications import create_notification
        create_notification(
            db=db,
            title=f"Annual Increase Sheet Submitted — {area.area_label}",
            message=f"{area.area_label} has submitted their annual wage increase sheet for review.",
            notification_type="annual_increase",
            action_url="/compensation",
            user_id=None,  # Broadcast to all HR admins
            priority="high",
        )
    except Exception:
        logger.exception("Failed to create submission notification")

    return _serialize_budget_area(result)


@router.get("/portal/annual-increase/submission-status")
def portal_submission_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
):
    """Check submission status for the current decision maker."""
    if not current_user.employee_id:
        return {"status": "none"}

    cycle = db.query(models.WageIncreaseCycle).filter(
        models.WageIncreaseCycle.is_annual_auto == True,  # noqa: E712
    ).order_by(models.WageIncreaseCycle.fiscal_year.desc()).first()

    if not cycle:
        return {"status": "none"}

    area = db.query(models.AnnualIncreaseBudgetArea).filter(
        models.AnnualIncreaseBudgetArea.cycle_id == cycle.id,
        models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
    ).first()

    if not area:
        return {"status": "none"}

    return {
        "status": area.submission_status,
        "submitted_at": area.submitted_at.isoformat() if area.submitted_at else None,
        "reviewed_by": area.reviewed_by,
        "reviewed_at": area.reviewed_at.isoformat() if area.reviewed_at else None,
        "review_notes": area.review_notes,
    }
