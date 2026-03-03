"""
PTO Team Calendar API

Provides chain-of-command PTO calendar visibility endpoints.
Employees see approved PTO for themselves, supervisors up to a
configurable title ceiling, peers, and all reports below them.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import date
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.db.pto_calendar_models import (
    PTOCalendarCeiling,
    TITLE_HIERARCHY,
    AVAILABLE_CEILING_LEVELS,
    DEFAULT_CEILING,
)
from app.services.rbac_service import require_any_permission, Permissions
from app.services.org_chain_service import (
    get_visible_employees,
    get_effective_ceiling,
    can_set_ceiling,
    resolve_title_level,
)


router = APIRouter(
    prefix="/portal/pto-calendar",
    tags=["Employee Portal - PTO Calendar"],
)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class CalendarPerson(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    relationship: str  # "self", "supervisor", "peer", "report"


class CalendarEvent(BaseModel):
    id: int
    employee_id: str
    start_date: date
    end_date: date
    pto_type: str
    status: str
    hours_requested: float


class CalendarEventsResponse(BaseModel):
    people: List[CalendarPerson]
    events: List[CalendarEvent]
    effective_ceiling: str
    can_modify_ceiling: bool


class CeilingLevel(BaseModel):
    value: str
    label: str


class CeilingResponse(BaseModel):
    effective_ceiling: str
    can_modify: bool
    current_override: Optional[str] = None
    available_levels: List[CeilingLevel]


class CeilingUpdateRequest(BaseModel):
    ceiling_title_level: str


# ============================================================================
# Helper Functions
# ============================================================================

def get_employee_for_user(db: Session, user: models.User) -> models.Employee:
    """Get the employee record for the current user."""
    if not user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record",
        )

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == user.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found",
        )

    return employee


def _employee_to_person(
    emp: models.Employee, relationship: str
) -> CalendarPerson:
    """Convert an Employee model to a CalendarPerson schema."""
    return CalendarPerson(
        employee_id=emp.employee_id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        position=emp.position,
        department=emp.department if hasattr(emp, "department") else None,
        relationship=relationship,
    )


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/events", response_model=CalendarEventsResponse)
def get_calendar_events(
    start_date: date = Query(..., description="Start of date range (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End of date range (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF,
    )),
):
    """
    Get PTO calendar events for the current user's chain of command.
    Only approved PTO requests within the date range are returned.
    """
    employee = get_employee_for_user(db, current_user)

    # Get visible employees via chain-of-command resolution
    visible = get_visible_employees(db, employee)

    # Build people list with relationship tags
    people: List[CalendarPerson] = [
        _employee_to_person(visible["self"], "self"),
    ]
    for sup in visible["supervisors"]:
        people.append(_employee_to_person(sup, "supervisor"))
    for peer in visible["peers"]:
        people.append(_employee_to_person(peer, "peer"))
    for report in visible["reports"]:
        people.append(_employee_to_person(report, "report"))

    # Collect all visible employee_ids
    visible_ids = [p.employee_id for p in people]

    # Query approved PTO requests within the date range
    events: List[CalendarEvent] = []
    if visible_ids:
        pto_requests = db.query(models.PTORequest).filter(
            models.PTORequest.employee_id.in_(visible_ids),
            models.PTORequest.status == "approved",
            and_(
                models.PTORequest.start_date <= end_date,
                models.PTORequest.end_date >= start_date,
            ),
        ).all()

        events = [
            CalendarEvent(
                id=req.id,
                employee_id=req.employee_id,
                start_date=req.start_date,
                end_date=req.end_date,
                pto_type=req.pto_type,
                status=req.status,
                hours_requested=req.hours_requested,
            )
            for req in pto_requests
        ]

    effective_ceiling = get_effective_ceiling(db, employee.employee_id)

    return CalendarEventsResponse(
        people=people,
        events=events,
        effective_ceiling=effective_ceiling,
        can_modify_ceiling=can_set_ceiling(current_user, employee),
    )


@router.get("/ceiling", response_model=CeilingResponse)
def get_ceiling(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF,
    )),
):
    """Get the current ceiling configuration for the logged-in user."""
    employee = get_employee_for_user(db, current_user)

    effective = get_effective_ceiling(db, employee.employee_id)

    # Check for a personal override
    override = db.query(PTOCalendarCeiling).filter(
        PTOCalendarCeiling.set_by_employee_id == employee.employee_id
    ).first()

    return CeilingResponse(
        effective_ceiling=effective,
        can_modify=can_set_ceiling(current_user, employee),
        current_override=override.ceiling_title_level if override else None,
        available_levels=[
            CeilingLevel(**level) for level in AVAILABLE_CEILING_LEVELS
        ],
    )


@router.put("/ceiling")
def update_ceiling(
    body: CeilingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF,
    )),
):
    """
    Set or update the PTO calendar visibility ceiling.
    Only HR admins or Director+ employees may modify.
    """
    employee = get_employee_for_user(db, current_user)

    if not can_set_ceiling(current_user, employee):
        raise HTTPException(
            status_code=403,
            detail="Only HR admins or Director+ employees can modify the ceiling",
        )

    if body.ceiling_title_level not in TITLE_HIERARCHY:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ceiling level. Must be one of: {', '.join(TITLE_HIERARCHY.keys())}",
        )

    # Upsert
    existing = db.query(PTOCalendarCeiling).filter(
        PTOCalendarCeiling.set_by_employee_id == employee.employee_id
    ).first()

    if existing:
        existing.ceiling_title_level = body.ceiling_title_level
    else:
        new_ceiling = PTOCalendarCeiling(
            set_by_employee_id=employee.employee_id,
            ceiling_title_level=body.ceiling_title_level,
        )
        db.add(new_ceiling)

    db.commit()

    return {
        "success": True,
        "message": "Ceiling updated successfully",
        "ceiling_title_level": body.ceiling_title_level,
    }


@router.delete("/ceiling")
def reset_ceiling(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF,
    )),
):
    """
    Remove the user's ceiling override, reverting to the default.
    Only HR admins or Director+ employees may modify.
    """
    employee = get_employee_for_user(db, current_user)

    if not can_set_ceiling(current_user, employee):
        raise HTTPException(
            status_code=403,
            detail="Only HR admins or Director+ employees can modify the ceiling",
        )

    existing = db.query(PTOCalendarCeiling).filter(
        PTOCalendarCeiling.set_by_employee_id == employee.employee_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    return {
        "success": True,
        "message": "Ceiling reset to default",
        "ceiling_title_level": DEFAULT_CEILING,
    }
