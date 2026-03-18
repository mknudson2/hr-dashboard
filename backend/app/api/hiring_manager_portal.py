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
from app.services.lifecycle_service import lifecycle_service
from app.services.recruiting_email_service import recruiting_email_service
from app.api.in_app_notifications import create_notification

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
    urgency: Optional[str] = "Normal"

    # Visibility
    visibility_user_ids: Optional[List[int]] = None

    # Description
    description: Optional[str] = None
    requirements: Optional[str] = None
    notes: Optional[str] = None


class AddNoteRequest(BaseModel):
    stage_id: int
    content: str
    highlights: Optional[List[str]] = None
    recommendation: Optional[str] = None
    recommendation_reason: Optional[str] = None


class CustomTeamRequest(BaseModel):
    team_name: str
    position_title: str


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
    from sqlalchemy import text
    result = db.execute(
        text(
            "SELECT COUNT(*) FROM job_requisitions "
            "WHERE visibility_user_ids IS NOT NULL "
            "AND visibility_user_ids LIKE :pattern"
        ),
        {"pattern": f"%{user.id}%"},
    ).scalar()
    return (result or 0) > 0


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
    """Create a notification for HR admins when a hiring manager proposes a new team."""
    requester_name = (
        current_user.full_name
        if hasattr(current_user, "full_name") and current_user.full_name
        else "A hiring manager"
    )
    create_notification(
        db=db,
        title="New Team Request",
        message=f"{requester_name} is requesting a new team '{data.team_name}' for position '{data.position_title}'",
        notification_type="team_request",
        priority="normal",
        user_id=None,
        created_by_user_id=current_user.id,
    )
    return {"message": "Custom team request submitted for HR review"}


@router.get("/requisitions")
def list_requisitions(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(_require_hiring_manager_or_stakeholder),
    db: Session = Depends(get_db),
):
    """List requisitions where user is hiring manager, requester, or stakeholder."""
    from sqlalchemy import text

    # Get IDs of requisitions where user is a stakeholder
    stakeholder_req_ids = [
        row[0] for row in db.execute(
            text(
                "SELECT id FROM job_requisitions "
                "WHERE visibility_user_ids IS NOT NULL "
                "AND visibility_user_ids LIKE :pattern"
            ),
            {"pattern": f"%{current_user.id}%"},
        ).fetchall()
    ]

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

    # Auto-set early tech screen if Bloom is selected
    requires_tech_screen = data.requires_early_tech_screen
    if data.posting_channels and "bloom" in data.posting_channels:
        requires_tech_screen = True

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
        urgency=data.urgency,
        visibility_user_ids=data.visibility_user_ids,
        description=data.description,
        requirements=data.requirements,
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
        "hiring_manager_name": (
            req.hiring_manager.full_name if req.hiring_manager else None
        ),
        "closed_at": req.closed_at.isoformat() if req.closed_at else None,
        "close_reason": req.close_reason,
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
