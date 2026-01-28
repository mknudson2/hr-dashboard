"""
PTO Portal API

Provides PTO self-service endpoints for employees and supervisors.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, require_any_permission, Permissions


router = APIRouter(prefix="/portal/pto", tags=["Employee Portal - PTO"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class PTOBalance(BaseModel):
    vacation_available: float
    sick_available: float
    personal_available: float


class PTORequest(BaseModel):
    id: int
    start_date: date
    end_date: date
    pto_type: str
    hours: float
    status: str
    notes: Optional[str] = None
    submitted_at: datetime
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class PTORequestsResponse(BaseModel):
    balance: PTOBalance
    requests: List[PTORequest]


class PTORequestCreate(BaseModel):
    start_date: date
    end_date: date
    pto_type: str
    hours: float
    notes: Optional[str] = None


class PTOReviewRequest(BaseModel):
    action: str  # approve, deny
    notes: Optional[str] = None


class TeamPTORequest(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    start_date: date
    end_date: date
    pto_type: str
    hours: float
    status: str
    notes: Optional[str] = None
    submitted_at: datetime


# ============================================================================
# Helper Functions
# ============================================================================

def get_employee_for_user(db: Session, user: models.User) -> models.Employee:
    """Get the employee record for the current user."""
    if not user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == user.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found"
        )

    return employee


def get_direct_reports(db: Session, supervisor_name: str) -> List[models.Employee]:
    """Get all direct reports for a supervisor."""
    return db.query(models.Employee).filter(
        or_(
            models.Employee.supervisor == supervisor_name,
            models.Employee.supervisor.ilike(f"%{supervisor_name}%")
        ),
        models.Employee.status == "Active"
    ).all()


# ============================================================================
# Employee PTO Endpoints
# ============================================================================

@router.get("/balance")
def get_pto_balance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF
    ))
):
    """Get the current user's PTO balance."""
    employee = get_employee_for_user(db, current_user)

    vacation_available = (employee.pto_allotted or 0) - (employee.pto_used or 0)

    return PTOBalance(
        vacation_available=max(0, vacation_available),
        sick_available=40,  # Default - would come from policy
        personal_available=16  # Default - would come from policy
    )


@router.get("/requests", response_model=PTORequestsResponse)
def get_pto_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF
    ))
):
    """Get the current user's PTO requests and balance."""
    employee = get_employee_for_user(db, current_user)

    vacation_available = (employee.pto_allotted or 0) - (employee.pto_used or 0)

    balance = PTOBalance(
        vacation_available=max(0, vacation_available),
        sick_available=40,
        personal_available=16
    )

    # Query PTORequest table if it exists
    # For now, return empty list as we haven't created the table yet
    requests: List[PTORequest] = []

    return PTORequestsResponse(
        balance=balance,
        requests=requests
    )


@router.post("/request")
def submit_pto_request(
    request: PTORequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_EMPLOYEE,
        Permissions.PTO_READ_SELF
    ))
):
    """Submit a new PTO request."""
    employee = get_employee_for_user(db, current_user)

    # Validate dates
    if request.start_date > request.end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date must be before or equal to end date"
        )

    if request.start_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Cannot request PTO for past dates"
        )

    # Check balance
    vacation_available = (employee.pto_allotted or 0) - (employee.pto_used or 0)
    if request.pto_type == "vacation" and request.hours > vacation_available:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient vacation balance. Available: {vacation_available} hours"
        )

    # In a real implementation, save to PTORequest table
    # For now, just return success

    return {
        "success": True,
        "message": "PTO request submitted successfully",
        "request_id": 1  # Placeholder
    }


# ============================================================================
# Supervisor PTO Endpoints
# ============================================================================

@router.get("/team/pending", response_model=List[TeamPTORequest])
def get_team_pending_pto(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_SUPERVISOR,
        Permissions.PTO_READ_TEAM
    ))
):
    """Get pending PTO requests for the supervisor's team."""
    # Get direct reports
    direct_reports = get_direct_reports(db, current_user.full_name)

    if not direct_reports:
        # Try using employee_id as supervisor identifier
        if current_user.employee_id:
            direct_reports = get_direct_reports(db, current_user.employee_id)

    # In a real implementation, query PTORequest table
    # For now, return empty list
    return []


@router.post("/team/{request_id}/review")
def review_pto_request(
    request_id: int,
    review: PTOReviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_SUPERVISOR,
        Permissions.PTO_WRITE_TEAM
    ))
):
    """Approve or deny a team member's PTO request."""
    if review.action not in ["approve", "deny"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be 'approve' or 'deny'"
        )

    # In a real implementation, update PTORequest record
    # For now, just return success

    return {
        "success": True,
        "message": f"PTO request {review.action}d successfully"
    }
