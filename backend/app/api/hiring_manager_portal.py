"""
Hiring Manager Portal API
Endpoints for hiring managers to submit and track requisition requests from the Employee Portal.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.lifecycle_service import lifecycle_service
from app.services.recruiting_email_service import recruiting_email_service

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

    # Posting preferences
    posting_channels: Optional[List[str]] = None  # ["internal", "external", "bloom"]
    requires_early_tech_screen: bool = False

    # Compensation
    preferred_salary: Optional[float] = None
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


# --- Helpers ---

def _get_employee_for_user(db: Session, user: models.User) -> Optional[models.Employee]:
    """Get the employee record linked to a user."""
    if not hasattr(user, 'employee_id') or not user.employee_id:
        return None
    return db.query(models.Employee).filter(
        models.Employee.employee_id == user.employee_id
    ).first()


def is_hiring_manager(user: models.User, employee: Optional[models.Employee], db: Session) -> bool:
    """Check if the current user qualifies as a hiring manager."""
    # Auto: user role is manager or admin
    if hasattr(user, 'role') and user.role in ("manager", "admin"):
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


@router.get("/requisitions")
def list_requisitions(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """List requisitions submitted by the current hiring manager."""
    query = db.query(models.JobRequisition).filter(
        or_(
            models.JobRequisition.requested_by == current_user.id,
            models.JobRequisition.hiring_manager_id == current_user.id,
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
                "target_start_date": r.target_start_date.isoformat() if r.target_start_date else None,
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
        posting_channels=data.posting_channels,
        requires_early_tech_screen=requires_tech_screen,
        preferred_salary=data.preferred_salary,
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
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Get detailed requisition info including lifecycle."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
        or_(
            models.JobRequisition.requested_by == current_user.id,
            models.JobRequisition.hiring_manager_id == current_user.id,
            # Also allow if user is in visibility list
        )
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

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
        "preferred_salary": req.preferred_salary,
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
    }


@router.get("/requisitions/{req_id}/lifecycle")
def get_requisition_lifecycle(
    req_id: int,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Get lifecycle stages for a requisition request."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    # Check access
    if req.requested_by != current_user.id and req.hiring_manager_id != current_user.id:
        if not (req.visibility_user_ids and current_user.id in req.visibility_user_ids):
            raise HTTPException(status_code=403, detail="Not authorized")

    stages = lifecycle_service.get_lifecycle(db, req_id)
    return {
        "requisition_id": req_id,
        "stages": [lifecycle_service.serialize_stage(s) for s in stages],
    }


@router.post("/requisitions/{req_id}/notes")
def add_note_to_stage(
    req_id: int,
    data: AddNoteRequest,
    current_user: models.User = Depends(_require_hiring_manager),
    db: Session = Depends(get_db),
):
    """Add a note to a lifecycle stage."""
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == req_id,
        or_(
            models.JobRequisition.requested_by == current_user.id,
            models.JobRequisition.hiring_manager_id == current_user.id,
        )
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

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

        results.append({
            "employee_id": emp.employee_id,
            "user_id": user.id if user else None,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "department": emp.department,
            "position": emp.position,
        })

    return {"employees": results}


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
