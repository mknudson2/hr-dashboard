"""Capitalized Labor Tracking API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field
import json
from ..db.database import get_db
from ..db.models import (
    Project, PayPeriod, Timesheet, TimeEntry, TimeEntryAudit,
    PayrollBatch, PayrollBatchLineItem, CapitalizationCalculation,
    CapitalizationAuditLog, Employee, User
)
from ..api.auth import get_current_user

router = APIRouter(
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


# ==================== PYDANTIC SCHEMAS ====================

# Project Schemas
class ProjectBase(BaseModel):
    project_code: str = Field(..., description="Unique project code")
    project_name: str = Field(..., description="Human-readable project name")
    description: Optional[str] = None
    is_capitalizable: bool = False
    capitalization_type: Optional[str] = None
    capitalization_start_date: Optional[date] = None
    capitalization_end_date: Optional[date] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    project_manager_id: Optional[int] = None
    total_budget: Optional[float] = None
    labor_budget: Optional[float] = None
    status: str = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    asset_id: Optional[str] = None
    amortization_period_months: Optional[int] = None
    amortization_start_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    description: Optional[str] = None
    is_capitalizable: Optional[bool] = None
    capitalization_type: Optional[str] = None
    capitalization_start_date: Optional[date] = None
    capitalization_end_date: Optional[date] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    project_manager_id: Optional[int] = None
    total_budget: Optional[float] = None
    labor_budget: Optional[float] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    asset_id: Optional[str] = None
    amortization_period_months: Optional[int] = None
    amortization_start_date: Optional[date] = None


class ProjectResponse(ProjectBase):
    id: int
    total_labor_cost: float
    total_capitalized_cost: float
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Time Entry Schemas
class TimeEntryBase(BaseModel):
    project_id: int
    work_date: date
    hours: float = Field(..., gt=0, le=24)
    labor_type: str = "direct"
    is_overtime: bool = False
    task_description: Optional[str] = None
    task_code: Optional[str] = None
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None


class TimeEntryCreate(TimeEntryBase):
    pass


class TimeEntryUpdate(BaseModel):
    project_id: Optional[int] = None
    work_date: Optional[date] = None
    hours: Optional[float] = Field(None, gt=0, le=24)
    labor_type: Optional[str] = None
    is_overtime: Optional[bool] = None
    task_description: Optional[str] = None
    task_code: Optional[str] = None
    edit_reason: Optional[str] = None


class TimeEntryResponse(TimeEntryBase):
    id: int
    timesheet_id: int
    employee_id: int
    is_capitalizable: bool
    capitalization_category: Optional[str]
    is_approved: bool
    is_edited: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Timesheet Schemas
class TimesheetBase(BaseModel):
    pay_period_id: int


class TimesheetCreate(TimesheetBase):
    pass


class TimesheetResponse(TimesheetBase):
    id: int
    employee_id: int
    total_hours: float
    regular_hours: float
    overtime_hours: float
    status: str
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    approved_by_id: Optional[int]
    rejection_reason: Optional[str]
    revision_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TimesheetSubmit(BaseModel):
    """Request to submit a timesheet for approval"""
    pass


class TimesheetApprove(BaseModel):
    """Request to approve a timesheet"""
    pass


class TimesheetReject(BaseModel):
    """Request to reject a timesheet"""
    rejection_reason: str


# Capitalization Calculation Schemas
class CapitalizationCalculationCreate(BaseModel):
    project_id: int
    calculation_month: int = Field(..., ge=1, le=12)
    calculation_year: int
    calculation_notes: Optional[str] = None


class CapitalizationCalculationResponse(BaseModel):
    id: int
    project_id: int
    calculation_month: int
    calculation_year: int
    calculation_date: date
    total_hours: float
    direct_labor_hours: float
    indirect_labor_hours: float
    total_labor_cost: float
    direct_labor_cost: float
    indirect_labor_cost: float
    overhead_allocation: float
    capitalizable_labor_cost: float
    capitalized_amount: float
    non_capitalized_amount: float
    journal_entry_number: Optional[str]
    posted_to_gl: bool
    approval_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== PROJECT ENDPOINTS ====================

@router.get("/projects")
def get_projects(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    is_capitalizable: Optional[bool] = None,
    department: Optional[str] = None
):
    """Get all projects with optional filters."""
    query = db.query(Project)

    if status:
        query = query.filter(Project.status == status)
    if is_capitalizable is not None:
        query = query.filter(Project.is_capitalizable == is_capitalizable)
    if department:
        query = query.filter(Project.department == department)

    projects = query.order_by(Project.created_at.desc()).all()

    return {
        "projects": [
            {
                "id": p.id,
                "project_code": p.project_code,
                "project_name": p.project_name,
                "description": p.description,
                "is_capitalizable": p.is_capitalizable,
                "capitalization_type": p.capitalization_type,
                "department": p.department,
                "cost_center": p.cost_center,
                "status": p.status,
                "total_budget": p.total_budget,
                "labor_budget": p.labor_budget,
                "total_labor_cost": p.total_labor_cost,
                "total_capitalized_cost": p.total_capitalized_cost,
                "start_date": str(p.start_date) if p.start_date else None,
                "end_date": str(p.end_date) if p.end_date else None,
                "created_at": str(p.created_at) if p.created_at else None
            }
            for p in projects
        ],
        "total": len(projects)
    }


@router.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get project manager info if available
    manager_name = None
    if project.project_manager_id:
        manager = db.query(Employee).filter(Employee.id == project.project_manager_id).first()
        if manager:
            manager_name = f"{manager.first_name} {manager.last_name}"

    return {
        "id": project.id,
        "project_code": project.project_code,
        "project_name": project.project_name,
        "description": project.description,
        "is_capitalizable": project.is_capitalizable,
        "capitalization_type": project.capitalization_type,
        "capitalization_start_date": str(project.capitalization_start_date) if project.capitalization_start_date else None,
        "capitalization_end_date": str(project.capitalization_end_date) if project.capitalization_end_date else None,
        "department": project.department,
        "cost_center": project.cost_center,
        "project_manager_id": project.project_manager_id,
        "project_manager_name": manager_name,
        "total_budget": project.total_budget,
        "labor_budget": project.labor_budget,
        "total_labor_cost": project.total_labor_cost,
        "total_capitalized_cost": project.total_capitalized_cost,
        "status": project.status,
        "start_date": str(project.start_date) if project.start_date else None,
        "end_date": str(project.end_date) if project.end_date else None,
        "asset_id": project.asset_id,
        "amortization_period_months": project.amortization_period_months,
        "amortization_start_date": str(project.amortization_start_date) if project.amortization_start_date else None,
        "created_at": str(project.created_at) if project.created_at else None,
        "updated_at": str(project.updated_at) if project.updated_at else None
    }


@router.post("/projects")
def create_project(project_data: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project."""
    # Check if project code already exists
    existing = db.query(Project).filter(Project.project_code == project_data.project_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project code already exists")

    new_project = Project(**project_data.dict())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return {
        "message": "Project created successfully",
        "project_id": new_project.id,
        "project_code": new_project.project_code
    }


@router.put("/projects/{project_id}")
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """Update a project."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update only provided fields
    for field, value in project_data.dict(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return {
        "message": "Project updated successfully",
        "project_id": project.id
    }


# ==================== TIME ENTRY ENDPOINTS ====================

@router.get("/time-entries")
def get_time_entries(
    db: Session = Depends(get_db),
    employee_id: Optional[int] = None,
    project_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    timesheet_id: Optional[int] = None
):
    """Get time entries with optional filters."""
    query = db.query(TimeEntry)

    if employee_id:
        query = query.filter(TimeEntry.employee_id == employee_id)
    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)
    if start_date:
        query = query.filter(TimeEntry.work_date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.work_date <= end_date)
    if timesheet_id:
        query = query.filter(TimeEntry.timesheet_id == timesheet_id)

    entries = query.order_by(TimeEntry.work_date.desc()).all()

    result = []
    for entry in entries:
        # Get employee name
        employee = db.query(Employee).filter(Employee.id == entry.employee_id).first()
        employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

        # Get project name
        project = db.query(Project).filter(Project.id == entry.project_id).first()
        project_name = project.project_name if project else "Unknown"

        result.append({
            "id": entry.id,
            "timesheet_id": entry.timesheet_id,
            "employee_id": entry.employee_id,
            "employee_name": employee_name,
            "project_id": entry.project_id,
            "project_name": project_name,
            "work_date": str(entry.work_date),
            "clock_in": str(entry.clock_in) if entry.clock_in else None,
            "clock_out": str(entry.clock_out) if entry.clock_out else None,
            "hours": entry.hours,
            "labor_type": entry.labor_type,
            "is_overtime": entry.is_overtime,
            "task_description": entry.task_description,
            "task_code": entry.task_code,
            "is_capitalizable": entry.is_capitalizable,
            "is_approved": entry.is_approved,
            "is_edited": entry.is_edited,
            "created_at": str(entry.created_at)
        })

    return {"time_entries": result, "total": len(result)}


@router.post("/time-entries")
def create_time_entry(
    entry_data: TimeEntryCreate,
    employee_id: int = Query(..., description="ID of employee creating the entry"),
    db: Session = Depends(get_db)
):
    """Create a new time entry."""
    # Get or create timesheet for this employee and current pay period
    # Find the current pay period
    today = date.today()
    pay_period = db.query(PayPeriod).filter(
        and_(
            PayPeriod.start_date <= today,
            PayPeriod.end_date >= today
        )
    ).first()

    if not pay_period:
        raise HTTPException(status_code=400, detail="No active pay period found")

    # Get or create timesheet
    timesheet = db.query(Timesheet).filter(
        and_(
            Timesheet.employee_id == employee_id,
            Timesheet.pay_period_id == pay_period.id
        )
    ).first()

    if not timesheet:
        timesheet = Timesheet(
            employee_id=employee_id,
            pay_period_id=pay_period.id,
            status="draft"
        )
        db.add(timesheet)
        db.flush()

    # Check if project is capitalizable
    project = db.query(Project).filter(Project.id == entry_data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create time entry
    new_entry = TimeEntry(
        timesheet_id=timesheet.id,
        employee_id=employee_id,
        **entry_data.dict(),
        is_capitalizable=project.is_capitalizable,
        capitalization_category=project.capitalization_type if project.is_capitalizable else None
    )
    db.add(new_entry)
    db.flush()

    # Create audit log
    audit_log = TimeEntryAudit(
        time_entry_id=new_entry.id,
        action="created",
        changed_by_id=employee_id,  # In a real app, get from auth context
        new_values={
            "project_id": entry_data.project_id,
            "work_date": str(entry_data.work_date),
            "hours": entry_data.hours,
            "labor_type": entry_data.labor_type
        }
    )
    db.add(audit_log)

    # Update timesheet totals
    _update_timesheet_totals(timesheet, db)

    db.commit()
    db.refresh(new_entry)

    return {
        "message": "Time entry created successfully",
        "time_entry_id": new_entry.id,
        "timesheet_id": timesheet.id
    }


@router.put("/time-entries/{entry_id}")
def update_time_entry(
    entry_id: int,
    entry_data: TimeEntryUpdate,
    user_id: int = Query(..., description="ID of user making the edit"),
    db: Session = Depends(get_db)
):
    """Update a time entry."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    # Check if timesheet is locked
    timesheet = db.query(Timesheet).filter(Timesheet.id == entry.timesheet_id).first()
    if timesheet.status in ["approved", "submitted"]:
        raise HTTPException(status_code=400, detail="Cannot edit time entry on submitted/approved timesheet")

    # Store old values for audit
    old_values = {
        "project_id": entry.project_id,
        "work_date": str(entry.work_date),
        "hours": entry.hours,
        "labor_type": entry.labor_type,
        "task_description": entry.task_description
    }

    # Update fields
    for field, value in entry_data.dict(exclude_unset=True).items():
        if field != "edit_reason":
            setattr(entry, field, value)

    entry.is_edited = True
    entry.edited_by_id = user_id
    entry.edited_at = datetime.now()
    if entry_data.edit_reason:
        entry.edit_reason = entry_data.edit_reason

    # Create audit log
    audit_log = TimeEntryAudit(
        time_entry_id=entry.id,
        action="updated",
        changed_by_id=user_id,
        old_values=old_values,
        new_values=entry_data.dict(exclude_unset=True),
        change_reason=entry_data.edit_reason
    )
    db.add(audit_log)

    # Update timesheet totals
    _update_timesheet_totals(timesheet, db)

    db.commit()

    return {"message": "Time entry updated successfully"}


@router.delete("/time-entries/{entry_id}")
def delete_time_entry(
    entry_id: int,
    user_id: int = Query(..., description="ID of user deleting the entry"),
    db: Session = Depends(get_db)
):
    """Delete a time entry."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    # Check if timesheet is locked
    timesheet = db.query(Timesheet).filter(Timesheet.id == entry.timesheet_id).first()
    if timesheet.status in ["approved", "submitted"]:
        raise HTTPException(status_code=400, detail="Cannot delete time entry on submitted/approved timesheet")

    # Create audit log before deletion
    audit_log = TimeEntryAudit(
        time_entry_id=entry.id,
        action="deleted",
        changed_by_id=user_id,
        old_values={
            "project_id": entry.project_id,
            "work_date": str(entry.work_date),
            "hours": entry.hours,
            "labor_type": entry.labor_type
        }
    )
    db.add(audit_log)

    db.delete(entry)

    # Update timesheet totals
    _update_timesheet_totals(timesheet, db)

    db.commit()

    return {"message": "Time entry deleted successfully"}


# ==================== TIMESHEET ENDPOINTS ====================

@router.get("/timesheets")
def get_timesheets(
    db: Session = Depends(get_db),
    employee_id: Optional[int] = None,
    pay_period_id: Optional[int] = None,
    status: Optional[str] = None
):
    """Get timesheets with optional filters."""
    query = db.query(Timesheet)

    if employee_id:
        query = query.filter(Timesheet.employee_id == employee_id)
    if pay_period_id:
        query = query.filter(Timesheet.pay_period_id == pay_period_id)
    if status:
        query = query.filter(Timesheet.status == status)

    timesheets = query.order_by(Timesheet.created_at.desc()).all()

    result = []
    for ts in timesheets:
        # Get employee name
        employee = db.query(Employee).filter(Employee.id == ts.employee_id).first()
        employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

        # Get pay period info
        pay_period = db.query(PayPeriod).filter(PayPeriod.id == ts.pay_period_id).first()

        result.append({
            "id": ts.id,
            "employee_id": ts.employee_id,
            "employee_name": employee_name,
            "pay_period_id": ts.pay_period_id,
            "pay_period_start": str(pay_period.start_date) if pay_period else None,
            "pay_period_end": str(pay_period.end_date) if pay_period else None,
            "total_hours": ts.total_hours,
            "regular_hours": ts.regular_hours,
            "overtime_hours": ts.overtime_hours,
            "status": ts.status,
            "submitted_at": str(ts.submitted_at) if ts.submitted_at else None,
            "approved_at": str(ts.approved_at) if ts.approved_at else None,
            "created_at": str(ts.created_at)
        })

    return {"timesheets": result, "total": len(result)}


@router.get("/timesheets/{timesheet_id}")
def get_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
    """Get a specific timesheet with all time entries."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    # Get time entries
    entries = db.query(TimeEntry).filter(TimeEntry.timesheet_id == timesheet_id).all()

    entry_list = []
    for entry in entries:
        project = db.query(Project).filter(Project.id == entry.project_id).first()
        entry_list.append({
            "id": entry.id,
            "project_id": entry.project_id,
            "project_name": project.project_name if project else "Unknown",
            "work_date": str(entry.work_date),
            "hours": entry.hours,
            "labor_type": entry.labor_type,
            "is_overtime": entry.is_overtime,
            "task_description": entry.task_description,
            "is_capitalizable": entry.is_capitalizable,
            "is_approved": entry.is_approved
        })

    # Get employee name
    employee = db.query(Employee).filter(Employee.id == timesheet.employee_id).first()
    employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

    # Get pay period
    pay_period = db.query(PayPeriod).filter(PayPeriod.id == timesheet.pay_period_id).first()

    return {
        "id": timesheet.id,
        "employee_id": timesheet.employee_id,
        "employee_name": employee_name,
        "pay_period_id": timesheet.pay_period_id,
        "pay_period_start": str(pay_period.start_date) if pay_period else None,
        "pay_period_end": str(pay_period.end_date) if pay_period else None,
        "total_hours": timesheet.total_hours,
        "regular_hours": timesheet.regular_hours,
        "overtime_hours": timesheet.overtime_hours,
        "status": timesheet.status,
        "submitted_at": str(timesheet.submitted_at) if timesheet.submitted_at else None,
        "approved_at": str(timesheet.approved_at) if timesheet.approved_at else None,
        "rejection_reason": timesheet.rejection_reason,
        "time_entries": entry_list
    }


@router.post("/timesheets/{timesheet_id}/submit")
def submit_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
    """Submit a timesheet for approval."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    if timesheet.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft timesheets can be submitted")

    timesheet.status = "submitted"
    timesheet.submitted_at = datetime.now()

    db.commit()

    return {"message": "Timesheet submitted for approval"}


@router.post("/timesheets/{timesheet_id}/approve")
def approve_timesheet(
    timesheet_id: int,
    manager_id: int = Query(..., description="ID of manager approving timesheet"),
    db: Session = Depends(get_db)
):
    """Approve a timesheet."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    if timesheet.status != "submitted":
        raise HTTPException(status_code=400, detail="Only submitted timesheets can be approved")

    timesheet.status = "approved"
    timesheet.approved_at = datetime.now()
    timesheet.approved_by_id = manager_id

    # Mark all time entries as approved
    db.query(TimeEntry).filter(TimeEntry.timesheet_id == timesheet_id).update(
        {"is_approved": True}
    )

    db.commit()

    return {"message": "Timesheet approved successfully"}


@router.post("/timesheets/{timesheet_id}/reject")
def reject_timesheet(
    timesheet_id: int,
    rejection_data: TimesheetReject,
    manager_id: int = Query(..., description="ID of manager rejecting timesheet"),
    db: Session = Depends(get_db)
):
    """Reject a timesheet and request revision."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    if timesheet.status != "submitted":
        raise HTTPException(status_code=400, detail="Only submitted timesheets can be rejected")

    timesheet.status = "needs_revision"
    timesheet.rejection_reason = rejection_data.rejection_reason
    timesheet.revision_count += 1

    db.commit()

    return {"message": "Timesheet rejected - revision requested"}


# ==================== HELPER FUNCTIONS ====================

def _update_timesheet_totals(timesheet: Timesheet, db: Session):
    """Recalculate timesheet totals based on time entries."""
    entries = db.query(TimeEntry).filter(TimeEntry.timesheet_id == timesheet.id).all()

    total_hours = sum(e.hours for e in entries)
    overtime_hours = sum(e.hours for e in entries if e.is_overtime)
    regular_hours = total_hours - overtime_hours

    timesheet.total_hours = total_hours
    timesheet.regular_hours = regular_hours
    timesheet.overtime_hours = overtime_hours


# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/summary")
def get_capitalization_summary(
    db: Session = Depends(get_db),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get summary of capitalized vs non-capitalized labor."""
    query = db.query(TimeEntry).filter(TimeEntry.is_approved == True)

    if start_date:
        query = query.filter(TimeEntry.work_date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.work_date <= end_date)

    entries = query.all()

    # Calculate totals
    total_hours = sum(e.hours for e in entries)
    capitalizable_hours = sum(e.hours for e in entries if e.is_capitalizable)
    non_capitalizable_hours = total_hours - capitalizable_hours

    direct_hours = sum(e.hours for e in entries if e.labor_type == 'direct')
    indirect_hours = sum(e.hours for e in entries if e.labor_type == 'indirect')
    overhead_hours = sum(e.hours for e in entries if e.labor_type == 'overhead')

    overtime_hours = sum(e.hours for e in entries if e.is_overtime)

    # Get unique employees and projects
    unique_employees = len(set(e.employee_id for e in entries))
    unique_projects = len(set(e.project_id for e in entries))

    return {
        "summary": {
            "total_hours": round(total_hours, 2),
            "capitalizable_hours": round(capitalizable_hours, 2),
            "non_capitalizable_hours": round(non_capitalizable_hours, 2),
            "capitalization_rate": round((capitalizable_hours / total_hours * 100) if total_hours > 0 else 0, 2)
        },
        "labor_type_breakdown": {
            "direct": round(direct_hours, 2),
            "indirect": round(indirect_hours, 2),
            "overhead": round(overhead_hours, 2)
        },
        "overtime": {
            "total_overtime_hours": round(overtime_hours, 2),
            "overtime_rate": round((overtime_hours / total_hours * 100) if total_hours > 0 else 0, 2)
        },
        "scope": {
            "employees": unique_employees,
            "projects": unique_projects,
            "total_entries": len(entries)
        }
    }


@router.get("/analytics/by-project")
def get_analytics_by_project(
    db: Session = Depends(get_db),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get labor hours and costs broken down by project."""
    query = db.query(TimeEntry).filter(TimeEntry.is_approved == True)

    if start_date:
        query = query.filter(TimeEntry.work_date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.work_date <= end_date)

    entries = query.all()

    # Group by project
    project_data = {}
    for entry in entries:
        project = db.query(Project).filter(Project.id == entry.project_id).first()
        if not project:
            continue

        if project.id not in project_data:
            project_data[project.id] = {
                "project_id": project.id,
                "project_code": project.project_code,
                "project_name": project.project_name,
                "is_capitalizable": project.is_capitalizable,
                "capitalization_type": project.capitalization_type,
                "total_hours": 0,
                "direct_hours": 0,
                "indirect_hours": 0,
                "overhead_hours": 0,
                "overtime_hours": 0,
                "unique_employees": set()
            }

        project_data[project.id]["total_hours"] += entry.hours
        if entry.labor_type == "direct":
            project_data[project.id]["direct_hours"] += entry.hours
        elif entry.labor_type == "indirect":
            project_data[project.id]["indirect_hours"] += entry.hours
        elif entry.labor_type == "overhead":
            project_data[project.id]["overhead_hours"] += entry.hours

        if entry.is_overtime:
            project_data[project.id]["overtime_hours"] += entry.hours

        project_data[project.id]["unique_employees"].add(entry.employee_id)

    # Convert sets to counts and round numbers
    result = []
    for proj in project_data.values():
        proj["employee_count"] = len(proj["unique_employees"])
        del proj["unique_employees"]
        proj["total_hours"] = round(proj["total_hours"], 2)
        proj["direct_hours"] = round(proj["direct_hours"], 2)
        proj["indirect_hours"] = round(proj["indirect_hours"], 2)
        proj["overhead_hours"] = round(proj["overhead_hours"], 2)
        proj["overtime_hours"] = round(proj["overtime_hours"], 2)
        result.append(proj)

    # Sort by total hours descending
    result.sort(key=lambda x: x["total_hours"], reverse=True)

    return {"projects": result, "total": len(result)}


@router.get("/analytics/by-employee")
def get_analytics_by_employee(
    db: Session = Depends(get_db),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get labor hours broken down by employee."""
    query = db.query(TimeEntry).filter(TimeEntry.is_approved == True)

    if start_date:
        query = query.filter(TimeEntry.work_date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.work_date <= end_date)

    entries = query.all()

    # Group by employee
    employee_data = {}
    for entry in entries:
        employee = db.query(Employee).filter(Employee.id == entry.employee_id).first()
        if not employee:
            continue

        if employee.id not in employee_data:
            employee_data[employee.id] = {
                "employee_id": employee.id,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "total_hours": 0,
                "capitalizable_hours": 0,
                "non_capitalizable_hours": 0,
                "direct_hours": 0,
                "indirect_hours": 0,
                "overhead_hours": 0,
                "overtime_hours": 0,
                "unique_projects": set()
            }

        employee_data[employee.id]["total_hours"] += entry.hours
        if entry.is_capitalizable:
            employee_data[employee.id]["capitalizable_hours"] += entry.hours
        else:
            employee_data[employee.id]["non_capitalizable_hours"] += entry.hours

        if entry.labor_type == "direct":
            employee_data[employee.id]["direct_hours"] += entry.hours
        elif entry.labor_type == "indirect":
            employee_data[employee.id]["indirect_hours"] += entry.hours
        elif entry.labor_type == "overhead":
            employee_data[employee.id]["overhead_hours"] += entry.hours

        if entry.is_overtime:
            employee_data[employee.id]["overtime_hours"] += entry.hours

        employee_data[employee.id]["unique_projects"].add(entry.project_id)

    # Convert sets to counts and round numbers
    result = []
    for emp in employee_data.values():
        emp["project_count"] = len(emp["unique_projects"])
        del emp["unique_projects"]
        emp["total_hours"] = round(emp["total_hours"], 2)
        emp["capitalizable_hours"] = round(emp["capitalizable_hours"], 2)
        emp["non_capitalizable_hours"] = round(emp["non_capitalizable_hours"], 2)
        emp["direct_hours"] = round(emp["direct_hours"], 2)
        emp["indirect_hours"] = round(emp["indirect_hours"], 2)
        emp["overhead_hours"] = round(emp["overhead_hours"], 2)
        emp["overtime_hours"] = round(emp["overtime_hours"], 2)
        emp["capitalization_rate"] = round((emp["capitalizable_hours"] / emp["total_hours"] * 100) if emp["total_hours"] > 0 else 0, 2)
        result.append(emp)

    # Sort by total hours descending
    result.sort(key=lambda x: x["total_hours"], reverse=True)

    return {"employees": result, "total": len(result)}
