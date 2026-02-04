"""
HR Admin API - Personnel Action Request Management

Provides HR Admin endpoints for reviewing, approving, and managing
personnel action requests (PARs) submitted by supervisors.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, require_any_permission, Permissions


router = APIRouter(
    prefix="/admin/hr",
    tags=["HR Admin"],
    # Require FMLA read permission or employees write permission for all HR admin endpoints
    dependencies=[Depends(require_any_permission(
        Permissions.EMPLOYEES_WRITE_ALL,
        Permissions.FMLA_WRITE
    ))]
)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class PARDetail(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    employee_department: Optional[str] = None
    employee_position: Optional[str] = None
    submitter_name: str
    action_type: str
    current_value: str
    proposed_value: str
    effective_date: str
    justification: str
    status: str
    submitted_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewer_notes: Optional[str] = None


class PARListResponse(BaseModel):
    pars: List[PARDetail]
    total: int
    pending_count: int
    approved_count: int
    denied_count: int
    processing_count: int


class PARActionRequest(BaseModel):
    notes: Optional[str] = None


class PARActionResponse(BaseModel):
    success: bool
    message: str
    par_id: int
    new_status: str
    changes_applied: bool = False


# ============================================================================
# Helper Functions
# ============================================================================

def apply_par_changes(db: Session, par: models.PersonnelActionRequest) -> bool:
    """
    Apply the changes from an approved PAR to the employee record.
    Returns True if changes were applied successfully.
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == par.employee_id
    ).first()

    if not employee:
        return False

    try:
        if par.action_type == "supervisor_change":
            employee.supervisor = par.proposed_value
        elif par.action_type == "salary_change":
            # Try to parse the salary value
            try:
                new_salary = float(par.proposed_value.replace("$", "").replace(",", ""))
                employee.annual_wage = new_salary
            except ValueError:
                pass
        elif par.action_type == "position_change":
            employee.position = par.proposed_value
        elif par.action_type == "title_change":
            employee.position = par.proposed_value
        elif par.action_type == "transfer":
            # Transfer typically means department change
            employee.department = par.proposed_value

        db.commit()
        return True
    except Exception:
        db.rollback()
        return False


# ============================================================================
# PAR Management Endpoints
# ============================================================================

@router.get("/pars", response_model=PARListResponse)
def get_all_pars(
    status: Optional[str] = None,
    action_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all personnel action requests for HR review."""
    query = db.query(
        models.PersonnelActionRequest,
        models.Employee.first_name.label('emp_first'),
        models.Employee.last_name.label('emp_last'),
        models.Employee.department.label('emp_dept'),
        models.Employee.position.label('emp_position'),
        models.User.full_name.label('submitter_name')
    ).join(
        models.Employee,
        models.PersonnelActionRequest.employee_id == models.Employee.employee_id
    ).join(
        models.User,
        models.PersonnelActionRequest.submitted_by == models.User.id
    )

    if status:
        query = query.filter(models.PersonnelActionRequest.status == status)

    if action_type:
        query = query.filter(models.PersonnelActionRequest.action_type == action_type)

    # Order by submitted date, pending first
    query = query.order_by(
        models.PersonnelActionRequest.status.desc(),  # pending comes after others alphabetically, so desc
        models.PersonnelActionRequest.submitted_at.desc()
    )

    results = query.all()

    pars = []
    for par, emp_first, emp_last, emp_dept, emp_position, submitter_name in results:
        # Get reviewer name if exists
        reviewer_name = None
        if par.reviewed_by:
            reviewer = db.query(models.User).filter(models.User.id == par.reviewed_by).first()
            if reviewer:
                reviewer_name = reviewer.full_name

        pars.append(PARDetail(
            id=par.id,
            employee_id=par.employee_id,
            employee_name=f"{emp_first} {emp_last}",
            employee_department=emp_dept,
            employee_position=emp_position,
            submitter_name=submitter_name,
            action_type=par.action_type,
            current_value=par.current_value,
            proposed_value=par.proposed_value,
            effective_date=par.effective_date.isoformat() if par.effective_date else "",
            justification=par.justification,
            status=par.status,
            submitted_at=par.submitted_at.isoformat() if par.submitted_at else "",
            reviewed_by=reviewer_name,
            reviewed_at=par.reviewed_at.isoformat() if par.reviewed_at else None,
            reviewer_notes=par.reviewer_notes
        ))

    # Count by status
    all_pars_for_count = db.query(models.PersonnelActionRequest).all()
    pending_count = len([p for p in all_pars_for_count if p.status == "pending"])
    approved_count = len([p for p in all_pars_for_count if p.status == "approved"])
    denied_count = len([p for p in all_pars_for_count if p.status == "denied"])
    processing_count = len([p for p in all_pars_for_count if p.status == "processing"])

    return PARListResponse(
        pars=pars,
        total=len(results),
        pending_count=pending_count,
        approved_count=approved_count,
        denied_count=denied_count,
        processing_count=processing_count
    )


@router.post("/pars/{par_id}/approve", response_model=PARActionResponse)
def approve_par(
    par_id: int,
    action: PARActionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Approve a personnel action request and apply changes."""
    par = db.query(models.PersonnelActionRequest).filter(
        models.PersonnelActionRequest.id == par_id
    ).first()

    if not par:
        raise HTTPException(status_code=404, detail="PAR not found")

    if par.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve PAR with status '{par.status}'"
        )

    # Update PAR status
    par.status = "approved"
    par.reviewed_by = current_user.id
    par.reviewed_at = datetime.now()
    par.reviewer_notes = action.notes

    # Apply the changes to the employee record
    changes_applied = apply_par_changes(db, par)

    if changes_applied:
        par.status = "completed"  # Mark as completed since changes are applied

    db.commit()

    return PARActionResponse(
        success=True,
        message="PAR approved successfully" + (" and changes applied" if changes_applied else ""),
        par_id=par.id,
        new_status=par.status,
        changes_applied=changes_applied
    )


@router.post("/pars/{par_id}/deny", response_model=PARActionResponse)
def deny_par(
    par_id: int,
    action: PARActionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Deny a personnel action request."""
    par = db.query(models.PersonnelActionRequest).filter(
        models.PersonnelActionRequest.id == par_id
    ).first()

    if not par:
        raise HTTPException(status_code=404, detail="PAR not found")

    if par.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot deny PAR with status '{par.status}'"
        )

    # Update PAR status
    par.status = "denied"
    par.reviewed_by = current_user.id
    par.reviewed_at = datetime.now()
    par.reviewer_notes = action.notes

    db.commit()

    return PARActionResponse(
        success=True,
        message="PAR denied",
        par_id=par.id,
        new_status=par.status,
        changes_applied=False
    )


@router.get("/pars/{par_id}", response_model=PARDetail)
def get_par_detail(
    par_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get detailed information about a specific PAR."""
    result = db.query(
        models.PersonnelActionRequest,
        models.Employee.first_name.label('emp_first'),
        models.Employee.last_name.label('emp_last'),
        models.Employee.department.label('emp_dept'),
        models.Employee.position.label('emp_position'),
        models.User.full_name.label('submitter_name')
    ).join(
        models.Employee,
        models.PersonnelActionRequest.employee_id == models.Employee.employee_id
    ).join(
        models.User,
        models.PersonnelActionRequest.submitted_by == models.User.id
    ).filter(
        models.PersonnelActionRequest.id == par_id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="PAR not found")

    par, emp_first, emp_last, emp_dept, emp_position, submitter_name = result

    # Get reviewer name if exists
    reviewer_name = None
    if par.reviewed_by:
        reviewer = db.query(models.User).filter(models.User.id == par.reviewed_by).first()
        if reviewer:
            reviewer_name = reviewer.full_name

    return PARDetail(
        id=par.id,
        employee_id=par.employee_id,
        employee_name=f"{emp_first} {emp_last}",
        employee_department=emp_dept,
        employee_position=emp_position,
        submitter_name=submitter_name,
        action_type=par.action_type,
        current_value=par.current_value,
        proposed_value=par.proposed_value,
        effective_date=par.effective_date.isoformat() if par.effective_date else "",
        justification=par.justification,
        status=par.status,
        submitted_at=par.submitted_at.isoformat() if par.submitted_at else "",
        reviewed_by=reviewer_name,
        reviewed_at=par.reviewed_at.isoformat() if par.reviewed_at else None,
        reviewer_notes=par.reviewer_notes
    )
