"""Analytics API routes for HR Dashboard.

Provides endpoints for dashboard analytics, headcount trends, and PTO utilization.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Employee
from app.services.analytics_service import get_pto_utilization_by_group

# ✅ add prefix + tags for cleaner route structure
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/")
def get_analytics(db: Session = Depends(get_db)):
    """Get analytics data for HR dashboard.

    Returns employee counts, YTD hires/terminations, turnover rate,
    and monthly headcount trends.
    """
    employees = db.query(Employee).all()
    current_year = datetime.now().year

    # ✅ Instead of hardcoding 2025, use current_year dynamically
    months = [datetime(current_year, m, 1) for m in range(1, 13)]

    # ✅ Headcount trend = count of active employees per month
    headcount_trend = []
    for date in months:
        count = sum(
            1
            for e in employees
            if e.hire_date and e.hire_date <= date
            and (e.termination_date is None or e.termination_date > date)
        )
        headcount_trend.append(count)

    active_employees = sum(
        1 for e in employees if e.status and e.status.lower() == "active"
    )

    # ✅ YTD hires
    ytd_hires = sum(
        1 for e in employees if e.hire_date and e.hire_date.year == current_year
    )

    # ✅ YTD terminations
    total_terminations_ytd = sum(
        1 for e in employees if e.termination_date and e.termination_date.year == current_year
    )

    total_employees = len(employees)

    # ✅ Defensive division
    turnover_rate = (
        round((total_terminations_ytd / total_employees) * 100, 2)
        if total_employees > 0
        else 0
    )

    # ✅ Return structure looks good
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "ytd_hires": ytd_hires,
        "ytd_terminations": {"total": total_terminations_ytd},
        "turnover_rate": turnover_rate,
        "headcount_trend": headcount_trend,
    }


@router.get("/pto-utilization")
def pto_utilization(db: Session = Depends(get_db)):
    """Get PTO utilization statistics grouped by department.

    Returns average PTO utilization percentage by department for active employees.
    """
    return get_pto_utilization_by_group(db)
