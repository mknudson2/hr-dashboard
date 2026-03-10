"""Analytics service for HR Dashboard.

Provides functions for calculating HR metrics including headcount, turnover,
tenure analysis, and export functionality for reports.
"""
from __future__ import annotations
from typing import Dict, List
from datetime import datetime
import io
from datetime import date, datetime
from typing import Dict, Any, Tuple, List

from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
)
from fastapi.responses import StreamingResponse
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from ..db import models


def _current_year_range() -> Tuple[date, date]:
    today = date.today()
    start = date(today.year, 1, 1)
    return start, today


def _month_end_dates_ytd() -> List[date]:
    """Return all month-end dates from Jan to current month of current year."""
    today = date.today()
    year = today.year
    month_ends = []
    for m in range(1, today.month + 1):
        # Month end: trick — next month day 1 minus 1 day
        if m == 12:
            next_month_first = date(year + 1, 1, 1)
        else:
            next_month_first = date(year, m + 1, 1)
        month_end = next_month_first.fromordinal(
            next_month_first.toordinal() - 1)
        month_ends.append(month_end)
    return month_ends


def count_active_as_of(session: Session, as_of: date) -> int:
    """
    Count employees active on a given date using hire/term dates.
    Active if hire_date <= as_of and (termination_date is NULL or termination_date > as_of).
    """
    q = session.query(func.count(models.Employee.id)).filter(
        models.Employee.hire_date <= as_of,
        or_(models.Employee.termination_date == None,
            models.Employee.termination_date > as_of),
    )
    return int(q.scalar() or 0)


def get_total_active_employees(session: Session) -> int:
    """Active as of today by dates (defensive even if there's a Status column)."""
    return count_active_as_of(session, date.today())


def get_ytd_terminations(session: Session) -> int:
    """Get total year-to-date terminations."""
    start, end = _current_year_range()
    q = session.query(func.count(models.Employee.id)).filter(
        models.Employee.termination_date != None,
        models.Employee.termination_date >= start,
        models.Employee.termination_date <= end,
    )
    return int(q.scalar() or 0)


def get_ytd_involuntary_terms(session: Session) -> int:
    """Get total year-to-date involuntary terminations."""
    start, end = _current_year_range()
    q = session.query(func.count(models.Employee.id)).filter(
        models.Employee.termination_date != None,
        models.Employee.termination_date >= start,
        models.Employee.termination_date <= end,
        func.lower(models.Employee.termination_type) == 'involuntary'
    )
    return int(q.scalar() or 0)


def get_ytd_average_headcount(session: Session) -> float:
    """Average of month-end active counts YTD."""
    month_ends = _month_end_dates_ytd()
    if not month_ends:
        return 0.0
    counts = [count_active_as_of(session, d) for d in month_ends]
    return round(sum(counts) / len(counts), 2)


def get_turnover_rate(session: Session) -> float:
    """Annualized turnover: (YTD Terms / YTD Avg Headcount) * (12 / months_elapsed) * 100."""
    terms = get_ytd_terminations(session)
    avg_hc = get_ytd_average_headcount(session)
    months_elapsed = date.today().month
    if avg_hc == 0 or months_elapsed == 0:
        return 0.0
    return round((terms / avg_hc) * (12 / months_elapsed) * 100.0, 2)


def get_regrettable_turnover_pct(session: Session) -> float:
    """Percentage of YTD terminations that were involuntary (firings, layoffs, dismissals)."""
    total_terms = get_ytd_terminations(session)
    if total_terms == 0:
        return 0.0
    invol = get_ytd_involuntary_terms(session)
    return round((invol / total_terms) * 100.0, 2)


def get_international_breakdown(session: Session) -> Dict[str, Any]:
    """
    Bottom-left donut: breakdown by employee_id prefix among ACTIVE employees.
      - Congruent: IDs starting with 'C' (e.g., 'C16')
      - Ameripol:  IDs starting with 'AM'
      - Bloom:     IDs starting with 'BH'
    Returns raw counts + total.
    """
    as_of = date.today()
    base_active = session.query(models.Employee).filter(
        models.Employee.hire_date <= as_of,
        or_(models.Employee.termination_date == None,
            models.Employee.termination_date > as_of),
    )

    def count_prefix(prefix: str) -> int:
        return int(base_active.filter(models.Employee.employee_id.like(f"{prefix}%")).count() or 0)

    congruent = count_prefix("C")
    ameripol = count_prefix("AM")
    bloom = count_prefix("BH")
    total = congruent + ameripol + bloom

    return {
        "total_international": total,
        "by_group": {
            "Congruent": congruent,
            "Ameripol": ameripol,
            "Bloom": bloom,
        }
    }


# 🆕 NEW ANALYTICS: AVERAGE TENURE BY COST CENTER / DEPARTMENT / TEAM
def get_average_tenure_by_group(session: Session) -> Dict[str, Any]:
    """
    Returns overall average tenure (years) and breakdown by cost center, department, and team.
    Only includes active employees.
    """
    today = date.today()

    employees = session.query(
        models.Employee.cost_center,
        models.Employee.department,
        models.Employee.team,
        models.Employee.hire_date,
        models.Employee.termination_date,
    ).all()

    # Filter active employees (must have hire_date <= today to exclude future-dated hires)
    active = [
        e for e in employees
        if e.hire_date and e.hire_date <= today and (not e.termination_date or e.termination_date > today)
    ]

    def years_between(start, end):
        return round((end - start).days / 365.25, 2)

    overall_tenure = [years_between(e.hire_date, today) for e in active]
    overall_avg = round(sum(overall_tenure) /
                        len(overall_tenure), 2) if overall_tenure else 0

    def avg_by(key_func):
        groups = {}
        for e in active:
            key = key_func(e)
            if key not in groups:
                groups[key] = []
            groups[key].append(years_between(e.hire_date, today))
        return {k: round(sum(v) / len(v), 2) for k, v in groups.items()}

    by_cost_center = avg_by(lambda e: e.cost_center or "Unassigned")
    by_department = avg_by(lambda e: e.department or "Unassigned")
    by_team = avg_by(lambda e: e.team or "Unassigned")

    return {
        "overall_avg_tenure": overall_avg,
        "by_cost_center": by_cost_center,
        "by_department": by_department,
        "by_team": by_team,
        "as_of": today.isoformat()
    }


def get_dashboard_summary(session: Session) -> Dict[str, Any]:
    """
    Consolidated payload for the 6 cards.
    """
    total_active = get_total_active_employees(session)
    ytd_terms = get_ytd_terminations(session)
    turnover_rate = get_turnover_rate(session)
    intl = get_international_breakdown(session)
    ytd_avg_hc = get_ytd_average_headcount(session)
    regrettable_pct = get_regrettable_turnover_pct(session)

    return {
        "top": {
            "total_active_employees": total_active,
            "ytd_terminations": ytd_terms,
            "turnover_rate_pct": turnover_rate
        },
        "bottom": {
            "international": intl,
            "ytd_average_headcount": ytd_avg_hc,
            "regrettable_turnover_pct": regrettable_pct
        },
        "as_of": datetime.now().isoformat()
    }

    # ----- Export Utilities -----


def export_average_tenure_excel(session: Session):
    """Return an in-memory Excel file of average tenure data."""
    data = get_average_tenure_by_group(session)

    # Convert nested dicts to DataFrames
    df_cc = pd.DataFrame(list(data["by_cost_center"].items()), columns=[
                         "Cost Center", "Avg Tenure (yrs)"])
    df_dep = pd.DataFrame(list(data["by_department"].items()),  columns=[
                          "Department", "Avg Tenure (yrs)"])
    df_team = pd.DataFrame(list(data["by_team"].items()),        columns=[
                           "Team", "Avg Tenure (yrs)"])

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        summary_df = pd.DataFrame({
            "Overall Avg Tenure (yrs)": [data["overall_avg_tenure"]],
            "As of": [data["as_of"]]
        })
        summary_df.to_excel(writer, index=False, sheet_name="Summary")
        df_cc.to_excel(writer,  index=False, sheet_name="By Cost Center")
        df_dep.to_excel(writer, index=False, sheet_name="By Department")
        df_team.to_excel(writer, index=False, sheet_name="By Team")
    buf.seek(0)

    headers = {
        "Content-Disposition": f"attachment; filename=Average_Tenure_{date.today()}.xlsx"
    }
    return StreamingResponse(buf,
                             headers=headers,
                             media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


def export_average_tenure_pdf(session: Session):
    """Return an in-memory PDF of average tenure data."""
    data = get_average_tenure_by_group(session)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    elems = [
        Paragraph("Average Tenure Report", styles["Title"]),
        Paragraph(f"As of {data['as_of']}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph(
            f"Overall Average Tenure: {data['overall_avg_tenure']} years", styles["Heading2"]),
        Spacer(1, 12)
    ]

    def make_table(title, dct):
        elems.append(Paragraph(title, styles["Heading3"]))
        rows = [["Group", "Avg Tenure (yrs)"]] + [[k, v]
                                                  for k, v in dct.items()]
        table = Table(rows)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ]))
        elems.append(table)
        elems.append(Spacer(1, 12))

    make_table("By Cost Center", data["by_cost_center"])
    make_table("By Department",  data["by_department"])
    make_table("By Team",        data["by_team"])
    doc.build(elems)

    buf.seek(0)
    headers = {
        "Content-Disposition": f"attachment; filename=Average_Tenure_{date.today()}.pdf"}
    return StreamingResponse(buf, headers=headers, media_type="application/pdf")


# ------------------ NEW PTO UTILIZATION ------------------ #

def get_pto_utilization_by_group(session: Session) -> Dict[str, object]:
    """
    Returns average PTO utilization (used / allotted * 100)
    grouped by department, cost center, and team for ACTIVE employees.
    Uses date-based active filter (hire_date/termination_date) for consistency
    with all other analytics endpoints.
    """
    today = date.today()
    employees = (
        session.query(models.Employee)
        .filter(
            models.Employee.hire_date <= today,
            or_(
                models.Employee.termination_date == None,
                models.Employee.termination_date > today,
            ),
        )
        .all()
    )

    def group_by(attr: str) -> Dict[str, float]:
        groups: Dict[str, List[float]] = {}
        for emp in employees:
            allotted = getattr(emp, "pto_allotted", None)
            used = getattr(emp, "pto_used", None)
            if allotted is None or allotted == 0 or used is None:
                continue
            pct = (used / allotted) * 100.0
            key = getattr(emp, attr, None) or "Unassigned"
            groups.setdefault(key, []).append(pct)

        return {
            key: round(sum(vals) / len(vals), 2)
            for key, vals in groups.items()
            if len(vals) > 0
        }

    return {
        "by_department": group_by("department"),
        "by_cost_center": group_by("cost_center"),
        "by_team": group_by("team"),
        "as_of": datetime.now().isoformat(),
    }


# ------------------ WAGE NORMALIZATION ------------------ #

def normalize_to_annual_wage(employee: models.Employee) -> float:
    """
    Normalize an employee's wage to annual equivalent for fair comparison.

    Rules:
    - If annual_wage exists, use it
    - If wage_type is "Hourly", calculate: hourly_wage × 2080 hours (40 hrs/wk × 52 weeks)
    - If wage_type is "Salary", use wage as annual
    - Return 0 if no valid wage data

    Args:
        employee: Employee model instance

    Returns:
        Normalized annual wage as float
    """
    # Prefer pre-calculated annual_wage if available
    if employee.annual_wage is not None and employee.annual_wage > 0:
        return round(employee.annual_wage, 2)

    # Check wage_type and calculate accordingly
    if employee.wage_type and employee.wage_type.lower() == "hourly":
        if employee.hourly_wage is not None and employee.hourly_wage > 0:
            # Standard full-time calculation: 40 hours/week × 52 weeks = 2080 hours
            return round(employee.hourly_wage * 2080, 2)
        elif employee.wage is not None and employee.wage > 0:
            # Fallback to wage field if hourly_wage not set
            return round(employee.wage * 2080, 2)

    elif employee.wage_type and employee.wage_type.lower() == "salary":
        if employee.wage is not None and employee.wage > 0:
            return round(employee.wage, 2)

    # Fallback: try wage field directly
    if employee.wage is not None and employee.wage > 0:
        return round(employee.wage, 2)

    return 0.0


def normalize_to_hourly_wage(employee: models.Employee) -> float:
    """
    Normalize an employee's wage to hourly equivalent for fair comparison.

    Rules:
    - If hourly_wage exists, use it
    - If wage_type is "Salary", calculate: annual_wage / 2080 hours
    - Return 0 if no valid wage data

    Args:
        employee: Employee model instance

    Returns:
        Normalized hourly wage as float
    """
    # Prefer pre-calculated hourly_wage if available
    if employee.hourly_wage is not None and employee.hourly_wage > 0:
        return round(employee.hourly_wage, 2)

    # Check wage_type and calculate accordingly
    if employee.wage_type and employee.wage_type.lower() == "salary":
        annual = normalize_to_annual_wage(employee)
        if annual > 0:
            return round(annual / 2080, 2)

    elif employee.wage_type and employee.wage_type.lower() == "hourly":
        if employee.wage is not None and employee.wage > 0:
            return round(employee.wage, 2)

    return 0.0


def get_employee_type_category(employee: models.Employee) -> str:
    """
    Determine employee type category for filtering and grouping.

    Returns:
        "Full-Time", "Part-Time", or "Unknown"
    """
    if employee.type:
        emp_type = employee.type.lower()
        if "full" in emp_type or "ft" in emp_type:
            return "Full-Time"
        elif "part" in emp_type or "pt" in emp_type:
            return "Part-Time"

    return "Unknown"


def get_wage_type_category(employee: models.Employee) -> str:
    """
    Determine wage type category for filtering and grouping.

    Returns:
        "Salary", "Hourly", or "Unknown"
    """
    if employee.wage_type:
        wage_type = employee.wage_type.lower()
        if "salary" in wage_type:
            return "Salary"
        elif "hourly" in wage_type or "hour" in wage_type:
            return "Hourly"

    return "Unknown"


def get_normalized_compensation(employee: models.Employee) -> Dict[str, Any]:
    """
    Get comprehensive normalized compensation data for an employee.

    Returns a dictionary with:
    - annual_wage: Normalized annual wage
    - hourly_wage: Normalized hourly wage
    - benefits_annual: Annual benefits cost
    - taxes_annual: Annual employer taxes
    - total_compensation: Total annual employer cost
    - employee_type: Full-Time, Part-Time, or Unknown
    - wage_type: Salary, Hourly, or Unknown

    Args:
        employee: Employee model instance

    Returns:
        Dictionary with normalized compensation data
    """
    annual = normalize_to_annual_wage(employee)
    hourly = normalize_to_hourly_wage(employee)

    # Get benefits and taxes (default to 0 if not set)
    benefits = employee.benefits_cost_annual or employee.benefits_cost or 0.0
    taxes = employee.employer_taxes_annual or 0.0

    # Calculate total compensation
    total_comp = annual + benefits + taxes

    return {
        "annual_wage": round(annual, 2),
        "hourly_wage": round(hourly, 2),
        "benefits_annual": round(benefits, 2),
        "taxes_annual": round(taxes, 2),
        "total_compensation": round(total_comp, 2),
        "employee_type": get_employee_type_category(employee),
        "wage_type": get_wage_type_category(employee),
    }


def get_compensation_by_group(
    session: Session,
    group_by: str = "department",
    employee_type_filter: str = None,
    wage_type_filter: str = None
) -> Dict[str, Any]:
    """
    Get average normalized compensation grouped by department, cost center, or team.

    Args:
        session: Database session
        group_by: Field to group by - "department", "cost_center", or "team"
        employee_type_filter: Optional filter - "Full-Time" or "Part-Time"
        wage_type_filter: Optional filter - "Salary" or "Hourly"

    Returns:
        Dictionary with grouped compensation averages
    """
    today = date.today()

    # Get active employees
    employees = session.query(models.Employee).filter(
        models.Employee.hire_date <= today,
        or_(models.Employee.termination_date == None,
            models.Employee.termination_date > today),
    ).all()

    # Apply filters
    filtered_employees = []
    for emp in employees:
        # Apply employee type filter
        if employee_type_filter:
            if get_employee_type_category(emp) != employee_type_filter:
                continue

        # Apply wage type filter
        if wage_type_filter:
            if get_wage_type_category(emp) != wage_type_filter:
                continue

        filtered_employees.append(emp)

    # Group by specified field
    valid_fields = ["department", "cost_center", "team"]
    if group_by not in valid_fields:
        group_by = "department"

    groups: Dict[str, List[Dict[str, Any]]] = {}

    for emp in filtered_employees:
        # Get grouping key
        if group_by == "department":
            key = emp.department or "Unassigned"
        elif group_by == "cost_center":
            key = emp.cost_center or "Unassigned"
        else:  # team
            key = emp.team or "Unassigned"

        # Get normalized compensation
        comp = get_normalized_compensation(emp)

        if key not in groups:
            groups[key] = []
        groups[key].append(comp)

    # Calculate averages for each group
    result = {}
    for key, comps in groups.items():
        if not comps:
            continue

        result[key] = {
            "count": len(comps),
            "avg_annual_wage": round(sum(c["annual_wage"] for c in comps) / len(comps), 2),
            "avg_hourly_wage": round(sum(c["hourly_wage"] for c in comps) / len(comps), 2),
            "avg_benefits": round(sum(c["benefits_annual"] for c in comps) / len(comps), 2),
            "avg_taxes": round(sum(c["taxes_annual"] for c in comps) / len(comps), 2),
            "avg_total_comp": round(sum(c["total_compensation"] for c in comps) / len(comps), 2),
            "min_annual": round(min(c["annual_wage"] for c in comps), 2),
            "max_annual": round(max(c["annual_wage"] for c in comps), 2),
        }

    return {
        "groups": result,
        "group_by": group_by,
        "filters": {
            "employee_type": employee_type_filter,
            "wage_type": wage_type_filter,
        },
        "total_employees": len(filtered_employees),
        "as_of": today.isoformat(),
    }
