"""FMLA (Family and Medical Leave Act) API routes for HR Dashboard.

RBAC Protection: FMLA data contains Protected Health Information (PHI).
Access is restricted to users with FMLA_READ or FMLA_WRITE permissions.
Roles with access: admin, hr
"""
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.audit_service import audit_service
from app.services.rbac_service import require_permission, Permissions
import pytz


router = APIRouter(
    prefix="/fmla",
    tags=["fmla"],
    # RBAC: Require FMLA_READ permission for all endpoints (PHI protection)
    dependencies=[Depends(require_permission(Permissions.FMLA_READ))]
)


# Pydantic models for request/response
class FMLACaseCreate(BaseModel):
    employee_id: str
    leave_type: str
    reason: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    intermittent: bool = False
    reduced_schedule: bool = False
    hours_approved: float = 480.0
    notes: Optional[str] = None


class FMLALeaveEntryCreate(BaseModel):
    case_id: int
    leave_date: str
    hours_taken: float
    entry_type: str  # "Full Day", "Partial Day", "Intermittent"
    notes: Optional[str] = None


class FMLACaseUpdate(BaseModel):
    status: Optional[str] = None
    end_date: Optional[str] = None
    certification_date: Optional[str] = None
    recertification_date: Optional[str] = None
    return_to_work_date: Optional[str] = None
    notes: Optional[str] = None


class FMLACaseNoteCreate(BaseModel):
    case_id: int
    note_text: str


@router.get("/")
def get_all_fmla_cases(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all FMLA cases with optional filtering.

    Args:
        status: Filter by case status
        employee_id: Filter by employee ID
        db: Database session

    Returns:
        List of FMLA cases with employee information
    """
    query = db.query(models.FMLACase)

    if status:
        query = query.filter(models.FMLACase.status == status)
    if employee_id:
        query = query.filter(models.FMLACase.employee_id == employee_id)

    cases = query.all()

    result = []
    for case in cases:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == case.employee_id
        ).first()

        result.append({
            "id": case.id,
            "case_number": case.case_number,
            "employee_id": case.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "department": employee.department if employee else None,
            "status": case.status,
            "leave_type": case.leave_type,
            "reason": case.reason,
            "request_date": case.request_date.isoformat() if case.request_date else None,
            "start_date": case.start_date.isoformat() if case.start_date else None,
            "end_date": case.end_date.isoformat() if case.end_date else None,
            "hours_approved": case.hours_approved,
            "hours_used": case.hours_used,
            "hours_remaining": case.hours_remaining,
            "intermittent": case.intermittent,
            "reduced_schedule": case.reduced_schedule,
            "certification_date": case.certification_date.isoformat() if case.certification_date else None,
            "return_to_work_date": case.return_to_work_date.isoformat() if case.return_to_work_date else None,
        })

    return result


@router.get("/dashboard")
def get_fmla_dashboard(db: Session = Depends(get_db)):
    """Get FMLA dashboard summary statistics.

    Returns:
        Dashboard metrics including active cases, pending requests, etc.
    """
    today = date.today()

    # Active cases (approved and ongoing)
    active_cases = db.query(models.FMLACase).filter(
        models.FMLACase.status == "Active"
    ).count()

    # Pending requests
    pending_cases = db.query(models.FMLACase).filter(
        models.FMLACase.status == "Pending"
    ).count()

    # Total cases this year
    ytd_cases = db.query(models.FMLACase).filter(
        func.extract('year', models.FMLACase.request_date) == today.year
    ).count()

    # Cases expiring soon (within 30 days)
    thirty_days = today + timedelta(days=30)
    expiring_soon = db.query(models.FMLACase).filter(
        models.FMLACase.status == "Active",
        models.FMLACase.end_date != None,
        models.FMLACase.end_date <= thirty_days,
        models.FMLACase.end_date >= today
    ).count()

    # Cases needing recertification (90 days from certification)
    recert_needed = db.query(models.FMLACase).filter(
        models.FMLACase.status == "Active",
        models.FMLACase.certification_date != None,
        models.FMLACase.recertification_date == None
    ).all()

    # Filter recertification cases (90+ days old)
    recert_count = sum(
        1 for case in recert_needed
        if (today - case.certification_date).days >= 90
    )

    # Leave type breakdown
    all_cases = db.query(models.FMLACase).all()
    leave_type_breakdown = {}
    for case in all_cases:
        leave_type = case.leave_type
        if leave_type not in leave_type_breakdown:
            leave_type_breakdown[leave_type] = 0
        leave_type_breakdown[leave_type] += 1

    # Status breakdown
    status_breakdown = {}
    for case in all_cases:
        status = case.status
        if status not in status_breakdown:
            status_breakdown[status] = 0
        status_breakdown[status] += 1

    return {
        "active_cases": active_cases,
        "pending_requests": pending_cases,
        "ytd_cases": ytd_cases,
        "expiring_soon": expiring_soon,
        "recertification_needed": recert_count,
        "leave_type_breakdown": leave_type_breakdown,
        "status_breakdown": status_breakdown,
        "as_of": today.isoformat(),
    }


@router.post("/cases")
def create_fmla_case(
    request: Request,
    case_data: FMLACaseCreate,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_WRITE)),
    db: Session = Depends(get_db)
):
    """Create a new FMLA case.

    Args:
        case_data: FMLA case creation data
        db: Database session

    Returns:
        Created FMLA case
    """
    # Check if employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == case_data.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate case number (format: FMLA-YYYY-NNNN)
    year = datetime.now().year
    last_case = db.query(models.FMLACase).filter(
        models.FMLACase.case_number.like(f"FMLA-{year}-%")
    ).order_by(models.FMLACase.id.desc()).first()

    if last_case:
        last_number = int(last_case.case_number.split("-")[-1])
        case_number = f"FMLA-{year}-{last_number + 1:04d}"
    else:
        case_number = f"FMLA-{year}-0001"

    # Create case
    new_case = models.FMLACase(
        case_number=case_number,
        employee_id=case_data.employee_id,
        status="Pending",
        leave_type=case_data.leave_type,
        reason=case_data.reason,
        request_date=date.today(),
        start_date=datetime.fromisoformat(case_data.start_date).date(),
        end_date=datetime.fromisoformat(case_data.end_date).date() if case_data.end_date else None,
        hours_approved=case_data.hours_approved,
        hours_used=0.0,
        hours_remaining=case_data.hours_approved,
        intermittent=case_data.intermittent,
        reduced_schedule=case_data.reduced_schedule,
        notes=case_data.notes,
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Audit log: FMLA case created (PHI - protected health information)
    audit_service.log_data_create(
        db, current_user, request, "fmla_case", new_case.id,
        new_data={"case_number": case_number, "employee_id": case_data.employee_id, "leave_type": case_data.leave_type}
    )

    return {
        "message": "FMLA case created successfully",
        "case_number": new_case.case_number,
        "id": new_case.id,
    }


@router.get("/cases/{case_id}")
def get_fmla_case(case_id: int, db: Session = Depends(get_db)):
    """Get detailed information for a specific FMLA case.

    Args:
        case_id: FMLA case ID
        db: Database session

    Returns:
        Detailed FMLA case information including leave entries
    """
    case = db.query(models.FMLACase).filter(models.FMLACase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="FMLA case not found")

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == case.employee_id
    ).first()

    # Get leave entries
    leave_entries = db.query(models.FMLALeaveEntry).filter(
        models.FMLALeaveEntry.case_id == case_id
    ).order_by(models.FMLALeaveEntry.leave_date.desc()).all()

    # Get case notes
    case_notes = db.query(models.FMLACaseNote).filter(
        models.FMLACaseNote.case_id == case_id
    ).order_by(models.FMLACaseNote.created_at.desc()).all()

    return {
        "id": case.id,
        "case_number": case.case_number,
        "employee_id": case.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
        "department": employee.department if employee else None,
        "status": case.status,
        "leave_type": case.leave_type,
        "reason": case.reason,
        "request_date": case.request_date.isoformat() if case.request_date else None,
        "start_date": case.start_date.isoformat() if case.start_date else None,
        "end_date": case.end_date.isoformat() if case.end_date else None,
        "hours_approved": case.hours_approved,
        "hours_used": case.hours_used,
        "hours_remaining": case.hours_remaining,
        "intermittent": case.intermittent,
        "reduced_schedule": case.reduced_schedule,
        "certification_date": case.certification_date.isoformat() if case.certification_date else None,
        "recertification_date": case.recertification_date.isoformat() if case.recertification_date else None,
        "return_to_work_date": case.return_to_work_date.isoformat() if case.return_to_work_date else None,
        "notes": case.notes,
        "leave_entries": [
            {
                "id": entry.id,
                "leave_date": entry.leave_date.isoformat(),
                "hours_taken": entry.hours_taken,
                "entry_type": entry.entry_type,
                "notes": entry.notes,
            }
            for entry in leave_entries
        ],
        "case_notes": [
            {
                "id": note.id,
                "note_text": note.note_text,
                "created_at": note.created_at.isoformat(),
            }
            for note in case_notes
        ],
    }


@router.patch("/cases/{case_id}")
def update_fmla_case(
    request: Request,
    case_id: int,
    updates: FMLACaseUpdate,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_WRITE)),
    db: Session = Depends(get_db)
):
    """Update an existing FMLA case.

    Args:
        case_id: FMLA case ID
        updates: Fields to update
        db: Database session

    Returns:
        Updated case information
    """
    case = db.query(models.FMLACase).filter(models.FMLACase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="FMLA case not found")

    # Capture old values for audit log
    old_values = {
        "status": case.status,
        "end_date": case.end_date.isoformat() if case.end_date else None,
        "certification_date": case.certification_date.isoformat() if case.certification_date else None,
    }

    # Update fields if provided
    if updates.status:
        case.status = updates.status
    if updates.end_date:
        case.end_date = datetime.fromisoformat(updates.end_date).date()
    if updates.certification_date:
        case.certification_date = datetime.fromisoformat(updates.certification_date).date()
    if updates.recertification_date:
        case.recertification_date = datetime.fromisoformat(updates.recertification_date).date()
    if updates.return_to_work_date:
        case.return_to_work_date = datetime.fromisoformat(updates.return_to_work_date).date()
    if updates.notes is not None:
        case.notes = updates.notes

    db.commit()

    # Audit log: FMLA case updated (PHI)
    new_values = {
        "status": case.status,
        "end_date": case.end_date.isoformat() if case.end_date else None,
        "certification_date": case.certification_date.isoformat() if case.certification_date else None,
    }
    audit_service.log_data_update(
        db, current_user, request, "fmla_case", case_id,
        old_data=old_values, new_data=new_values
    )
    db.refresh(case)

    return {"message": "FMLA case updated successfully", "case_id": case.id}


@router.post("/leave-entries")
def add_leave_entry(entry_data: FMLALeaveEntryCreate, db: Session = Depends(get_db)):
    """Add a leave entry to an FMLA case.

    Args:
        entry_data: Leave entry data
        db: Database session

    Returns:
        Created leave entry and updated case hours
    """
    # Check if case exists
    case = db.query(models.FMLACase).filter(models.FMLACase.id == entry_data.case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="FMLA case not found")

    # Create leave entry
    new_entry = models.FMLALeaveEntry(
        case_id=entry_data.case_id,
        leave_date=datetime.fromisoformat(entry_data.leave_date).date(),
        hours_taken=entry_data.hours_taken,
        entry_type=entry_data.entry_type,
        notes=entry_data.notes,
    )

    db.add(new_entry)

    # Update case hours
    case.hours_used += entry_data.hours_taken
    case.hours_remaining = case.hours_approved - case.hours_used

    db.commit()
    db.refresh(new_entry)
    db.refresh(case)

    return {
        "message": "Leave entry added successfully",
        "entry_id": new_entry.id,
        "hours_used": case.hours_used,
        "hours_remaining": case.hours_remaining,
    }


@router.get("/employee/{employee_id}")
def get_employee_fmla_history(employee_id: str, db: Session = Depends(get_db)):
    """Get FMLA history for a specific employee.

    Args:
        employee_id: Employee ID
        db: Database session

    Returns:
        List of FMLA cases for the employee
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    cases = db.query(models.FMLACase).filter(
        models.FMLACase.employee_id == employee_id
    ).order_by(models.FMLACase.request_date.desc()).all()

    # Calculate rolling 12-month usage
    today = date.today()
    twelve_months_ago = today - timedelta(days=365)

    recent_cases = [
        c for c in cases
        if c.start_date and c.start_date >= twelve_months_ago
    ]

    total_hours_used_12mo = sum(c.hours_used for c in recent_cases)
    hours_available_12mo = 480.0 - total_hours_used_12mo

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "total_cases": len(cases),
        "rolling_12mo_hours_used": total_hours_used_12mo,
        "rolling_12mo_hours_available": max(0, hours_available_12mo),
        "cases": [
            {
                "id": case.id,
                "case_number": case.case_number,
                "status": case.status,
                "leave_type": case.leave_type,
                "start_date": case.start_date.isoformat() if case.start_date else None,
                "end_date": case.end_date.isoformat() if case.end_date else None,
                "hours_used": case.hours_used,
                "hours_remaining": case.hours_remaining,
            }
            for case in cases
        ],
    }


@router.post("/cases/{case_id}/notes")
def add_case_note(case_id: int, note_data: FMLACaseNoteCreate, db: Session = Depends(get_db)):
    """Add a note to an FMLA case.

    Args:
        case_id: FMLA case ID
        note_data: Note creation data
        db: Database session

    Returns:
        Created note
    """
    # Check if case exists
    case = db.query(models.FMLACase).filter(models.FMLACase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="FMLA case not found")

    # Create note with current timestamp
    new_note = models.FMLACaseNote(
        case_id=case_id,
        note_text=note_data.note_text,
        created_at=date.today(),
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return {
        "message": "Note added successfully",
        "note": {
            "id": new_note.id,
            "note_text": new_note.note_text,
            "created_at": new_note.created_at.isoformat(),
        }
    }


# =============================================================================
# FMLA WH-381 Notice of Eligibility Form Generation
# =============================================================================

from app.services.fmla_form_service import FMLAFormService
from app.api.auth import get_current_user


class FMLANoticeRequestCreate(BaseModel):
    """Schema for creating FMLA WH-381 Notice request"""
    employee_id: int
    request_date: date
    leave_start_date: date
    leave_end_date: Optional[date] = None
    leave_reason: str  # birth_adoption, own_health, family_care, military_exigency, military_caregiver
    family_relationship: Optional[str] = None
    certification_required: bool = False
    certification_type: Optional[str] = None
    certification_attached: bool = False
    relationship_cert_required: bool = False
    is_key_employee: bool = False
    some_unpaid: bool = True
    employer_requires_paid: bool = True
    other_leave_arrangement: Optional[str] = None
    internal_notes: Optional[str] = None
    generate_notice: bool = True


class FMLANoticeResponse(BaseModel):
    """Response for FMLA Notice request"""
    id: int
    employee_id: int
    request_date: str
    leave_start_date: str
    is_eligible: bool
    status: str
    filled_form_path: Optional[str]


class EligibilityCheckRequest(BaseModel):
    """Schema for checking FMLA eligibility"""
    employee_id: int
    leave_start_date: date


@router.post("/check-eligibility")
def check_fmla_eligibility(
    request: EligibilityCheckRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Check if an employee is eligible for FMLA leave"""
    # Get employee
    employee = db.query(models.Employee).filter(models.Employee.id == request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check eligibility
    fmla_service = FMLAFormService()
    employment_type = employee.employment_type or "Full Time"
    eligibility = fmla_service.calculate_eligibility(
        employee,
        request.leave_start_date,
        employment_type
    )

    return eligibility


@router.post("/create-notice")
def create_fmla_notice(
    request: FMLANoticeRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create FMLA WH-381 Notice of Eligibility and Rights & Responsibilities"""
    # Get employee
    employee = db.query(models.Employee).filter(models.Employee.id == request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check eligibility
    fmla_service = FMLAFormService()
    employment_type = employee.employment_type or "Full Time"
    eligibility = fmla_service.calculate_eligibility(
        employee,
        request.leave_start_date,
        employment_type
    )

    # Calculate certification due date
    cert_due_date = None
    if request.certification_required:
        cert_due_date = request.request_date + timedelta(days=30)

    # Create FMLA leave request record
    fmla_request = models.FMLALeaveRequest(
        employee_id=request.employee_id,
        request_date=request.request_date,
        leave_start_date=request.leave_start_date,
        leave_end_date=request.leave_end_date,
        leave_reason=request.leave_reason,
        family_relationship=request.family_relationship,
        is_eligible=eligibility['is_eligible'],
        months_employed=eligibility['months_employed'],
        hours_worked_12months=eligibility['hours_worked_12months'],
        ineligibility_reasons=eligibility['ineligibility_reasons'],
        certification_required=request.certification_required,
        certification_type=request.certification_type,
        certification_due_date=cert_due_date,
        certification_attached=request.certification_attached,
        relationship_cert_required=request.relationship_cert_required,
        is_key_employee=request.is_key_employee,
        some_unpaid=request.some_unpaid,
        employer_requires_paid=request.employer_requires_paid,
        other_leave_arrangement=request.other_leave_arrangement,
        internal_notes=request.internal_notes,
        created_by=current_user.username,
        status='draft'
    )

    db.add(fmla_request)
    db.commit()
    db.refresh(fmla_request)

    # Generate notice if requested
    if request.generate_notice:
        try:
            # Prepare request data for form generation
            request_data = {
                'request_date': request.request_date,
                'leave_start_date': request.leave_start_date,
                'leave_end_date': request.leave_end_date,
                'leave_reason': request.leave_reason,
                'family_relationship': request.family_relationship,
                'certification_required': request.certification_required,
                'certification_attached': request.certification_attached,
                'relationship_cert_required': request.relationship_cert_required,
                'is_key_employee': request.is_key_employee,
                'some_unpaid': request.some_unpaid,
                'employer_requires_paid': request.employer_requires_paid,
                'other_leave_arrangement': request.other_leave_arrangement,
            }

            # Generate the form
            filled_form_path = fmla_service.generate_form(employee, request_data)

            # Update the request with the form path
            fmla_request.filled_form_path = filled_form_path
            fmla_request.status = 'notice_generated'

            db.commit()
            db.refresh(fmla_request)

        except Exception as e:
            # If form generation fails, still return the request but with error status
            fmla_request.status = 'error'
            fmla_request.internal_notes = f"{fmla_request.internal_notes or ''}\n\nForm generation error: {str(e)}"
            db.commit()
            db.refresh(fmla_request)

    return {
        "id": fmla_request.id,
        "employee_id": fmla_request.employee_id,
        "request_date": fmla_request.request_date.isoformat(),
        "leave_start_date": fmla_request.leave_start_date.isoformat(),
        "is_eligible": fmla_request.is_eligible,
        "status": fmla_request.status,
        "filled_form_path": fmla_request.filled_form_path,
    }


@router.get("/notices")
def list_fmla_notices(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List FMLA WH-381 notices with optional filtering"""
    query = db.query(models.FMLALeaveRequest)

    if employee_id:
        query = query.filter(models.FMLALeaveRequest.employee_id == employee_id)

    if status:
        query = query.filter(models.FMLALeaveRequest.status == status)

    notices = query.order_by(models.FMLALeaveRequest.created_at.desc()).all()

    return [{
        "id": notice.id,
        "employee_id": notice.employee_id,
        "request_date": notice.request_date.isoformat(),
        "leave_start_date": notice.leave_start_date.isoformat(),
        "leave_reason": notice.leave_reason,
        "is_eligible": notice.is_eligible,
        "status": notice.status,
        "created_at": notice.created_at.isoformat(),
    } for notice in notices]


@router.get("/notices/{notice_id}")
def get_fmla_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific FMLA WH-381 notice"""
    notice = db.query(models.FMLALeaveRequest).filter(models.FMLALeaveRequest.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="FMLA notice not found")

    employee = db.query(models.Employee).filter(models.Employee.id == notice.employee_id).first()

    return {
        "id": notice.id,
        "employee_id": notice.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
        "request_date": notice.request_date.isoformat(),
        "leave_start_date": notice.leave_start_date.isoformat(),
        "leave_end_date": notice.leave_end_date.isoformat() if notice.leave_end_date else None,
        "leave_reason": notice.leave_reason,
        "family_relationship": notice.family_relationship,
        "is_eligible": notice.is_eligible,
        "months_employed": notice.months_employed,
        "hours_worked_12months": notice.hours_worked_12months,
        "status": notice.status,
        "filled_form_path": notice.filled_form_path,
        "notice_sent_date": notice.notice_sent_date.isoformat() if notice.notice_sent_date else None,
        "created_at": notice.created_at.isoformat(),
        "internal_notes": notice.internal_notes,
    }


@router.get("/notices/{notice_id}/download")
def download_fmla_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Download the filled WH-381 form"""
    from fastapi.responses import FileResponse
    import os

    # Get the FMLA notice
    notice = db.query(models.FMLALeaveRequest).filter(models.FMLALeaveRequest.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="FMLA notice not found")

    if not notice.filled_form_path:
        raise HTTPException(status_code=404, detail="No form has been generated for this notice")

    # Check if file exists
    if not os.path.exists(notice.filled_form_path):
        raise HTTPException(status_code=404, detail="Form file not found")

    # Get employee for filename
    employee = db.query(models.Employee).filter(models.Employee.id == notice.employee_id).first()
    filename = f"FMLA_WH381_{employee.first_name}_{employee.last_name}_{notice.id}.pdf"

    return FileResponse(
        path=notice.filled_form_path,
        filename=filename,
        media_type='application/pdf'
    )


@router.post("/notices/{notice_id}/send-email")
async def send_fmla_notice_email(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Send FMLA notice to employee via email"""
    from app.services.email_service import email_service

    # Get the FMLA notice
    notice = db.query(models.FMLALeaveRequest).filter(models.FMLALeaveRequest.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="FMLA notice not found")

    # Get employee
    employee = db.query(models.Employee).filter(models.Employee.id == notice.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if employee has email
    if not hasattr(employee, 'email') or not employee.email:
        raise HTTPException(status_code=400, detail="Employee does not have an email address")

    # Check if form has been generated
    if not notice.filled_form_path:
        raise HTTPException(status_code=400, detail="No form has been generated for this notice. Generate the notice first.")

    # Send the email
    try:
        await email_service.send_fmla_notice(
            to_email=employee.email,
            employee_name=f"{employee.first_name} {employee.last_name}",
            leave_start_date=notice.leave_start_date.strftime("%B %d, %Y"),
            leave_reason=notice.leave_reason,
            is_eligible=notice.is_eligible,
            certification_required=notice.certification_required,
            certification_due_date=notice.certification_due_date.strftime("%B %d, %Y") if notice.certification_due_date else None,
            notice_pdf_path=notice.filled_form_path,
            cc_hr=True
        )

        # Update notice status and delivery tracking
        notice.notice_sent_date = datetime.now()
        notice.notice_sent_method = 'email'
        if notice.status == 'notice_generated':
            notice.status = 'sent_to_employee'

        db.commit()

        return {
            "message": "FMLA notice sent successfully",
            "sent_to": employee.email,
            "sent_at": notice.notice_sent_date.isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
