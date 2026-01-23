"""
FMLA Self-Service Portal API routes.

This module provides endpoints for the Employee/Supervisor FMLA Self-Service Portal,
allowing employees to submit time entries and leave requests, and supervisors to
review and approve submissions with full audit trail.

Employee Endpoints (require fmla_portal:employee permission):
- GET /portal/my-cases - View own FMLA cases
- GET /portal/my-submissions - View own time submissions
- POST /portal/submit-time - Submit time entry for approval
- POST /portal/request-leave - Submit new FMLA leave request

Supervisor Endpoints (require fmla_portal:supervisor permission):
- GET /portal/team-submissions - View pending submissions from direct reports
- GET /portal/team-cases - View FMLA cases for direct reports
- POST /portal/review-submission/{id} - Approve/reject/modify time entry
- GET /portal/export-report - Download team FMLA report
"""

from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import csv
import io

from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.audit_service import audit_service
from app.services.rbac_service import require_permission, require_any_permission, Permissions
from app.schemas.fmla_portal import (
    TimeSubmissionCreate, TimeSubmissionResponse, TimeSubmissionListResponse,
    LeaveRequestCreate, LeaveRequestResponse,
    CaseResponse, MyCasesResponse,
    SubmissionReviewRequest, SubmissionReviewResponse,
    TeamMemberSubmission, TeamSubmissionsResponse,
    TeamCaseSummary, TeamCasesResponse,
    AuditLogEntry, AuditLogResponse,
    ReportExportRequest, ReportSummary,
    EmployeeDashboardResponse, SupervisorDashboardResponse
)


router = APIRouter(
    prefix="/portal",
    tags=["fmla-portal"],
)


# =============================================================================
# HELPER FUNCTIONS - Supervisor Resolution
# =============================================================================

def get_supervisor_for_employee(db: Session, employee_id: str) -> Optional[models.User]:
    """
    Find supervisor User record by matching name or employee_id.

    Since Employee.supervisor is a text field (not a foreign key),
    we need to match it against either User.full_name or User.employee_id.
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee or not employee.supervisor:
        return None

    # Try matching by full name first, then employee_id
    supervisor = db.query(models.User).filter(
        or_(
            models.User.full_name == employee.supervisor,
            models.User.employee_id == employee.supervisor
        )
    ).first()

    return supervisor


def get_direct_reports(db: Session, supervisor_user: models.User) -> List[models.Employee]:
    """
    Get all employees who report to this supervisor.

    Matches Employee.supervisor field against the supervisor's
    full_name or employee_id.
    """
    return db.query(models.Employee).filter(
        or_(
            models.Employee.supervisor == supervisor_user.full_name,
            models.Employee.supervisor == supervisor_user.employee_id
        )
    ).all()


def get_direct_report_ids(db: Session, supervisor_user: models.User) -> List[str]:
    """Get list of employee_ids for all direct reports."""
    reports = get_direct_reports(db, supervisor_user)
    return [emp.employee_id for emp in reports]


def format_date(d: Optional[date]) -> Optional[str]:
    """Format date to ISO string, handling None values."""
    return d.isoformat() if d else None


def format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Format datetime to ISO string, handling None values."""
    return dt.isoformat() if dt else None


# =============================================================================
# EMPLOYEE ENDPOINTS
# =============================================================================

@router.get("/my-cases", response_model=MyCasesResponse)
def get_my_cases(
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get the current employee's FMLA cases.

    Returns all FMLA cases for the logged-in employee, along with
    summary statistics including rolling 12-month hours used.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    # Get employee info
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == current_user.employee_id
    ).first()

    employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

    # Get all cases for this employee
    cases = db.query(models.FMLACase).filter(
        models.FMLACase.employee_id == current_user.employee_id
    ).order_by(models.FMLACase.start_date.desc()).all()

    # Calculate rolling 12-month usage
    today = date.today()
    twelve_months_ago = today - timedelta(days=365)

    recent_cases = [
        c for c in cases
        if c.start_date and c.start_date >= twelve_months_ago
    ]

    total_hours_used_12mo = sum(c.hours_used for c in recent_cases)
    hours_available_12mo = 480.0 - total_hours_used_12mo

    active_cases = [c for c in cases if c.status in ("Active", "Approved")]

    return MyCasesResponse(
        cases=[
            CaseResponse(
                id=case.id,
                case_number=case.case_number,
                employee_id=case.employee_id,
                employee_name=employee_name,
                status=case.status,
                leave_type=case.leave_type,
                reason=case.reason,
                request_date=format_date(case.request_date),
                start_date=format_date(case.start_date),
                end_date=format_date(case.end_date),
                hours_approved=case.hours_approved,
                hours_used=case.hours_used,
                hours_remaining=case.hours_remaining,
                intermittent=case.intermittent or False,
                reduced_schedule=case.reduced_schedule or False
            )
            for case in cases
        ],
        total_cases=len(cases),
        active_cases=len(active_cases),
        rolling_12mo_hours_used=total_hours_used_12mo,
        rolling_12mo_hours_available=max(0, hours_available_12mo)
    )


@router.get("/my-submissions", response_model=TimeSubmissionListResponse)
def get_my_submissions(
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get the current employee's time submissions.

    Args:
        status: Filter by submission status (pending, approved, rejected, revised)
        limit: Maximum number of submissions to return
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    query = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id == current_user.employee_id
    )

    if status:
        query = query.filter(models.FMLATimeSubmission.status == status)

    submissions = query.order_by(
        models.FMLATimeSubmission.submitted_at.desc()
    ).limit(limit).all()

    pending_count = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id == current_user.employee_id,
        models.FMLATimeSubmission.status == "pending"
    ).count()

    return TimeSubmissionListResponse(
        submissions=[
            TimeSubmissionResponse(
                id=sub.id,
                case_id=sub.case_id,
                employee_id=sub.employee_id,
                leave_date=format_date(sub.leave_date),
                hours_requested=sub.hours_requested,
                entry_type=sub.entry_type,
                employee_notes=sub.employee_notes,
                status=sub.status,
                submitted_at=format_datetime(sub.submitted_at),
                reviewed_by=sub.reviewed_by,
                reviewed_at=format_datetime(sub.reviewed_at),
                reviewer_notes=sub.reviewer_notes,
                approved_hours=sub.approved_hours
            )
            for sub in submissions
        ],
        total=len(submissions),
        pending_count=pending_count
    )


@router.post("/submit-time", response_model=TimeSubmissionResponse)
def submit_time_entry(
    request: Request,
    submission: TimeSubmissionCreate,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Submit a time entry for supervisor approval.

    Employees use this endpoint to log FMLA time usage. The submission
    goes into a pending state until reviewed by the employee's supervisor.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    # Verify the case exists and belongs to this employee
    case = db.query(models.FMLACase).filter(
        models.FMLACase.id == submission.case_id,
        models.FMLACase.employee_id == current_user.employee_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="FMLA case not found or does not belong to you"
        )

    # Validate case is active
    if case.status not in ("Active", "Approved"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit time for a case with status '{case.status}'"
        )

    # Parse and validate date
    try:
        leave_date = datetime.fromisoformat(submission.leave_date).date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use ISO format (YYYY-MM-DD)"
        )

    # Validate hours
    if submission.hours_requested <= 0 or submission.hours_requested > 24:
        raise HTTPException(
            status_code=400,
            detail="Hours must be between 0 and 24"
        )

    # Check for duplicate submission for same date/case
    existing = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.case_id == submission.case_id,
        models.FMLATimeSubmission.leave_date == leave_date,
        models.FMLATimeSubmission.status.in_(["pending", "approved"])
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A time entry already exists for this date (status: {existing.status})"
        )

    # Create the submission
    new_submission = models.FMLATimeSubmission(
        case_id=submission.case_id,
        employee_id=current_user.employee_id,
        leave_date=leave_date,
        hours_requested=submission.hours_requested,
        entry_type=submission.entry_type,
        employee_notes=submission.employee_notes,
        status="pending"
    )

    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    return TimeSubmissionResponse(
        id=new_submission.id,
        case_id=new_submission.case_id,
        employee_id=new_submission.employee_id,
        leave_date=format_date(new_submission.leave_date),
        hours_requested=new_submission.hours_requested,
        entry_type=new_submission.entry_type,
        employee_notes=new_submission.employee_notes,
        status=new_submission.status,
        submitted_at=format_datetime(new_submission.submitted_at),
        reviewed_by=None,
        reviewed_at=None,
        reviewer_notes=None,
        approved_hours=None
    )


@router.post("/request-leave", response_model=LeaveRequestResponse)
def request_leave(
    request: Request,
    leave_request: LeaveRequestCreate,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Submit a new FMLA leave request.

    Employees use this endpoint to initiate a new FMLA leave request,
    which will be reviewed by HR. Once approved by HR, a formal FMLA
    case will be created.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    # Parse dates
    try:
        start_date = datetime.fromisoformat(leave_request.requested_start_date).date()
        end_date = None
        if leave_request.requested_end_date:
            end_date = datetime.fromisoformat(leave_request.requested_end_date).date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use ISO format (YYYY-MM-DD)"
        )

    # Validate dates
    if end_date and end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be before start date"
        )

    # Create the leave request
    new_request = models.FMLACaseRequest(
        employee_id=current_user.employee_id,
        leave_type=leave_request.leave_type,
        reason=leave_request.reason,
        requested_start_date=start_date,
        requested_end_date=end_date,
        intermittent=leave_request.intermittent,
        reduced_schedule=leave_request.reduced_schedule,
        estimated_hours_per_week=leave_request.estimated_hours_per_week,
        status="submitted"
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return LeaveRequestResponse(
        id=new_request.id,
        employee_id=new_request.employee_id,
        leave_type=new_request.leave_type,
        reason=new_request.reason,
        requested_start_date=format_date(new_request.requested_start_date),
        requested_end_date=format_date(new_request.requested_end_date),
        intermittent=new_request.intermittent,
        reduced_schedule=new_request.reduced_schedule,
        estimated_hours_per_week=new_request.estimated_hours_per_week,
        status=new_request.status,
        submitted_at=format_datetime(new_request.submitted_at),
        hr_notes=new_request.hr_notes,
        linked_case_id=new_request.linked_case_id
    )


@router.get("/dashboard", response_model=EmployeeDashboardResponse)
def get_employee_dashboard(
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_EMPLOYEE)),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data for an employee.

    Returns a summary view with active cases, pending submissions,
    and recent activity for the employee's dashboard page.
    """
    if not current_user.employee_id:
        raise HTTPException(
            status_code=400,
            detail="User is not linked to an employee record"
        )

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == current_user.employee_id
    ).first()

    employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

    # Get active cases
    active_cases = db.query(models.FMLACase).filter(
        models.FMLACase.employee_id == current_user.employee_id,
        models.FMLACase.status.in_(["Active", "Approved"])
    ).all()

    # Get pending submissions
    pending_submissions = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id == current_user.employee_id,
        models.FMLATimeSubmission.status == "pending"
    ).order_by(models.FMLATimeSubmission.submitted_at.desc()).all()

    # Get recent submissions (last 10)
    recent_submissions = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id == current_user.employee_id
    ).order_by(models.FMLATimeSubmission.submitted_at.desc()).limit(10).all()

    # Calculate rolling 12-month usage
    today = date.today()
    twelve_months_ago = today - timedelta(days=365)

    all_cases = db.query(models.FMLACase).filter(
        models.FMLACase.employee_id == current_user.employee_id
    ).all()

    recent_cases = [c for c in all_cases if c.start_date and c.start_date >= twelve_months_ago]
    total_hours_used_12mo = sum(c.hours_used for c in recent_cases)

    return EmployeeDashboardResponse(
        employee_id=current_user.employee_id,
        employee_name=employee_name,
        active_cases=[
            CaseResponse(
                id=case.id,
                case_number=case.case_number,
                employee_id=case.employee_id,
                employee_name=employee_name,
                status=case.status,
                leave_type=case.leave_type,
                reason=case.reason,
                request_date=format_date(case.request_date),
                start_date=format_date(case.start_date),
                end_date=format_date(case.end_date),
                hours_approved=case.hours_approved,
                hours_used=case.hours_used,
                hours_remaining=case.hours_remaining,
                intermittent=case.intermittent or False,
                reduced_schedule=case.reduced_schedule or False
            )
            for case in active_cases
        ],
        pending_submissions=[
            TimeSubmissionResponse(
                id=sub.id,
                case_id=sub.case_id,
                employee_id=sub.employee_id,
                leave_date=format_date(sub.leave_date),
                hours_requested=sub.hours_requested,
                entry_type=sub.entry_type,
                employee_notes=sub.employee_notes,
                status=sub.status,
                submitted_at=format_datetime(sub.submitted_at),
                reviewed_by=sub.reviewed_by,
                reviewed_at=format_datetime(sub.reviewed_at),
                reviewer_notes=sub.reviewer_notes,
                approved_hours=sub.approved_hours
            )
            for sub in pending_submissions
        ],
        recent_submissions=[
            TimeSubmissionResponse(
                id=sub.id,
                case_id=sub.case_id,
                employee_id=sub.employee_id,
                leave_date=format_date(sub.leave_date),
                hours_requested=sub.hours_requested,
                entry_type=sub.entry_type,
                employee_notes=sub.employee_notes,
                status=sub.status,
                submitted_at=format_datetime(sub.submitted_at),
                reviewed_by=sub.reviewed_by,
                reviewed_at=format_datetime(sub.reviewed_at),
                reviewer_notes=sub.reviewer_notes,
                approved_hours=sub.approved_hours
            )
            for sub in recent_submissions
        ],
        rolling_12mo_hours_used=total_hours_used_12mo,
        rolling_12mo_hours_available=max(0, 480.0 - total_hours_used_12mo)
    )


# =============================================================================
# SUPERVISOR ENDPOINTS
# =============================================================================

@router.get("/team-submissions", response_model=TeamSubmissionsResponse)
def get_team_submissions(
    status: Optional[str] = None,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_SUPERVISOR)),
    db: Session = Depends(get_db)
):
    """
    Get pending time submissions from direct reports.

    Supervisors use this endpoint to see time entries submitted by
    their direct reports that need review.
    """
    # Get list of direct report employee IDs
    direct_report_ids = get_direct_report_ids(db, current_user)

    if not direct_report_ids:
        return TeamSubmissionsResponse(
            pending_submissions=[],
            recent_submissions=[],
            pending_count=0,
            approved_today=0,
            rejected_today=0
        )

    # Query pending submissions
    pending_query = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.status == "pending"
    ).order_by(models.FMLATimeSubmission.submitted_at.asc())

    pending_submissions = pending_query.all()

    # Query recent submissions (last 7 days, non-pending)
    week_ago = datetime.now() - timedelta(days=7)
    recent_query = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.status != "pending",
        models.FMLATimeSubmission.reviewed_at >= week_ago
    ).order_by(models.FMLATimeSubmission.reviewed_at.desc()).limit(20)

    recent_submissions = recent_query.all()

    # Count today's activity
    today_start = datetime.combine(date.today(), datetime.min.time())
    approved_today = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.status == "approved",
        models.FMLATimeSubmission.reviewed_at >= today_start
    ).count()

    rejected_today = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.status == "rejected",
        models.FMLATimeSubmission.reviewed_at >= today_start
    ).count()

    # Helper to build team member submission response
    def build_team_submission(sub: models.FMLATimeSubmission) -> TeamMemberSubmission:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == sub.employee_id
        ).first()
        case = db.query(models.FMLACase).filter(
            models.FMLACase.id == sub.case_id
        ).first()

        return TeamMemberSubmission(
            id=sub.id,
            employee_id=sub.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            department=employee.department if employee else None,
            case_number=(case.case_number if case and case.case_number else f"Case-{sub.case_id}"),
            leave_date=format_date(sub.leave_date),
            hours_requested=sub.hours_requested,
            entry_type=sub.entry_type,
            employee_notes=sub.employee_notes,
            status=sub.status,
            submitted_at=format_datetime(sub.submitted_at)
        )

    return TeamSubmissionsResponse(
        pending_submissions=[build_team_submission(sub) for sub in pending_submissions],
        recent_submissions=[build_team_submission(sub) for sub in recent_submissions],
        pending_count=len(pending_submissions),
        approved_today=approved_today,
        rejected_today=rejected_today
    )


@router.get("/team-cases", response_model=TeamCasesResponse)
def get_team_cases(
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_SUPERVISOR)),
    db: Session = Depends(get_db)
):
    """
    Get FMLA cases for direct reports.

    Supervisors use this endpoint to see an overview of FMLA cases
    for employees who report to them.
    """
    direct_report_ids = get_direct_report_ids(db, current_user)

    if not direct_report_ids:
        return TeamCasesResponse(
            cases=[],
            total_team_members_on_fmla=0,
            total_pending_submissions=0
        )

    # Get active cases for direct reports
    cases = db.query(models.FMLACase).filter(
        models.FMLACase.employee_id.in_(direct_report_ids),
        models.FMLACase.status.in_(["Active", "Approved", "Pending"])
    ).all()

    # Count pending submissions
    total_pending = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.status == "pending"
    ).count()

    # Build case summaries
    case_summaries = []
    employees_with_cases = set()

    for case in cases:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == case.employee_id
        ).first()

        pending_for_case = db.query(models.FMLATimeSubmission).filter(
            models.FMLATimeSubmission.case_id == case.id,
            models.FMLATimeSubmission.status == "pending"
        ).count()

        case_summaries.append(TeamCaseSummary(
            employee_id=case.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            department=employee.department if employee else None,
            case_id=case.id,
            case_number=case.case_number,
            status=case.status,
            leave_type=case.leave_type,
            start_date=format_date(case.start_date),
            hours_used=case.hours_used,
            hours_remaining=case.hours_remaining,
            pending_submissions=pending_for_case
        ))
        employees_with_cases.add(case.employee_id)

    return TeamCasesResponse(
        cases=case_summaries,
        total_team_members_on_fmla=len(employees_with_cases),
        total_pending_submissions=total_pending
    )


@router.get("/submission/{submission_id}")
def get_submission_details(
    submission_id: int,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_SUPERVISOR)),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific submission.

    Used by supervisors when reviewing a submission to see full details
    including case information and employee details.
    """
    submission = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Verify supervisor has access to this employee
    direct_report_ids = get_direct_report_ids(db, current_user)
    if submission.employee_id not in direct_report_ids:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view this submission"
        )

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == submission.employee_id
    ).first()

    case = db.query(models.FMLACase).filter(
        models.FMLACase.id == submission.case_id
    ).first()

    reviewer = None
    if submission.reviewed_by:
        reviewer = db.query(models.User).filter(
            models.User.id == submission.reviewed_by
        ).first()

    return {
        "submission": {
            "id": submission.id,
            "case_id": submission.case_id,
            "employee_id": submission.employee_id,
            "leave_date": format_date(submission.leave_date),
            "hours_requested": submission.hours_requested,
            "entry_type": submission.entry_type,
            "employee_notes": submission.employee_notes,
            "status": submission.status,
            "submitted_at": format_datetime(submission.submitted_at),
            "reviewed_by": submission.reviewed_by,
            "reviewed_at": format_datetime(submission.reviewed_at),
            "reviewer_notes": submission.reviewer_notes,
            "approved_hours": submission.approved_hours
        },
        "employee": {
            "employee_id": employee.employee_id if employee else None,
            "name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "department": employee.department if employee else None,
            "position": employee.position if employee else None
        },
        "case": {
            "id": case.id if case else None,
            "case_number": case.case_number if case else None,
            "status": case.status if case else None,
            "leave_type": case.leave_type if case else None,
            "hours_approved": case.hours_approved if case else None,
            "hours_used": case.hours_used if case else None,
            "hours_remaining": case.hours_remaining if case else None
        },
        "reviewer": {
            "id": reviewer.id if reviewer else None,
            "name": reviewer.full_name if reviewer else None
        } if reviewer else None
    }


@router.post("/review-submission/{submission_id}", response_model=SubmissionReviewResponse)
def review_submission(
    submission_id: int,
    request: Request,
    review: SubmissionReviewRequest,
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_SUPERVISOR)),
    db: Session = Depends(get_db)
):
    """
    Review and approve/reject/modify a time submission.

    Supervisors must provide a reason for their decision. If modifying
    hours, the approved_hours field is required. All actions are logged
    in the audit trail.
    """
    submission = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Verify supervisor has access
    direct_report_ids = get_direct_report_ids(db, current_user)
    if submission.employee_id not in direct_report_ids:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to review this submission"
        )

    # Verify submission is pending
    if submission.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot review a submission with status '{submission.status}'"
        )

    # Validate action
    valid_actions = ["approved", "rejected", "revised"]
    if review.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action. Must be one of: {', '.join(valid_actions)}"
        )

    # If revising, approved_hours is required
    if review.action == "revised":
        if review.approved_hours is None:
            raise HTTPException(
                status_code=400,
                detail="approved_hours is required when revising a submission"
            )
        if review.approved_hours <= 0 or review.approved_hours > 24:
            raise HTTPException(
                status_code=400,
                detail="approved_hours must be between 0 and 24"
            )

    # Capture previous values for audit
    previous_value = {
        "status": submission.status,
        "hours_requested": submission.hours_requested,
        "approved_hours": submission.approved_hours
    }

    # Update submission
    submission.status = review.action
    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.now()
    submission.reviewer_notes = review.reviewer_notes

    if review.action == "revised":
        submission.approved_hours = review.approved_hours
    elif review.action == "approved":
        submission.approved_hours = submission.hours_requested

    # If approved or revised, update the FMLA case hours
    if review.action in ["approved", "revised"]:
        case = db.query(models.FMLACase).filter(
            models.FMLACase.id == submission.case_id
        ).first()

        if case:
            hours_to_add = submission.approved_hours or submission.hours_requested
            case.hours_used += hours_to_add
            case.hours_remaining = case.hours_approved - case.hours_used

            # Also create a leave entry in the main system
            leave_entry = models.FMLALeaveEntry(
                case_id=case.id,
                leave_date=submission.leave_date,
                hours_taken=hours_to_add,
                entry_type=submission.entry_type,
                notes=f"Approved via portal by {current_user.full_name}"
            )
            db.add(leave_entry)

    # Create audit log
    new_value = {
        "status": submission.status,
        "hours_requested": submission.hours_requested,
        "approved_hours": submission.approved_hours
    }

    # Get client IP
    client_ip = request.client.host if request.client else None

    audit_entry = models.FMLASupervisorAuditLog(
        supervisor_id=current_user.id,
        employee_id=submission.employee_id,
        action_type=review.action,
        target_type="time_submission",
        target_id=submission.id,
        previous_value=previous_value,
        new_value=new_value,
        reason_for_change=review.reason_for_change,
        ip_address=client_ip
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(submission)
    db.refresh(audit_entry)

    return SubmissionReviewResponse(
        submission_id=submission.id,
        status=submission.status,
        approved_hours=submission.approved_hours,
        reviewed_at=format_datetime(submission.reviewed_at),
        audit_log_id=audit_entry.id
    )


@router.get("/audit-log", response_model=AuditLogResponse)
def get_audit_log(
    employee_id: Optional[str] = None,
    action_type: Optional[str] = None,
    days: int = Query(30, le=365),
    limit: int = Query(100, le=500),
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_SUPERVISOR)),
    db: Session = Depends(get_db)
):
    """
    Get audit log of supervisor actions.

    Supervisors can view their own audit trail. HR/Admin can view all.
    """
    cutoff_date = datetime.now() - timedelta(days=days)

    query = db.query(models.FMLASupervisorAuditLog).filter(
        models.FMLASupervisorAuditLog.created_at >= cutoff_date
    )

    # Non-admin supervisors can only see their own actions
    # (This could be extended to check for admin permission)
    query = query.filter(models.FMLASupervisorAuditLog.supervisor_id == current_user.id)

    if employee_id:
        query = query.filter(models.FMLASupervisorAuditLog.employee_id == employee_id)

    if action_type:
        query = query.filter(models.FMLASupervisorAuditLog.action_type == action_type)

    entries = query.order_by(
        models.FMLASupervisorAuditLog.created_at.desc()
    ).limit(limit).all()

    # Build response
    result_entries = []
    for entry in entries:
        supervisor = db.query(models.User).filter(
            models.User.id == entry.supervisor_id
        ).first()
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == entry.employee_id
        ).first()

        result_entries.append(AuditLogEntry(
            id=entry.id,
            supervisor_id=entry.supervisor_id,
            supervisor_name=supervisor.full_name if supervisor else "Unknown",
            employee_id=entry.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            action_type=entry.action_type,
            target_type=entry.target_type,
            target_id=entry.target_id,
            previous_value=entry.previous_value,
            new_value=entry.new_value,
            reason_for_change=entry.reason_for_change,
            created_at=format_datetime(entry.created_at),
            ip_address=entry.ip_address
        ))

    return AuditLogResponse(
        entries=result_entries,
        total=len(result_entries)
    )


@router.get("/export-report")
def export_team_report(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: models.User = Depends(require_any_permission(
        Permissions.FMLA_PORTAL_SUPERVISOR,
        Permissions.FMLA_PORTAL_REPORT
    )),
    db: Session = Depends(get_db)
):
    """
    Export team FMLA report as CSV or PDF.

    Generates a report of all time submissions for the supervisor's
    direct reports within the specified date range.
    """
    direct_report_ids = get_direct_report_ids(db, current_user)

    if not direct_report_ids:
        raise HTTPException(
            status_code=400,
            detail="No direct reports found"
        )

    # Parse date range
    try:
        start_date = datetime.fromisoformat(date_from).date() if date_from else date.today() - timedelta(days=30)
        end_date = datetime.fromisoformat(date_to).date() if date_to else date.today()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use ISO format (YYYY-MM-DD)"
        )

    # Query submissions
    submissions = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.leave_date >= start_date,
        models.FMLATimeSubmission.leave_date <= end_date
    ).order_by(
        models.FMLATimeSubmission.employee_id,
        models.FMLATimeSubmission.leave_date
    ).all()

    if format == "csv":
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "Employee ID", "Employee Name", "Department",
            "Case Number", "Leave Date", "Hours Requested",
            "Hours Approved", "Entry Type", "Status",
            "Submitted At", "Reviewed At", "Reviewer Notes"
        ])

        # Data rows
        for sub in submissions:
            employee = db.query(models.Employee).filter(
                models.Employee.employee_id == sub.employee_id
            ).first()
            case = db.query(models.FMLACase).filter(
                models.FMLACase.id == sub.case_id
            ).first()

            writer.writerow([
                sub.employee_id,
                f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
                employee.department if employee else "",
                case.case_number if case else "",
                format_date(sub.leave_date),
                sub.hours_requested,
                sub.approved_hours or "",
                sub.entry_type or "",
                sub.status,
                format_datetime(sub.submitted_at),
                format_datetime(sub.reviewed_at) or "",
                sub.reviewer_notes or ""
            ])

        output.seek(0)

        filename = f"fmla_report_{start_date}_{end_date}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    else:
        # PDF generation would go here - for now return error
        raise HTTPException(
            status_code=501,
            detail="PDF export not yet implemented"
        )


@router.get("/supervisor-dashboard", response_model=SupervisorDashboardResponse)
def get_supervisor_dashboard(
    current_user: models.User = Depends(require_permission(Permissions.FMLA_PORTAL_SUPERVISOR)),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data for a supervisor.

    Returns summary metrics and recent activity for the supervisor
    dashboard page.
    """
    direct_reports = get_direct_reports(db, current_user)
    direct_report_ids = [emp.employee_id for emp in direct_reports]

    if not direct_report_ids:
        return SupervisorDashboardResponse(
            team_size=0,
            team_members_on_fmla=0,
            pending_submissions=0,
            submissions_to_review=[],
            recent_activity=[]
        )

    # Count team members on FMLA
    employees_on_fmla = db.query(models.FMLACase.employee_id).filter(
        models.FMLACase.employee_id.in_(direct_report_ids),
        models.FMLACase.status.in_(["Active", "Approved"])
    ).distinct().count()

    # Get pending submissions
    pending = db.query(models.FMLATimeSubmission).filter(
        models.FMLATimeSubmission.employee_id.in_(direct_report_ids),
        models.FMLATimeSubmission.status == "pending"
    ).order_by(models.FMLATimeSubmission.submitted_at.asc()).limit(10).all()

    # Get recent audit activity
    week_ago = datetime.now() - timedelta(days=7)
    recent_audit = db.query(models.FMLASupervisorAuditLog).filter(
        models.FMLASupervisorAuditLog.supervisor_id == current_user.id,
        models.FMLASupervisorAuditLog.created_at >= week_ago
    ).order_by(models.FMLASupervisorAuditLog.created_at.desc()).limit(10).all()

    # Build submission list
    submissions_to_review = []
    for sub in pending:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == sub.employee_id
        ).first()
        case = db.query(models.FMLACase).filter(
            models.FMLACase.id == sub.case_id
        ).first()

        submissions_to_review.append(TeamMemberSubmission(
            id=sub.id,
            employee_id=sub.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            department=employee.department if employee else None,
            case_number=(case.case_number if case and case.case_number else f"Case-{sub.case_id}"),
            leave_date=format_date(sub.leave_date),
            hours_requested=sub.hours_requested,
            entry_type=sub.entry_type,
            employee_notes=sub.employee_notes,
            status=sub.status,
            submitted_at=format_datetime(sub.submitted_at)
        ))

    # Build audit activity list
    recent_activity = []
    for entry in recent_audit:
        supervisor = db.query(models.User).filter(
            models.User.id == entry.supervisor_id
        ).first()
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == entry.employee_id
        ).first()

        recent_activity.append(AuditLogEntry(
            id=entry.id,
            supervisor_id=entry.supervisor_id,
            supervisor_name=supervisor.full_name if supervisor else "Unknown",
            employee_id=entry.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            action_type=entry.action_type,
            target_type=entry.target_type,
            target_id=entry.target_id,
            previous_value=entry.previous_value,
            new_value=entry.new_value,
            reason_for_change=entry.reason_for_change,
            created_at=format_datetime(entry.created_at),
            ip_address=entry.ip_address
        ))

    return SupervisorDashboardResponse(
        team_size=len(direct_reports),
        team_members_on_fmla=employees_on_fmla,
        pending_submissions=len(pending),
        submissions_to_review=submissions_to_review,
        recent_activity=recent_activity
    )
