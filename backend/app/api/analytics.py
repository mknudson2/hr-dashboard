"""Analytics API routes for HR Dashboard."""
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.services.analytics_service import (
    get_pto_utilization_by_group,
    get_average_tenure_by_group,
    export_average_tenure_excel,
    export_average_tenure_pdf,
    get_total_active_employees,
    get_ytd_terminations,
    get_turnover_rate,
    get_international_breakdown,
    get_ytd_average_headcount,
    get_regrettable_turnover_pct,
)
from app.services.export_service import export_employees_excel, export_employees_pdf

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/")
def get_analytics(db: Session = Depends(get_db)):
    """Main dashboard analytics.

    Includes:
    - Total & active employees
    - YTD hires, terminations, turnover rate
    - Headcount trend (up to current month, labeled)
    - International breakdown
    - YTD average headcount & regrettable turnover %
    """
    employees = db.query(models.Employee).all()
    current_year = datetime.now().year
    current_month = datetime.now().month

    # ✅ Month labels for chart readability (truncated to current month)
    month_labels = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ][:current_month]

    # ✅ Truncate headcount trend to current month only
    months = [date(current_year, m, 1) for m in range(1, current_month + 1)]
    headcount_trend = []
    for dt in months:
        count = sum(
            1
            for e in employees
            if e.hire_date
            and e.hire_date <= dt
            and (e.termination_date is None or e.termination_date > dt)
        )
        headcount_trend.append(count)

    # Employee summary stats
    total_employees = len(employees)
    active_employees = get_total_active_employees(db)
    ytd_hires = sum(
        1 for e in employees if e.hire_date and e.hire_date.year == current_year
    )

    # Termination breakdown
    total_terms_ytd = get_ytd_terminations(db)
    voluntary_terms = sum(
        1
        for e in employees
        if e.termination_date
        and e.termination_date.year == current_year
        and e.termination_type
        and e.termination_type.lower() == "voluntary"
    )
    involuntary_terms = sum(
        1
        for e in employees
        if e.termination_date
        and e.termination_date.year == current_year
        and e.termination_type
        and e.termination_type.lower() == "involuntary"
    )

    turnover_rate = get_turnover_rate(db)

    # International breakdown
    intl = get_international_breakdown(db)
    international_breakdown = {
        "total": intl["total_international"],
        "congruent": intl["by_group"]["Congruent"],
        "ameripol": intl["by_group"]["Ameripol"],
        "bloom": intl["by_group"]["Bloom"],
    }

    ytd_avg_headcount = get_ytd_average_headcount(db)
    regrettable_turnover_pct = get_regrettable_turnover_pct(db)

    # ✅ Return structured JSON with labeled months
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "ytd_hires": ytd_hires,
        "ytd_terminations": {
            "total": total_terms_ytd,
            "voluntary": voluntary_terms,
            "involuntary": involuntary_terms,
        },
        "turnover_rate": turnover_rate,
        "headcount_trend": {
            "labels": month_labels,
            "values": headcount_trend,
        },
        "international_breakdown": international_breakdown,
        "ytd_avg_headcount": ytd_avg_headcount,
        "regrettable_turnover_pct": regrettable_turnover_pct,
        "as_of": datetime.now().isoformat(),
    }


# ---------------- PTO UTILIZATION ---------------- #

@router.get("/pto-utilization")
def pto_utilization(db: Session = Depends(get_db)):
    """Average PTO utilization % grouped by Department, Cost Center, and Team."""
    return get_pto_utilization_by_group(db)


# ---------------- AVERAGE TENURE ---------------- #

@router.get("/average-tenure")
def average_tenure(db: Session = Depends(get_db)):
    return get_average_tenure_by_group(db)


@router.get("/average-tenure/export/excel")
def average_tenure_excel(db: Session = Depends(get_db)):
    return export_average_tenure_excel(db)


@router.get("/average-tenure/export/pdf")
def average_tenure_pdf(db: Session = Depends(get_db)):
    return export_average_tenure_pdf(db)


# ---------------- DEPARTMENT BREAKDOWN ---------------- #

@router.get("/departments")
def get_departments(db: Session = Depends(get_db), group_by: str = "department"):
    """Get breakdown with active and YTD termination counts.

    Args:
        group_by: Field to group by - "department", "cost_center", or "team"
    """
    from datetime import date as date_type

    employees = db.query(models.Employee).all()
    current_year = datetime.now().year
    today = date_type.today()

    # Determine which field to group by
    valid_fields = ["department", "cost_center", "team"]
    if group_by not in valid_fields:
        group_by = "department"

    # Group by the specified field
    summary = {}
    for emp in employees:
        # Get the grouping key
        if group_by == "department":
            key = emp.department or "Unassigned"
        elif group_by == "cost_center":
            key = emp.cost_center or "Unassigned"
        else:  # team
            key = emp.team or "Unassigned"

        if key not in summary:
            summary[key] = {"active": 0, "ytd_terms": 0}

        # Check if active
        is_active = (
            emp.hire_date
            and emp.hire_date <= today
            and (emp.termination_date is None or emp.termination_date > today)
        )
        if is_active:
            summary[key]["active"] += 1

        # Check if terminated YTD
        if emp.termination_date and emp.termination_date.year == current_year:
            summary[key]["ytd_terms"] += 1

    return summary


# ---------------- EMPLOYEE DETAILS ---------------- #

@router.get("/employees")
def get_all_employees(db: Session = Depends(get_db)):
    """Get list of all employees with comprehensive information."""
    employees = db.query(models.Employee).all()

    result = []
    for emp in employees:
        # Get most recent wage change date from wage_history
        latest_wage_record = (
            db.query(models.WageHistory)
            .filter(models.WageHistory.employee_id == emp.employee_id)
            .order_by(models.WageHistory.effective_date.desc())
            .first()
        )

        wage_effective_date = None
        if latest_wage_record:
            wage_effective_date = latest_wage_record.effective_date.isoformat()

        result.append({
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "department": emp.department,
            "cost_center": emp.cost_center,
            "team": emp.team,
            "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
            "status": emp.status,
            "type": emp.type,
            "location": emp.location,
            "wage": emp.wage,
            "wage_type": emp.wage_type,
            "wage_effective_date": wage_effective_date,
        })

    return result


@router.get("/employees/{employee_id}")
def get_employee_details(employee_id: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific employee."""
    from datetime import date as date_type

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        return {"error": "Employee not found"}

    # Calculate tenure
    today = date_type.today()
    if employee.hire_date:
        tenure_days = (today - employee.hire_date).days
        tenure_years = round(tenure_days / 365.25, 2)
    else:
        tenure_years = 0

    # Determine if active
    is_active = (
        employee.hire_date
        and employee.hire_date <= today
        and (employee.termination_date is None or employee.termination_date > today)
    )

    return {
        "employee_id": employee.employee_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "full_name": f"{employee.first_name} {employee.last_name}",
        "status": "Active" if is_active else "Terminated",
        "type": employee.type,
        "location": employee.location,
        "department": employee.department,
        "cost_center": employee.cost_center,
        "team": employee.team,
        "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None,
        "termination_type": employee.termination_type,
        "tenure_years": tenure_years,
        "wage": employee.wage,
        "benefits_cost": employee.benefits_cost,
        "pto_allotted": employee.pto_allotted,
        "pto_used": employee.pto_used,
        "pto_remaining": (employee.pto_allotted - employee.pto_used) if (employee.pto_allotted and employee.pto_used) else None,
        "attendance_days": employee.attendance_days,
        "expected_days": employee.expected_days,
    }


@router.get("/employees/{employee_id}/wage-history")
def get_wage_history(employee_id: str, db: Session = Depends(get_db)):
    """Get wage history for a specific employee."""
    # Check if employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        return {"error": "Employee not found"}

    # Get wage history ordered by date
    wage_history = (
        db.query(models.WageHistory)
        .filter(models.WageHistory.employee_id == employee_id)
        .order_by(models.WageHistory.effective_date)
        .all()
    )

    return [
        {
            "effective_date": record.effective_date.isoformat(),
            "wage": record.wage,
            "change_reason": record.change_reason,
            "change_amount": record.change_amount,
            "change_percentage": record.change_percentage,
        }
        for record in wage_history
    ]


# ---------------- EMPLOYEE EXPORTS ---------------- #

@router.get("/employees/export/excel")
def export_employees_to_excel(
    view_mode: str = Query("standard", description="View mode: standard or compensation"),
    employee_ids: str = Query(None, description="Comma-separated employee IDs to export"),
    db: Session = Depends(get_db)
):
    """Export employee data to Excel format.

    Args:
        view_mode: "standard" or "compensation"
        employee_ids: Optional comma-separated list of employee IDs to filter
        db: Database session

    Returns:
        Excel file as streaming response
    """
    # Get employees
    query = db.query(models.Employee)

    # Filter by employee IDs if provided
    if employee_ids:
        id_list = [id.strip() for id in employee_ids.split(",")]
        query = query.filter(models.Employee.employee_id.in_(id_list))

    employees = query.all()

    # Convert to dictionaries
    employee_data = []
    for emp in employees:
        # Get wage effective date
        latest_wage_record = (
            db.query(models.WageHistory)
            .filter(models.WageHistory.employee_id == emp.employee_id)
            .order_by(models.WageHistory.effective_date.desc())
            .first()
        )

        wage_effective_date = None
        if latest_wage_record:
            wage_effective_date = latest_wage_record.effective_date.isoformat()

        employee_data.append({
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "department": emp.department,
            "cost_center": emp.cost_center,
            "team": emp.team,
            "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
            "status": emp.status,
            "type": emp.type,
            "location": emp.location,
            "wage": emp.wage,
            "wage_type": emp.wage_type,
            "wage_effective_date": wage_effective_date,
        })

    # Generate Excel file
    excel_file = export_employees_excel(employee_data, view_mode)

    # Return as streaming response
    filename = f"employees_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/employees/export/pdf")
def export_employees_to_pdf(
    view_mode: str = Query("standard", description="View mode: standard or compensation"),
    employee_ids: str = Query(None, description="Comma-separated employee IDs to export"),
    db: Session = Depends(get_db)
):
    """Export employee data to PDF format.

    Args:
        view_mode: "standard" or "compensation"
        employee_ids: Optional comma-separated list of employee IDs to filter
        db: Database session

    Returns:
        PDF file as streaming response
    """
    # Get employees
    query = db.query(models.Employee)

    # Filter by employee IDs if provided
    if employee_ids:
        id_list = [id.strip() for id in employee_ids.split(",")]
        query = query.filter(models.Employee.employee_id.in_(id_list))

    employees = query.all()

    # Convert to dictionaries
    employee_data = []
    for emp in employees:
        # Get wage effective date
        latest_wage_record = (
            db.query(models.WageHistory)
            .filter(models.WageHistory.employee_id == emp.employee_id)
            .order_by(models.WageHistory.effective_date.desc())
            .first()
        )

        wage_effective_date = None
        if latest_wage_record:
            wage_effective_date = latest_wage_record.effective_date.isoformat()

        employee_data.append({
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "department": emp.department,
            "cost_center": emp.cost_center,
            "team": emp.team,
            "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
            "status": emp.status,
            "type": emp.type,
            "location": emp.location,
            "wage": emp.wage,
            "wage_type": emp.wage_type,
            "wage_effective_date": wage_effective_date,
        })

    # Generate PDF file
    pdf_file = export_employees_pdf(employee_data, view_mode)

    # Return as streaming response
    filename = f"employees_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    return StreamingResponse(
        pdf_file,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
