"""API endpoints for turnover tracking."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Termination, InternalChange, Employee

router = APIRouter(prefix="/turnover", tags=["turnover"])


# Pydantic models
class TerminationCreate(BaseModel):
    employee_id: str
    termination_date: date
    termination_type: str
    termination_reason: Optional[str] = None
    position: Optional[str] = None
    supervisor: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    team: Optional[str] = None
    employment_type: Optional[str] = None
    annual_wage: float = 0.0
    hourly_wage: Optional[float] = None
    benefits_cost_annual: float = 0.0
    employer_taxes_annual: float = 0.0
    total_compensation: float = 0.0
    severance_cost: float = 0.0
    unused_pto_payout: float = 0.0
    recruitment_cost: float = 0.0
    training_cost: float = 0.0
    total_turnover_cost: float = 0.0
    rehire_eligible: bool = True
    notes: Optional[str] = None


class TerminationUpdate(BaseModel):
    termination_date: Optional[date] = None
    termination_type: Optional[str] = None
    termination_reason: Optional[str] = None
    position: Optional[str] = None
    supervisor: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    team: Optional[str] = None
    employment_type: Optional[str] = None
    annual_wage: Optional[float] = None
    hourly_wage: Optional[float] = None
    benefits_cost_annual: Optional[float] = None
    employer_taxes_annual: Optional[float] = None
    total_compensation: Optional[float] = None
    severance_cost: Optional[float] = None
    unused_pto_payout: Optional[float] = None
    recruitment_cost: Optional[float] = None
    training_cost: Optional[float] = None
    total_turnover_cost: Optional[float] = None
    rehire_eligible: Optional[bool] = None
    notes: Optional[str] = None


class InternalChangeCreate(BaseModel):
    employee_id: str
    change_date: date
    change_type: str
    change_reason: Optional[str] = None
    position_before: Optional[str] = None
    supervisor_before: Optional[str] = None
    department_before: Optional[str] = None
    cost_center_before: Optional[str] = None
    team_before: Optional[str] = None
    employment_type_before: Optional[str] = None
    position_after: Optional[str] = None
    supervisor_after: Optional[str] = None
    department_after: Optional[str] = None
    cost_center_after: Optional[str] = None
    team_after: Optional[str] = None
    employment_type_after: Optional[str] = None
    annual_wage_before: float = 0.0
    hourly_wage_before: Optional[float] = None
    benefits_cost_before: float = 0.0
    employer_taxes_before: float = 0.0
    total_compensation_before: float = 0.0
    annual_wage_after: float = 0.0
    hourly_wage_after: Optional[float] = None
    benefits_cost_after: float = 0.0
    employer_taxes_after: float = 0.0
    total_compensation_after: float = 0.0
    compensation_change_amount: float = 0.0
    compensation_change_percentage: float = 0.0
    annual_cost_impact: float = 0.0
    notes: Optional[str] = None


class InternalChangeUpdate(BaseModel):
    change_date: Optional[date] = None
    change_type: Optional[str] = None
    change_reason: Optional[str] = None
    position_before: Optional[str] = None
    supervisor_before: Optional[str] = None
    department_before: Optional[str] = None
    cost_center_before: Optional[str] = None
    team_before: Optional[str] = None
    employment_type_before: Optional[str] = None
    position_after: Optional[str] = None
    supervisor_after: Optional[str] = None
    department_after: Optional[str] = None
    cost_center_after: Optional[str] = None
    team_after: Optional[str] = None
    employment_type_after: Optional[str] = None
    annual_wage_before: Optional[float] = None
    hourly_wage_before: Optional[float] = None
    benefits_cost_before: Optional[float] = None
    employer_taxes_before: Optional[float] = None
    total_compensation_before: Optional[float] = None
    annual_wage_after: Optional[float] = None
    hourly_wage_after: Optional[float] = None
    benefits_cost_after: Optional[float] = None
    employer_taxes_after: Optional[float] = None
    total_compensation_after: Optional[float] = None
    compensation_change_amount: Optional[float] = None
    compensation_change_percentage: Optional[float] = None
    annual_cost_impact: Optional[float] = None
    notes: Optional[str] = None


# Dashboard statistics endpoint
@router.get("/dashboard")
def get_turnover_dashboard(db: Session = Depends(get_db)):
    """Get dashboard statistics for turnover tracking."""

    # Get current year
    current_year = datetime.now().year

    # Get terminations
    all_terminations = db.query(Termination).all()
    ytd_terminations = db.query(Termination).filter(
        extract('year', Termination.termination_date) == current_year
    ).all()

    # Get internal changes
    all_changes = db.query(InternalChange).all()
    ytd_changes = db.query(InternalChange).filter(
        extract('year', InternalChange.change_date) == current_year
    ).all()

    # Calculate termination statistics
    total_terminations = len(all_terminations)
    ytd_termination_count = len(ytd_terminations)
    voluntary_terminations = len([t for t in ytd_terminations if t.termination_type == "Voluntary"])
    involuntary_terminations = len([t for t in ytd_terminations if t.termination_type == "Involuntary"])

    # Calculate costs
    ytd_termination_cost = sum(t.total_turnover_cost for t in ytd_terminations)
    ytd_compensation_saved = sum(t.total_compensation for t in ytd_terminations)

    # Calculate internal change statistics
    total_changes = len(all_changes)
    ytd_change_count = len(ytd_changes)
    ytd_cost_increase = sum(c.annual_cost_impact for c in ytd_changes if c.annual_cost_impact > 0)
    ytd_cost_decrease = abs(sum(c.annual_cost_impact for c in ytd_changes if c.annual_cost_impact < 0))

    # Calculate net impact
    net_cost_impact = ytd_termination_cost - ytd_compensation_saved + ytd_cost_increase - ytd_cost_decrease

    # Get recent activity (last 30 days)
    thirty_days_ago = date.today() - timedelta(days=30)
    recent_terminations = db.query(Termination).filter(
        Termination.termination_date >= thirty_days_ago
    ).count()
    recent_changes = db.query(InternalChange).filter(
        InternalChange.change_date >= thirty_days_ago
    ).count()

    # Get breakdown by employment type
    ft_terminations = len([t for t in ytd_terminations if t.employment_type == "Full Time"])
    pt_terminations = len([t for t in ytd_terminations if t.employment_type == "Part Time"])

    return {
        "total_terminations": total_terminations,
        "ytd_terminations": ytd_termination_count,
        "voluntary_terminations": voluntary_terminations,
        "involuntary_terminations": involuntary_terminations,
        "ytd_termination_cost": ytd_termination_cost,
        "ytd_compensation_saved": ytd_compensation_saved,
        "total_internal_changes": total_changes,
        "ytd_internal_changes": ytd_change_count,
        "ytd_cost_increase": ytd_cost_increase,
        "ytd_cost_decrease": ytd_cost_decrease,
        "net_cost_impact": net_cost_impact,
        "recent_terminations": recent_terminations,
        "recent_changes": recent_changes,
        "ft_terminations": ft_terminations,
        "pt_terminations": pt_terminations,
    }


# Termination endpoints
@router.get("/terminations")
def list_terminations(
    termination_type: Optional[str] = None,
    employment_type: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all terminations with optional filtering."""
    query = db.query(Termination).join(Employee)

    if termination_type:
        query = query.filter(Termination.termination_type == termination_type)

    if employment_type:
        query = query.filter(Termination.employment_type == employment_type)

    if year:
        query = query.filter(extract('year', Termination.termination_date) == year)

    terminations = query.order_by(Termination.termination_date.desc()).all()

    # Add employee info to response
    result = []
    for term in terminations:
        employee = db.query(Employee).filter(Employee.employee_id == term.employee_id).first()
        result.append({
            "id": term.id,
            "employee_id": term.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "termination_date": term.termination_date,
            "termination_type": term.termination_type,
            "termination_reason": term.termination_reason,
            "position": term.position,
            "department": term.department,
            "employment_type": term.employment_type,
            "total_compensation": term.total_compensation,
            "total_turnover_cost": term.total_turnover_cost,
        })

    return result


@router.post("/terminations")
def create_termination(termination: TerminationCreate, db: Session = Depends(get_db)):
    """Create a new termination record."""

    # Verify employee exists
    employee = db.query(Employee).filter(Employee.employee_id == termination.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create termination record
    db_termination = Termination(**termination.dict())
    db.add(db_termination)

    # Update employee record
    employee.status = "Terminated"
    employee.termination_date = termination.termination_date
    employee.termination_type = termination.termination_type

    db.commit()
    db.refresh(db_termination)

    return db_termination


@router.get("/terminations/{termination_id}")
def get_termination(termination_id: int, db: Session = Depends(get_db)):
    """Get detailed termination information."""
    termination = db.query(Termination).filter(Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination record not found")

    # Get employee info
    employee = db.query(Employee).filter(Employee.employee_id == termination.employee_id).first()

    return {
        **termination.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
    }


@router.patch("/terminations/{termination_id}")
def update_termination(
    termination_id: int,
    termination_update: TerminationUpdate,
    db: Session = Depends(get_db)
):
    """Update a termination record."""
    termination = db.query(Termination).filter(Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination record not found")

    # Update fields
    update_data = termination_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(termination, field, value)

    db.commit()
    db.refresh(termination)

    return termination


@router.delete("/terminations/{termination_id}")
def delete_termination(termination_id: int, db: Session = Depends(get_db)):
    """Delete a termination record."""
    termination = db.query(Termination).filter(Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination record not found")

    db.delete(termination)
    db.commit()

    return {"message": "Termination record deleted successfully"}


# Internal change endpoints
@router.get("/internal-changes")
def list_internal_changes(
    change_type: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all internal changes with optional filtering."""
    query = db.query(InternalChange).join(Employee)

    if change_type:
        query = query.filter(InternalChange.change_type == change_type)

    if year:
        query = query.filter(extract('year', InternalChange.change_date) == year)

    changes = query.order_by(InternalChange.change_date.desc()).all()

    # Add employee info to response
    result = []
    for change in changes:
        employee = db.query(Employee).filter(Employee.employee_id == change.employee_id).first()
        result.append({
            "id": change.id,
            "employee_id": change.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "change_date": change.change_date,
            "change_type": change.change_type,
            "change_reason": change.change_reason,
            "position_before": change.position_before,
            "position_after": change.position_after,
            "annual_cost_impact": change.annual_cost_impact,
        })

    return result


@router.post("/internal-changes")
def create_internal_change(change: InternalChangeCreate, db: Session = Depends(get_db)):
    """Create a new internal change record."""

    # Verify employee exists
    employee = db.query(Employee).filter(Employee.employee_id == change.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create internal change record
    db_change = InternalChange(**change.dict())
    db.add(db_change)
    db.commit()
    db.refresh(db_change)

    return db_change


@router.get("/internal-changes/{change_id}")
def get_internal_change(change_id: int, db: Session = Depends(get_db)):
    """Get detailed internal change information."""
    change = db.query(InternalChange).filter(InternalChange.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Internal change record not found")

    # Get employee info
    employee = db.query(Employee).filter(Employee.employee_id == change.employee_id).first()

    return {
        **change.__dict__,
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
    }


@router.patch("/internal-changes/{change_id}")
def update_internal_change(
    change_id: int,
    change_update: InternalChangeUpdate,
    db: Session = Depends(get_db)
):
    """Update an internal change record."""
    change = db.query(InternalChange).filter(InternalChange.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Internal change record not found")

    # Update fields
    update_data = change_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(change, field, value)

    db.commit()
    db.refresh(change)

    return change


@router.delete("/internal-changes/{change_id}")
def delete_internal_change(change_id: int, db: Session = Depends(get_db)):
    """Delete an internal change record."""
    change = db.query(InternalChange).filter(InternalChange.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Internal change record not found")

    db.delete(change)
    db.commit()

    return {"message": "Internal change record deleted successfully"}


# Get employee history endpoint
@router.get("/employee/{employee_id}")
def get_employee_turnover_history(employee_id: str, db: Session = Depends(get_db)):
    """Get complete turnover history for an employee."""

    # Get employee
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get termination record if exists
    termination = db.query(Termination).filter(Termination.employee_id == employee_id).first()

    # Get all internal changes
    changes = db.query(InternalChange).filter(
        InternalChange.employee_id == employee_id
    ).order_by(InternalChange.change_date.desc()).all()

    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "status": employee.status,
        "termination": termination if termination else None,
        "internal_changes": changes,
    }
