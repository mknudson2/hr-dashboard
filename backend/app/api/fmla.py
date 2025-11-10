"""FMLA (Family and Medical Leave Act) API routes for HR Dashboard."""
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.db.database import get_db
from app.db import models
import pytz


router = APIRouter(prefix="/fmla", tags=["fmla"])


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
def create_fmla_case(case_data: FMLACaseCreate, db: Session = Depends(get_db)):
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
def update_fmla_case(case_id: int, updates: FMLACaseUpdate, db: Session = Depends(get_db)):
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
