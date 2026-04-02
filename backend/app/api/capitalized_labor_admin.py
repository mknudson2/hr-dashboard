"""Capitalized Labor Admin API endpoints for HR/Admin view.

This module provides administrative endpoints for:
- Data import (time and payroll data)
- Labor rate management
- Period management with approval workflow
- Cost calculations
- Analytics and reporting
- Audit log access
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import datetime, date, timedelta
from calendar import monthrange
from pydantic import BaseModel, Field
from decimal import Decimal
import json
import io
import csv

from ..db.database import get_db
from ..db.models import (
    Employee, Project, PayPeriod, Timesheet, TimeEntry,
    EmployeeLaborRate, LaborDataImport, CapitalizationPeriod,
    EmployeeCapitalizationSummary, CapitalizationAuditLog, User
)
from ..api.auth import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["Capitalized Labor Admin"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


# ==================== PYDANTIC SCHEMAS ====================

# Labor Rate Schemas
class LaborRateBase(BaseModel):
    employee_id: int
    effective_date: date
    hourly_rate: float
    overtime_multiplier: float = 1.5
    benefits_hourly: float = 0.0
    benefits_percentage: Optional[float] = None
    employer_taxes_hourly: float = 0.0
    employer_taxes_percentage: Optional[float] = None
    overhead_rate_hourly: float = 0.0
    overhead_rate_percentage: Optional[float] = None
    calculation_methodology: Optional[str] = None


class LaborRateCreate(LaborRateBase):
    pass


class LaborRateUpdate(BaseModel):
    hourly_rate: Optional[float] = None
    overtime_multiplier: Optional[float] = None
    benefits_hourly: Optional[float] = None
    benefits_percentage: Optional[float] = None
    employer_taxes_hourly: Optional[float] = None
    employer_taxes_percentage: Optional[float] = None
    overhead_rate_hourly: Optional[float] = None
    overhead_rate_percentage: Optional[float] = None
    calculation_methodology: Optional[str] = None


class LaborRateResponse(LaborRateBase):
    id: int
    fully_burdened_rate: float
    rate_source: str
    is_locked: bool
    end_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# Period Schemas
class PeriodCreate(BaseModel):
    period_type: str = Field(..., description="Type: 'monthly', 'quarterly', 'annual'")
    year: int
    month: Optional[int] = None
    quarter: Optional[int] = None
    notes: Optional[str] = None


class PeriodUpdate(BaseModel):
    notes: Optional[str] = None


class PeriodResponse(BaseModel):
    id: int
    period_id: str
    period_type: str
    year: int
    month: Optional[int]
    quarter: Optional[int]
    start_date: date
    end_date: date
    status: str
    total_hours: float
    total_capitalizable_hours: float
    total_labor_cost: float
    total_capitalized_cost: float
    capitalization_rate: float
    employee_count: int
    project_count: int
    last_calculated_at: Optional[datetime]
    locked_at: Optional[datetime]

    class Config:
        from_attributes = True


# Analytics Schemas
class CompanySummary(BaseModel):
    total_hours: float
    regular_hours: float
    overtime_hours: float
    capitalizable_hours: float
    non_capitalizable_hours: float
    direct_hours: float
    indirect_hours: float
    overhead_hours: float
    total_labor_cost: float
    capitalized_cost: float
    expensed_cost: float
    capitalization_rate: float
    employee_count: int
    project_count: int
    period_info: Optional[dict] = None


class EmployeeAnalytics(BaseModel):
    employee_id: int
    employee_name: str
    department: Optional[str]
    total_hours: float
    capitalizable_hours: float
    direct_hours: float
    indirect_hours: float
    overhead_hours: float
    fully_burdened_cost: float
    capitalizable_cost: float
    capitalization_rate: float
    hourly_rate: Optional[float]
    fully_burdened_rate: Optional[float]
    project_count: int


class ProjectAnalytics(BaseModel):
    project_id: int
    project_code: str
    project_name: str
    is_capitalizable: bool
    capitalization_type: Optional[str]
    total_hours: float
    direct_hours: float
    indirect_hours: float
    overhead_hours: float
    total_cost: float
    capitalized_cost: float
    employee_count: int


# ==================== LABOR RATE ENDPOINTS ====================

@router.get("/rates")
def get_labor_rates(
    db: Session = Depends(get_db),
    employee_id: Optional[int] = None,
    effective_date: Optional[str] = None,
    include_historical: bool = False,
    is_locked: Optional[bool] = None
):
    """Get labor rates with optional filters."""
    query = db.query(EmployeeLaborRate)

    if employee_id:
        query = query.filter(EmployeeLaborRate.employee_id == employee_id)

    if effective_date:
        eff_date = datetime.strptime(effective_date, "%Y-%m-%d").date()
        query = query.filter(
            and_(
                EmployeeLaborRate.effective_date <= eff_date,
                or_(
                    EmployeeLaborRate.end_date.is_(None),
                    EmployeeLaborRate.end_date >= eff_date
                )
            )
        )
    elif not include_historical:
        # Only get currently active rates
        query = query.filter(EmployeeLaborRate.end_date.is_(None))

    if is_locked is not None:
        query = query.filter(EmployeeLaborRate.is_locked == is_locked)

    rates = query.order_by(
        EmployeeLaborRate.employee_id,
        desc(EmployeeLaborRate.effective_date)
    ).all()

    result = []
    for rate in rates:
        employee = db.query(Employee).filter(Employee.id == rate.employee_id).first()
        result.append({
            "id": rate.id,
            "employee_id": rate.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "department": employee.department if employee else None,
            "effective_date": str(rate.effective_date),
            "end_date": str(rate.end_date) if rate.end_date else None,
            "hourly_rate": rate.hourly_rate,
            "overtime_multiplier": rate.overtime_multiplier,
            "benefits_hourly": rate.benefits_hourly,
            "benefits_percentage": rate.benefits_percentage,
            "employer_taxes_hourly": rate.employer_taxes_hourly,
            "employer_taxes_percentage": rate.employer_taxes_percentage,
            "overhead_rate_hourly": rate.overhead_rate_hourly,
            "overhead_rate_percentage": rate.overhead_rate_percentage,
            "fully_burdened_rate": rate.fully_burdened_rate,
            "rate_source": rate.rate_source,
            "calculation_methodology": rate.calculation_methodology,
            "is_locked": rate.is_locked,
            "created_at": str(rate.created_at)
        })

    return {"rates": result, "total": len(result)}


@router.post("/rates")
def create_labor_rate(
    rate_data: LaborRateCreate,
    user_id: int = Query(..., description="ID of user creating the rate"),
    db: Session = Depends(get_db)
):
    """Create a new labor rate for an employee."""
    # Calculate fully burdened rate
    fully_burdened = calculate_fully_burdened_rate(
        rate_data.hourly_rate,
        rate_data.benefits_hourly,
        rate_data.benefits_percentage,
        rate_data.employer_taxes_hourly,
        rate_data.employer_taxes_percentage,
        rate_data.overhead_rate_hourly,
        rate_data.overhead_rate_percentage
    )

    # End any existing active rate for this employee
    existing_rate = db.query(EmployeeLaborRate).filter(
        and_(
            EmployeeLaborRate.employee_id == rate_data.employee_id,
            EmployeeLaborRate.end_date.is_(None)
        )
    ).first()

    if existing_rate:
        # Set end date to day before new rate starts
        existing_rate.end_date = rate_data.effective_date - timedelta(days=1)

    new_rate = EmployeeLaborRate(
        **rate_data.dict(),
        fully_burdened_rate=fully_burdened,
        rate_source="manual",
        created_by_id=user_id
    )
    db.add(new_rate)
    db.flush()

    # Create audit log
    create_audit_log(
        db=db,
        entity_type="labor_rate",
        entity_id=new_rate.id,
        action="created",
        action_category="create",
        user_id=user_id,
        new_values=rate_data.dict(),
        is_financial_impact=True
    )

    db.commit()
    db.refresh(new_rate)

    return {
        "message": "Labor rate created successfully",
        "rate_id": new_rate.id,
        "fully_burdened_rate": new_rate.fully_burdened_rate
    }


@router.put("/rates/{rate_id}")
def update_labor_rate(
    rate_id: int,
    rate_data: LaborRateUpdate,
    user_id: int = Query(..., description="ID of user updating the rate"),
    db: Session = Depends(get_db)
):
    """Update a labor rate."""
    rate = db.query(EmployeeLaborRate).filter(EmployeeLaborRate.id == rate_id).first()

    if not rate:
        raise HTTPException(status_code=404, detail="Labor rate not found")

    if rate.is_locked:
        raise HTTPException(status_code=400, detail="Cannot modify locked rate")

    # Store old values for audit
    old_values = {
        "hourly_rate": rate.hourly_rate,
        "benefits_hourly": rate.benefits_hourly,
        "employer_taxes_hourly": rate.employer_taxes_hourly,
        "overhead_rate_hourly": rate.overhead_rate_hourly,
        "fully_burdened_rate": rate.fully_burdened_rate
    }

    # Update fields
    for field, value in rate_data.dict(exclude_unset=True).items():
        setattr(rate, field, value)

    # Recalculate fully burdened rate
    rate.fully_burdened_rate = calculate_fully_burdened_rate(
        rate.hourly_rate,
        rate.benefits_hourly,
        rate.benefits_percentage,
        rate.employer_taxes_hourly,
        rate.employer_taxes_percentage,
        rate.overhead_rate_hourly,
        rate.overhead_rate_percentage
    )

    # Create audit log
    create_audit_log(
        db=db,
        entity_type="labor_rate",
        entity_id=rate.id,
        action="updated",
        action_category="update",
        user_id=user_id,
        old_values=old_values,
        new_values=rate_data.dict(exclude_unset=True),
        is_financial_impact=True
    )

    db.commit()

    return {"message": "Labor rate updated successfully", "fully_burdened_rate": rate.fully_burdened_rate}


@router.post("/rates/calculate-from-compensation")
def calculate_rates_from_compensation(
    employee_ids: Optional[List[int]] = None,
    effective_date: str = Query(..., description="Effective date for new rates"),
    overhead_percentage: float = Query(default=15.0, description="Overhead allocation percentage"),
    user_id: int = Query(..., description="ID of user creating rates"),
    db: Session = Depends(get_db)
):
    """Calculate fully burdened rates from employee compensation data."""
    eff_date = datetime.strptime(effective_date, "%Y-%m-%d").date()

    query = db.query(Employee).filter(Employee.status == "active")
    if employee_ids:
        query = query.filter(Employee.id.in_(employee_ids))

    employees = query.all()
    created_rates = []
    errors = []

    for emp in employees:
        try:
            # Get hourly rate
            if emp.hourly_wage and emp.hourly_wage > 0:
                hourly_rate = emp.hourly_wage
            elif emp.annual_wage and emp.annual_wage > 0:
                hourly_rate = emp.annual_wage / 2080  # Standard work hours per year
            else:
                errors.append({"employee_id": emp.id, "error": "No wage data available"})
                continue

            # Calculate benefits hourly (annual benefits / 2080)
            benefits_hourly = (emp.benefits_cost_annual or 0) / 2080

            # Calculate employer taxes hourly (annual taxes / 2080)
            employer_taxes_hourly = (emp.employer_taxes_annual or 0) / 2080

            # Calculate overhead
            overhead_hourly = hourly_rate * (overhead_percentage / 100)

            # Calculate fully burdened rate
            fully_burdened = hourly_rate + benefits_hourly + employer_taxes_hourly + overhead_hourly

            # End existing rate
            existing = db.query(EmployeeLaborRate).filter(
                and_(
                    EmployeeLaborRate.employee_id == emp.id,
                    EmployeeLaborRate.end_date.is_(None)
                )
            ).first()

            if existing:
                existing.end_date = eff_date - timedelta(days=1)

            # Create new rate
            new_rate = EmployeeLaborRate(
                employee_id=emp.id,
                effective_date=eff_date,
                hourly_rate=round(hourly_rate, 4),
                benefits_hourly=round(benefits_hourly, 4),
                employer_taxes_hourly=round(employer_taxes_hourly, 4),
                overhead_rate_hourly=round(overhead_hourly, 4),
                overhead_rate_percentage=overhead_percentage,
                fully_burdened_rate=round(fully_burdened, 4),
                rate_source="calculated",
                calculation_methodology=f"Calculated from compensation data. Overhead: {overhead_percentage}%",
                created_by_id=user_id
            )
            db.add(new_rate)
            created_rates.append({
                "employee_id": emp.id,
                "employee_name": f"{emp.first_name} {emp.last_name}",
                "hourly_rate": round(hourly_rate, 4),
                "fully_burdened_rate": round(fully_burdened, 4)
            })

        except Exception as e:
            errors.append({"employee_id": emp.id, "error": str(e)})

    db.commit()

    return {
        "message": f"Created {len(created_rates)} labor rates",
        "created_rates": created_rates,
        "errors": errors
    }


# ==================== PERIOD MANAGEMENT ENDPOINTS ====================

@router.get("/periods")
def get_periods(
    db: Session = Depends(get_db),
    year: Optional[int] = None,
    period_type: Optional[str] = None,
    status: Optional[str] = None
):
    """Get capitalization periods with optional filters."""
    query = db.query(CapitalizationPeriod)

    if year:
        query = query.filter(CapitalizationPeriod.year == year)
    if period_type:
        query = query.filter(CapitalizationPeriod.period_type == period_type)
    if status:
        query = query.filter(CapitalizationPeriod.status == status)

    periods = query.order_by(
        desc(CapitalizationPeriod.year),
        desc(CapitalizationPeriod.month),
        desc(CapitalizationPeriod.quarter)
    ).all()

    result = []
    for p in periods:
        result.append({
            "id": p.id,
            "period_id": p.period_id,
            "period_type": p.period_type,
            "year": p.year,
            "month": p.month,
            "quarter": p.quarter,
            "start_date": str(p.start_date),
            "end_date": str(p.end_date),
            "status": p.status,
            "total_hours": p.total_hours,
            "total_capitalizable_hours": p.total_capitalizable_hours,
            "total_labor_cost": p.total_labor_cost,
            "total_capitalized_cost": p.total_capitalized_cost,
            "capitalization_rate": p.capitalization_rate,
            "employee_count": p.employee_count,
            "project_count": p.project_count,
            "last_calculated_at": str(p.last_calculated_at) if p.last_calculated_at else None,
            "locked_at": str(p.locked_at) if p.locked_at else None
        })

    return {"periods": result, "total": len(result)}


@router.get("/periods/{period_id}")
def get_period(period_id: int, db: Session = Depends(get_db)):
    """Get a specific period with details."""
    period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == period_id).first()

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    # Get employee summaries for this period
    summaries = db.query(EmployeeCapitalizationSummary).filter(
        EmployeeCapitalizationSummary.period_id == period_id
    ).all()

    employee_data = []
    for s in summaries:
        emp = db.query(Employee).filter(Employee.id == s.employee_id).first()
        employee_data.append({
            "employee_id": s.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "department": emp.department if emp else None,
            "total_hours": s.total_hours,
            "capitalizable_hours": s.capitalizable_hours,
            "direct_hours": s.direct_hours,
            "indirect_hours": s.indirect_hours,
            "fully_burdened_cost": s.fully_burdened_cost,
            "capitalizable_cost": s.capitalizable_cost,
            "capitalization_rate": s.capitalization_rate
        })

    return {
        "period": {
            "id": period.id,
            "period_id": period.period_id,
            "period_type": period.period_type,
            "year": period.year,
            "month": period.month,
            "quarter": period.quarter,
            "start_date": str(period.start_date),
            "end_date": str(period.end_date),
            "status": period.status,
            "total_hours": period.total_hours,
            "total_regular_hours": period.total_regular_hours,
            "total_overtime_hours": period.total_overtime_hours,
            "total_capitalizable_hours": period.total_capitalizable_hours,
            "total_non_capitalizable_hours": period.total_non_capitalizable_hours,
            "total_direct_hours": period.total_direct_hours,
            "total_indirect_hours": period.total_indirect_hours,
            "total_overhead_hours": period.total_overhead_hours,
            "total_labor_cost": period.total_labor_cost,
            "total_capitalized_cost": period.total_capitalized_cost,
            "total_expensed_cost": period.total_expensed_cost,
            "capitalization_rate": period.capitalization_rate,
            "employee_count": period.employee_count,
            "project_count": period.project_count,
            "last_calculated_at": str(period.last_calculated_at) if period.last_calculated_at else None,
            "notes": period.notes
        },
        "employees": employee_data
    }


@router.post("/periods/{period_id}/calculate")
def calculate_period(
    period_id: int,
    recalculate: bool = False,
    user_id: int = Query(..., description="ID of user running calculation"),
    db: Session = Depends(get_db)
):
    """Calculate capitalization for a period."""
    period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == period_id).first()

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    if period.status == "locked":
        raise HTTPException(status_code=400, detail="Cannot calculate locked period")

    # Get all approved time entries in this period
    entries = db.query(TimeEntry).filter(
        and_(
            TimeEntry.work_date >= period.start_date,
            TimeEntry.work_date <= period.end_date,
            TimeEntry.is_approved == True
        )
    ).all()

    # Group entries by employee
    employee_entries = {}
    for entry in entries:
        if entry.employee_id not in employee_entries:
            employee_entries[entry.employee_id] = []
        employee_entries[entry.employee_id].append(entry)

    # Calculate for each employee
    total_hours = 0
    total_regular = 0
    total_overtime = 0
    total_capitalizable = 0
    total_non_capitalizable = 0
    total_direct = 0
    total_indirect = 0
    total_overhead = 0
    total_cost = 0
    total_cap_cost = 0
    total_exp_cost = 0
    unique_projects = set()

    for employee_id, emp_entries in employee_entries.items():
        # Get employee's labor rate for this period
        rate = db.query(EmployeeLaborRate).filter(
            and_(
                EmployeeLaborRate.employee_id == employee_id,
                EmployeeLaborRate.effective_date <= period.end_date,
                or_(
                    EmployeeLaborRate.end_date.is_(None),
                    EmployeeLaborRate.end_date >= period.start_date
                )
            )
        ).order_by(desc(EmployeeLaborRate.effective_date)).first()

        if not rate:
            continue  # Skip employees without rates

        emp_total = 0
        emp_regular = 0
        emp_overtime = 0
        emp_cap = 0
        emp_non_cap = 0
        emp_direct = 0
        emp_indirect = 0
        emp_overhead = 0
        emp_cost = 0
        emp_cap_cost = 0
        emp_projects = set()

        for entry in emp_entries:
            emp_total += entry.hours
            if entry.is_overtime:
                emp_overtime += entry.hours
            else:
                emp_regular += entry.hours

            if entry.is_capitalizable:
                emp_cap += entry.hours
            else:
                emp_non_cap += entry.hours

            if entry.labor_type == "direct":
                emp_direct += entry.hours
            elif entry.labor_type == "indirect":
                emp_indirect += entry.hours
            else:
                emp_overhead += entry.hours

            # Calculate cost for this entry
            entry_cost = entry.hours * rate.fully_burdened_rate
            if entry.is_overtime:
                # Add OT premium (0.5x base rate)
                entry_cost += entry.hours * rate.hourly_rate * 0.5

            emp_cost += entry_cost
            if entry.is_capitalizable:
                emp_cap_cost += entry_cost

            emp_projects.add(entry.project_id)
            unique_projects.add(entry.project_id)

            # Update entry with cost info
            entry.labor_rate_at_entry = rate.fully_burdened_rate
            entry.fully_burdened_cost = entry_cost

        # Update or create employee summary
        summary = db.query(EmployeeCapitalizationSummary).filter(
            and_(
                EmployeeCapitalizationSummary.employee_id == employee_id,
                EmployeeCapitalizationSummary.period_id == period_id
            )
        ).first()

        if not summary:
            summary = EmployeeCapitalizationSummary(
                employee_id=employee_id,
                period_id=period_id
            )
            db.add(summary)

        summary.total_hours = emp_total
        summary.regular_hours = emp_regular
        summary.overtime_hours = emp_overtime
        summary.direct_hours = emp_direct
        summary.indirect_hours = emp_indirect
        summary.overhead_hours = emp_overhead
        summary.capitalizable_hours = emp_cap
        summary.non_capitalizable_hours = emp_non_cap
        summary.fully_burdened_cost = emp_cost
        summary.capitalizable_cost = emp_cap_cost
        summary.non_capitalizable_cost = emp_cost - emp_cap_cost
        summary.labor_rate_id = rate.id
        summary.hourly_rate_used = rate.hourly_rate
        summary.fully_burdened_rate_used = rate.fully_burdened_rate
        summary.capitalization_rate = (emp_cap / emp_total * 100) if emp_total > 0 else 0
        summary.project_count = len(emp_projects)
        summary.calculated_at = datetime.now()
        summary.calculation_version = period.calculation_version + 1

        # Accumulate totals
        total_hours += emp_total
        total_regular += emp_regular
        total_overtime += emp_overtime
        total_capitalizable += emp_cap
        total_non_capitalizable += emp_non_cap
        total_direct += emp_direct
        total_indirect += emp_indirect
        total_overhead += emp_overhead
        total_cost += emp_cost
        total_cap_cost += emp_cap_cost
        total_exp_cost += (emp_cost - emp_cap_cost)

    # Update period totals
    period.total_hours = total_hours
    period.total_regular_hours = total_regular
    period.total_overtime_hours = total_overtime
    period.total_capitalizable_hours = total_capitalizable
    period.total_non_capitalizable_hours = total_non_capitalizable
    period.total_direct_hours = total_direct
    period.total_indirect_hours = total_indirect
    period.total_overhead_hours = total_overhead
    period.total_labor_cost = total_cost
    period.total_capitalized_cost = total_cap_cost
    period.total_expensed_cost = total_exp_cost
    period.capitalization_rate = (total_capitalizable / total_hours * 100) if total_hours > 0 else 0
    period.employee_count = len(employee_entries)
    period.project_count = len(unique_projects)
    period.last_calculated_at = datetime.now()
    period.calculated_by_id = user_id
    period.calculation_version += 1

    # Create audit log
    create_audit_log(
        db=db,
        entity_type="period",
        entity_id=period.id,
        action="calculated",
        action_category="update",
        user_id=user_id,
        new_values={
            "total_hours": total_hours,
            "total_capitalized_cost": total_cap_cost,
            "employee_count": len(employee_entries)
        },
        is_financial_impact=True
    )

    db.commit()

    return {
        "message": "Period calculation complete",
        "period_id": period.period_id,
        "total_hours": total_hours,
        "total_capitalized_cost": total_cap_cost,
        "capitalization_rate": period.capitalization_rate,
        "employee_count": len(employee_entries),
        "project_count": len(unique_projects)
    }


@router.post("/periods/{period_id}/lock")
def lock_period(
    period_id: int,
    user_id: int = Query(..., description="ID of user locking the period"),
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lock a period to prevent changes."""
    period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == period_id).first()

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    if period.status == "locked":
        raise HTTPException(status_code=400, detail="Period is already locked")

    old_status = period.status
    period.status = "locked"
    period.locked_at = datetime.now()
    period.locked_by_id = user_id
    period.lock_reason = reason

    # Lock associated labor rates
    db.query(EmployeeLaborRate).filter(
        and_(
            EmployeeLaborRate.effective_date <= period.end_date,
            or_(
                EmployeeLaborRate.end_date.is_(None),
                EmployeeLaborRate.end_date >= period.start_date
            )
        )
    ).update({"is_locked": True, "locked_at": datetime.now(), "locked_by_id": user_id})

    create_audit_log(
        db=db,
        entity_type="period",
        entity_id=period.id,
        action="locked",
        action_category="update",
        user_id=user_id,
        old_values={"status": old_status},
        new_values={"status": "locked", "reason": reason},
        is_financial_impact=True
    )

    db.commit()

    return {"message": "Period locked successfully", "period_id": period.period_id}


@router.post("/periods/{period_id}/unlock")
def unlock_period(
    period_id: int,
    user_id: int = Query(..., description="ID of user unlocking the period"),
    reason: str = Query(..., description="Reason for unlocking"),
    db: Session = Depends(get_db)
):
    """Unlock a period (requires justification)."""
    period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == period_id).first()

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    if period.status != "locked":
        raise HTTPException(status_code=400, detail="Period is not locked")

    period.status = "open"
    period.locked_at = None
    period.locked_by_id = None
    period.lock_reason = None

    create_audit_log(
        db=db,
        entity_type="period",
        entity_id=period.id,
        action="unlocked",
        action_category="update",
        user_id=user_id,
        old_values={"status": "locked"},
        new_values={"status": "open"},
        change_reason=reason,
        is_financial_impact=True,
        requires_approval=True
    )

    db.commit()

    return {"message": "Period unlocked", "period_id": period.period_id}


# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/company-summary")
def get_company_summary(
    db: Session = Depends(get_db),
    period_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get company-wide capitalization summary."""
    if period_id:
        # Accept either numeric id or string period_id (e.g., "CAP-2025-11")
        if period_id.isdigit():
            period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == int(period_id)).first()
        else:
            period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.period_id == period_id).first()
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        # Calculate labor type costs from summaries
        summaries = db.query(EmployeeCapitalizationSummary).filter(
            EmployeeCapitalizationSummary.period_id == period.id
        ).all()

        direct_hours = sum(s.direct_hours or 0 for s in summaries)
        indirect_hours = sum(s.indirect_hours or 0 for s in summaries)
        overhead_hours = sum(s.overhead_hours or 0 for s in summaries)
        total_cost = sum(s.fully_burdened_cost or 0 for s in summaries)

        # Estimate cost distribution based on hours ratio
        total_hours_calc = direct_hours + indirect_hours + overhead_hours
        if total_hours_calc > 0:
            direct_cost = total_cost * (direct_hours / total_hours_calc)
            indirect_cost = total_cost * (indirect_hours / total_hours_calc)
            overhead_cost = total_cost * (overhead_hours / total_hours_calc)
        else:
            direct_cost = indirect_cost = overhead_cost = 0

        # Calculate non-capitalizable hours and rate
        total_hours = period.total_hours or 0
        cap_hours = period.total_capitalizable_hours or 0
        non_cap_hours = total_hours - cap_hours
        cap_rate = (cap_hours / total_hours * 100) if total_hours > 0 else 0
        overtime_hours = period.total_overtime_hours or 0
        overtime_rate = (overtime_hours / total_hours * 100) if total_hours > 0 else 0

        return {
            "total_hours": total_hours,
            "regular_hours": period.total_regular_hours or 0,
            "overtime_hours": overtime_hours,
            "overtime_rate": round(overtime_rate, 2),
            "capitalizable_hours": cap_hours,
            "non_capitalizable_hours": non_cap_hours,
            "direct_hours": direct_hours,
            "indirect_hours": indirect_hours,
            "overhead_hours": overhead_hours,
            "total_labor_cost": period.total_labor_cost or 0,
            "capitalized_cost": period.total_capitalized_cost or 0,
            "total_capitalized_cost": period.total_capitalized_cost or 0,
            "expensed_cost": period.total_expensed_cost or 0,
            "capitalization_rate": round(cap_rate, 2),
            "employee_count": period.employee_count or 0,
            "project_count": period.project_count or 0,
            "total_employees": period.employee_count or 0,
            "total_projects": period.project_count or 0,
            "period_status": period.status,
            "start_date": str(period.start_date),
            "end_date": str(period.end_date),
            "labor_type_breakdown": {
                # Short names for Dashboard
                "direct": direct_hours,
                "indirect": indirect_hours,
                "overhead": overhead_hours,
                # Full names for Analytics
                "direct_hours": direct_hours,
                "indirect_hours": indirect_hours,
                "overhead_hours": overhead_hours,
                "direct_cost": round(direct_cost, 2),
                "indirect_cost": round(indirect_cost, 2),
                "overhead_cost": round(overhead_cost, 2)
            },
            "period_info": {
                "period_id": period.period_id,
                "period_type": period.period_type,
                "start_date": str(period.start_date),
                "end_date": str(period.end_date),
                "status": period.status
            }
        }

    # Calculate from time entries
    query = db.query(TimeEntry).filter(TimeEntry.is_approved == True)

    if start_date:
        query = query.filter(TimeEntry.work_date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.work_date <= end_date)

    entries = query.all()

    total_hours = sum(e.hours for e in entries)
    regular_hours = sum(e.hours for e in entries if not e.is_overtime)
    overtime_hours = sum(e.hours for e in entries if e.is_overtime)
    cap_hours = sum(e.hours for e in entries if e.is_capitalizable)
    non_cap_hours = sum(e.hours for e in entries if not e.is_capitalizable)
    direct_hours = sum(e.hours for e in entries if e.labor_type == "direct")
    indirect_hours = sum(e.hours for e in entries if e.labor_type == "indirect")
    overhead_hours = sum(e.hours for e in entries if e.labor_type == "overhead")

    total_cost = sum(e.fully_burdened_cost or 0 for e in entries)
    cap_cost = sum(e.fully_burdened_cost or 0 for e in entries if e.is_capitalizable)

    unique_employees = len(set(e.employee_id for e in entries))
    unique_projects = len(set(e.project_id for e in entries))

    cap_rate = (cap_hours / total_hours * 100) if total_hours > 0 else 0
    ot_rate = (overtime_hours / total_hours * 100) if total_hours > 0 else 0
    return {
        "total_hours": round(total_hours, 2),
        "regular_hours": round(regular_hours, 2),
        "overtime_hours": round(overtime_hours, 2),
        "overtime_rate": round(ot_rate, 2),
        "capitalizable_hours": round(cap_hours, 2),
        "non_capitalizable_hours": round(non_cap_hours, 2),
        "direct_hours": round(direct_hours, 2),
        "indirect_hours": round(indirect_hours, 2),
        "overhead_hours": round(overhead_hours, 2),
        "total_labor_cost": round(total_cost, 2),
        "capitalized_cost": round(cap_cost, 2),
        "total_capitalized_cost": round(cap_cost, 2),
        "expensed_cost": round(total_cost - cap_cost, 2),
        "capitalization_rate": round(cap_rate, 2),
        "employee_count": unique_employees,
        "project_count": unique_projects,
        "total_employees": unique_employees,
        "total_projects": unique_projects,
        "period_status": "open",
        "start_date": start_date or "",
        "end_date": end_date or "",
        "labor_type_breakdown": {
            # Short names for Dashboard
            "direct": round(direct_hours, 2),
            "indirect": round(indirect_hours, 2),
            "overhead": round(overhead_hours, 2),
            # Full names for Analytics
            "direct_hours": round(direct_hours, 2),
            "indirect_hours": round(indirect_hours, 2),
            "overhead_hours": round(overhead_hours, 2),
            "direct_cost": 0,
            "indirect_cost": 0,
            "overhead_cost": 0
        }
    }


@router.get("/analytics/by-employee")
def get_analytics_by_employee(
    db: Session = Depends(get_db),
    period_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None
):
    """Get capitalization analytics by employee."""
    if period_id:
        # Accept either numeric id or string period_id (e.g., "CAP-2025-11")
        if period_id.isdigit():
            period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == int(period_id)).first()
        else:
            period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.period_id == period_id).first()

        if not period:
            return {"employees": []}

        summaries = db.query(EmployeeCapitalizationSummary).filter(
            EmployeeCapitalizationSummary.period_id == period.id
        ).all()

        result = []
        for s in summaries:
            emp = db.query(Employee).filter(Employee.id == s.employee_id).first()
            if department and emp and emp.department != department:
                continue

            result.append({
                "employee_id": s.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "department": emp.department if emp else None,
                "total_hours": s.total_hours or 0,
                "capitalizable_hours": s.capitalizable_hours or 0,
                "direct_hours": s.direct_hours or 0,
                "indirect_hours": s.indirect_hours or 0,
                "overhead_hours": s.overhead_hours or 0,
                "fully_burdened_cost": s.fully_burdened_cost or 0,
                "total_cost": s.fully_burdened_cost or 0,
                "capitalizable_cost": s.capitalizable_cost or 0,
                "capitalization_rate": s.capitalization_rate or 0,
                "hourly_rate": s.hourly_rate_used,
                "fully_burdened_rate": s.fully_burdened_rate_used,
                "project_count": s.project_count or 0,
                "labor_type_breakdown": {
                    "direct_hours": s.direct_hours or 0,
                    "indirect_hours": s.indirect_hours or 0,
                    "overhead_hours": s.overhead_hours or 0
                }
            })

        return {"employees": result, "total": len(result)}

    # Calculate from entries
    query = db.query(TimeEntry).filter(TimeEntry.is_approved == True)

    if start_date:
        query = query.filter(TimeEntry.work_date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.work_date <= end_date)

    entries = query.all()

    # Group by employee
    employee_data = {}
    for entry in entries:
        if entry.employee_id not in employee_data:
            emp = db.query(Employee).filter(Employee.id == entry.employee_id).first()
            if department and emp and emp.department != department:
                continue
            employee_data[entry.employee_id] = {
                "employee_id": entry.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "department": emp.department if emp else None,
                "total_hours": 0,
                "capitalizable_hours": 0,
                "direct_hours": 0,
                "indirect_hours": 0,
                "overhead_hours": 0,
                "fully_burdened_cost": 0,
                "capitalizable_cost": 0,
                "projects": set()
            }

        if entry.employee_id in employee_data:
            employee_data[entry.employee_id]["total_hours"] += entry.hours
            if entry.is_capitalizable:
                employee_data[entry.employee_id]["capitalizable_hours"] += entry.hours
            if entry.labor_type == "direct":
                employee_data[entry.employee_id]["direct_hours"] += entry.hours
            elif entry.labor_type == "indirect":
                employee_data[entry.employee_id]["indirect_hours"] += entry.hours
            else:
                employee_data[entry.employee_id]["overhead_hours"] += entry.hours
            employee_data[entry.employee_id]["fully_burdened_cost"] += entry.fully_burdened_cost or 0
            if entry.is_capitalizable:
                employee_data[entry.employee_id]["capitalizable_cost"] += entry.fully_burdened_cost or 0
            employee_data[entry.employee_id]["projects"].add(entry.project_id)

    result = []
    for emp_id, data in employee_data.items():
        data["project_count"] = len(data["projects"])
        del data["projects"]
        data["capitalization_rate"] = round(
            (data["capitalizable_hours"] / data["total_hours"] * 100) if data["total_hours"] > 0 else 0, 2
        )
        # Round values
        for key in ["total_hours", "capitalizable_hours", "direct_hours", "indirect_hours",
                    "overhead_hours", "fully_burdened_cost", "capitalizable_cost"]:
            data[key] = round(data[key], 2)
        result.append(data)

    # Sort by total hours descending
    result.sort(key=lambda x: x["total_hours"], reverse=True)

    return {"employees": result, "total": len(result)}


@router.get("/analytics/by-project")
def get_analytics_by_project(
    db: Session = Depends(get_db),
    period_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    is_capitalizable: Optional[bool] = None
):
    """Get capitalization analytics by project."""
    query = db.query(TimeEntry).filter(TimeEntry.is_approved == True)

    if period_id:
        # Accept either numeric id or string period_id (e.g., "CAP-2025-11")
        if period_id.isdigit():
            period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == int(period_id)).first()
        else:
            period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.period_id == period_id).first()
        if period:
            query = query.filter(
                and_(
                    TimeEntry.work_date >= period.start_date,
                    TimeEntry.work_date <= period.end_date
                )
            )
    else:
        if start_date:
            query = query.filter(TimeEntry.work_date >= start_date)
        if end_date:
            query = query.filter(TimeEntry.work_date <= end_date)

    entries = query.all()

    # Group by project
    project_data = {}
    for entry in entries:
        if entry.project_id not in project_data:
            proj = db.query(Project).filter(Project.id == entry.project_id).first()
            if is_capitalizable is not None and proj and proj.is_capitalizable != is_capitalizable:
                continue
            project_data[entry.project_id] = {
                "project_id": entry.project_id,
                "project_code": proj.project_code if proj else "Unknown",
                "project_name": proj.project_name if proj else "Unknown",
                "is_capitalizable": proj.is_capitalizable if proj else False,
                "capitalization_type": proj.capitalization_type if proj else None,
                "total_hours": 0,
                "capitalizable_hours": 0,
                "direct_hours": 0,
                "indirect_hours": 0,
                "overhead_hours": 0,
                "total_cost": 0,
                "capitalized_cost": 0,
                "employees": set()
            }

        if entry.project_id in project_data:
            project_data[entry.project_id]["total_hours"] += entry.hours
            if entry.is_capitalizable:
                project_data[entry.project_id]["capitalizable_hours"] += entry.hours
            if entry.labor_type == "direct":
                project_data[entry.project_id]["direct_hours"] += entry.hours
            elif entry.labor_type == "indirect":
                project_data[entry.project_id]["indirect_hours"] += entry.hours
            else:
                project_data[entry.project_id]["overhead_hours"] += entry.hours
            project_data[entry.project_id]["total_cost"] += entry.fully_burdened_cost or 0
            if entry.is_capitalizable:
                project_data[entry.project_id]["capitalized_cost"] += entry.fully_burdened_cost or 0
            project_data[entry.project_id]["employees"].add(entry.employee_id)

    result = []
    for proj_id, data in project_data.items():
        data["employee_count"] = len(data["employees"])
        del data["employees"]
        # Round values
        for key in ["total_hours", "capitalizable_hours", "direct_hours", "indirect_hours", "overhead_hours",
                    "total_cost", "capitalized_cost"]:
            data[key] = round(data[key], 2)
        # Add labor_type_breakdown for frontend compatibility
        data["labor_type_breakdown"] = {
            "direct_hours": data["direct_hours"],
            "indirect_hours": data["indirect_hours"],
            "overhead_hours": data["overhead_hours"]
        }
        result.append(data)

    # Sort by total hours descending
    result.sort(key=lambda x: x["total_hours"], reverse=True)

    return {"projects": result, "total": len(result)}


@router.get("/analytics/employee/{employee_id}/history")
def get_employee_history(
    employee_id: int,
    periods: int = Query(default=12, description="Number of periods to return"),
    labor_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get detailed capitalization history for an employee."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get employee summaries
    summaries = db.query(EmployeeCapitalizationSummary).join(
        CapitalizationPeriod
    ).filter(
        and_(
            EmployeeCapitalizationSummary.employee_id == employee_id,
            CapitalizationPeriod.period_type == "monthly"
        )
    ).order_by(
        desc(CapitalizationPeriod.year),
        desc(CapitalizationPeriod.month)
    ).limit(periods).all()

    history = []
    for s in summaries:
        period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == s.period_id).first()
        entry = {
            "period_id": period.period_id if period else None,
            "period_type": period.period_type if period else None,
            "year": period.year if period else None,
            "month": period.month if period else None,
            "start_date": str(period.start_date) if period else None,
            "end_date": str(period.end_date) if period else None,
            "total_hours": s.total_hours,
            "regular_hours": s.regular_hours,
            "overtime_hours": s.overtime_hours,
            "capitalizable_hours": s.capitalizable_hours,
            "non_capitalizable_hours": s.non_capitalizable_hours,
            "direct_hours": s.direct_hours,
            "indirect_hours": s.indirect_hours,
            "overhead_hours": s.overhead_hours,
            "fully_burdened_cost": s.fully_burdened_cost,
            "capitalizable_cost": s.capitalizable_cost,
            "capitalization_rate": s.capitalization_rate,
            "hourly_rate": s.hourly_rate_used,
            "fully_burdened_rate": s.fully_burdened_rate_used,
            "project_count": s.project_count
        }
        history.append(entry)

    # Get current rate
    current_rate = db.query(EmployeeLaborRate).filter(
        and_(
            EmployeeLaborRate.employee_id == employee_id,
            EmployeeLaborRate.end_date.is_(None)
        )
    ).first()

    # Get project breakdown from time entries
    project_breakdown = []
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.employee_id == employee_id
    ).all()

    # Aggregate by project
    project_data = {}
    for te in time_entries:
        project = db.query(Project).filter(Project.id == te.project_id).first()
        if project:
            if project.id not in project_data:
                project_data[project.id] = {
                    "project_id": project.id,
                    "project_code": project.project_code,
                    "project_name": project.project_name,
                    "total_hours": 0,
                    "capitalizable_hours": 0,
                    "capitalized_cost": 0
                }
            project_data[project.id]["total_hours"] += te.hours or 0
            if project.is_capitalizable:
                project_data[project.id]["capitalizable_hours"] += te.hours or 0
                # Estimate cost using current rate
                if current_rate:
                    project_data[project.id]["capitalized_cost"] += (te.hours or 0) * current_rate.fully_burdened_rate

    project_breakdown = list(project_data.values())

    # Calculate labor type totals from history
    total_direct = sum(h.get("direct_hours", 0) or 0 for h in history)
    total_indirect = sum(h.get("indirect_hours", 0) or 0 for h in history)
    total_overhead = sum(h.get("overhead_hours", 0) or 0 for h in history)

    return {
        # Root level employee fields (frontend expects these)
        "employee_id": employee.id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "department": employee.department,
        "position": employee.position,
        # Current rate as object
        "current_rate": {
            "id": current_rate.id,
            "hourly_rate": current_rate.hourly_rate,
            "fully_burdened_rate": current_rate.fully_burdened_rate,
            "effective_date": str(current_rate.effective_date) if current_rate.effective_date else None,
        } if current_rate else None,
        # Also include nested employee object for compatibility
        "employee": {
            "id": employee.id,
            "name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department,
            "position": employee.position,
            "current_hourly_rate": current_rate.hourly_rate if current_rate else None,
            "current_fully_burdened_rate": current_rate.fully_burdened_rate if current_rate else None
        },
        "period_summaries": history,
        "project_breakdown": project_breakdown,
        # Both names for frontend compatibility
        "labor_type_totals": {
            "direct_hours": total_direct,
            "indirect_hours": total_indirect,
            "overhead_hours": total_overhead
        },
        "labor_type_breakdown": {
            "direct_hours": total_direct,
            "indirect_hours": total_indirect,
            "overhead_hours": total_overhead
        },
        "total_periods": len(history)
    }


# ==================== EXPORT ENDPOINTS ====================

@router.get("/export/period-report/{period_id}")
def export_period_report(
    period_id: int,
    format: str = Query(default="csv", description="Export format: csv, excel"),
    db: Session = Depends(get_db)
):
    """Export comprehensive period report."""
    period = db.query(CapitalizationPeriod).filter(CapitalizationPeriod.id == period_id).first()

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    # Get employee summaries
    summaries = db.query(EmployeeCapitalizationSummary).filter(
        EmployeeCapitalizationSummary.period_id == period_id
    ).all()

    # Build CSV content
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["Capitalized Labor Report"])
    writer.writerow(["Period:", period.period_id])
    writer.writerow(["Date Range:", f"{period.start_date} to {period.end_date}"])
    writer.writerow(["Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])

    # Summary section
    writer.writerow(["SUMMARY"])
    writer.writerow(["Total Hours:", period.total_hours])
    writer.writerow(["Capitalizable Hours:", period.total_capitalizable_hours])
    writer.writerow(["Non-Capitalizable Hours:", period.total_non_capitalizable_hours])
    writer.writerow(["Capitalization Rate:", f"{period.capitalization_rate:.2f}%"])
    writer.writerow(["Total Labor Cost:", f"${period.total_labor_cost:,.2f}"])
    writer.writerow(["Capitalized Cost:", f"${period.total_capitalized_cost:,.2f}"])
    writer.writerow(["Expensed Cost:", f"${period.total_expensed_cost:,.2f}"])
    writer.writerow([])

    # Employee breakdown
    writer.writerow(["EMPLOYEE BREAKDOWN"])
    writer.writerow([
        "Employee ID", "Employee Name", "Department", "Total Hours",
        "Capitalizable Hours", "Direct Hours", "Indirect Hours", "Overhead Hours",
        "Fully Burdened Cost", "Capitalizable Cost", "Capitalization Rate"
    ])

    for s in summaries:
        emp = db.query(Employee).filter(Employee.id == s.employee_id).first()
        writer.writerow([
            s.employee_id,
            f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            emp.department if emp else "",
            f"{s.total_hours:.2f}",
            f"{s.capitalizable_hours:.2f}",
            f"{s.direct_hours:.2f}",
            f"{s.indirect_hours:.2f}",
            f"{s.overhead_hours:.2f}",
            f"${s.fully_burdened_cost:,.2f}",
            f"${s.capitalizable_cost:,.2f}",
            f"{s.capitalization_rate:.2f}%"
        ])

    output.seek(0)

    filename = f"capitalization_report_{period.period_id}_{datetime.now().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/employee-breakdown")
def export_employee_breakdown(
    period_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export employee-level breakdown."""
    analytics = get_analytics_by_employee(
        db=db,
        period_id=period_id,
        start_date=start_date,
        end_date=end_date
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Employee ID", "Employee Name", "Department",
        "Total Hours", "Capitalizable Hours", "Direct Hours",
        "Indirect Hours", "Overhead Hours", "Fully Burdened Cost",
        "Capitalizable Cost", "Capitalization Rate", "Hourly Rate",
        "Fully Burdened Rate", "Project Count"
    ])

    for emp in analytics["employees"]:
        writer.writerow([
            emp["employee_id"],
            emp["employee_name"],
            emp.get("department", ""),
            emp["total_hours"],
            emp["capitalizable_hours"],
            emp["direct_hours"],
            emp["indirect_hours"],
            emp["overhead_hours"],
            emp["fully_burdened_cost"],
            emp["capitalizable_cost"],
            emp["capitalization_rate"],
            emp.get("hourly_rate", ""),
            emp.get("fully_burdened_rate", ""),
            emp["project_count"]
        ])

    output.seek(0)
    filename = f"employee_breakdown_{datetime.now().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/project-breakdown")
def export_project_breakdown(
    period_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export project-level breakdown."""
    analytics = get_analytics_by_project(
        db=db,
        period_id=period_id,
        start_date=start_date,
        end_date=end_date
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Project ID", "Project Code", "Project Name", "Is Capitalizable",
        "Capitalization Type", "Total Hours", "Direct Hours", "Indirect Hours",
        "Overhead Hours", "Total Cost", "Capitalized Cost", "Employee Count"
    ])

    for proj in analytics["projects"]:
        writer.writerow([
            proj["project_id"],
            proj["project_code"],
            proj["project_name"],
            "Yes" if proj["is_capitalizable"] else "No",
            proj.get("capitalization_type", ""),
            proj["total_hours"],
            proj["direct_hours"],
            proj["indirect_hours"],
            proj["overhead_hours"],
            proj["total_cost"],
            proj["capitalized_cost"],
            proj["employee_count"]
        ])

    output.seek(0)
    filename = f"project_breakdown_{datetime.now().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== AUDIT LOG ENDPOINTS ====================

@router.get("/audit-log")
def get_audit_log(
    db: Session = Depends(get_db),
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action_category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[int] = None,
    is_financial_impact: Optional[bool] = None,
    limit: int = Query(default=100, le=500)
):
    """Get audit log entries with filters."""
    query = db.query(CapitalizationAuditLog)

    if entity_type:
        query = query.filter(CapitalizationAuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(CapitalizationAuditLog.entity_id == entity_id)
    if action_category:
        query = query.filter(CapitalizationAuditLog.action_category == action_category)
    if start_date:
        query = query.filter(CapitalizationAuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(CapitalizationAuditLog.timestamp <= end_date)
    if user_id:
        query = query.filter(CapitalizationAuditLog.user_id == user_id)
    if is_financial_impact is not None:
        query = query.filter(CapitalizationAuditLog.is_financial_impact == is_financial_impact)

    logs = query.order_by(desc(CapitalizationAuditLog.timestamp)).limit(limit).all()

    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "action_category": log.action_category,
            "user_id": log.user_id,
            "user_name": user.username if user else "Unknown",
            "timestamp": str(log.timestamp),
            "old_values": log.old_values,
            "new_values": log.new_values,
            "change_reason": log.change_reason,
            "is_financial_impact": log.is_financial_impact,
            "requires_approval": log.requires_approval
        })

    return {"audit_logs": result, "total": len(result)}


# ==================== SAMPLE FILE DOWNLOAD ENDPOINTS ====================

@router.get("/sample-files")
def list_sample_files():
    """List available sample files for download."""
    import os
    sample_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "sample_files")

    files = []
    if os.path.exists(sample_dir):
        for filename in os.listdir(sample_dir):
            if filename.endswith(".csv"):
                filepath = os.path.join(sample_dir, filename)
                files.append({
                    "filename": filename,
                    "size": os.path.getsize(filepath),
                    "description": get_sample_file_description(filename)
                })

    return {"files": files}


@router.get("/sample-files/{filename}")
def download_sample_file(filename: str):
    """Download a sample file for upload demonstration."""
    import os
    sample_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "sample_files")
    filepath = os.path.join(sample_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Sample file not found")

    # Security: ensure the file is within the sample_files directory
    if not os.path.abspath(filepath).startswith(os.path.abspath(sample_dir)):
        raise HTTPException(status_code=403, detail="Access denied")

    with open(filepath, "r") as f:
        content = f.read()

    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def get_sample_file_description(filename: str) -> str:
    """Get description for sample file."""
    descriptions = {
        "sample_time_data.csv": "Sample time entry data with employee hours, projects, and labor types",
        "sample_payroll_data.csv": "Sample payroll data with pay periods, hours, and compensation",
        "sample_labor_rates.csv": "Sample labor rate data with fully burdened rate components",
        "sample_projects.csv": "Sample project data with capitalization settings"
    }
    return descriptions.get(filename, "Sample data file")


# ==================== HELPER FUNCTIONS ====================

def calculate_fully_burdened_rate(
    hourly_rate: float,
    benefits_hourly: float = 0,
    benefits_percentage: Optional[float] = None,
    employer_taxes_hourly: float = 0,
    employer_taxes_percentage: Optional[float] = None,
    overhead_hourly: float = 0,
    overhead_percentage: Optional[float] = None
) -> float:
    """Calculate fully burdened hourly rate."""
    total = hourly_rate

    # Add benefits
    if benefits_percentage:
        total += hourly_rate * (benefits_percentage / 100)
    else:
        total += benefits_hourly

    # Add employer taxes
    if employer_taxes_percentage:
        total += hourly_rate * (employer_taxes_percentage / 100)
    else:
        total += employer_taxes_hourly

    # Add overhead
    if overhead_percentage:
        total += hourly_rate * (overhead_percentage / 100)
    else:
        total += overhead_hourly

    return round(total, 4)


def create_audit_log(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    action_category: str,
    user_id: int,
    old_values: dict = None,
    new_values: dict = None,
    change_reason: str = None,
    is_financial_impact: bool = False,
    requires_approval: bool = False
):
    """Create an audit log entry."""
    log = CapitalizationAuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        action_category=action_category,
        user_id=user_id,
        old_values=old_values,
        new_values=new_values,
        change_reason=change_reason,
        is_financial_impact=is_financial_impact,
        requires_approval=requires_approval
    )
    db.add(log)
