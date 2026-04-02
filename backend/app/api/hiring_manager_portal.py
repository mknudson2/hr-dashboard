"""
Hiring Manager Portal API
Endpoints for hiring managers to submit and track requisition requests from the Employee Portal.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import uuid
import os
from pathlib import Path
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from sqlalchemy.orm import joinedload
from app.services.lifecycle_service import lifecycle_service
from app.services.recruiting_email_service import recruiting_email_service
from app.services.recruiting_service import recruiting_service
from app.services.approval_service import approval_service
from app.services.offer_service import offer_service
from app.api.in_app_notifications import create_notification
from app.schemas.approval import ApprovalActionRequest

def _get_visibility_req_ids(db: Session, user_id: int) -> list[int]:
    """Get requisition IDs where user appears in visibility_user_ids JSON list.

    Uses ORM query with Python-side filtering instead of raw SQL LIKE,
    which avoids false positives (e.g., ID 1 matching 10, 11, 12) and
    works correctly on both SQLite and PostgreSQL.
    """
    rows = db.query(
        models.JobRequisition.id,
        models.JobRequisition.visibility_user_ids,
    ).filter(
        models.JobRequisition.visibility_user_ids.isnot(None),
    ).all()
    return [r.id for r in rows if r.visibility_user_ids and user_id in r.visibility_user_ids]


router = APIRouter(
    prefix="/portal/hiring-manager",
    tags=["hiring-manager-portal"],
)


# --- Pydantic schemas ---

class RequisitionRequestCreate(BaseModel):
    title: str
    department: Optional[str] = None
    team: Optional[str] = None
    cost_center: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = "On-site"
    employment_type: Optional[str] = "Full Time"
    position_type: Optional[str] = "New"
    position_supervisor: Optional[str] = None
    job_description_id: Optional[int] = None

    # Posting preferences
    posting_channels: Optional[List[str]] = None  # ["internal", "external", "bloom"]
    requires_early_tech_screen: bool = False

    # Compensation
    target_salary: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    wage_type: Optional[str] = "Salary"

    # Skills
    skills_tags: Optional[List[str]] = None

    # Timeline
    target_start_date: Optional[str] = None
    target_fill_date: Optional[str] = None
    urgency: Optional[str] = "Normal"

    # Visibility (legacy — prefer stakeholders array)
    visibility_user_ids: Optional[List[int]] = None

    # Stakeholders with roles
    stakeholders: Optional[List["StakeholderInput"]] = None

    # Description
    description: Optional[str] = None
    requirements: Optional[str] = None
    notes: Optional[str] = None


class StakeholderInput(BaseModel):
    employee_id: str
    user_id: Optional[int] = None
    role: str = "observer"  # vp_svp, interviewer, observer


class AddNoteRequest(BaseModel):
    stage_id: int
    content: str
    highlights: Optional[List[str]] = None
    recommendation: Optional[str] = None
    recommendation_reason: Optional[str] = None


class CustomTeamRequest(BaseModel):
    team_name: str
    position_title: str


class CompleteStageRequest(BaseModel):
    stage_id: int
    outcome: Optional[str] = None
    notes: Optional[str] = None


# --- Helpers ---

def _get_employee_for_user(db: Session, user: models.User) -> Optional[models.Employee]:
    """Get the employee record linked to a user."""
    if not hasattr(user, 'employee_id') or not user.employee_id:
        return None
    return db.query(models.Employee).filter(
        models.Employee.employee_id == user.employee_id
    ).first()


_HM_TITLE_KEYWORDS = [
    "supervisor", "director", "vice president", "president",
    "chief executive officer", "ceo", "coo", "cfo", "cto", "chro",
]

_HM_DEPARTMENTS = ["human resources"]


def _position_grants_hm(employee: Optional[models.Employee]) -> bool:
    """Return True if the employee's position title or department auto-grants HM access."""
    if not employee:
        return False
    pos = (employee.position or "").lower()
    dept = (employee.department or "").lower()
    if any(kw in pos for kw in _HM_TITLE_KEYWORDS):
        return True
    if any(kw in dept for kw in _HM_DEPARTMENTS):
        return True
    return False


def is_hiring_manager(user: models.User, employee: Optional[models.Employee], db: Session) -> bool:
    """Check if the current user qualifies as a hiring manager."""
    # Auto: user role is manager or admin
    if hasattr(user, 'role') and user.role in ("manager", "admin"):
        return True

    # Auto: position title includes leadership keywords or employee is in HR
    if _position_grants_hm(employee):
        return True

    # Auto: user is a supervisor of active employees
    if employee:
        supervisor_name = f"{employee.first_name} {employee.last_name}" if employee.first_name else None
        if supervisor_name:
            has_reports = db.query(models.Employee).filter(
                models.Employee.supervisor == supervisor_name,
                models.Employee.status == "Active",
            ).first()
            if has_reports:
                return True

    # Manual: employee has "hiring_manager" in custom_tags
    if employee and employee.custom_tags and "hiring_manager" in employee.custom_tags:
        return True

    return False


def _is_recruiting_stakeholder(db: Session, user: models.User) -> bool:
    """Check if user is listed as a stakeholder on any requisition."""
    return len(_get_visibility_req_ids(db, user.id)) > 0


def _require_hiring_manager_or_stakeholder(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dependency that verifies hiring manager or recruiting stakeholder access."""
    employee = _get_employee_for_user(db, current_user)
    if not is_hiring_manager(current_user, employee, db) and not _is_recruiting_stakeholder(db, current_user):
        raise HTTPException(
            status_code=403,
            detail="Hiring manager or stakeholder access required",
        )
    return current_user


def _check_requisition_access(req: models.JobRequisition, user: models.User) -> bool:
    """Check if a user has access to a specific requisition.
    Allows: admin/manager roles, requisition owner, hiring manager, or stakeholders.
    """
    # Admin and manager roles always have access
    if hasattr(user, 'role') and user.role in ("admin", "manager"):
        return True
    # Owner or hiring manager
    if req.requested_by == user.id or req.hiring_manager_id == user.id:
        return True
    # Stakeholder
    if req.visibility_user_ids and user.id in req.visibility_user_ids:
        return True
    return False


def _require_hiring_manager(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dependency that verifies hiring manager access."""
    employee = _get_employee_for_user(db, current_user)
    if not is_hiring_manager(current_user, employee, db):
        raise HTTPException(
            status_code=403,
            detail="Hiring manager access required",
        )
    return current_user


def _generate_requisition_id(db: Session) -> str:
    """Generate a unique requisition ID."""
    year = datetime.now().year
    prefix = f"REQ-{year}-"

    last = (
        db.query(models.JobRequisition)
        .filter(models.JobRequisition.requisition_id.like(f"{prefix}%"))
        .order_by(models.JobRequisition.id.desc())
        .first()
    )

    if last and last.requisition_id:
        try:
            last_num = int(last.requisition_id.split("-")[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:03d}"


# --- Endpoints ---

@router.get("/check-access")
def check_access(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if the current user has hiring manager access."""
    employee = _get_employee_for_user(db, current_user)
    return {
        "is_hiring_manager": is_hiring_manager(current_user, employee, db),
    }


@router.get("/my-hiring-stats")
def my_hiring_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return summary stats for requisitions the current user is involved in."""

    # Find reqs via visibility_user_ids (legacy JSON column)
    vis_req_ids = _get_visibility_req_ids(db, current_user.id)

    # Also find reqs via RequisitionStakeholder table (canonical source)
    stakeholder_req_ids = [
        s.requisition_id for s in db.query(models.RequisitionStakeholder).filter(
            models.RequisitionStakeholder.user_id == current_user.id,
            models.RequisitionStakeholder.is_active == True,
        ).all()
    ]

    all_req_ids = list(set(vis_req_ids + stakeholder_req_ids))

    query = db.query(models.JobRequisition).filter(
        or_(
            models.JobRequisition.requested_by == current_user.id,
            models.JobRequisition.hiring_manager_id == current_user.id,
            models.JobRequisition.id.in_(all_req_ids) if all_req_ids else False,
        )
    )

    all_reqs = query.all()
    open_count = sum(1 for r in all_reqs if r.status in ("Open", "Approved"))
    in_process_count = sum(1 for r in all_reqs if r.status in ("In Review", "Interviewing", "Offer Extended"))
    total = len(all_reqs)

    return {
        "open_count": open_count,
        "in_process_count": in_process_count,
        "total": total,
    }


@router.get("/action-items")
def get_hiring_action_items(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate hiring-related action items for the current user's dashboard."""
    from datetime import timedelta

    items: list[dict] = []
    now = datetime.now()
    seven_days = now + timedelta(days=7)

    # --- 1) Upcoming Interviews (within 7 days) ---
    try:
        upcoming = (
            db.query(models.Interview)
            .options(joinedload(models.Interview.stage))
            .filter(
                models.Interview.status.in_(["Scheduled", "Confirmed"]),
                models.Interview.scheduled_at >= now,
                models.Interview.scheduled_at <= seven_days,
            )
            .all()
        )
        for iv in upcoming:
            # Check if current user is in the interviewers JSON
            if not iv.interviewers:
                continue
            interviewer_ids = [
                e["user_id"] if isinstance(e, dict) else e
                for e in iv.interviewers
            ]
            if current_user.id not in interviewer_ids:
                continue

            candidate_name = "a candidate"
            req_id = None
            req_title = None
            if iv.application_id:
                app = (
                    db.query(models.Application)
                    .options(
                        joinedload(models.Application.applicant),
                        joinedload(models.Application.requisition),
                    )
                    .filter(models.Application.id == iv.application_id)
                    .first()
                )
                if app and app.applicant:
                    candidate_name = f"{app.applicant.first_name} {app.applicant.last_name}"
                if app and app.requisition:
                    req_id = app.requisition.id
                    req_title = app.requisition.title

            scheduled_str = iv.scheduled_at.strftime("%b %d at %-I:%M %p") if iv.scheduled_at else "TBD"

            items.append({
                "id": f"interview-{iv.interview_id or iv.id}",
                "action_type": "upcoming_interview",
                "title": f"Interview with {candidate_name}",
                "description": scheduled_str + (f" — {req_title}" if req_title else ""),
                "priority": 1,
                "due_date": iv.scheduled_at.isoformat() if iv.scheduled_at else None,
                "link_hint": f"/hiring/requisitions/{req_id}" if req_id else "/hiring/my-requisitions",
            })
    except Exception:
        pass

    # --- 2) Pending Scorecards ---
    try:
        pending_sc = (
            db.query(models.InterviewScorecard)
            .options(joinedload(models.InterviewScorecard.stage))
            .filter(
                models.InterviewScorecard.interviewer_id == current_user.id,
                models.InterviewScorecard.status.in_(["Pending", "In Progress"]),
            )
            .all()
        )
        for sc in pending_sc:
            candidate_name = "a candidate"
            req_id = None
            req_title = None
            if sc.application_id:
                app = (
                    db.query(models.Application)
                    .options(
                        joinedload(models.Application.applicant),
                        joinedload(models.Application.requisition),
                    )
                    .filter(models.Application.id == sc.application_id)
                    .first()
                )
                if app and app.applicant:
                    candidate_name = f"{app.applicant.first_name} {app.applicant.last_name}"
                if app and app.requisition:
                    req_id = app.requisition.id
                    req_title = app.requisition.title

            stage_name = sc.stage.name if sc.stage else "Interview"
            due_str = f" — due {sc.due_date.strftime('%b %d')}" if sc.due_date else ""
            overdue = sc.due_date and sc.due_date < now

            items.append({
                "id": f"scorecard-{sc.id}",
                "action_type": "pending_scorecard",
                "title": f"Complete scorecard for {candidate_name}",
                "description": stage_name + due_str + (f" ({req_title})" if req_title else ""),
                "priority": 1 if overdue else 2,
                "due_date": sc.due_date.isoformat() if sc.due_date else None,
                "link_hint": f"/hiring/requisitions/{req_id}" if req_id else "/hiring/my-requisitions",
            })
    except Exception:
        pass

    # --- 3) Submit Availability ---
    try:
        active_stakes = (
            db.query(models.RequisitionStakeholder)
            .filter(
                models.RequisitionStakeholder.user_id == current_user.id,
                models.RequisitionStakeholder.is_active == True,
                models.RequisitionStakeholder.opted_out_of_availability == False,
            )
            .all()
        )
        for stake in active_stakes:
            # Only if hiring_manager_interview lifecycle stage is active
            hm_stage = (
                db.query(models.RequisitionLifecycleStage)
                .filter(
                    models.RequisitionLifecycleStage.requisition_id == stake.requisition_id,
                    models.RequisitionLifecycleStage.stage_key == "hiring_manager_interview",
                    models.RequisitionLifecycleStage.status == "active",
                )
                .first()
            )
            if not hm_stage:
                continue

            # Skip if user already submitted slots
            slot_count = (
                db.query(models.InterviewerAvailability)
                .filter(
                    models.InterviewerAvailability.user_id == current_user.id,
                    models.InterviewerAvailability.requisition_id == stake.requisition_id,
                )
                .count()
            )
            if slot_count > 0:
                continue

            req = db.query(models.JobRequisition).filter(
                models.JobRequisition.id == stake.requisition_id
            ).first()
            req_title = req.title if req else "a position"

            items.append({
                "id": f"availability-{stake.requisition_id}",
                "action_type": "submit_availability",
                "title": "Submit interview availability",
                "description": f"Your availability is needed for {req_title}",
                "priority": 2,
                "due_date": None,
                "link_hint": f"/hiring/requisitions/{stake.requisition_id}/availability",
            })
    except Exception:
        pass

    # --- 4) Pending Approvals ---
    try:
        pending_approvals = approval_service.get_pending_for_user(db, current_user.id)
        for ar in pending_approvals:
            requested_by_name = None
            if ar.requested_by:
                user = db.query(models.User).filter(models.User.id == ar.requested_by).first()
                requested_by_name = user.full_name if user else None

            items.append({
                "id": f"approval-{ar.id}",
                "action_type": "pending_approval",
                "title": f"Pending {ar.resource_type.replace('_', ' ').title()} Approval",
                "description": f"Requested by {requested_by_name or 'Unknown'}",
                "priority": 2,
                "due_date": None,
                "link_hint": "/hiring/approvals",
            })
    except Exception:
        pass

    # Sort by priority (urgent first), then due_date (soonest first)
    items.sort(key=lambda x: (x["priority"], x["due_date"] or "9999"))

    return {"action_items": items, "total_count": len(items)}


@router.get("/field-options")
def get_field_options(
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Return distinct departments, cost centers, and teams from active employees."""
    departments = sorted([
        r[0] for r in db.query(models.Employee.department)
        .filter(models.Employee.status == "Active", models.Employee.department.isnot(None), models.Employee.department != "")
        .distinct().all()
    ])
    cost_centers = sorted([
        r[0] for r in db.query(models.Employee.cost_center)
        .filter(models.Employee.status == "Active", models.Employee.cost_center.isnot(None), models.Employee.cost_center != "")
        .distinct().all()
    ])
    teams = sorted([
        r[0] for r in db.query(models.Employee.team)
        .filter(models.Employee.status == "Active", models.Employee.team.isnot(None), models.Employee.team != "")
        .distinct().all()
    ])
    return {
        "departments": departments,
        "cost_centers": cost_centers,
        "teams": teams,
    }


@router.post("/custom-team-request")
def request_custom_team(
    data: CustomTeamRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Create a team request record and notify HR admins."""
    requester_name = (
        current_user.full_name
        if hasattr(current_user, "full_name") and current_user.full_name
        else "A hiring manager"
    )
    team_req = models.TeamRequest(
        team_name=data.team_name,
        position_title=data.position_title,
        requested_by_user_id=current_user.id,
    )
    db.add(team_req)
    db.flush()

    create_notification(
        db=db,
        title="New Team Request",
        message=f"{requester_name} is requesting a new team '{data.team_name}' for position '{data.position_title}'",
        notification_type="team_request",
        priority="normal",
        user_id=None,
        created_by_user_id=current_user.id,
        resource_type="team_request",
        resource_id=team_req.id,
        action_url="/recruiting?tab=team-requests",
    )
    db.commit()
    return {"message": "Custom team request submitted for HR review"}


@router.get("/hiring-updates")
def get_hiring_updates(
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Return recent hiring activity for requisitions the user is associated with."""

    # Get IDs of requisitions where user is a stakeholder (same pattern as list_requisitions)
    stakeholder_req_ids = _get_visibility_req_ids(db, current_user.id)

    user_req_ids_query = db.query(models.JobRequisition.id).filter(
        or_(
            models.JobRequisition.requested_by == current_user.id,
            models.JobRequisition.hiring_manager_id == current_user.id,
            models.JobRequisition.id.in_(stakeholder_req_ids) if stakeholder_req_ids else False,
        )
    )
    user_req_ids = [row[0] for row in user_req_ids_query.all()]

    if not user_req_ids:
        return {"updates": []}

    RELEVANT_TYPES = [
        "interview_scheduled", "interview_self_scheduled", "scorecard_submitted",
        "stage_change", "candidate_selected", "offer_extended", "status_change",
    ]

    activities = (
        db.query(models.ApplicationActivity)
        .join(models.Application, models.ApplicationActivity.application_id == models.Application.id)
        .filter(
            models.Application.requisition_id.in_(user_req_ids),
            models.ApplicationActivity.activity_type.in_(RELEVANT_TYPES),
        )
        .options(
            joinedload(models.ApplicationActivity.application)
                .joinedload(models.Application.applicant),
            joinedload(models.ApplicationActivity.application)
                .joinedload(models.Application.requisition),
        )
        .order_by(models.ApplicationActivity.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "updates": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "description": a.description or a.activity_type.replace("_", " ").title(),
                "candidate_name": (
                    f"{a.application.applicant.first_name} {a.application.applicant.last_name}"
                    if a.application and a.application.applicant else None
                ),
                "requisition_id": a.application.requisition.id if a.application and a.application.requisition else None,
                "requisition_title": a.application.requisition.title if a.application and a.application.requisition else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in activities
        ],
    }


@router.get("/requisitions")
def list_requisitions(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """List requisitions where user is hiring manager, requester, or stakeholder."""

    # Get IDs of requisitions where user is a stakeholder (visibility_user_ids)
    vis_req_ids = _get_visibility_req_ids(db, current_user.id)

    # Also check RequisitionStakeholder table (canonical source)
    stakeholder_table_req_ids = [
        s.requisition_id for s in db.query(models.RequisitionStakeholder).filter(
            models.RequisitionStakeholder.user_id == current_user.id,
            models.RequisitionStakeholder.is_active == True,
        ).all()
    ]

    stakeholder_req_ids = list(set(vis_req_ids + stakeholder_table_req_ids))

    query = db.query(models.JobRequisition).filter(
        or_(
            models.JobRequisition.requested_by == current_user.id,
            models.JobRequisition.hiring_manager_id == current_user.id,
            models.JobRequisition.id.in_(stakeholder_req_ids) if stakeholder_req_ids else False,
        )
    )

    if status:
        query = query.filter(models.JobRequisition.status == status)

    total = query.count()
    requisitions = query.order_by(models.JobRequisition.created_at.desc()).offset(skip).limit(limit).all()

    # Build a lookup of stakeholder roles for the current user
    stakeholder_roles: dict[int, str] = {}
    if hasattr(models, 'RequisitionStakeholder'):
        stakes = db.query(models.RequisitionStakeholder).filter(
            models.RequisitionStakeholder.user_id == current_user.id,
            models.RequisitionStakeholder.is_active == True,
        ).all()
        for s in stakes:
            stakeholder_roles[s.requisition_id] = s.role

    def _user_role(r: models.JobRequisition) -> str:
        if r.hiring_manager_id == current_user.id or r.requested_by == current_user.id:
            return "hiring_manager"
        return stakeholder_roles.get(r.id, "stakeholder")

    return {
        "total": total,
        "requisitions": [
            {
                "id": r.id,
                "requisition_id": r.requisition_id,
                "title": r.title,
                "department": r.department,
                "team": r.team,
                "status": r.status,
                "urgency": r.urgency,
                "posting_channels": r.posting_channels,
                "request_source": r.request_source,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                "target_start_date": r.target_start_date.isoformat() if r.target_start_date else None,
                "closed_at": r.closed_at.isoformat() if r.closed_at else None,
                "close_reason": r.close_reason,
                "my_role": _user_role(r),
            }
            for r in requisitions
        ],
    }


@router.post("/requisitions")
def create_requisition_request(
    data: RequisitionRequestCreate,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Submit a new requisition request from the employee portal."""
    req_id = _generate_requisition_id(db)

    # Parse target start date if provided
    target_start = None
    if data.target_start_date:
        try:
            target_start = date.fromisoformat(data.target_start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid target_start_date format")

    # Parse target fill date if provided
    target_fill = None
    if data.target_fill_date:
        try:
            target_fill = date.fromisoformat(data.target_fill_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid target_fill_date format")

    # Auto-set early tech screen if Bloom is selected
    requires_tech_screen = data.requires_early_tech_screen
    if data.posting_channels and "bloom" in data.posting_channels:
        requires_tech_screen = True

    # If a JD is linked, pull content fields from it as defaults
    jd_description = data.description
    jd_requirements = data.requirements
    jd_responsibilities = None
    jd_preferred_qualifications = None
    if data.job_description_id:
        jd = db.query(models.JobDescription).filter(
            models.JobDescription.id == data.job_description_id
        ).first()
        if jd:
            if not jd_description:
                jd_description = jd.description
            if not jd_requirements:
                jd_requirements = jd.requirements
            jd_responsibilities = jd.responsibilities
            jd_preferred_qualifications = jd.preferred_qualifications

    requisition = models.JobRequisition(
        requisition_id=req_id,
        title=data.title,
        department=data.department,
        team=data.team,
        cost_center=data.cost_center,
        location=data.location,
        remote_type=data.remote_type,
        employment_type=data.employment_type,
        position_type=data.position_type,
        position_supervisor=data.position_supervisor,
        job_description_id=data.job_description_id,
        posting_channels=data.posting_channels,
        requires_early_tech_screen=requires_tech_screen,
        target_salary=data.target_salary,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        wage_type=data.wage_type,
        skills_tags=data.skills_tags,
        target_start_date=target_start,
        target_fill_date=target_fill,
        urgency=data.urgency,
        visibility_user_ids=data.visibility_user_ids,
        description=jd_description,
        requirements=jd_requirements,
        responsibilities=jd_responsibilities,
        preferred_qualifications=jd_preferred_qualifications,
        notes=data.notes,
        status="Pending Approval",
        request_source="employee_portal",
        requested_by=current_user.id,
        hiring_manager_id=current_user.id,
    )
    db.add(requisition)
    db.flush()

    # Create lifecycle stages
    lifecycle_service.create_lifecycle_for_requisition(db, requisition.id)

    # Create stakeholder records
    if data.stakeholders:
        for s in data.stakeholders:
            access = _DEFAULT_ACCESS_LEVELS.get(s.role, "pipeline_view_only")
            stakeholder = models.RequisitionStakeholder(
                requisition_id=requisition.id,
                employee_id=s.employee_id,
                user_id=s.user_id,
                role=s.role,
                access_level=access,
                assigned_by=current_user.id,
            )
            db.add(stakeholder)
    elif data.visibility_user_ids:
        # Legacy fallback: create from user IDs only
        for uid in data.visibility_user_ids:
            user = db.query(models.User).filter(models.User.id == uid).first()
            stakeholder = models.RequisitionStakeholder(
                requisition_id=requisition.id,
                user_id=uid,
                employee_id=user.employee_id if user else None,
                role="observer",
                access_level="pipeline_view_only",
                assigned_by=current_user.id,
            )
            db.add(stakeholder)

    # Send notification to recruiting team
    _notify_recruiting_team(db, requisition, current_user)

    db.commit()

    return {
        "message": "Requisition request submitted successfully",
        "id": requisition.id,
        "requisition_id": requisition.requisition_id,
    }


@router.get("/requisitions/{req_id}")
def get_requisition_detail(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get detailed requisition info including lifecycle."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Load stakeholders for this requisition
    stakeholders = (
        db.query(models.RequisitionStakeholder)
        .options(
            joinedload(models.RequisitionStakeholder.user),
            joinedload(models.RequisitionStakeholder.employee),
            joinedload(models.RequisitionStakeholder.assigned_by_user),
        )
        .filter(
            models.RequisitionStakeholder.requisition_id == req.id,
            models.RequisitionStakeholder.is_active == True,  # noqa: E712
        )
        .all()
    )

    # Resolve hiring manager name from the user who submitted
    hm_name = None
    if req.hiring_manager:
        hm_name = req.hiring_manager.full_name
    elif req.requested_by_user:
        hm_name = req.requested_by_user.full_name

    return {
        "id": req.id,
        "requisition_id": req.requisition_id,
        "title": req.title,
        "department": req.department,
        "team": req.team,
        "cost_center": req.cost_center,
        "location": req.location,
        "remote_type": req.remote_type,
        "employment_type": req.employment_type,
        "position_type": req.position_type,
        "position_supervisor": req.position_supervisor,
        "posting_channels": req.posting_channels,
        "requires_early_tech_screen": req.requires_early_tech_screen,
        "target_salary": req.target_salary,
        "salary_min": req.salary_min,
        "salary_max": req.salary_max,
        "wage_type": req.wage_type,
        "skills_tags": req.skills_tags,
        "urgency": req.urgency,
        "visibility_user_ids": req.visibility_user_ids,
        "description": req.description,
        "requirements": req.requirements,
        "notes": req.notes,
        "status": req.status,
        "request_source": req.request_source,
        "target_start_date": req.target_start_date.isoformat() if req.target_start_date else None,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "recruiter_name": (
            req.recruiter.full_name if req.recruiter else None
        ),
        "hiring_manager_name": hm_name,
        "closed_at": req.closed_at.isoformat() if req.closed_at else None,
        "close_reason": req.close_reason,
        "stakeholders": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "employee_id": s.employee_id,
                "user_name": (
                    s.user.full_name if s.user
                    else f"{s.employee.first_name} {s.employee.last_name}" if s.employee
                    else None
                ),
                "role": s.role,
                "access_level": s.access_level,
                "assigned_by_name": s.assigned_by_user.full_name if s.assigned_by_user else None,
                "assigned_at": s.assigned_at.isoformat() if s.assigned_at else None,
                "is_active": s.is_active,
            }
            for s in stakeholders
        ],
    }


class CloseRequisitionRequest(BaseModel):
    reason: str  # "filled", "rescinded", "cancelled", "budget_cut", "position_eliminated", "other"
    notes: Optional[str] = None


@router.post("/requisitions/{req_id}/close")
def close_requisition(
    req_id: int,
    data: CloseRequisitionRequest,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Close or cancel a requisition. Only the hiring manager or admin can close."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Only allow closing active requisitions
    if req.status in ("Filled", "Cancelled"):
        raise HTTPException(status_code=400, detail="Requisition is already closed")

    valid_reasons = {"filled", "rescinded", "cancelled", "budget_cut", "position_eliminated", "other"}
    if data.reason not in valid_reasons:
        raise HTTPException(status_code=400, detail=f"Invalid reason. Must be one of: {', '.join(valid_reasons)}")

    # Map reason to status
    new_status = "Filled" if data.reason == "filled" else "Cancelled"

    req.status = new_status
    req.close_reason = data.reason
    req.closed_at = func.now()
    req.closed_by = current_user.id
    if data.notes:
        existing_notes = req.notes or ""
        req.notes = f"{existing_notes}\n\nClosed: {data.notes}".strip()

    db.commit()
    db.refresh(req)

    return {
        "id": req.id,
        "status": req.status,
        "close_reason": req.close_reason,
        "closed_at": req.closed_at.isoformat() if req.closed_at else None,
    }


@router.get("/requisitions/{req_id}/lifecycle")
def get_requisition_lifecycle(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get lifecycle stages for a requisition request."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    stages = lifecycle_service.get_lifecycle(db, req_id)

    # Get per-user view timestamps for unread badge calculation
    stage_ids = [s.id for s in stages]
    user_views = lifecycle_service.get_user_stage_views(db, current_user.id, stage_ids)

    return {
        "requisition_id": req_id,
        "stages": [
            lifecycle_service.serialize_stage(s, last_viewed_at=user_views.get(s.id))
            for s in stages
        ],
    }


@router.post("/requisitions/{req_id}/notes")
def add_note_to_stage(
    req_id: int,
    data: AddNoteRequest,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Add a note to a lifecycle stage."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify stage belongs to this requisition
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == data.stage_id,
        models.RequisitionLifecycleStage.requisition_id == req_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    note = lifecycle_service.add_stage_note(
        db,
        stage_id=data.stage_id,
        author_id=current_user.id,
        content=data.content,
        highlights=data.highlights,
        recommendation=data.recommendation,
        recommendation_reason=data.recommendation_reason,
    )
    db.commit()

    return {
        "message": "Note added",
        "note": lifecycle_service.serialize_note(note),
    }


@router.post("/requisitions/{req_id}/stages/{stage_id}/mark-viewed")
def mark_stage_viewed(
    req_id: int,
    stage_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Mark a lifecycle stage as viewed by the current user (clears unread badge)."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == stage_id,
        models.RequisitionLifecycleStage.requisition_id == req_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    lifecycle_service.mark_stage_viewed(db, stage_id, current_user.id)
    db.commit()
    return {"success": True}


@router.get("/requisitions/{req_id}/stages/{stage_id}/notes")
def get_stage_notes(
    req_id: int,
    stage_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get notes for a lifecycle stage. Accessible to hiring managers and stakeholders."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify stage belongs to this requisition
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == stage_id,
        models.RequisitionLifecycleStage.requisition_id == req_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    notes = lifecycle_service.get_stage_notes(db, stage_id)
    return {
        "notes": [lifecycle_service.serialize_note(n) for n in notes],
    }


@router.post("/requisitions/{req_id}/stages/{stage_id}/documents")
def upload_stage_document(
    req_id: int,
    stage_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Upload a document to a lifecycle stage."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify stage belongs to this requisition
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == stage_id,
        models.RequisitionLifecycleStage.requisition_id == req_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    # Validate file
    allowed_extensions = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    # Save file to disk
    upload_dir = Path("data/uploads/recruiting")
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / safe_filename

    content = file.file.read()
    if len(content) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 25 MB)")

    with open(file_path, "wb") as f:
        f.write(content)

    doc = lifecycle_service.add_stage_document(
        db,
        stage_id=stage_id,
        user_id=current_user.id,
        filename=file.filename or safe_filename,
        file_path=str(file_path),
        description=description,
    )
    db.commit()

    return {
        "message": "Document uploaded",
        "document": lifecycle_service.serialize_document(doc),
    }


@router.get("/requisitions/{req_id}/stages/{stage_id}/documents")
def get_stage_documents(
    req_id: int,
    stage_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get documents for a lifecycle stage."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify stage belongs to this requisition
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == stage_id,
        models.RequisitionLifecycleStage.requisition_id == req_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    docs = lifecycle_service.get_stage_documents(db, stage_id)
    return {
        "documents": [lifecycle_service.serialize_document(d) for d in docs],
    }


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Download a lifecycle stage document."""
    doc = db.query(models.LifecycleStageDocument).filter(
        models.LifecycleStageDocument.id == doc_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check requisition access via the stage
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == doc.lifecycle_stage_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == stage.requisition_id,
    ).first()
    if not req or not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/octet-stream",
    )


@router.get("/team-members")
def search_team_members(
    search: str = Query("", min_length=0),
    limit: int = 20,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Search employees for the 'who should be in the loop' picker."""
    query = db.query(models.Employee).filter(models.Employee.status == "Active")

    if search:
        query = query.filter(
            or_(
                models.Employee.first_name.ilike(f"%{search}%"),
                models.Employee.last_name.ilike(f"%{search}%"),
                models.Employee.employee_id.ilike(f"%{search}%"),
            )
        )

    employees = query.limit(limit).all()

    # We need to find associated user IDs for these employees
    results = []
    for emp in employees:
        user = db.query(models.User).filter(
            models.User.employee_id == emp.employee_id
        ).first() if hasattr(models.User, 'employee_id') else None

        emp_is_hm = False
        if user:
            emp_is_hm = is_hiring_manager(user, emp, db)
        else:
            emp_is_hm = _position_grants_hm(emp)

        results.append({
            "employee_id": emp.employee_id,
            "user_id": user.id if user else None,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "department": emp.department,
            "position": emp.position,
            "is_hiring_manager": emp_is_hm,
        })

    return {"employees": results}


@router.get("/supervisor-chain")
def get_supervisor_chain(
    employee_id: str = Query(...),
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Walk up the supervisor chain for an employee, returning each level."""
    emp = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id,
    ).first()
    if not emp:
        return {"chain": []}

    chain = []
    visited = {emp.employee_id}
    current = emp
    max_depth = 10

    for _ in range(max_depth):
        sup_name = (current.supervisor or "").strip()
        if not sup_name:
            break

        # Find supervisor employee record by name match
        parts = sup_name.rsplit(" ", 1)
        if len(parts) == 2:
            sup = db.query(models.Employee).filter(
                models.Employee.first_name.ilike(parts[0]),
                models.Employee.last_name.ilike(parts[1]),
                models.Employee.status == "Active",
            ).first()
        else:
            sup = db.query(models.Employee).filter(
                func.lower(
                    models.Employee.first_name + " " + models.Employee.last_name
                ) == sup_name.lower(),
                models.Employee.status == "Active",
            ).first()

        if not sup or sup.employee_id in visited:
            break
        visited.add(sup.employee_id)

        sup_user = db.query(models.User).filter(
            models.User.employee_id == sup.employee_id,
        ).first() if hasattr(models.User, 'employee_id') else None

        sup_is_hm = False
        if sup_user:
            sup_is_hm = is_hiring_manager(sup_user, sup, db)
        else:
            sup_is_hm = _position_grants_hm(sup)

        chain.append({
            "employee_id": sup.employee_id,
            "user_id": sup_user.id if sup_user else None,
            "first_name": sup.first_name,
            "last_name": sup.last_name,
            "department": sup.department,
            "position": sup.position,
            "is_hiring_manager": sup_is_hm,
        })
        current = sup

    return {"chain": chain}


@router.get("/skills-suggestions")
def skills_suggestions(
    search: str = Query("", min_length=0),
    limit: int = 20,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Autocomplete for skills tags based on existing requisition skills."""
    # Common skills (fallback)
    common_skills = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "AWS", "Azure", "GCP",
        "Docker", "Kubernetes", "SQL", "PostgreSQL", "MongoDB", "GraphQL", "REST API",
        "Java", "C#", ".NET", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
        "Machine Learning", "Data Science", "DevOps", "CI/CD", "Agile", "Scrum",
        "Project Management", "Leadership", "Communication", "Problem Solving",
        "Customer Service", "Sales", "Marketing", "Finance", "Accounting", "HR",
        "Excel", "PowerBI", "Tableau", "Figma", "Adobe Creative Suite",
    ]

    # Filter by search term
    if search:
        filtered = [s for s in common_skills if search.lower() in s.lower()]
    else:
        filtered = common_skills

    return {"suggestions": filtered[:limit]}


# ============================================================================
# JOB DESCRIPTION ENDPOINTS (HM Portal)
# ============================================================================

@router.get("/job-descriptions")
def search_job_descriptions(
    search: str = Query("", min_length=0),
    limit: int = 50,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Search existing job descriptions by position title for the requisition form dropdown."""
    query = db.query(models.JobDescription).filter(
        models.JobDescription.status == "Active"
    )
    if search:
        query = query.filter(models.JobDescription.position_title.ilike(f"%{search}%"))

    items = query.order_by(models.JobDescription.position_title).limit(limit).all()

    return {
        "job_descriptions": [
            {
                "id": jd.id,
                "position_title": jd.position_title,
                "description": jd.description,
                "requirements": jd.requirements,
                "preferred_qualifications": jd.preferred_qualifications,
                "responsibilities": jd.responsibilities,
                "skills_tags": jd.skills_tags,
            }
            for jd in items
        ]
    }


@router.post("/job-description-request")
async def request_new_job_description(
    position_title: str = Form(...),
    description: Optional[str] = Form(None),
    requirements: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Submit a new JD with optional uploaded file. Creates with status 'Pending Approval'."""
    # Check for duplicate
    existing = db.query(models.JobDescription).filter(
        func.lower(models.JobDescription.position_title) == func.lower(position_title)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A job description with this position title already exists")

    file_upload_id = None
    extracted_text = None

    if file and file.filename:
        upload_dir = os.path.join("app", "data", "uploads", "job-descriptions")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or "file")[1]
        safe_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(upload_dir, safe_name)

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_record = models.FileUpload(
            file_name=safe_name,
            original_filename=file.filename or "job-description",
            file_type=ext.lstrip("."),
            file_size=len(content),
            file_path=file_path,
            mime_type=file.content_type,
            upload_source="hm_portal_jd_request",
            uploaded_by=str(current_user.id),
            status="completed",
        )
        db.add(file_record)
        db.flush()
        file_upload_id = file_record.id

        # Best-effort text extraction
        try:
            if ext.lower() == ".pdf":
                import pdfplumber
                text_parts = []
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                extracted_text = "\n".join(text_parts)
            elif ext.lower() in (".docx", ".doc"):
                from docx import Document
                doc = Document(file_path)
                extracted_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception:
            pass

    jd = models.JobDescription(
        position_title=position_title,
        description=description or extracted_text,
        requirements=requirements,
        file_upload_id=file_upload_id,
        status="Pending Approval",
        created_by=current_user.id,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)

    return {"message": "Job description request submitted for HR approval", "id": jd.id}


# --- Internal Helpers ---

def _notify_recruiting_team(db: Session, requisition: models.JobRequisition, requester: models.User):
    """Send in-app notification and email to users with recruiting access."""
    try:
        if not hasattr(models, 'InAppNotification'):
            return

        # Find users with recruiting permissions (admin and manager roles)
        recruiting_users = db.query(models.User).filter(
            models.User.role.in_(["admin", "manager"]),
            models.User.is_active == True,
            models.User.id != requester.id,
        ).all()

        requester_name = requester.full_name if hasattr(requester, 'full_name') and requester.full_name else "A hiring manager"

        for user in recruiting_users:
            notification = models.InAppNotification(
                user_id=user.id,
                title="New Requisition Request",
                message=f"{requester_name} submitted a new position request: {requisition.title}",
                notification_type="recruiting",
                priority="normal",
                resource_type="requisition",
                resource_id=requisition.id,
                action_url=f"/recruiting/requisitions/{requisition.id}",
                created_by_user_id=requester.id,
            )
            db.add(notification)

        # Send email notification to recruiting team
        import asyncio
        for user in recruiting_users:
            if hasattr(user, 'email') and user.email:
                try:
                    asyncio.get_event_loop().run_until_complete(
                        recruiting_email_service.send_new_requisition_request_notification(
                            to_email=user.email,
                            requester_name=requester_name,
                            job_title=requisition.title,
                            requisition_id=requisition.requisition_id or str(requisition.id),
                            department=requisition.department or "",
                        )
                    )
                except RuntimeError:
                    # No event loop running — skip email in sync context
                    pass
    except Exception:
        # Don't fail the request if notification fails
        pass


# =============================================================================
# OFFER APPROVAL
# =============================================================================

@router.patch("/offers/{offer_id}/approve")
def approve_offer_as_hiring_manager(
    offer_id: int,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Allow the hiring manager to approve an offer for their requisition."""
    from sqlalchemy.orm import joinedload

    offer = (
        db.query(models.OfferLetter)
        .options(
            joinedload(models.OfferLetter.application)
            .joinedload(models.Application.requisition)
        )
        .filter(models.OfferLetter.id == offer_id)
        .first()
    )
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Verify the current user is the hiring manager for this requisition
    requisition = None
    if offer.application:
        requisition = offer.application.requisition
    if not requisition:
        raise HTTPException(status_code=400, detail="Offer has no linked requisition")

    employee = _get_employee_for_user(db, current_user)
    hm_employee_id = employee.id if employee else None

    if requisition.hiring_manager_id != hm_employee_id:
        raise HTTPException(
            status_code=403,
            detail="You are not the hiring manager for this requisition",
        )

    if offer.status not in ("Draft", "Pending Approval"):
        raise HTTPException(
            status_code=400,
            detail=f"Offer cannot be approved from status '{offer.status}'",
        )

    offer.status = "Approved"
    offer.approved_by = current_user.username
    offer.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)

    return {
        "message": "Offer approved",
        "offer_id": offer.id,
        "status": offer.status,
        "approved_by": offer.approved_by,
        "approved_at": offer.approved_at.isoformat() if offer.approved_at else None,
    }


# =============================================================================
# CANDIDATES / INTERVIEWS / STAGE ADVANCEMENT
# =============================================================================

@router.get("/requisitions/{req_id}/candidates")
def get_requisition_candidates(
    req_id: int,
    stage_key: Optional[str] = Query(None),
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Return candidates for a requisition with interviews, scorecards, resume analysis, and documents."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Find the pipeline stage matching the lifecycle stage_key
    pipeline_stage = None
    if stage_key and req.pipeline_template_id:
        pipeline_stage = db.query(models.PipelineStage).filter(
            models.PipelineStage.template_id == req.pipeline_template_id,
            models.PipelineStage.lifecycle_stage_key == stage_key,
        ).first()

    # Load applications with related data
    applications = (
        db.query(models.Application)
        .options(
            joinedload(models.Application.applicant),
            joinedload(models.Application.current_stage),
            joinedload(models.Application.resume_analysis),
            joinedload(models.Application.documents).joinedload(models.ApplicantDocument.file_upload),
            joinedload(models.Application.interviews),
            joinedload(models.Application.scorecards).joinedload(models.InterviewScorecard.interviewer),
        )
        .filter(models.Application.requisition_id == req_id)
        .all()
    )

    candidates = []
    interviews_completed = 0
    interviews_total = 0
    scorecards_submitted = 0
    scorecards_total = 0
    active_count = 0

    for app in applications:
        if app.status in ("Rejected",):
            continue

        # Show ALL interviews and scorecards for the candidate
        app_interviews = list(app.interviews)
        app_scorecards = list(app.scorecards)

        # Filter to current stage for completion tracking
        if pipeline_stage:
            stage_interviews = [iv for iv in app.interviews if iv.stage_id == pipeline_stage.id]
            stage_scorecards = [sc for sc in app.scorecards if sc.stage_id == pipeline_stage.id]
        else:
            stage_interviews = app_interviews
            stage_scorecards = app_scorecards

        # Build resume analysis object
        ra = app.resume_analysis
        resume_analysis = None
        if ra:
            resume_analysis = {
                "overall_score": ra.overall_score,
                "skills_match_score": ra.skills_match_score,
                "experience_match_score": ra.experience_match_score,
                "education_match_score": ra.education_match_score,
                "threshold_label": ra.threshold_label,
                "status": ra.status,
            }

        # Build documents list (from applicant docs linked to this application + resume on application)
        docs = []
        for doc in app.documents:
            docs.append({
                "id": doc.id,
                "document_type": doc.document_type,
                "label": doc.label or (doc.file_upload.original_filename if doc.file_upload else None),
                "file_upload_id": doc.file_upload_id,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            })
        # Also include the resume file attached directly to the application
        if app.resume_file_id and not any(d["file_upload_id"] == app.resume_file_id for d in docs):
            resume_upload = db.query(models.FileUpload).filter(models.FileUpload.id == app.resume_file_id).first()
            if resume_upload:
                docs.insert(0, {
                    "id": None,
                    "document_type": "resume",
                    "label": resume_upload.original_filename,
                    "file_upload_id": resume_upload.id,
                    "uploaded_at": resume_upload.uploaded_at.isoformat() if resume_upload.uploaded_at else None,
                })

        # Build a stage name lookup
        stage_name_map: dict = {}
        if req.pipeline_template_id:
            for ps in db.query(models.PipelineStage).filter(
                models.PipelineStage.template_id == req.pipeline_template_id
            ).all():
                stage_name_map[ps.id] = ps.name

        # Serialize interviews
        interview_list = []
        for iv in app_interviews:
            interview_list.append({
                "id": iv.id,
                "interview_id": iv.interview_id,
                "scheduled_at": iv.scheduled_at.isoformat() if iv.scheduled_at else None,
                "duration_minutes": iv.duration_minutes,
                "format": iv.format,
                "status": iv.status,
                "interviewers": iv.interviewers or [],
                "video_link": iv.video_link,
                "stage_name": stage_name_map.get(iv.stage_id, None),
            })

        # Serialize scorecards
        scorecard_list = []
        for sc in app_scorecards:
            scorecard_list.append({
                "id": sc.id,
                "interviewer_name": sc.interviewer.full_name if sc.interviewer else None,
                "interviewer_id": sc.interviewer_id,
                "overall_rating": sc.overall_rating,
                "recommendation": sc.recommendation,
                "status": sc.status,
                "submitted_at": sc.submitted_at.isoformat() if sc.submitted_at else None,
                "stage_name": stage_name_map.get(sc.stage_id, None),
            })

        applicant = app.applicant
        candidates.append({
            "application_id": app.id,
            "application_id_str": app.application_id,
            "status": app.status,
            "applicant": {
                "id": applicant.id if applicant else None,
                "name": f"{applicant.first_name} {applicant.last_name}" if applicant else "Unknown",
                "email": applicant.email if applicant else None,
                "phone": applicant.phone if applicant else None,
                "current_title": applicant.current_title if applicant else None,
                "current_employer": applicant.current_employer if applicant else None,
                "is_internal": applicant.is_internal if applicant else False,
            },
            "current_stage": {
                "id": app.current_stage.id,
                "name": app.current_stage.name,
            } if app.current_stage else None,
            "overall_rating": app.overall_rating,
            "is_favorite": app.is_favorite,
            "resume_analysis": resume_analysis,
            "interviews": interview_list,
            "scorecards": scorecard_list,
            "documents": docs,
        })

        # Tally stage summary for non-withdrawn candidates (using stage-filtered data)
        if app.status != "Withdrawn":
            active_count += 1
            for iv in stage_interviews:
                interviews_total += 1
                if iv.status in ("Completed",):
                    interviews_completed += 1
            for sc in stage_scorecards:
                scorecards_total += 1
                if sc.status == "Submitted":
                    scorecards_submitted += 1

    # all_complete: every active candidate must have at least one completed/cancelled interview
    # for this stage AND all stage scorecards must be submitted
    all_complete = active_count > 0
    if all_complete:
        for c in candidates:
            if c["status"] in ("Withdrawn", "Rejected"):
                continue
            # Require at least one interview that is completed/cancelled for this stage
            c_stage_ivs = []
            c_stage_scs = []
            app_obj = next((a for a in applications if a.id == c["application_id"]), None)
            if app_obj and pipeline_stage:
                c_stage_ivs = [iv for iv in app_obj.interviews if iv.stage_id == pipeline_stage.id]
                c_stage_scs = [sc for sc in app_obj.scorecards if sc.stage_id == pipeline_stage.id]
            elif app_obj:
                c_stage_ivs = list(app_obj.interviews)
                c_stage_scs = list(app_obj.scorecards)

            # Must have at least one interview scheduled/completed for this stage
            if len(c_stage_ivs) == 0:
                all_complete = False
                break
            # All interviews must be completed/cancelled
            for iv in c_stage_ivs:
                if iv.status not in ("Completed", "Cancelled", "No Show"):
                    all_complete = False
                    break
            if not all_complete:
                break
            # All scorecards must be submitted
            for sc in c_stage_scs:
                if sc.status != "Submitted":
                    all_complete = False
                    break
            if not all_complete:
                break

    return {
        "candidates": candidates,
        "stage_summary": {
            "total_candidates": len(candidates),
            "active_candidates": active_count,
            "interviews_completed": interviews_completed,
            "interviews_total": interviews_total,
            "scorecards_submitted": scorecards_submitted,
            "scorecards_total": scorecards_total,
            "all_complete": all_complete,
        },
    }


@router.patch("/interviews/{interview_id}/complete")
def hm_complete_interview(
    interview_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Allow hiring manager to mark an interview as completed."""
    interview = (
        db.query(models.Interview)
        .options(joinedload(models.Interview.application).joinedload(models.Application.requisition))
        .filter(models.Interview.id == interview_id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    req = interview.application.requisition if interview.application else None
    if not req or not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    if interview.status not in ("Scheduled", "Confirmed"):
        raise HTTPException(
            status_code=400,
            detail=f"Interview cannot be completed from status '{interview.status}'",
        )

    interview.status = "Completed"
    recruiting_service.log_activity(
        db, interview.application_id, "interview_completed",
        f"Interview marked as completed by {current_user.full_name}",
        performed_by=current_user.id,
    )
    db.commit()

    return {"message": "Interview marked as completed", "interview_id": interview_id}


@router.post("/requisitions/{req_id}/complete-stage")
def hm_complete_stage(
    req_id: int,
    data: CompleteStageRequest,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Allow hiring manager to advance a lifecycle stage when all interviews/scorecards are complete."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify stage belongs to this requisition and is active
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == data.stage_id,
        models.RequisitionLifecycleStage.requisition_id == req_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found for this requisition")
    if stage.status != "active":
        raise HTTPException(status_code=400, detail=f"Stage is not active (current status: {stage.status})")

    # Only allow for interview-type stages
    allowed_keys = {"hr_interview", "hiring_manager_interview", "tech_screen"}
    if stage.stage_key not in allowed_keys:
        raise HTTPException(status_code=400, detail="Stage advancement not allowed for this stage type")

    # Verify all candidates are complete
    candidates_resp = get_requisition_candidates(req_id, stage_key=stage.stage_key, current_user=current_user, db=db)
    if not candidates_resp["stage_summary"]["all_complete"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot advance: not all interviews and scorecards are complete",
        )

    # Advance the stage
    updated_stage = lifecycle_service.advance_stage(
        db, data.stage_id, current_user.id,
        outcome=data.outcome,
        notes=data.notes,
    )

    # Notify stakeholders
    try:
        lifecycle_service.notify_stakeholders(
            db, req, stage,
            event="stage_completed",
            actor_name=current_user.full_name,
        )
    except Exception:
        pass  # Non-critical

    db.commit()

    return {
        "message": f"Stage '{stage.stage_label}' completed and advanced",
        "stage_id": stage.id,
        "status": updated_stage.status if updated_stage else "completed",
    }


@router.get("/applicant-documents/{file_upload_id}/download")
def download_applicant_document(
    file_upload_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Download an applicant document (resume, etc.), verifying HM has access."""
    file_upload = db.query(models.FileUpload).filter(models.FileUpload.id == file_upload_id).first()
    if not file_upload:
        raise HTTPException(status_code=404, detail="File not found")

    # Check access: file must be linked to an application on an accessible requisition
    # Check via ApplicantDocument
    doc = db.query(models.ApplicantDocument).filter(
        models.ApplicantDocument.file_upload_id == file_upload_id,
    ).first()
    if doc and doc.application_id:
        app = db.query(models.Application).filter(models.Application.id == doc.application_id).first()
        if app:
            req = db.query(models.JobRequisition).filter(models.JobRequisition.id == app.requisition_id).first()
            if req and _check_requisition_access(req, current_user):
                if not os.path.exists(file_upload.file_path):
                    raise HTTPException(status_code=404, detail="File not found on disk")
                return FileResponse(
                    path=file_upload.file_path,
                    filename=file_upload.original_filename,
                    media_type="application/octet-stream",
                )

    # Check via Application.resume_file_id
    app = db.query(models.Application).filter(models.Application.resume_file_id == file_upload_id).first()
    if app:
        req = db.query(models.JobRequisition).filter(models.JobRequisition.id == app.requisition_id).first()
        if req and _check_requisition_access(req, current_user):
            if not os.path.exists(file_upload.file_path):
                raise HTTPException(status_code=404, detail="File not found on disk")
            return FileResponse(
                path=file_upload.file_path,
                filename=file_upload.original_filename,
                media_type="application/octet-stream",
            )

    raise HTTPException(status_code=403, detail="Not authorized to download this file")


# ============================================================================
# ATS PHASE 0 — HM PORTAL STUBS
# ============================================================================

@router.get("/requisitions/{req_id}/stakeholders")
def hm_list_stakeholders(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """View stakeholders for a requisition (HM view)."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    stakeholders = (
        db.query(models.RequisitionStakeholder)
        .options(
            joinedload(models.RequisitionStakeholder.user),
            joinedload(models.RequisitionStakeholder.employee),
            joinedload(models.RequisitionStakeholder.assigned_by_user),
        )
        .filter(
            models.RequisitionStakeholder.requisition_id == req_id,
            models.RequisitionStakeholder.is_active == True,  # noqa: E712
        )
        .all()
    )

    def _stakeholder_name(s):
        if s.user:
            return s.user.full_name
        if s.employee:
            return f"{s.employee.first_name} {s.employee.last_name}"
        return None

    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "employee_id": s.employee_id,
            "user_name": _stakeholder_name(s),
            "role": s.role,
            "access_level": s.access_level,
            "assigned_by_name": s.assigned_by_user.full_name if s.assigned_by_user else None,
            "assigned_at": s.assigned_at.isoformat() if s.assigned_at else None,
            "is_active": s.is_active,
        }
        for s in stakeholders
    ]


class AddStakeholderRequest(BaseModel):
    user_id: Optional[int] = None
    employee_id: Optional[str] = None
    role: str  # one of: "vp_svp", "hiring_manager", "interviewer", "observer"
    access_level: Optional[str] = None


class UpdateStakeholderRequest(BaseModel):
    role: Optional[str] = None
    access_level: Optional[str] = None


_DEFAULT_ACCESS_LEVELS = {
    "vp_svp": "full_access",
    "hiring_manager": "full_access",
    "interviewer": "interview_and_pipeline_view",
    "observer": "pipeline_view_only",
}


@router.post("/requisitions/{req_id}/stakeholders")
def hm_add_stakeholder(
    req_id: int,
    body: AddStakeholderRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """HM adds a stakeholder to a requisition."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate role
    valid_roles = ("vp_svp", "hiring_manager", "interviewer", "observer")
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    if not body.user_id and not body.employee_id:
        raise HTTPException(status_code=422, detail="Must provide user_id or employee_id")

    # Resolve names
    target_user = None
    target_employee = None
    if body.user_id:
        target_user = db.query(models.User).filter(models.User.id == body.user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
    if body.employee_id:
        target_employee = db.query(models.Employee).filter(
            models.Employee.employee_id == body.employee_id
        ).first()
        if not target_employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    # Check not already an active stakeholder
    dup_filter = [
        models.RequisitionStakeholder.requisition_id == req_id,
        models.RequisitionStakeholder.is_active == True,  # noqa: E712
    ]
    if body.employee_id:
        dup_filter.append(models.RequisitionStakeholder.employee_id == body.employee_id)
    elif body.user_id:
        dup_filter.append(models.RequisitionStakeholder.user_id == body.user_id)

    existing = db.query(models.RequisitionStakeholder).filter(*dup_filter).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Already an active stakeholder for this requisition",
        )

    # Determine access level
    access_level = body.access_level if body.access_level else _DEFAULT_ACCESS_LEVELS.get(body.role, "pipeline_view_only")

    stakeholder = models.RequisitionStakeholder(
        requisition_id=req_id,
        user_id=body.user_id,
        employee_id=body.employee_id,
        role=body.role,
        access_level=access_level,
        assigned_by=current_user.id,
    )
    db.add(stakeholder)
    db.commit()
    db.refresh(stakeholder)

    display_name = None
    if target_user:
        display_name = target_user.full_name
    elif target_employee:
        display_name = f"{target_employee.first_name} {target_employee.last_name}"

    return {
        "id": stakeholder.id,
        "requisition_id": stakeholder.requisition_id,
        "user_id": stakeholder.user_id,
        "employee_id": stakeholder.employee_id,
        "user_name": display_name,
        "role": stakeholder.role,
        "access_level": stakeholder.access_level,
        "assigned_by": stakeholder.assigned_by,
        "assigned_by_name": current_user.full_name,
        "assigned_at": stakeholder.assigned_at.isoformat() if stakeholder.assigned_at else None,
        "is_active": stakeholder.is_active,
    }


@router.put("/requisitions/{req_id}/stakeholders/{stakeholder_id}")
def hm_update_stakeholder(
    req_id: int,
    stakeholder_id: int,
    body: UpdateStakeholderRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """HM updates a stakeholder's role/access level."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    stakeholder = (
        db.query(models.RequisitionStakeholder)
        .options(
            joinedload(models.RequisitionStakeholder.user),
            joinedload(models.RequisitionStakeholder.employee),
            joinedload(models.RequisitionStakeholder.assigned_by_user),
        )
        .filter(
            models.RequisitionStakeholder.id == stakeholder_id,
            models.RequisitionStakeholder.requisition_id == req_id,
            models.RequisitionStakeholder.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    if body.role is not None:
        stakeholder.role = body.role
    if body.access_level is not None:
        stakeholder.access_level = body.access_level

    db.commit()
    db.refresh(stakeholder)

    display_name = None
    if stakeholder.user:
        display_name = stakeholder.user.full_name
    elif stakeholder.employee:
        display_name = f"{stakeholder.employee.first_name} {stakeholder.employee.last_name}"

    return {
        "id": stakeholder.id,
        "user_id": stakeholder.user_id,
        "employee_id": stakeholder.employee_id,
        "user_name": display_name,
        "role": stakeholder.role,
        "access_level": stakeholder.access_level,
        "assigned_by_name": stakeholder.assigned_by_user.full_name if stakeholder.assigned_by_user else None,
        "assigned_at": stakeholder.assigned_at.isoformat() if stakeholder.assigned_at else None,
        "is_active": stakeholder.is_active,
    }


@router.delete("/requisitions/{req_id}/stakeholders/{stakeholder_id}")
def hm_remove_stakeholder(
    req_id: int,
    stakeholder_id: int,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """HM removes a stakeholder from a requisition."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    stakeholder = (
        db.query(models.RequisitionStakeholder)
        .filter(
            models.RequisitionStakeholder.id == stakeholder_id,
            models.RequisitionStakeholder.requisition_id == req_id,
            models.RequisitionStakeholder.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")

    stakeholder.is_active = False
    db.commit()

    return {"message": "Stakeholder removed"}


@router.get("/approval-requests/pending")
def hm_get_pending_approvals(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get pending approval requests for this HM."""
    requests = approval_service.get_pending_for_user(db, current_user.id)

    result = []
    for req in requests:
        requested_by_name = None
        if req.requested_by:
            user = db.query(models.User).filter(models.User.id == req.requested_by).first()
            requested_by_name = user.full_name if user else None

        result.append({
            "id": req.id,
            "resource_type": req.resource_type,
            "resource_id": req.resource_id,
            "chain_id": req.chain_id,
            "current_step_id": req.current_step_id,
            "status": req.status,
            "requested_by_name": requested_by_name,
            "notes": req.notes,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })

    return result


@router.post("/approval-requests/{request_id}/approve")
def hm_approve_request(
    request_id: int,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """HM approves an offer or counter-offer."""
    req = approval_service.approve(db, request_id, current_user.id, data.notes)
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found or not pending")
    db.commit()
    return {
        "id": req.id,
        "status": req.status,
        "acted_at": req.acted_at.isoformat() if req.acted_at else None,
    }


@router.post("/approval-requests/{request_id}/reject")
def hm_reject_request(
    request_id: int,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """HM rejects an offer or counter-offer."""
    req = approval_service.reject(db, request_id, current_user.id, data.notes)
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found or not pending")
    db.commit()
    return {
        "id": req.id,
        "status": req.status,
        "acted_at": req.acted_at.isoformat() if req.acted_at else None,
    }


@router.get("/requisitions/{req_id}/selection-summary")
def hm_get_selection_summary(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Get candidate selection summary (scorecards, ratings, AI analysis)."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    applications = db.query(models.Application).options(
        joinedload(models.Application.applicant),
    ).filter(
        models.Application.requisition_id == req_id,
        ~models.Application.status.in_(["Rejected", "Withdrawn"]),
    ).all()

    candidates = []
    for app in applications:
        # Gather submitted scorecards
        scorecards = db.query(models.InterviewScorecard).filter(
            models.InterviewScorecard.application_id == app.id,
            models.InterviewScorecard.status == "Submitted",
        ).all()

        # Build scorecard details with interviewer names
        scorecard_details = []
        for sc in scorecards:
            interviewer = db.query(models.User).filter(models.User.id == sc.interviewer_id).first()
            scorecard_details.append((sc, interviewer))

        # Resume analysis
        ra = db.query(models.ResumeAnalysis).filter(
            models.ResumeAnalysis.application_id == app.id
        ).first()

        # Scorecard analysis
        sa = db.query(models.ScorecardAnalysis).filter(
            models.ScorecardAnalysis.application_id == app.id
        ).first()

        # Compute average overall rating from scorecards
        ratings = [sc.overall_rating for sc in scorecards if sc.overall_rating is not None]
        overall_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

        candidates.append({
            "application_id": app.id,
            "applicant_name": f"{app.applicant.first_name} {app.applicant.last_name}",
            "applicant_email": app.applicant.email,
            "status": app.status,
            "overall_rating": overall_rating,
            "scorecard_count": len(scorecards),
            "scorecards": [{
                "interviewer_name": sc_user.full_name if sc_user else "Unknown",
                "overall_rating": sc.overall_rating,
                "recommendation": sc.recommendation,
                "strengths": sc.strengths,
                "concerns": sc.concerns,
            } for sc, sc_user in scorecard_details],
            "resume_analysis": {
                "overall_score": ra.overall_score,
                "threshold_label": ra.threshold_label,
                "summary": ra.summary,
            } if ra and ra.status == "Completed" else None,
            "scorecard_analysis": {
                "overall_recommendation": sa.overall_recommendation,
                "confidence_level": sa.confidence_level,
                "summary": sa.summary,
                "consensus_strengths": sa.consensus_strengths,
                "consensus_concerns": sa.consensus_concerns,
            } if sa and sa.status == "Completed" else None,
            "is_favorite": app.is_favorite,
        })

    return {
        "requisition_id": req_id,
        "requisition_title": req.title,
        "candidates": candidates,
    }


class SelectionDecision(BaseModel):
    selected_application_id: int
    rationale: Optional[str] = None
    reject_others: bool = True


@router.post("/requisitions/{req_id}/selection-decision")
def hm_selection_decision(
    req_id: int,
    data: SelectionDecision,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """HM records candidate selection decision."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate the selected application belongs to this requisition
    selected_app = db.query(models.Application).filter(
        models.Application.id == data.selected_application_id,
        models.Application.requisition_id == req_id,
    ).first()
    if not selected_app:
        raise HTTPException(status_code=404, detail="Application not found for this requisition")

    # Advance selected application to Offer status
    selected_app.status = "Offer"

    # Optionally reject all other non-terminal applications
    if data.reject_others:
        other_apps = db.query(models.Application).filter(
            models.Application.requisition_id == req_id,
            models.Application.id != data.selected_application_id,
            ~models.Application.status.in_(["Rejected", "Withdrawn", "Hired"]),
        ).all()
        for app in other_apps:
            app.status = "Rejected"

    # Log the selection activity
    recruiting_service.log_activity(
        db, data.selected_application_id, "candidate_selected",
        f"Selected for {req.title}",
        details={"rationale": data.rationale, "rejected_others": data.reject_others},
        performed_by=current_user.id,
    )

    db.commit()

    return {
        "id": selected_app.id,
        "application_id": selected_app.application_id,
        "status": selected_app.status,
        "requisition_id": req_id,
        "message": f"Candidate selected for {req.title}",
    }


class InitiateOfferRequest(BaseModel):
    application_id: int
    salary: Optional[float] = None
    wage_type: Optional[str] = "salary"
    benefits_package: Optional[str] = None
    signing_bonus: Optional[float] = None
    start_date: Optional[str] = None
    notes: Optional[str] = None


@router.post("/requisitions/{req_id}/initiate-offer")
def hm_initiate_offer(
    req_id: int,
    data: InitiateOfferRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """HM initiates offer with compensation/benefits/notes — advances pipeline from Candidate Selection to Offer Extended."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate application belongs to this requisition
    application = db.query(models.Application).filter(
        models.Application.id == data.application_id,
        models.Application.requisition_id == req_id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found for this requisition")

    # Parse start_date if provided
    parsed_start_date = None
    if data.start_date:
        try:
            parsed_start_date = date.fromisoformat(data.start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format, expected YYYY-MM-DD")

    # Create the OfferLetter in Draft status
    offer = models.OfferLetter(
        offer_id=offer_service.generate_offer_id(db),
        application_id=data.application_id,
        position_title=req.title,
        department=req.department,
        location=req.location,
        employment_type=req.employment_type,
        start_date=parsed_start_date,
        salary=data.salary,
        wage_type=data.wage_type,
        signing_bonus=data.signing_bonus,
        benefits_summary=data.benefits_package,
        status="Draft",
        version=1,
        created_by=current_user.id,
    )
    db.add(offer)
    db.flush()

    # Find an active "offer" approval chain and create an ApprovalRequest
    approval_chain = db.query(models.ApprovalChain).filter(
        models.ApprovalChain.chain_type == "offer",
        models.ApprovalChain.is_active == True,
    ).first()

    approval_request = None
    if approval_chain and approval_chain.steps:
        first_step = approval_chain.steps[0]
        approval_request = models.ApprovalRequest(
            resource_type="offer",
            resource_id=offer.id,
            chain_id=approval_chain.id,
            current_step_id=first_step.id,
            status="Pending",
            requested_by=current_user.id,
        )
        db.add(approval_request)

    # Log activity
    recruiting_service.log_activity(
        db, data.application_id, "offer_initiated",
        f"Offer initiated for {req.title}",
        details={
            "offer_id": offer.offer_id,
            "salary": data.salary,
            "wage_type": data.wage_type,
            "notes": data.notes,
        },
        performed_by=current_user.id,
    )

    db.commit()

    return {
        "id": offer.id,
        "offer_id": offer.offer_id,
        "application_id": offer.application_id,
        "position_title": offer.position_title,
        "status": offer.status,
        "version": offer.version,
        "salary": offer.salary,
        "wage_type": offer.wage_type,
        "signing_bonus": offer.signing_bonus,
        "benefits_summary": offer.benefits_summary,
        "start_date": offer.start_date.isoformat() if offer.start_date else None,
        "created_by": offer.created_by,
        "approval_request_id": approval_request.id if approval_request else None,
    }


# ============================================================================
# SCORECARD TEMPLATES (Phase 4 — §3.1)
# ============================================================================

class CreateScorecardTemplateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    sections: list  # JSON structure: [{name, weight, criteria: [...]}]
    recommendation_options: Optional[list] = None
    red_flags: Optional[list] = None
    suggested_questions: Optional[list] = None


@router.get("/scorecard-templates")
def hm_list_scorecard_templates(
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """List active scorecard templates visible to hiring managers."""
    templates = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.is_active == True,
        or_(
            models.ScorecardTemplate.template_type.in_(["hm", "tech_screen"]),
            models.ScorecardTemplate.created_by == current_user.id,
        ),
    ).order_by(models.ScorecardTemplate.created_at.desc()).all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "template_type": t.template_type,
            "sections": t.sections,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "is_editable": t.created_by == current_user.id,
        }
        for t in templates
    ]


@router.post("/scorecard-templates")
def hm_create_scorecard_template(
    data: CreateScorecardTemplateRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Create a new HM scorecard template."""
    template = models.ScorecardTemplate(
        name=data.name,
        description=data.description,
        template_type="hm",
        sections=data.sections,
        recommendation_options=data.recommendation_options,
        red_flags=data.red_flags,
        suggested_questions=data.suggested_questions,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "template_type": template.template_type,
        "sections": template.sections,
        "recommendation_options": template.recommendation_options,
        "red_flags": template.red_flags,
        "suggested_questions": template.suggested_questions,
        "is_active": template.is_active,
        "created_by": template.created_by,
        "created_at": template.created_at.isoformat() if template.created_at else None,
    }


@router.put("/scorecard-templates/{template_id}")
def hm_update_scorecard_template(
    template_id: int,
    data: CreateScorecardTemplateRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Update a scorecard template owned by the current HM."""
    template = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.id == template_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit templates you created")

    template.name = data.name
    template.description = data.description
    template.sections = data.sections
    template.recommendation_options = data.recommendation_options
    template.red_flags = data.red_flags
    template.suggested_questions = data.suggested_questions

    db.commit()
    db.refresh(template)

    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "template_type": template.template_type,
        "sections": template.sections,
        "recommendation_options": template.recommendation_options,
        "red_flags": template.red_flags,
        "suggested_questions": template.suggested_questions,
        "is_active": template.is_active,
        "created_by": template.created_by,
        "created_at": template.created_at.isoformat() if template.created_at else None,
    }


@router.delete("/scorecard-templates/{template_id}")
def hm_delete_scorecard_template(
    template_id: int,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Soft-delete (deactivate) a scorecard template owned by the current HM."""
    template = db.query(models.ScorecardTemplate).filter(
        models.ScorecardTemplate.id == template_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete templates you created")

    template.is_active = False
    db.commit()

    return {"message": "Template deactivated"}


# ============================================================================
# NEGOTIATION HISTORY (Phase 4 — §3.5)
# ============================================================================

@router.get("/offers/{offer_id}/negotiation-history")
def hm_negotiation_history(
    offer_id: int,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Get full negotiation history for an offer including all versions and applicant proposals."""
    offer = db.query(models.OfferLetter).filter(
        models.OfferLetter.id == offer_id,
    ).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Trace back to application -> requisition and check access
    application = db.query(models.Application).options(
        joinedload(models.Application.applicant),
    ).filter(models.Application.id == offer.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == application.requisition_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Access denied to this requisition")

    # Get the full negotiation chain
    chain = offer_service.get_negotiation_chain(db, offer)

    applicant_name = (
        f"{application.applicant.first_name} {application.applicant.last_name}"
        if application.applicant else "Unknown"
    )

    # Build offer versions
    offer_versions = []
    for o in chain:
        offer_versions.append({
            "id": o.id,
            "offer_id": o.offer_id,
            "version": o.version if hasattr(o, "version") and o.version else 1,
            "salary": float(o.salary) if o.salary else None,
            "signing_bonus": float(o.signing_bonus) if o.signing_bonus else None,
            "start_date": o.start_date.isoformat() if o.start_date else None,
            "benefits_summary": o.benefits_summary,
            "status": o.status,
            "is_counter_offer": o.is_counter_offer,
            "negotiation_notes": o.negotiation_notes,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    # Get applicant counter-proposals from activity log
    applicant_proposals = []
    activities = db.query(models.ApplicationActivity).filter(
        models.ApplicationActivity.application_id == application.id,
        models.ApplicationActivity.activity_type == "negotiation_requested",
    ).order_by(models.ApplicationActivity.created_at).all()

    for act in activities:
        details = act.details or {}
        applicant_proposals.append({
            "desired_salary": details.get("desired_salary"),
            "desired_signing_bonus": details.get("desired_signing_bonus"),
            "desired_start_date": details.get("desired_start_date"),
            "notes": details.get("notes"),
            "submitted_at": act.created_at.isoformat() if act.created_at else None,
        })

    # Get approval requests for offers in the chain
    offer_ids = [o.id for o in chain]
    approval_requests = db.query(models.ApprovalRequest).filter(
        models.ApprovalRequest.resource_type == "counter_offer",
        models.ApprovalRequest.resource_id.in_(offer_ids),
    ).all()

    approval_data = []
    for ar in approval_requests:
        approval_data.append({
            "id": ar.id,
            "resource_id": ar.resource_id,
            "status": ar.status,
            "notes": ar.notes,
            "created_at": ar.created_at.isoformat() if ar.created_at else None,
            "acted_at": ar.acted_at.isoformat() if ar.acted_at else None,
        })

    return {
        "application_id": offer.application_id,
        "applicant_name": applicant_name,
        "negotiation_round": application.negotiation_round if application.negotiation_round else 0,
        "current_offer": offer_versions[-1] if offer_versions else None,
        "offer_versions": offer_versions,
        "applicant_proposals": applicant_proposals,
        "approval_requests": approval_data,
    }


# ============================================================================
# STAKEHOLDER AVAILABILITY FOR INTERVIEWS
# ============================================================================

class AvailabilitySlotInput(BaseModel):
    start_time: str  # ISO datetime
    end_time: str    # ISO datetime
    time_zone: Optional[str] = None

class AvailabilitySubmission(BaseModel):
    slots: List[AvailabilitySlotInput]


@router.post("/requisitions/{req_id}/availability")
def submit_availability(
    req_id: int,
    data: AvailabilitySubmission,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Submit interview availability slots for a requisition.

    Replaces all existing unbooked slots for this user+requisition.
    """
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    # Remove existing unbooked slots for this user+requisition so resubmission replaces them
    db.query(models.InterviewerAvailability).filter(
        models.InterviewerAvailability.user_id == current_user.id,
        models.InterviewerAvailability.requisition_id == req_id,
        models.InterviewerAvailability.is_booked == False,
    ).delete()

    from app.services.availability_service import availability_service

    slot_dicts = [
        {
            "start_time": s.start_time,
            "end_time": s.end_time,
            "time_zone": s.time_zone,
            "slot_duration_minutes": 60,
        }
        for s in data.slots
    ]

    created = availability_service.create_slots(
        db=db,
        user_id=current_user.id,
        slots=slot_dicts,
        requisition_id=req_id,
    )
    db.commit()

    return {
        "message": f"Created {len(created)} availability slots",
        "slots_created": len(created),
    }


@router.get("/requisitions/{req_id}/my-availability")
def get_my_availability(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get the current user's submitted availability slots for a requisition."""
    slots = (
        db.query(models.InterviewerAvailability)
        .filter(
            models.InterviewerAvailability.user_id == current_user.id,
            models.InterviewerAvailability.requisition_id == req_id,
        )
        .order_by(models.InterviewerAvailability.start_time)
        .all()
    )
    return {
        "slots": [
            {
                "id": s.id,
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "is_booked": s.is_booked,
            }
            for s in slots
        ]
    }


@router.get("/requisitions/{req_id}/availability-status")
def get_availability_status(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get availability submission status for all stakeholders on a requisition."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    # Collect all stakeholders (from table + HM/recruiter from requisition)
    stakeholder_rows = db.query(models.RequisitionStakeholder).filter(
        models.RequisitionStakeholder.requisition_id == req_id,
        models.RequisitionStakeholder.is_active == True,
    ).all()

    seen_user_ids = set()
    stakeholders = []

    # Add stakeholders from the table
    for s in stakeholder_rows:
        if s.user_id and s.user_id not in seen_user_ids:
            seen_user_ids.add(s.user_id)
            user = db.query(models.User).filter(models.User.id == s.user_id).first()
            slot_count = db.query(models.InterviewerAvailability).filter(
                models.InterviewerAvailability.user_id == s.user_id,
                models.InterviewerAvailability.requisition_id == req_id,
            ).count()
            stakeholders.append({
                "user_id": s.user_id,
                "name": user.full_name if user else "Unknown",
                "role": s.role,
                "slots_submitted": slot_count,
                "opted_out": s.opted_out_of_availability,
            })

    # Add HM and recruiter if not already included
    for uid, role in [(req.hiring_manager_id, "hiring_manager"), (req.recruiter_id, "recruiter")]:
        if uid and uid not in seen_user_ids:
            seen_user_ids.add(uid)
            user = db.query(models.User).filter(models.User.id == uid).first()
            slot_count = db.query(models.InterviewerAvailability).filter(
                models.InterviewerAvailability.user_id == uid,
                models.InterviewerAvailability.requisition_id == req_id,
            ).count()
            stakeholders.append({
                "user_id": uid,
                "name": user.full_name if user else "Unknown",
                "role": role,
                "slots_submitted": slot_count,
                "opted_out": False,
            })

    return {"stakeholders": stakeholders, "requisition_title": req.title}


@router.post("/requisitions/{req_id}/opt-out-availability")
def opt_out_availability(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Opt out of availability submission (VP/SVP and observers only)."""
    stakeholder = db.query(models.RequisitionStakeholder).filter(
        models.RequisitionStakeholder.requisition_id == req_id,
        models.RequisitionStakeholder.user_id == current_user.id,
        models.RequisitionStakeholder.is_active == True,
    ).first()

    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder record not found")

    if stakeholder.role not in ("vp_svp", "observer"):
        raise HTTPException(status_code=403, detail="Only VP/SVP and observers can opt out of availability submission")

    stakeholder.opted_out_of_availability = True
    db.commit()

    return {"message": "Opted out of availability submission"}


# ---------------------------------------------------------------------------
# Scorecard viewing (for stakeholders)
# ---------------------------------------------------------------------------

@router.get("/scorecards/{scorecard_id}")
def get_scorecard_detail(
    scorecard_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Get full scorecard details. Only accessible if user is a stakeholder on the requisition."""
    from sqlalchemy.orm import joinedload

    sc = db.query(models.InterviewScorecard).options(
        joinedload(models.InterviewScorecard.interviewer),
        joinedload(models.InterviewScorecard.stage),
        joinedload(models.InterviewScorecard.application).joinedload(models.Application.applicant),
        joinedload(models.InterviewScorecard.application).joinedload(models.Application.requisition),
    ).filter(models.InterviewScorecard.id == scorecard_id).first()

    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")

    # Verify user has access to the requisition this scorecard belongs to
    req = sc.application.requisition if sc.application else None
    if req and not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this scorecard")

    return {
        "id": sc.id,
        "application_id": sc.application_id,
        "applicant_name": f"{sc.application.applicant.first_name} {sc.application.applicant.last_name}" if sc.application and sc.application.applicant else None,
        "stage": {"id": sc.stage.id, "name": sc.stage.name} if sc.stage else None,
        "interviewer": {"id": sc.interviewer.id, "name": sc.interviewer.full_name} if sc.interviewer else None,
        "overall_rating": sc.overall_rating,
        "recommendation": sc.recommendation,
        "criteria_ratings": sc.criteria_ratings,
        "strengths": sc.strengths,
        "concerns": sc.concerns,
        "additional_notes": sc.additional_notes,
        "status": sc.status,
        "submitted_at": sc.submitted_at.isoformat() if sc.submitted_at else None,
        "due_date": sc.due_date.isoformat() if sc.due_date else None,
    }


@router.get("/scorecards/{scorecard_id}/pdf")
def download_scorecard_pdf(
    scorecard_id: int,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """Download a scorecard as a PDF."""
    from fpdf import FPDF
    from io import BytesIO
    from starlette.responses import StreamingResponse
    from sqlalchemy.orm import joinedload

    sc = db.query(models.InterviewScorecard).options(
        joinedload(models.InterviewScorecard.interviewer),
        joinedload(models.InterviewScorecard.stage),
        joinedload(models.InterviewScorecard.application).joinedload(models.Application.applicant),
        joinedload(models.InterviewScorecard.application).joinedload(models.Application.requisition),
    ).filter(models.InterviewScorecard.id == scorecard_id).first()

    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")

    req = sc.application.requisition if sc.application else None
    if req and not _check_requisition_access(req, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    applicant_name = f"{sc.application.applicant.first_name} {sc.application.applicant.last_name}" if sc.application and sc.application.applicant else "Unknown"
    interviewer_name = sc.interviewer.full_name if sc.interviewer else "Unassigned"
    stage_name = sc.stage.name if sc.stage else "N/A"
    req_title = req.title if req else "N/A"

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "Interview Scorecard", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(108, 63, 160)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Meta info
    pdf.set_font("Helvetica", "", 10)
    meta = [
        ("Candidate", applicant_name),
        ("Position", req_title),
        ("Stage", stage_name),
        ("Interviewer", interviewer_name),
        ("Status", sc.status),
    ]
    if sc.submitted_at:
        meta.append(("Submitted", sc.submitted_at.strftime("%B %d, %Y at %I:%M %p")))

    for label, value in meta:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(35, 6, f"{label}:")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)

    # Overall Rating & Recommendation
    if sc.overall_rating is not None:
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, f"Overall Rating: {sc.overall_rating:.1f} / 5", new_x="LMARGIN", new_y="NEXT")

    if sc.recommendation:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, f"Recommendation: {sc.recommendation}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)

    # Criteria Ratings
    if sc.criteria_ratings:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Criteria Ratings", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)

        for cr in sc.criteria_ratings:
            pdf.set_font("Helvetica", "B", 10)
            criteria_name = cr.get("criteria", cr.get("name", "Unknown"))
            rating = cr.get("rating", "N/A")
            pdf.cell(80, 6, criteria_name)
            pdf.set_font("Helvetica", "", 10)
            rating_str = f"{rating}/5" if isinstance(rating, (int, float)) else str(rating)
            pdf.cell(0, 6, rating_str, new_x="LMARGIN", new_y="NEXT")
            notes = cr.get("notes", "")
            if notes:
                pdf.set_font("Helvetica", "I", 9)
                pdf.set_text_color(100, 100, 100)
                pdf.multi_cell(0, 5, notes)
                pdf.set_text_color(0, 0, 0)
            pdf.ln(1)

        pdf.ln(3)

    # Strengths
    if sc.strengths:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Strengths", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, sc.strengths)
        pdf.ln(3)

    # Concerns
    if sc.concerns:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Concerns", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, sc.concerns)
        pdf.ln(3)

    # Additional Notes
    if sc.additional_notes:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Additional Notes", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, sc.additional_notes)

    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, f"Generated from Bifrost ATS", new_x="LMARGIN", new_y="NEXT")

    buf = BytesIO()
    buf.write(pdf.output())
    buf.seek(0)

    filename = f"scorecard_{applicant_name.replace(' ', '_')}_{stage_name.replace(' ', '_')}.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
