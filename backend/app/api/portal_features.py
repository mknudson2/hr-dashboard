"""
Portal Features API - Feature flags for personalized employee portal experience.

This module provides endpoints to determine which features should be visible
to each employee based on their actual data (FMLA cases, garnishments, etc.)
rather than showing all features to all employees.

Endpoints:
- GET /portal/features/flags - Get feature visibility flags for current user
- PUT /portal/features/preferences - Save user view preferences (og/modern)
"""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, Permissions


router = APIRouter(
    prefix="/portal/features",
    tags=["portal-features"],
)


# =============================================================================
# SCHEMAS
# =============================================================================

class EmployeeFeatureFlags(BaseModel):
    """Feature flags based on employee's actual data and eligibility."""

    # FMLA-related
    has_active_fmla_cases: bool = False
    has_any_fmla_cases: bool = False
    has_pending_fmla_submissions: bool = False
    is_fmla_eligible: bool = True  # Based on 12-month tenure

    # Garnishment-related
    has_active_garnishments: bool = False
    has_any_garnishments: bool = False

    # PTO-related
    has_pending_pto_requests: bool = False

    # Benefits
    benefits_enrolled: bool = False

    # Supervisor features
    is_supervisor: bool = False
    has_direct_reports: bool = False
    pending_approvals_count: int = 0

    # User preferences
    preferred_view: str = "og"  # "og" or "modern"

    # Annual wage increase decision maker
    is_annual_increase_decision_maker: bool = False

    # Hiring manager access
    is_hiring_manager: bool = False

    # Recruiting stakeholder (in visibility_user_ids for any requisition)
    is_recruiting_stakeholder: bool = False

    # Action items count
    total_action_items: int = 0


class ViewPreference(BaseModel):
    """User's preferred view mode."""
    preferred_view: str  # "og" or "modern"


class PreferenceUpdateResponse(BaseModel):
    """Response after updating preferences."""
    success: bool
    preferred_view: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_direct_reports(db: Session, supervisor_user: models.User) -> list[models.Employee]:
    """
    Get all employees who report to this supervisor.
    Matches Employee.supervisor field against the supervisor's full_name or employee_id.
    """
    return db.query(models.Employee).filter(
        or_(
            models.Employee.supervisor == supervisor_user.full_name,
            models.Employee.supervisor == supervisor_user.employee_id
        ),
        models.Employee.status == "Active"
    ).all()


def check_fmla_eligibility(hire_date: Optional[date]) -> bool:
    """
    Check if employee is eligible for FMLA based on 12-month tenure.
    FMLA requires at least 12 months of employment.
    """
    if not hire_date:
        return False

    today = date.today()
    twelve_months_ago = today - timedelta(days=365)
    return hire_date <= twelve_months_ago


def check_benefits_enrolled(employee: models.Employee) -> bool:
    """Check if employee has any benefits enrollment."""
    if not employee:
        return False

    # Check if any benefit plan is enrolled
    return any([
        employee.medical_plan,
        employee.dental_plan,
        employee.vision_plan,
        employee.retirement_plan_type,
        employee.hsa_ee_contribution,
        employee.fsa_contribution,
    ])


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/flags", response_model=EmployeeFeatureFlags)
def get_feature_flags(
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
    db: Session = Depends(get_db)
):
    """
    Get feature visibility flags for the current employee.

    Returns flags indicating which portal features should be displayed
    based on the employee's actual data, eligibility, and role.
    """
    flags = EmployeeFeatureFlags()
    action_items = 0

    # Check supervisor status first (doesn't require employee_id)
    is_supervisor = current_user.role in ("manager", "admin")
    flags.is_supervisor = is_supervisor

    # Get direct reports for supervisors
    if is_supervisor:
        direct_reports = get_direct_reports(db, current_user)
        flags.has_direct_reports = len(direct_reports) > 0

        if direct_reports:
            direct_report_ids = [emp.employee_id for emp in direct_reports]

            # Count pending FMLA submissions from direct reports
            pending_fmla_count = db.query(models.FMLATimeSubmission).filter(
                models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
                models.FMLATimeSubmission.status == "pending"
            ).count() if hasattr(models, 'FMLATimeSubmission') else 0

            # Count pending PTO requests from direct reports
            pending_pto_count = db.query(models.PTORequest).filter(
                models.PTORequest.employee_id.in_(direct_report_ids),
                models.PTORequest.status == "pending"
            ).count() if hasattr(models, 'PTORequest') else 0

            flags.pending_approvals_count = pending_fmla_count + pending_pto_count
            if flags.pending_approvals_count > 0:
                action_items += 1

    # Check hiring manager access (works without employee record for admin/manager roles)
    from app.api.hiring_manager_portal import is_hiring_manager as _is_hm
    _employee_for_hm = None
    if current_user.employee_id:
        _employee_for_hm = db.query(models.Employee).filter(
            models.Employee.employee_id == current_user.employee_id
        ).first()
    flags.is_hiring_manager = _is_hm(current_user, _employee_for_hm, db)

    # Check if user is a recruiting stakeholder (in visibility_user_ids for any requisition)
    if hasattr(models, 'JobRequisition'):
        rows = db.query(
            models.JobRequisition.visibility_user_ids,
        ).filter(
            models.JobRequisition.visibility_user_ids.isnot(None),
        ).all()
        flags.is_recruiting_stakeholder = any(
            current_user.id in (r.visibility_user_ids or []) for r in rows
        )

    # If user doesn't have an employee_id, return flags now
    if not current_user.employee_id:
        flags.total_action_items = action_items
        return flags

    # Get employee record
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == current_user.employee_id
    ).first()

    if not employee:
        flags.total_action_items = action_items
        return flags

    # FMLA flags
    fmla_cases = db.query(models.FMLACase).filter(
        models.FMLACase.employee_id == current_user.employee_id
    ).all()

    flags.has_any_fmla_cases = len(fmla_cases) > 0
    flags.has_active_fmla_cases = any(
        case.status in ("Active", "Approved") for case in fmla_cases
    )

    # Check FMLA eligibility (12 months tenure)
    flags.is_fmla_eligible = check_fmla_eligibility(employee.hire_date)

    # Check for pending FMLA submissions (own submissions awaiting review)
    if hasattr(models, 'FMLATimeSubmission'):
        pending_submissions = db.query(models.FMLATimeSubmission).filter(
            models.FMLATimeSubmission.employee_id == current_user.employee_id,
            models.FMLATimeSubmission.status == "pending"
        ).count()
        flags.has_pending_fmla_submissions = pending_submissions > 0

    # Garnishment flags
    garnishments = db.query(models.Garnishment).filter(
        models.Garnishment.employee_id == current_user.employee_id
    ).all()

    flags.has_any_garnishments = len(garnishments) > 0
    flags.has_active_garnishments = any(
        g.status in ("Active", "Pending") for g in garnishments
    )

    # PTO flags
    if hasattr(models, 'PTORequest'):
        pending_pto = db.query(models.PTORequest).filter(
            models.PTORequest.employee_id == current_user.employee_id,
            models.PTORequest.status == "pending"
        ).count()
        flags.has_pending_pto_requests = pending_pto > 0
        if pending_pto > 0:
            action_items += 1

    # Benefits enrollment check
    flags.benefits_enrolled = check_benefits_enrolled(employee)

    # Annual wage increase decision maker check
    if hasattr(models, 'AnnualIncreaseBudgetArea'):
        try:
            annual_area = db.query(models.AnnualIncreaseBudgetArea).filter(
                models.AnnualIncreaseBudgetArea.decision_maker_employee_id == current_user.employee_id,
                models.AnnualIncreaseBudgetArea.is_dashboard_enabled == True,  # noqa: E712
            ).first()
            if annual_area:
                flags.is_annual_increase_decision_maker = True
                action_items += 1
        except Exception:
            pass

    # Get user preference (stored in user settings or default to "og")
    # Check if user has a stored preference
    if hasattr(current_user, 'portal_view_preference') and current_user.portal_view_preference:
        flags.preferred_view = current_user.portal_view_preference
    else:
        flags.preferred_view = "og"

    # Calculate total action items
    if flags.has_pending_fmla_submissions:
        action_items += 1

    flags.total_action_items = action_items

    return flags


@router.put("/preferences", response_model=PreferenceUpdateResponse)
def update_view_preference(
    preference: ViewPreference,
    current_user: models.User = Depends(require_permission(Permissions.EMPLOYEE_PORTAL_ACCESS)),
    db: Session = Depends(get_db)
):
    """
    Update the user's preferred view mode (og or modern).

    The preference is stored server-side for persistence across devices/sessions.
    Frontend should also store in localStorage for immediate access.
    """
    if preference.preferred_view not in ("og", "modern"):
        raise HTTPException(
            status_code=400,
            detail="Invalid view preference. Must be 'og' or 'modern'"
        )

    # Store preference on user record if the field exists
    if hasattr(current_user, 'portal_view_preference'):
        current_user.portal_view_preference = preference.preferred_view
        db.commit()

    # Even if we can't store server-side, return success
    # Frontend will use localStorage as primary storage
    return PreferenceUpdateResponse(
        success=True,
        preferred_view=preference.preferred_view
    )
