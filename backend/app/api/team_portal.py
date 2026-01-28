"""
Team Portal API - Supervisor Features

Provides supervisor-only endpoints for managing team members, approvals,
performance reviews, goals, PIPs, and personnel action requests.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from calendar import monthrange

from app.db import models
from app.db.database import get_db
from app.api.auth import get_current_user
from app.services.rbac_service import require_permission, require_any_permission, Permissions
from app.api.in_app_notifications import create_notification


router = APIRouter(prefix="/portal/team", tags=["Employee Portal - Team (Supervisor)"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

# Direct Reports
class DirectReport(BaseModel):
    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    position: Optional[str] = None
    department: str
    hire_date: date
    status: str
    on_fmla: bool = False
    on_pto: bool = False


class DirectReportsResponse(BaseModel):
    reports: List[DirectReport]
    total_count: int


# Enhanced Team Dashboard
class TeamMemberEvent(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    date: date
    years: Optional[int] = None  # For anniversaries


class FMLACaseSummary(BaseModel):
    employee_id: str
    employee_name: str
    case_number: str
    status: str
    leave_type: str
    hours_used: float
    hours_remaining: float
    pending_submissions: int


class NewTeamMember(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    hire_date: date
    days_employed: int


class PerformanceSnapshot(BaseModel):
    reviews_completed: int
    reviews_pending: int
    average_rating: Optional[float] = None
    goals_on_track: int
    goals_at_risk: int
    goals_completed: int


class OpenPosition(BaseModel):
    id: int
    title: str
    department: str
    status: str  # open, interviewing, offer_extended
    days_open: int
    candidates: int


class TeamDashboardStats(BaseModel):
    team_size: int
    on_fmla: int
    pending_fmla_reviews: int
    reviews_due_this_month: int
    birthdays_this_month: int
    anniversaries_this_month: int
    new_hires_count: int
    open_positions_count: int


class DashboardCardPreferences(BaseModel):
    visible_cards: List[str]  # List of card IDs that should be visible
    card_order: List[str]  # Order of cards


class EnhancedTeamDashboardResponse(BaseModel):
    stats: TeamDashboardStats
    birthdays_this_month: List[TeamMemberEvent]
    anniversaries_this_month: List[TeamMemberEvent]
    fmla_cases: List[FMLACaseSummary]
    who_is_out: List[TeamMemberEvent]
    new_team_members: List[NewTeamMember]
    performance_snapshot: PerformanceSnapshot
    open_positions: List[OpenPosition]
    card_preferences: Optional[DashboardCardPreferences] = None


# Approvals
class ApprovalItem(BaseModel):
    id: int
    type: str  # pto, fmla, expense, timesheet
    employee_name: str
    employee_id: str
    submitted_at: datetime
    details: str
    hours: Optional[float] = None
    amount: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    priority: str = "normal"


class ApprovalCounts(BaseModel):
    pto: int = 0
    fmla: int = 0
    expense: int = 0
    timesheet: int = 0
    total: int = 0


class PendingApprovalsResponse(BaseModel):
    approvals: List[ApprovalItem]
    counts: ApprovalCounts


# Performance
class ReviewCycle(BaseModel):
    id: int
    name: str
    status: str
    start_date: date
    end_date: date


class TeamMemberReview(BaseModel):
    id: Optional[int] = None  # None when no review exists yet
    employee_id: str
    employee_name: str
    review_status: str
    self_review_submitted: bool = False
    manager_review_submitted: bool = False
    overall_rating: Optional[float] = None
    due_date: date


class CompletionStats(BaseModel):
    total: int
    completed: int
    in_progress: int
    not_started: int


class PerformanceResponse(BaseModel):
    current_cycle: Optional[ReviewCycle] = None
    team_reviews: List[TeamMemberReview]
    completion_stats: CompletionStats


# Goals
class Goal(BaseModel):
    id: int
    title: str
    description: str
    due_date: date
    progress: int
    status: str
    priority: str


class TeamMemberGoals(BaseModel):
    employee_id: str
    employee_name: str
    goals: List[Goal]
    total_goals: int
    completed_goals: int


class GoalsSummary(BaseModel):
    total_goals: int
    completed: int
    in_progress: int
    at_risk: int


class GoalsResponse(BaseModel):
    team_goals: List[TeamMemberGoals]
    summary: GoalsSummary


# PIPs
class PIPMilestone(BaseModel):
    id: int
    title: str
    due_date: date
    status: str
    notes: Optional[str] = None


class PIP(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    start_date: date
    end_date: date
    status: str
    reason: str
    progress_percentage: int
    milestones: List[PIPMilestone]
    next_review_date: Optional[date] = None


class PIPsSummary(BaseModel):
    active: int
    completed_successfully: int
    completed_unsuccessfully: int
    total: int


class PIPsResponse(BaseModel):
    active_pips: List[PIP]
    completed_pips: List[PIP]
    summary: PIPsSummary


# PARs
class PAR(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    action_type: str
    current_value: str
    proposed_value: str
    effective_date: date
    justification: str
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None


class PARCreate(BaseModel):
    employee_id: str
    action_type: str
    current_value: str
    proposed_value: str
    effective_date: date
    justification: str


class PARsSummary(BaseModel):
    pending: int
    approved: int
    denied: int
    processing: int


class PARsResponse(BaseModel):
    pending_pars: List[PAR]
    submitted_pars: List[PAR]
    summary: PARsSummary


# ============================================================================
# Helper Functions
# ============================================================================

def get_direct_reports(db: Session, supervisor_name: str, supervisor_employee_id: Optional[str] = None) -> List[models.Employee]:
    """Get all direct reports for a supervisor."""
    conditions = []

    if supervisor_name:
        conditions.append(models.Employee.supervisor == supervisor_name)
        conditions.append(models.Employee.supervisor.ilike(f"%{supervisor_name}%"))

    if supervisor_employee_id:
        conditions.append(models.Employee.supervisor == supervisor_employee_id)

    return db.query(models.Employee).filter(
        or_(*conditions),
        models.Employee.status == "Active"
    ).all()


def verify_is_supervisor(db: Session, user: models.User) -> List[models.Employee]:
    """Verify user is a supervisor and return their direct reports."""
    direct_reports = get_direct_reports(db, user.full_name, user.employee_id)

    if not direct_reports:
        raise HTTPException(
            status_code=403,
            detail="You do not have any direct reports"
        )

    return direct_reports


# ============================================================================
# Supervisors Endpoint
# ============================================================================

class SupervisorInfo(BaseModel):
    employee_id: str
    full_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    direct_reports_count: int = 0


class SupervisorsResponse(BaseModel):
    supervisors: List[SupervisorInfo]


@router.get("/supervisors", response_model=SupervisorsResponse)
def get_supervisors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_TEAM,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Get all employees who are supervisors (have direct reports)."""
    # Get all unique supervisor names from the employees table
    supervisor_names = db.query(models.Employee.supervisor).filter(
        models.Employee.supervisor.isnot(None),
        models.Employee.supervisor != "",
        models.Employee.status == "Active"
    ).distinct().all()

    supervisors = []
    seen = set()

    for (supervisor_name,) in supervisor_names:
        if supervisor_name and supervisor_name not in seen:
            seen.add(supervisor_name)

            # Count direct reports
            direct_reports_count = db.query(models.Employee).filter(
                models.Employee.supervisor == supervisor_name,
                models.Employee.status == "Active"
            ).count()

            # Try to find the supervisor's employee record
            supervisor_emp = db.query(models.Employee).filter(
                func.concat(models.Employee.first_name, ' ', models.Employee.last_name) == supervisor_name
            ).first()

            supervisors.append(SupervisorInfo(
                employee_id=supervisor_emp.employee_id if supervisor_emp else "",
                full_name=supervisor_name,
                position=supervisor_emp.position if supervisor_emp else None,
                department=supervisor_emp.department if supervisor_emp else None,
                direct_reports_count=direct_reports_count
            ))

    # Sort by name
    supervisors.sort(key=lambda s: s.full_name)

    return SupervisorsResponse(supervisors=supervisors)


# ============================================================================
# Direct Reports Endpoints
# ============================================================================

@router.get("/reports", response_model=DirectReportsResponse)
def get_team_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_TEAM,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Get all direct reports for the current supervisor."""
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)

    reports = []
    for emp in direct_reports:
        # Check if employee is on FMLA
        active_fmla = db.query(models.FMLALeaveRequest).filter(
            models.FMLALeaveRequest.employee_id == emp.employee_id,
            models.FMLALeaveRequest.status == "active"
        ).first()

        reports.append(DirectReport(
            id=emp.id,
            employee_id=emp.employee_id,
            first_name=emp.first_name,
            last_name=emp.last_name,
            email=f"{emp.first_name.lower()}.{emp.last_name.lower()}@company.com",
            phone=emp.personal_phone,
            position=emp.position,
            department=emp.department or "Unknown",
            hire_date=emp.hire_date or date.today(),
            status=emp.status or "Active",
            on_fmla=active_fmla is not None,
            on_pto=False  # Would need PTO tracking table
        ))

    return DirectReportsResponse(
        reports=reports,
        total_count=len(reports)
    )


# ============================================================================
# Enhanced Team Dashboard Endpoint
# ============================================================================

@router.get("/dashboard", response_model=EnhancedTeamDashboardResponse)
def get_enhanced_team_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_TEAM,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """
    Get comprehensive team dashboard data for supervisors.

    Includes:
    - Team statistics (size, FMLA count, pending reviews, etc.)
    - Birthdays this month
    - Work anniversaries this month
    - FMLA cases (if any)
    - Who's currently out
    """
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)
    employee_ids = [emp.employee_id for emp in direct_reports]

    today = date.today()
    current_month = today.month
    current_year = today.year

    # Initialize counters
    on_fmla_count = 0
    pending_fmla_reviews = 0
    reviews_due_count = 0

    birthdays = []
    anniversaries = []
    fmla_cases = []
    who_is_out = []

    for emp in direct_reports:
        # Check for birthdays this month
        if emp.birth_date and emp.birth_date.month == current_month:
            # Check show_birthday privacy setting
            if getattr(emp, 'show_birthday', True):
                birthdays.append(TeamMemberEvent(
                    employee_id=emp.employee_id,
                    first_name=emp.first_name,
                    last_name=emp.last_name,
                    position=emp.position,
                    department=emp.department,
                    date=emp.birth_date.replace(year=current_year),
                    years=None  # Don't show age
                ))

        # Check for work anniversaries this month (based on hire_date)
        if emp.hire_date and emp.hire_date.month == current_month:
            years_of_service = current_year - emp.hire_date.year
            if years_of_service > 0:  # Only show if they've been here at least a year
                anniversaries.append(TeamMemberEvent(
                    employee_id=emp.employee_id,
                    first_name=emp.first_name,
                    last_name=emp.last_name,
                    position=emp.position,
                    department=emp.department,
                    date=emp.hire_date.replace(year=current_year),
                    years=years_of_service
                ))

        # Check for annual reviews due this month (anniversary month of hire date)
        if emp.hire_date and emp.hire_date.month == current_month:
            reviews_due_count += 1

        # Check if on FMLA
        active_fmla_case = db.query(models.FMLACase).filter(
            models.FMLACase.employee_id == emp.employee_id,
            models.FMLACase.status.in_(["Active", "Approved"])
        ).first()

        if active_fmla_case:
            on_fmla_count += 1

            # Get pending submissions for this case
            pending_count = db.query(models.FMLATimeSubmission).filter(
                models.FMLATimeSubmission.case_id == active_fmla_case.id,
                models.FMLATimeSubmission.status == "pending"
            ).count()

            pending_fmla_reviews += pending_count

            # Calculate hours
            total_hours = float(active_fmla_case.hours_approved or 480)
            used_hours = float(active_fmla_case.hours_used or 0)
            remaining = float(active_fmla_case.hours_remaining or (total_hours - used_hours))

            fmla_cases.append(FMLACaseSummary(
                employee_id=emp.employee_id,
                employee_name=f"{emp.first_name} {emp.last_name}",
                case_number=active_fmla_case.case_number or f"FMLA-{active_fmla_case.id}",
                status=active_fmla_case.status,
                leave_type=active_fmla_case.leave_type or "FMLA",
                hours_used=used_hours,
                hours_remaining=remaining,
                pending_submissions=pending_count
            ))

            # Add to who's out list
            who_is_out.append(TeamMemberEvent(
                employee_id=emp.employee_id,
                first_name=emp.first_name,
                last_name=emp.last_name,
                position=emp.position,
                department=emp.department,
                date=today,
                years=None
            ))

    # Sort birthdays and anniversaries by date
    birthdays.sort(key=lambda x: x.date.day)
    anniversaries.sort(key=lambda x: x.date.day)

    # New Team Members (hired in last 90 days)
    new_team_members = []
    ninety_days_ago = today - timedelta(days=90)
    for emp in direct_reports:
        if emp.hire_date and emp.hire_date >= ninety_days_ago:
            days_employed = (today - emp.hire_date).days
            new_team_members.append(NewTeamMember(
                employee_id=emp.employee_id,
                first_name=emp.first_name,
                last_name=emp.last_name,
                position=emp.position,
                department=emp.department,
                hire_date=emp.hire_date,
                days_employed=days_employed
            ))
    new_team_members.sort(key=lambda x: x.hire_date, reverse=True)

    # Performance Snapshot (placeholder - would query real performance data)
    # Check for any review cycles and reviews
    reviews_completed = 0
    reviews_pending = 0
    try:
        current_cycle = db.query(models.ReviewCycle).filter(
            models.ReviewCycle.status.in_(["Active", "In Progress"])
        ).first()
        if current_cycle:
            for emp in direct_reports:
                review = db.query(models.PerformanceReview).filter(
                    models.PerformanceReview.employee_id == emp.employee_id,
                    models.PerformanceReview.cycle_id == current_cycle.id
                ).first()
                if review:
                    if review.status == "completed":
                        reviews_completed += 1
                    else:
                        reviews_pending += 1
                else:
                    reviews_pending += 1
    except Exception:
        pass  # Performance review tables might not exist

    performance_snapshot = PerformanceSnapshot(
        reviews_completed=reviews_completed,
        reviews_pending=reviews_pending,
        average_rating=None,  # Would calculate from actual data
        goals_on_track=0,  # Would query goals table
        goals_at_risk=0,
        goals_completed=0
    )

    # Open Positions (placeholder - would query job requisitions table)
    # For now, return empty list as this would require a job requisitions table
    open_positions: List[OpenPosition] = []

    stats = TeamDashboardStats(
        team_size=len(direct_reports),
        on_fmla=on_fmla_count,
        pending_fmla_reviews=pending_fmla_reviews,
        reviews_due_this_month=reviews_due_count,
        birthdays_this_month=len(birthdays),
        anniversaries_this_month=len(anniversaries),
        new_hires_count=len(new_team_members),
        open_positions_count=len(open_positions)
    )

    # Get user's card preferences (would be stored in a preferences table)
    # For now, return default preferences
    default_cards = [
        "team_size", "reviews_due", "birthdays", "anniversaries",
        "new_members", "performance", "fmla_cases", "who_is_out"
    ]
    card_preferences = DashboardCardPreferences(
        visible_cards=default_cards,
        card_order=default_cards
    )

    return EnhancedTeamDashboardResponse(
        stats=stats,
        birthdays_this_month=birthdays,
        anniversaries_this_month=anniversaries,
        fmla_cases=fmla_cases,
        who_is_out=who_is_out,
        new_team_members=new_team_members,
        performance_snapshot=performance_snapshot,
        open_positions=open_positions,
        card_preferences=card_preferences
    )


# ============================================================================
# Dashboard Card Preferences Endpoints
# ============================================================================

class CardPreferencesUpdate(BaseModel):
    visible_cards: List[str]
    card_order: List[str]


@router.get("/dashboard/preferences", response_model=DashboardCardPreferences)
def get_dashboard_preferences(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_TEAM,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Get the user's dashboard card preferences."""
    # Check if user has stored preferences
    pref = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user.id,
        models.UserPreference.key == "team_dashboard_cards"
    ).first()

    if pref and pref.value:
        import json
        try:
            data = json.loads(pref.value)
            return DashboardCardPreferences(
                visible_cards=data.get("visible_cards", []),
                card_order=data.get("card_order", [])
            )
        except Exception:
            pass

    # Return default preferences
    default_cards = [
        "team_size", "reviews_due", "birthdays", "anniversaries",
        "new_members", "performance", "fmla_cases", "who_is_out"
    ]
    return DashboardCardPreferences(
        visible_cards=default_cards,
        card_order=default_cards
    )


@router.put("/dashboard/preferences", response_model=DashboardCardPreferences)
def update_dashboard_preferences(
    preferences: CardPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_TEAM,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Update the user's dashboard card preferences."""
    import json

    # Check if preference exists
    pref = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user.id,
        models.UserPreference.key == "team_dashboard_cards"
    ).first()

    value = json.dumps({
        "visible_cards": preferences.visible_cards,
        "card_order": preferences.card_order
    })

    if pref:
        pref.value = value
    else:
        pref = models.UserPreference(
            user_id=current_user.id,
            key="team_dashboard_cards",
            value=value
        )
        db.add(pref)

    db.commit()

    return DashboardCardPreferences(
        visible_cards=preferences.visible_cards,
        card_order=preferences.card_order
    )


# Employee Detail Schema
class EmployeeDetailResponse(BaseModel):
    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    position: Optional[str] = None
    department: str
    team: Optional[str] = None
    hire_date: date
    employment_type: Optional[str] = None
    location: Optional[str] = None
    status: str
    on_fmla: bool = False
    on_pto: bool = False
    pto_balance: Optional[float] = None
    fmla_hours_remaining: Optional[float] = None


@router.get("/employee/{employee_id}", response_model=EmployeeDetailResponse)
def get_employee_detail(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.EMPLOYEES_READ_TEAM,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Get detailed information about a direct report."""
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)
    employee_ids = [emp.employee_id for emp in direct_reports]

    # Verify this employee is a direct report
    if employee_id not in employee_ids:
        raise HTTPException(
            status_code=403,
            detail="You can only view details for your direct reports"
        )

    # Find the employee in the direct reports list
    employee = next((emp for emp in direct_reports if emp.employee_id == employee_id), None)

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Check if employee is on FMLA
    active_fmla = db.query(models.FMLALeaveRequest).filter(
        models.FMLALeaveRequest.employee_id == employee_id,
        models.FMLALeaveRequest.status == "active"
    ).first()

    # Get FMLA hours remaining if on FMLA
    fmla_hours = None
    if active_fmla:
        case = db.query(models.FMLACase).filter(
            models.FMLACase.employee_id == employee_id,
            models.FMLACase.status == "Active"
        ).first()
        if case:
            fmla_hours = float(case.available_hours) if case.available_hours else None

    return EmployeeDetailResponse(
        id=employee.id,
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=f"{employee.first_name.lower()}.{employee.last_name.lower()}@company.com",
        phone=employee.personal_phone,
        position=employee.position,
        department=employee.department or "Unknown",
        team=employee.team,
        hire_date=employee.hire_date or date.today(),
        employment_type=employee.employment_type,
        location=employee.location,
        status=employee.status or "Active",
        on_fmla=active_fmla is not None,
        on_pto=False,  # Would need PTO tracking table
        pto_balance=None,  # Would need PTO balance tracking
        fmla_hours_remaining=fmla_hours
    )


# ============================================================================
# Approvals Endpoints
# ============================================================================

@router.get("/approvals", response_model=PendingApprovalsResponse)
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_SUPERVISOR,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Get all pending approvals for the supervisor's team."""
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)
    employee_ids = [emp.employee_id for emp in direct_reports]

    approvals = []
    counts = ApprovalCounts()

    # Get pending FMLA time submissions
    pending_fmla = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.status == "pending"
    ).all()

    for submission in pending_fmla:
        # Get the case to check employee
        case = db.query(models.FMLACase).filter(
            models.FMLACase.id == submission.case_id
        ).first()

        if case and case.employee_id in employee_ids:
            employee = next((e for e in direct_reports if e.employee_id == case.employee_id), None)
            if employee:
                approvals.append(ApprovalItem(
                    id=submission.id,
                    type="fmla",
                    employee_name=f"{employee.first_name} {employee.last_name}",
                    employee_id=case.employee_id,
                    submitted_at=submission.submitted_at or datetime.now(),
                    details=f"FMLA time entry for {submission.leave_date}",
                    hours=submission.hours_requested,
                    start_date=submission.leave_date,
                    priority="normal"
                ))
                counts.fmla += 1

    counts.total = counts.pto + counts.fmla + counts.expense + counts.timesheet

    return PendingApprovalsResponse(
        approvals=approvals,
        counts=counts
    )


@router.post("/approvals/{approval_id}/approve")
def approve_item(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_SUPERVISOR,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Approve a pending item."""
    submission = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.id == approval_id,
        models.FMLATimeSubmission.status == "pending"
    ).first()
    if submission:
        submission.status = "approved"
        submission.reviewed_by = current_user.id
        submission.reviewed_at = datetime.now()
        submission.approved_hours = submission.hours_requested
        db.commit()
        return {"success": True, "message": "FMLA time entry approved"}

    raise HTTPException(status_code=404, detail="Pending approval not found")


@router.post("/approvals/{approval_id}/deny")
def deny_item(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PTO_PORTAL_SUPERVISOR,
        Permissions.FMLA_PORTAL_SUPERVISOR
    ))
):
    """Deny a pending item."""
    submission = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.id == approval_id,
        models.FMLATimeSubmission.status == "pending"
    ).first()
    if submission:
        submission.status = "rejected"
        submission.reviewed_by = current_user.id
        submission.reviewed_at = datetime.now()
        db.commit()
        return {"success": True, "message": "FMLA time entry denied"}

    raise HTTPException(status_code=404, detail="Pending approval not found")


# ============================================================================
# Performance Endpoints
# ============================================================================

@router.get("/performance", response_model=PerformanceResponse)
def get_team_performance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PERFORMANCE_PORTAL_SUPERVISOR,
        Permissions.PERFORMANCE_READ_TEAM
    ))
):
    """Get performance review data for the team."""
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)

    # Get current review cycle
    current_cycle = db.query(models.ReviewCycle).filter(
        models.ReviewCycle.status.in_(["Active", "In Progress"])
    ).first()

    team_reviews = []
    for emp in direct_reports:
        # Check for existing review
        review = None
        if current_cycle:
            review = db.query(models.PerformanceReview).filter(
                models.PerformanceReview.employee_id == emp.employee_id,
                models.PerformanceReview.cycle_id == current_cycle.id
            ).first()

        team_reviews.append(TeamMemberReview(
            id=review.id if review else None,
            employee_id=emp.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            review_status=review.status if review else "not_started",
            self_review_submitted=review.self_review_date is not None if review and hasattr(review, 'self_review_date') else False,
            manager_review_submitted=review.manager_review_date is not None if review and hasattr(review, 'manager_review_date') else False,
            overall_rating=float(review.overall_rating) if review and review.overall_rating else None,
            due_date=current_cycle.review_window_end if current_cycle else date.today()
        ))

    # Calculate completion stats
    completed = sum(1 for r in team_reviews if r.review_status == "completed")
    in_progress = sum(1 for r in team_reviews if r.review_status == "in_progress")
    not_started = sum(1 for r in team_reviews if r.review_status == "not_started")

    return PerformanceResponse(
        current_cycle=ReviewCycle(
            id=current_cycle.id,
            name=current_cycle.name,
            status=current_cycle.status,
            start_date=current_cycle.start_date,
            end_date=current_cycle.end_date
        ) if current_cycle else None,
        team_reviews=team_reviews,
        completion_stats=CompletionStats(
            total=len(team_reviews),
            completed=completed,
            in_progress=in_progress,
            not_started=not_started
        )
    )


# ============================================================================
# Goals Endpoints
# ============================================================================

@router.get("/goals", response_model=GoalsResponse)
def get_team_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PERFORMANCE_PORTAL_SUPERVISOR,
        Permissions.PERFORMANCE_READ_TEAM
    ))
):
    """Get goals for all team members."""
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)

    # Map database status to frontend status
    def map_status(db_status: str) -> str:
        status_map = {
            "Not Started": "not_started",
            "On Track": "in_progress",
            "At Risk": "at_risk",
            "Behind": "at_risk",
            "Completed": "completed",
            "Cancelled": "cancelled",
            "In Progress": "in_progress",
        }
        return status_map.get(db_status, "not_started")

    team_goals = []
    total_goals = 0
    completed = 0
    in_progress = 0
    at_risk = 0

    for emp in direct_reports:
        # Query actual goals from the performance_goals table
        db_goals = db.query(models.PerformanceGoal).filter(
            models.PerformanceGoal.employee_id == emp.employee_id
        ).order_by(models.PerformanceGoal.target_date).all()

        goals = []
        for g in db_goals:
            mapped_status = map_status(g.status or "Not Started")
            goals.append(Goal(
                id=g.id,
                title=g.goal_title,
                description=g.goal_description or "",
                due_date=g.target_date,
                progress=int(g.progress_percentage or 0),
                status=mapped_status,
                priority=(g.priority or "Medium").lower()
            ))

            # Count for summary
            if mapped_status == "completed":
                completed += 1
            elif mapped_status in ("in_progress", "not_started"):
                in_progress += 1
            elif mapped_status == "at_risk":
                at_risk += 1

        team_goals.append(TeamMemberGoals(
            employee_id=emp.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            goals=goals,
            total_goals=len(goals),
            completed_goals=sum(1 for g in goals if g.status == "completed")
        ))

        total_goals += len(goals)

    return GoalsResponse(
        team_goals=team_goals,
        summary=GoalsSummary(
            total_goals=total_goals,
            completed=completed,
            in_progress=in_progress,
            at_risk=at_risk
        )
    )


# ============================================================================
# PIPs Endpoints
# ============================================================================

@router.get("/pips", response_model=PIPsResponse)
def get_team_pips(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PERFORMANCE_PORTAL_SUPERVISOR,
        Permissions.PERFORMANCE_READ_TEAM
    ))
):
    """Get PIPs for team members."""
    # For now, return placeholder data
    # In a real implementation, would query a PIP table

    return PIPsResponse(
        active_pips=[],
        completed_pips=[],
        summary=PIPsSummary(
            active=0,
            completed_successfully=0,
            completed_unsuccessfully=0,
            total=0
        )
    )


# ============================================================================
# PARs Endpoints
# ============================================================================

@router.get("/pars", response_model=PARsResponse)
def get_team_pars(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PAR_PORTAL_SUPERVISOR,
        Permissions.EMPLOYEES_WRITE_TEAM
    ))
):
    """Get personnel action requests submitted by the supervisor."""
    # Get PARs submitted by this user
    all_pars = db.query(
        models.PersonnelActionRequest,
        models.Employee.first_name,
        models.Employee.last_name
    ).join(
        models.Employee,
        models.PersonnelActionRequest.employee_id == models.Employee.employee_id
    ).filter(
        models.PersonnelActionRequest.submitted_by == current_user.id
    ).order_by(
        models.PersonnelActionRequest.submitted_at.desc()
    ).all()

    pending_pars = []
    submitted_pars = []

    for par, first_name, last_name in all_pars:
        par_data = PAR(
            id=par.id,
            employee_id=par.employee_id,
            employee_name=f"{first_name} {last_name}",
            action_type=par.action_type,
            current_value=par.current_value,
            proposed_value=par.proposed_value,
            effective_date=par.effective_date,
            justification=par.justification,
            status=par.status,
            submitted_at=par.submitted_at,
            reviewed_at=par.reviewed_at,
            reviewer_notes=par.reviewer_notes
        )

        if par.status == "pending":
            pending_pars.append(par_data)
        else:
            submitted_pars.append(par_data)

    # Calculate summary counts
    summary = PARsSummary(
        pending=len([p for p in all_pars if p[0].status == "pending"]),
        approved=len([p for p in all_pars if p[0].status == "approved"]),
        denied=len([p for p in all_pars if p[0].status == "denied"]),
        processing=len([p for p in all_pars if p[0].status == "processing"])
    )

    return PARsResponse(
        pending_pars=pending_pars,
        submitted_pars=submitted_pars,
        summary=summary
    )


@router.post("/pars")
def submit_par(
    par: PARCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any_permission(
        Permissions.PAR_PORTAL_SUPERVISOR,
        Permissions.EMPLOYEES_WRITE_TEAM
    ))
):
    """Submit a new personnel action request."""
    direct_reports = get_direct_reports(db, current_user.full_name, current_user.employee_id)
    employee_ids = [emp.employee_id for emp in direct_reports]

    # Verify the employee is a direct report
    if par.employee_id not in employee_ids:
        raise HTTPException(
            status_code=403,
            detail="You can only submit PARs for your direct reports"
        )

    # Create the PAR record
    new_par = models.PersonnelActionRequest(
        employee_id=par.employee_id,
        submitted_by=current_user.id,
        action_type=par.action_type,
        effective_date=par.effective_date,
        current_value=par.current_value,
        proposed_value=par.proposed_value,
        justification=par.justification,
        status="pending"
    )

    db.add(new_par)
    db.commit()
    db.refresh(new_par)

    # Get employee name for notification
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == par.employee_id
    ).first()
    employee_name = f"{employee.first_name} {employee.last_name}" if employee else par.employee_id

    # Format action type for display
    action_display = par.action_type.replace("_", " ").title()

    # Create notification for HR admins
    create_notification(
        db=db,
        title=f"New HR Request: {action_display}",
        message=f"{current_user.full_name} submitted a {action_display.lower()} request for {employee_name}",
        notification_type="hr_request",
        resource_type="par",
        resource_id=new_par.id,
        action_url="/par-approvals",
        created_by_user_id=current_user.id,
        employee_id=par.employee_id,
        priority="normal"
    )

    return {
        "success": True,
        "message": "Personnel action request submitted successfully",
        "par_id": new_par.id
    }
