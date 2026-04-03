"""Analytics API routes for HR Dashboard."""
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
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
    get_normalized_compensation,
    get_compensation_by_group,
)
from app.services.export_service import export_employees_excel, export_employees_pdf
from app.services.celebrations_pdf_service import CelebrationsPDFService

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


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

    # ✅ Truncate headcount trend to current month only (use month-end dates
    #    for consistency with YTD average headcount calculation)
    today = date.today()
    months = []
    for m in range(1, current_month + 1):
        if m == 12:
            month_end = date(current_year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(current_year, m + 1, 1) - timedelta(days=1)
        # For the current month, cap at today instead of month-end
        months.append(min(month_end, today))
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
        "nordurljós": intl["by_group"].get("Norðurljós", 0),
        "vestanvind": intl["by_group"].get("Vestanvind", 0),
        "súlnasker": intl["by_group"].get("Súlnasker", 0),
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

        # Check if terminated YTD (only count terminations that have actually occurred)
        if emp.termination_date and emp.termination_date.year == current_year and emp.termination_date <= today:
            summary[key]["ytd_terms"] += 1

    return summary


# ---------------- EMPLOYEE DETAILS ---------------- #

@router.get("/employees")
def get_all_employees(db: Session = Depends(get_db)):
    """Get list of all employees with comprehensive information."""
    employees = db.query(models.Employee).all()
    # Sort numerically for numeric IDs, alphabetically for non-numeric
    def _emp_sort_key(emp):
        try:
            return (0, int(emp.employee_id), '')
        except (ValueError, TypeError):
            return (1, 0, emp.employee_id or '')
    employees.sort(key=_emp_sort_key)

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

        # Get normalized compensation data
        normalized_comp = get_normalized_compensation(emp)

        result.append({
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "full_name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "cost_center": emp.cost_center,
            "team": emp.team,
            "position": getattr(emp, 'position', None),
            "supervisor": getattr(emp, 'supervisor', None),
            "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
            "termination_date": emp.termination_date.isoformat() if emp.termination_date else None,
            "exit_docs_sent": getattr(emp, 'exit_docs_sent', False) or False,
            "exit_docs_sent_at": emp.exit_docs_sent_at.isoformat() if getattr(emp, 'exit_docs_sent_at', None) else None,
            "exit_docs_sent_to": getattr(emp, 'exit_docs_sent_to', None),
            "exit_docs_attachment_count": getattr(emp, 'exit_docs_attachment_count', None),
            "status": emp.status,
            "type": emp.type,
            "location": emp.location,
            "wage": emp.wage,
            "wage_type": emp.wage_type,
            "wage_effective_date": wage_effective_date,
            # Raw values from database
            "annual_wage": getattr(emp, 'annual_wage', None),
            "hourly_wage": getattr(emp, 'hourly_wage', None),
            # Normalized values for fair comparison
            "normalized_annual_wage": normalized_comp["annual_wage"],
            "normalized_hourly_wage": normalized_comp["hourly_wage"],
            "employee_type_category": normalized_comp["employee_type"],
            "wage_type_category": normalized_comp["wage_type"],
            # Compensation totals
            "benefits_cost_annual": getattr(emp, 'benefits_cost_annual', None) or getattr(emp, 'benefits_cost', None),
            "employer_taxes_annual": getattr(emp, 'employer_taxes_annual', None),
            "total_compensation": getattr(emp, 'total_compensation', None),
            "normalized_total_compensation": normalized_comp["total_compensation"],
            # Benefits contributions (round to 2 decimals to fix floating-point precision)
            "hsa_ee_contribution": round(getattr(emp, 'hsa_ee_contribution', 0) or 0, 2) if getattr(emp, 'hsa_ee_contribution', None) is not None else None,
            "hsa_er_contribution": round(getattr(emp, 'hsa_er_contribution', 0) or 0, 2) if getattr(emp, 'hsa_er_contribution', None) is not None else None,
            "hra_er_contribution": round(getattr(emp, 'hra_er_contribution', 0) or 0, 2) if getattr(emp, 'hra_er_contribution', None) is not None else None,
            "fsa_contribution": round(getattr(emp, 'fsa_contribution', 0) or 0, 2) if getattr(emp, 'fsa_contribution', None) is not None else None,
            "lfsa_contribution": round(getattr(emp, 'lfsa_contribution', 0) or 0, 2) if getattr(emp, 'lfsa_contribution', None) is not None else None,
            "dependent_care_fsa": round(getattr(emp, 'dependent_care_fsa', 0) or 0, 2) if getattr(emp, 'dependent_care_fsa', None) is not None else None,
            "retirement_ee_contribution_amount": round(getattr(emp, 'retirement_ee_contribution_amount', 0) or 0, 2) if getattr(emp, 'retirement_ee_contribution_amount', None) is not None else None,
            "retirement_ee_contribution_pct": round(getattr(emp, 'retirement_ee_contribution_pct', 0) or 0, 2) if getattr(emp, 'retirement_ee_contribution_pct', None) is not None else None,
            "medical_tier": getattr(emp, 'medical_tier', None),
        })

    return {"employees": result}


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

    # Use database status field - it's the source of truth
    # (previously computed from dates, but this caused issues when status was changed without clearing termination_date)
    employee_status = employee.status if employee.status else "Active"

    return {
        "employee_id": employee.employee_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "full_name": f"{employee.first_name} {employee.last_name}",
        "status": employee_status,
        "type": employee.type,
        "location": employee.location,
        "department": employee.department,
        "cost_center": employee.cost_center,
        "team": employee.team,
        "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None,
        "termination_type": employee.termination_type,
        "exit_docs_sent": getattr(employee, 'exit_docs_sent', False) or False,
        "exit_docs_sent_at": employee.exit_docs_sent_at.isoformat() if getattr(employee, 'exit_docs_sent_at', None) else None,
        "exit_docs_sent_to": getattr(employee, 'exit_docs_sent_to', None),
        "exit_docs_attachment_count": getattr(employee, 'exit_docs_attachment_count', None),
        "tenure_years": tenure_years,
        "wage": employee.wage,
        "wage_type": employee.wage_type,
        "annual_wage": getattr(employee, 'annual_wage', None),
        "hourly_wage": getattr(employee, 'hourly_wage', None),
        "position": getattr(employee, 'position', None),
        "supervisor": getattr(employee, 'supervisor', None),
        "personal_email": getattr(employee, 'personal_email', None),
        "benefits_cost": employee.benefits_cost,
        "pto_allotted": employee.pto_allotted,
        "pto_used": employee.pto_used,
        "pto_remaining": (employee.pto_allotted - employee.pto_used) if (employee.pto_allotted and employee.pto_used) else None,
        "attendance_days": employee.attendance_days,
        "expected_days": employee.expected_days,
        "birth_date": employee.birth_date.isoformat() if getattr(employee, 'birth_date', None) else None,
        "show_birthday": getattr(employee, 'show_birthday', True),
        "show_tenure": getattr(employee, 'show_tenure', True),
        "show_exact_dates": getattr(employee, 'show_exact_dates', True),
        "is_international": getattr(employee, 'is_international', False) or False,
        # Custom tags (hiring_manager, interviewer, etc.)
        "custom_tags": getattr(employee, 'custom_tags', None) or [],
        # Benefits data
        "benefits": {
            "medical": {
                "plan": getattr(employee, 'medical_plan', None),
                "tier": getattr(employee, 'medical_tier', None),
                "ee_cost": getattr(employee, 'medical_ee_cost', None),
                "er_cost": getattr(employee, 'medical_er_cost', None),
            },
            "dental": {
                "plan": getattr(employee, 'dental_plan', None),
                "tier": getattr(employee, 'dental_tier', None),
                "ee_cost": getattr(employee, 'dental_ee_cost', None),
                "er_cost": getattr(employee, 'dental_er_cost', None),
            },
            "vision": {
                "plan": getattr(employee, 'vision_plan', None),
                "tier": getattr(employee, 'vision_tier', None),
                "ee_cost": getattr(employee, 'vision_ee_cost', None),
                "er_cost": getattr(employee, 'vision_er_cost', None),
            },
            "retirement": {
                "plan_type": getattr(employee, 'retirement_plan_type', None),
                "ee_contribution_pct": getattr(employee, 'retirement_ee_contribution_pct', None),
                "ee_contribution_amount": getattr(employee, 'retirement_ee_contribution_amount', None),
                "er_match_pct": getattr(employee, 'retirement_er_match_pct', None),
                "er_match_amount": getattr(employee, 'retirement_er_match_amount', None),
                "vesting_schedule": getattr(employee, 'retirement_vesting_schedule', None),
                "vested_pct": getattr(employee, 'retirement_vested_pct', None),
            },
            "hsa": {
                "ee_contribution": getattr(employee, 'hsa_ee_contribution', None),
                "er_contribution": getattr(employee, 'hsa_er_contribution', None),
            },
            "fsa": {
                "contribution": getattr(employee, 'fsa_contribution', None),
                "dependent_care": getattr(employee, 'dependent_care_fsa', None),
            },
            "life_insurance": {
                "coverage": getattr(employee, 'life_insurance_coverage', None),
                "ee_cost": getattr(employee, 'life_insurance_ee_cost', None),
                "er_cost": getattr(employee, 'life_insurance_er_cost', None),
            },
            "disability": {
                "std_enrolled": getattr(employee, 'disability_std', False),
                "std_cost": getattr(employee, 'disability_std_cost', None),
                "ltd_enrolled": getattr(employee, 'disability_ltd', False),
                "ltd_cost": getattr(employee, 'disability_ltd_cost', None),
            },
            "other": {
                "commuter_benefits": getattr(employee, 'commuter_benefits', None),
                "wellness_stipend": getattr(employee, 'wellness_stipend', None),
            }
        }
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
            "annual_salary": record.annual_salary,
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


# ---------------- BIRTHDAYS & TENURE ANNIVERSARIES ---------------- #

@router.get("/birthdays")
def get_monthly_birthdays(db: Session = Depends(get_db)):
    """Get employees with birthdays this month (respecting privacy settings)."""
    today = date.today()
    current_month = today.month

    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active",
        models.Employee.birth_date.isnot(None),
        models.Employee.show_birthday == True
    ).all()

    birthdays_this_month = []
    for emp in employees:
        if emp.birth_date and emp.birth_date.month == current_month:
            # Calculate age
            age = today.year - emp.birth_date.year
            if today.month < emp.birth_date.month or (today.month == emp.birth_date.month and today.day < emp.birth_date.day):
                age -= 1

            birthdays_this_month.append({
                "employee_id": emp.employee_id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "birth_date": emp.birth_date.isoformat() if emp.show_exact_dates else None,
                "birth_month": emp.birth_date.month,
                "birth_day": emp.birth_date.day if emp.show_exact_dates else None,
                "age": age,
                "show_exact_dates": emp.show_exact_dates,
            })

    # Sort by day of month
    birthdays_this_month.sort(key=lambda x: x["birth_day"] if x["birth_day"] else 99)

    return {
        "month": today.strftime("%B"),
        "year": today.year,
        "count": len(birthdays_this_month),
        "birthdays": birthdays_this_month
    }


@router.get("/tenure-anniversaries")
def get_monthly_tenure_anniversaries(db: Session = Depends(get_db)):
    """Get employees with tenure anniversaries this month (respecting privacy settings)."""
    today = date.today()
    current_month = today.month

    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active",
        models.Employee.hire_date.isnot(None),
        models.Employee.show_tenure == True
    ).all()

    anniversaries_this_month = []
    for emp in employees:
        if emp.hire_date and emp.hire_date.month == current_month:
            # Calculate years of service
            years_of_service = today.year - emp.hire_date.year
            if today.month < emp.hire_date.month or (today.month == emp.hire_date.month and today.day < emp.hire_date.day):
                years_of_service -= 1

            # Only include if it's an actual anniversary (1+ years)
            if years_of_service > 0:
                # Check if this is a milestone year (5, 10, 15, 20, 25, 30, etc.)
                is_milestone = years_of_service >= 5 and years_of_service % 5 == 0
                has_milestone_bonus = False
                milestone_bonus_paid = False

                if is_milestone:
                    # Check if a bonus exists for this milestone
                    milestone_bonus = db.query(models.Bonus).filter(
                        models.Bonus.employee_id == emp.employee_id,
                        models.Bonus.bonus_type == "Anniversary",
                        models.Bonus.fiscal_year == today.year,
                        models.Bonus.notes.like(f"%{years_of_service} year%")
                    ).first()

                    if milestone_bonus:
                        has_milestone_bonus = True
                        milestone_bonus_paid = milestone_bonus.status == "Paid"
                    else:
                        # Auto-create the anniversary bonus
                        bonus_amount = years_of_service * 25  # $125 for 5 years, $250 for 10, etc.
                        anniversary_bonus = models.Bonus(
                            employee_id=emp.employee_id,
                            bonus_type="Anniversary",
                            amount=bonus_amount,
                            target_amount=bonus_amount,
                            payment_date=emp.hire_date.replace(year=today.year),
                            fiscal_year=today.year,
                            status="Pending",
                            notes=f"{years_of_service} year anniversary bonus",
                            approved_by=None,
                            approved_date=None
                        )
                        db.add(anniversary_bonus)
                        db.commit()
                        has_milestone_bonus = True
                        milestone_bonus_paid = False

                anniversaries_this_month.append({
                    "employee_id": emp.employee_id,
                    "first_name": emp.first_name,
                    "last_name": emp.last_name,
                    "full_name": f"{emp.first_name} {emp.last_name}",
                    "department": emp.department,
                    "hire_date": emp.hire_date.isoformat() if emp.show_exact_dates else None,
                    "hire_month": emp.hire_date.month,
                    "hire_day": emp.hire_date.day if emp.show_exact_dates else None,
                    "years_of_service": years_of_service,
                    "show_exact_dates": emp.show_exact_dates,
                    "has_milestone_bonus": has_milestone_bonus,
                    "milestone_bonus_paid": milestone_bonus_paid,
                })

    # Sort by day of month
    anniversaries_this_month.sort(key=lambda x: x["hire_day"] if x["hire_day"] else 99)

    return {
        "month": today.strftime("%B"),
        "year": today.year,
        "count": len(anniversaries_this_month),
        "anniversaries": anniversaries_this_month
    }


@router.get("/birthdays/export/pdf")
def export_birthdays_pdf(db: Session = Depends(get_db)):
    """Export monthly birthdays to PDF."""
    # Get birthday data
    today = date.today()
    current_month = today.month

    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active",
        models.Employee.birth_date.isnot(None),
        models.Employee.show_birthday == True
    ).all()

    birthdays_this_month = []
    for emp in employees:
        if emp.birth_date and emp.birth_date.month == current_month:
            # Calculate age
            age = today.year - emp.birth_date.year
            if today.month < emp.birth_date.month or (today.month == emp.birth_date.month and today.day < emp.birth_date.day):
                age -= 1

            birthdays_this_month.append({
                "employee_id": emp.employee_id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "birth_date": emp.birth_date.isoformat() if emp.show_exact_dates else None,
                "birth_month": emp.birth_date.month,
                "birth_day": emp.birth_date.day if emp.show_exact_dates else None,
                "age": age,
                "show_exact_dates": emp.show_exact_dates,
            })

    # Sort by day of month
    birthdays_this_month.sort(key=lambda x: x["birth_day"] if x["birth_day"] else 99)

    birthdays_data = {
        "month": today.strftime("%B"),
        "year": today.year,
        "count": len(birthdays_this_month),
        "birthdays": birthdays_this_month
    }

    # Generate PDF
    pdf_service = CelebrationsPDFService()
    pdf_buffer = pdf_service.generate_birthdays_pdf(birthdays_data)

    # Return as streaming response
    filename = f"birthdays_{today.strftime('%Y_%m')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/tenure-anniversaries/export/pdf")
def export_anniversaries_pdf(db: Session = Depends(get_db)):
    """Export monthly tenure anniversaries to PDF."""
    # Get anniversary data
    today = date.today()
    current_month = today.month

    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active",
        models.Employee.hire_date.isnot(None),
        models.Employee.show_tenure == True
    ).all()

    anniversaries_this_month = []
    for emp in employees:
        if emp.hire_date and emp.hire_date.month == current_month:
            # Calculate years of service
            years_of_service = today.year - emp.hire_date.year
            if today.month < emp.hire_date.month or (today.month == emp.hire_date.month and today.day < emp.hire_date.day):
                years_of_service -= 1

            # Only include if it's an actual anniversary (1+ years)
            if years_of_service > 0:
                anniversaries_this_month.append({
                    "employee_id": emp.employee_id,
                    "first_name": emp.first_name,
                    "last_name": emp.last_name,
                    "full_name": f"{emp.first_name} {emp.last_name}",
                    "department": emp.department,
                    "hire_date": emp.hire_date.isoformat() if emp.show_exact_dates else None,
                    "hire_month": emp.hire_date.month,
                    "hire_day": emp.hire_date.day if emp.show_exact_dates else None,
                    "years_of_service": years_of_service,
                    "show_exact_dates": emp.show_exact_dates,
                })

    # Sort by day of month
    anniversaries_this_month.sort(key=lambda x: x["hire_day"] if x["hire_day"] else 99)

    anniversaries_data = {
        "month": today.strftime("%B"),
        "year": today.year,
        "count": len(anniversaries_this_month),
        "anniversaries": anniversaries_this_month
    }

    # Generate PDF
    pdf_service = CelebrationsPDFService()
    pdf_buffer = pdf_service.generate_anniversaries_pdf(anniversaries_data)

    # Return as streaming response
    filename = f"anniversaries_{today.strftime('%Y_%m')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/location-distribution")
def get_location_distribution(db: Session = Depends(get_db)):
    """Get employee distribution by state and country for mapping."""
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    us_states = {}
    countries = {}
    cities = []

    # US country values (used to detect domestic vs international)
    us_country_values = {"US", "USA", "UNITED STATES"}

    # Legacy international country names for backwards compatibility
    intl_country_names = [
        "Canada", "United Kingdom", "Germany", "France", "Australia",
        "India", "Mexico", "Spain", "Netherlands", "Brazil"
    ]

    for emp in employees:
        if not emp.location:
            continue

        location = emp.location

        # Determine if international using address_country field first, then fallback to name matching
        emp_country = (emp.address_country or "").strip().upper()
        is_international = False
        if emp_country and emp_country not in us_country_values:
            is_international = True
        elif any(name in location for name in intl_country_names) or location.startswith("International"):
            is_international = True

        if is_international:
            # Handle "International - Company" format (e.g., "International - Norðurljós")
            if location.startswith("International - "):
                company = location.replace("International - ", "").strip()
                country = company

                if country not in countries:
                    countries[country] = {"count": 0, "cities": {}}
                countries[country]["count"] += 1

                cities.append({
                    "city": "",
                    "country": country,
                    "full_location": location,
                    "type": "international"
                })
            elif ", " in location:
                # Format: "City/Region, CountryCode" (e.g., "Lagos, NGA")
                parts = location.split(", ")
                country = parts[-1].strip()
                city = parts[0].strip() if len(parts) > 1 else ""

                if country not in countries:
                    countries[country] = {"count": 0, "cities": {}}
                countries[country]["count"] += 1

                if city:
                    if city not in countries[country]["cities"]:
                        countries[country]["cities"][city] = 0
                    countries[country]["cities"][city] += 1

                    cities.append({
                        "city": city,
                        "country": country,
                        "full_location": location,
                        "type": "international"
                    })
            else:
                # Bare country code (e.g., "IND", "BRA")
                country = location.strip()
                if country:
                    if country not in countries:
                        countries[country] = {"count": 0, "cities": {}}
                    countries[country]["count"] += 1
        else:
            # US location (City, State format or bare state code)
            if ", " in location:
                parts = location.split(", ")
                state = parts[-1].strip()
                city = parts[0].strip() if len(parts) > 1 else ""

                if state not in us_states:
                    us_states[state] = {"count": 0, "cities": {}}
                us_states[state]["count"] += 1

                if city:
                    if city not in us_states[state]["cities"]:
                        us_states[state]["cities"][city] = 0
                    us_states[state]["cities"][city] += 1

                    cities.append({
                        "city": city,
                        "state": state,
                        "full_location": location,
                        "type": "us"
                    })
            else:
                # Bare state code (e.g., "OH", "TX")
                state = location.strip()
                if state and len(state) <= 3:
                    if state not in us_states:
                        us_states[state] = {"count": 0, "cities": {}}
                    us_states[state]["count"] += 1

    # Calculate totals
    total_us = sum(state["count"] for state in us_states.values())
    total_international = sum(country["count"] for country in countries.values())
    total_employees = total_us + total_international

    return {
        "total_employees": total_employees,
        "us_states": us_states,
        "countries": countries,
        "cities": cities,
        "summary": {
            "total_us": total_us,
            "total_international": total_international,
            "us_percentage": round(total_us / total_employees * 100, 1) if total_employees > 0 else 0,
            "international_percentage": round(total_international / total_employees * 100, 1) if total_employees > 0 else 0,
            "total_states": len(us_states),
            "total_countries": len(countries)
        }
    }


@router.get("/location-distribution/pdf")
def download_location_distribution_pdf(db: Session = Depends(get_db)):
    """Generate and download a PDF report of employee location distribution."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from io import BytesIO
    from datetime import datetime

    # Get location data
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    us_states = {}
    countries = {}

    intl_countries = [
        "Canada", "United Kingdom", "Germany", "France", "Australia",
        "India", "Mexico", "Spain", "Netherlands", "Brazil"
    ]

    for emp in employees:
        if not emp.location:
            continue

        location = emp.location
        is_international = any(country in location for country in intl_countries)

        if is_international:
            if ", " in location:
                parts = location.split(", ")
                country = parts[-1].strip()
                if country not in countries:
                    countries[country] = {"count": 0, "cities": {}}
                countries[country]["count"] += 1
                if len(parts) > 1:
                    city = parts[0].strip()
                    if city not in countries[country]["cities"]:
                        countries[country]["cities"][city] = 0
                    countries[country]["cities"][city] += 1
        else:
            if ", " in location:
                parts = location.split(", ")
                state = parts[-1].strip()
                if state not in us_states:
                    us_states[state] = {"count": 0, "cities": {}}
                us_states[state]["count"] += 1
                if len(parts) > 1:
                    city = parts[0].strip()
                    if city not in us_states[state]["cities"]:
                        us_states[state]["cities"][city] = 0
                    us_states[state]["cities"][city] += 1

    total_us = sum(state["count"] for state in us_states.values())
    total_international = sum(country["count"] for country in countries.values())
    total_employees = total_us + total_international

    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)

    # Container for the 'Flowable' objects
    elements = []

    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=12
    )

    # Title
    title = Paragraph("Employee Location Distribution Report", title_style)
    elements.append(title)

    # Date
    date_text = Paragraph(f"<para align=center>Generated: {datetime.now().strftime('%B %d, %Y')}</para>", styles['Normal'])
    elements.append(date_text)
    elements.append(Spacer(1, 0.3 * inch))

    # Summary Section
    summary_heading = Paragraph("Summary", heading_style)
    elements.append(summary_heading)

    summary_data = [
        ['Metric', 'Value'],
        ['Total Active Employees', str(total_employees)],
        ['US Employees', f"{total_us} ({round(total_us/total_employees*100, 1)}%)"],
        ['International Employees', f"{total_international} ({round(total_international/total_employees*100, 1)}%)"],
        ['Total US States', str(len(us_states))],
        ['Total Countries', str(len(countries))],
    ]

    summary_table = Table(summary_data, colWidths=[3.5*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
    ]))

    elements.append(summary_table)
    elements.append(Spacer(1, 0.3 * inch))

    # US States Section
    us_heading = Paragraph("United States - Employee Distribution by State", heading_style)
    elements.append(us_heading)

    us_data = [['State', 'Employees', 'Percentage']]
    for state, data in sorted(us_states.items(), key=lambda x: x[1]['count'], reverse=True):
        pct = round(data['count'] / total_us * 100, 1) if total_us > 0 else 0
        us_data.append([state, str(data['count']), f"{pct}%"])

    us_table = Table(us_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
    us_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
    ]))

    elements.append(us_table)
    elements.append(Spacer(1, 0.3 * inch))

    # International Section
    intl_heading = Paragraph("International - Employee Distribution by Country", heading_style)
    elements.append(intl_heading)

    intl_data = [['Country', 'Employees', 'Percentage']]
    for country, data in sorted(countries.items(), key=lambda x: x[1]['count'], reverse=True):
        pct = round(data['count'] / total_international * 100, 1) if total_international > 0 else 0
        intl_data.append([country, str(data['count']), f"{pct}%"])

    intl_table = Table(intl_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
    intl_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
    ]))

    elements.append(intl_table)
    elements.append(PageBreak())

    # Add visualization page with matplotlib charts
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    from reportlab.platypus import Image as RLImage
    import tempfile
    import os

    # Create horizontal bar chart for top locations
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 6))

    # US States chart
    top_states = sorted(us_states.items(), key=lambda x: x[1]['count'], reverse=True)[:10]
    if top_states:
        state_names = [s[0] for s in top_states]
        state_counts = [s[1]['count'] for s in top_states]
        ax1.barh(state_names, state_counts, color='#3B82F6')
        ax1.set_xlabel('Number of Employees')
        ax1.set_title('Top 10 US States', fontweight='bold')
        ax1.invert_yaxis()
        for i, v in enumerate(state_counts):
            ax1.text(v + 0.5, i, str(v), va='center')

    # International chart
    top_countries = sorted(countries.items(), key=lambda x: x[1]['count'], reverse=True)[:10]
    if top_countries:
        country_names = [c[0] for c in top_countries]
        country_counts = [c[1]['count'] for c in top_countries]
        ax2.barh(country_names, country_counts, color='#10B981')
        ax2.set_xlabel('Number of Employees')
        ax2.set_title('International Locations', fontweight='bold')
        ax2.invert_yaxis()
        for i, v in enumerate(country_counts):
            ax2.text(v + 0.5, i, str(v), va='center')

    plt.tight_layout()

    # Save to temporary file
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        chart_path = tmp_file.name
        plt.savefig(chart_path, format='png', dpi=150, bbox_inches='tight')
        plt.close()

    # Add chart to PDF
    viz_heading = Paragraph("Geographic Distribution Visualization", title_style)
    elements.append(viz_heading)
    elements.append(Spacer(1, 0.2 * inch))

    chart_img = RLImage(chart_path, width=7*inch, height=4.2*inch)
    elements.append(chart_img)

    # Build PDF
    doc.build(elements)

    # Clean up temporary file
    try:
        os.unlink(chart_path)
    except:
        pass

    # FileResponse headers
    buffer.seek(0)
    today = datetime.now().strftime("%Y-%m-%d")
    filename = f"employee-locations-{today}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ---------------- COMPENSATION ANALYSIS ---------------- #

@router.get("/compensation-by-group")
def get_compensation_analysis(
    group_by: str = Query("department", description="Field to group by: department, cost_center, or team"),
    employee_type: str = Query(None, description="Filter by employee type: Full-Time or Part-Time"),
    wage_type: str = Query(None, description="Filter by wage type: Salary or Hourly"),
    db: Session = Depends(get_db)
):
    """
    Get average normalized compensation grouped by department, cost center, or team.

    Supports filtering by employee type (Full-Time/Part-Time) and wage type (Salary/Hourly).
    All wages are normalized to annual equivalents for fair comparison.

    Args:
        group_by: Field to group by - "department", "cost_center", or "team"
        employee_type: Optional filter - "Full-Time" or "Part-Time"
        wage_type: Optional filter - "Salary" or "Hourly"

    Returns:
        Dictionary with grouped compensation averages including:
        - Average annual wage (normalized)
        - Average hourly wage (normalized)
        - Average benefits and taxes
        - Average total compensation
        - Min/max annual wages
        - Employee counts
    """
    return get_compensation_by_group(
        session=db,
        group_by=group_by,
        employee_type_filter=employee_type,
        wage_type_filter=wage_type
    )
