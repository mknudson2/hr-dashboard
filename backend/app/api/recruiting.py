"""
Recruiting API Router — HR Dashboard (authenticated HR users)

Manages job requisitions, postings, and application viewing for HR admins.
"""

import os
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.db import models, database
from app.api.auth import get_current_user
from app.services.recruiting_service import recruiting_service
from app.services.pipeline_service import pipeline_service
from app.services.offer_service import offer_service
from app.services.recruiting_email_service import recruiting_email_service
from app.services.hire_conversion_service import hire_conversion_service
from app.services.recruiting_analytics_service import recruiting_analytics_service
from app.services.rbac_service import require_any_permission, require_permission, Permissions
from app.services.lifecycle_service import lifecycle_service
from app.services.resume_analysis_service import resume_analysis_service
from app.services.calendar_service import calendar_service, CreateEventRequest
from app.services.ics_service import ics_service


router = APIRouter(prefix="/recruiting", tags=["recruiting"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class RequisitionCreate(BaseModel):
    title: str
    department: Optional[str] = None
    team: Optional[str] = None
    cost_center: Optional[str] = None
    location: Optional[str] = None
    remote_type: str = "On-site"
    employment_type: Optional[str] = None
    position_type: str = "New"
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    wage_type: Optional[str] = None
    show_salary_on_posting: bool = False
    openings: int = 1
    is_internal_only: bool = False
    internal_visibility: str = "All"
    internal_visibility_teams: Optional[list] = None
    replacing_employee_id: Optional[str] = None
    pipeline_template_id: Optional[int] = None
    job_description_id: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits_summary: Optional[str] = None
    eeo_job_category: Optional[str] = None
    target_start_date: Optional[str] = None
    target_fill_date: Optional[str] = None
    hiring_manager_id: Optional[int] = None
    recruiter_id: Optional[int] = None
    notes: Optional[str] = None


class RequisitionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    team: Optional[str] = None
    cost_center: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    employment_type: Optional[str] = None
    position_type: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    wage_type: Optional[str] = None
    show_salary_on_posting: Optional[bool] = None
    openings: Optional[int] = None
    is_internal_only: Optional[bool] = None
    internal_visibility: Optional[str] = None
    internal_visibility_teams: Optional[list] = None
    replacing_employee_id: Optional[str] = None
    pipeline_template_id: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits_summary: Optional[str] = None
    eeo_job_category: Optional[str] = None
    target_start_date: Optional[str] = None
    target_fill_date: Optional[str] = None
    hiring_manager_id: Optional[int] = None
    recruiter_id: Optional[int] = None
    notes: Optional[str] = None


class StatusChange(BaseModel):
    status: str


class PostingCreate(BaseModel):
    requisition_id: int
    title: Optional[str] = None
    description_html: Optional[str] = None
    short_description: Optional[str] = None
    channel: str = "portal"
    is_internal: bool = False
    allow_easy_apply: bool = True
    requires_resume: bool = True
    requires_cover_letter: bool = False
    custom_questions: Optional[list] = None
    tags: Optional[list] = None
    closes_at: Optional[str] = None


class PostingUpdate(BaseModel):
    title: Optional[str] = None
    description_html: Optional[str] = None
    short_description: Optional[str] = None
    channel: Optional[str] = None
    is_internal: Optional[bool] = None
    allow_easy_apply: Optional[bool] = None
    requires_resume: Optional[bool] = None
    requires_cover_letter: Optional[bool] = None
    custom_questions: Optional[list] = None
    tags: Optional[list] = None
    closes_at: Optional[str] = None


# ============================================================================
# JOB DESCRIPTION SCHEMAS
# ============================================================================

class JobDescriptionCreate(BaseModel):
    position_title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    responsibilities: Optional[str] = None
    skills_tags: Optional[List[str]] = None
    company_position: Optional[str] = None
    status: str = "Active"


class JobDescriptionUpdate(BaseModel):
    position_title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    responsibilities: Optional[str] = None
    skills_tags: Optional[List[str]] = None
    company_position: Optional[str] = None
    status: Optional[str] = None


# ============================================================================
# JOB DESCRIPTION ENDPOINTS
# ============================================================================

@router.get("/company-positions")
def list_company_positions(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Return distinct employee positions for linking to job descriptions."""
    rows = db.query(models.Employee.position).filter(
        models.Employee.position.isnot(None),
        models.Employee.position != "",
    ).distinct().order_by(models.Employee.position).all()
    return {"positions": [r[0] for r in rows]}


@router.get("/job-descriptions")
def list_job_descriptions(
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List all job descriptions with optional search/status filter."""
    query = db.query(models.JobDescription)

    if search:
        query = query.filter(models.JobDescription.position_title.ilike(f"%{search}%"))
    if status:
        query = query.filter(models.JobDescription.status == status)

    total = query.count()
    items = query.order_by(models.JobDescription.position_title).offset(skip).limit(limit).all()

    return {
        "total": total,
        "job_descriptions": [
            {
                "id": jd.id,
                "position_title": jd.position_title,
                "description": jd.description,
                "requirements": jd.requirements,
                "preferred_qualifications": jd.preferred_qualifications,
                "responsibilities": jd.responsibilities,
                "skills_tags": jd.skills_tags,
                "company_position": jd.company_position,
                "status": jd.status,
                "file_upload_id": jd.file_upload_id,
                "created_by": jd.created_by,
                "approved_by": jd.approved_by,
                "created_at": jd.created_at.isoformat() if jd.created_at else None,
                "updated_at": jd.updated_at.isoformat() if jd.updated_at else None,
            }
            for jd in items
        ],
    }


@router.get("/job-descriptions/{jd_id}")
def get_job_description(
    jd_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get a single job description with full content."""
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    return {
        "id": jd.id,
        "position_title": jd.position_title,
        "description": jd.description,
        "requirements": jd.requirements,
        "preferred_qualifications": jd.preferred_qualifications,
        "responsibilities": jd.responsibilities,
        "skills_tags": jd.skills_tags,
        "company_position": jd.company_position,
        "status": jd.status,
        "file_upload_id": jd.file_upload_id,
        "created_by": jd.created_by,
        "approved_by": jd.approved_by,
        "created_at": jd.created_at.isoformat() if jd.created_at else None,
        "updated_at": jd.updated_at.isoformat() if jd.updated_at else None,
    }


@router.post("/job-descriptions")
def create_job_description(
    data: JobDescriptionCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a new job description (HR only)."""
    # Check for duplicate title
    existing = db.query(models.JobDescription).filter(
        func.lower(models.JobDescription.position_title) == func.lower(data.position_title)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A job description with this position title already exists")

    jd = models.JobDescription(
        position_title=data.position_title,
        description=data.description,
        requirements=data.requirements,
        preferred_qualifications=data.preferred_qualifications,
        responsibilities=data.responsibilities,
        skills_tags=data.skills_tags,
        company_position=data.company_position,
        status=data.status,
        created_by=current_user.id,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)

    return {"message": "Job description created", "id": jd.id}


@router.patch("/job-descriptions/{jd_id}")
def update_job_description(
    jd_id: int,
    data: JobDescriptionUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update a job description."""
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(jd, key, value)

    db.commit()
    return {"message": "Job description updated"}


@router.patch("/job-descriptions/{jd_id}/approve")
def approve_job_description(
    jd_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Approve a pending job description (HR only)."""
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    if jd.status != "Pending Approval":
        raise HTTPException(status_code=400, detail="Job description is not pending approval")

    jd.status = "Active"
    jd.approved_by = current_user.id
    db.commit()
    return {"message": "Job description approved"}


@router.post("/job-descriptions/upload")
async def upload_job_description(
    position_title: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Upload a JD document (PDF/DOCX), extract text, and create a job description record."""
    import uuid

    # Check for duplicate title
    existing = db.query(models.JobDescription).filter(
        func.lower(models.JobDescription.position_title) == func.lower(position_title)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A job description with this position title already exists")

    # Save file
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
        upload_source="job_description",
        uploaded_by=str(current_user.id),
        status="completed",
    )
    db.add(file_record)
    db.flush()

    # Extract text from document
    extracted_text = None
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
        pass  # Text extraction is best-effort

    jd = models.JobDescription(
        position_title=position_title,
        description=extracted_text,
        file_upload_id=file_record.id,
        status="Active",
        created_by=current_user.id,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)

    return {"message": "Job description uploaded and created", "id": jd.id}


# ============================================================================
# RESUME ANALYSIS ENDPOINTS
# ============================================================================

@router.get("/applications/{app_id}/resume-analysis")
def get_resume_analysis(
    app_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get AI resume analysis for an application."""
    analysis = db.query(models.ResumeAnalysis).filter(
        models.ResumeAnalysis.application_id == app_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Resume analysis not found")

    return {
        "id": analysis.id,
        "application_id": analysis.application_id,
        "overall_score": analysis.overall_score,
        "skills_match_score": analysis.skills_match_score,
        "experience_match_score": analysis.experience_match_score,
        "education_match_score": analysis.education_match_score,
        "strengths": analysis.strengths,
        "weaknesses": analysis.weaknesses,
        "red_flags": analysis.red_flags,
        "suggested_questions": analysis.suggested_questions,
        "summary": analysis.summary,
        "threshold_score": analysis.threshold_score,
        "threshold_label": analysis.threshold_label,
        "status": analysis.status,
        "error_message": analysis.error_message,
        "resume_text_length": analysis.resume_text_length,
        "job_description_length": analysis.job_description_length,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
    }


@router.post("/applications/{app_id}/resume-analysis/retry")
def retry_resume_analysis(
    app_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Re-trigger a failed resume analysis."""
    # Delete existing failed analysis so it can be recreated
    existing = db.query(models.ResumeAnalysis).filter(
        models.ResumeAnalysis.application_id == app_id
    ).first()
    if existing and existing.status in ("Failed", "No Resume"):
        db.delete(existing)
        db.commit()

    analysis = resume_analysis_service.analyze_resume(db, app_id)
    if not analysis:
        raise HTTPException(status_code=400, detail="Could not run analysis")

    return {
        "message": "Resume analysis retriggered",
        "status": analysis.status,
        "overall_score": analysis.overall_score,
        "threshold_label": analysis.threshold_label,
    }


# ============================================================================
# REQUISITION ENDPOINTS
# ============================================================================

@router.get("/requisitions")
def list_requisitions(
    status: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List job requisitions with optional filters."""
    query = db.query(models.JobRequisition)

    if status:
        query = query.filter(models.JobRequisition.status == status)
    if department:
        query = query.filter(models.JobRequisition.department == department)
    if search:
        query = query.filter(
            or_(
                models.JobRequisition.title.ilike(f"%{search}%"),
                models.JobRequisition.requisition_id.ilike(f"%{search}%"),
            )
        )

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
                "location": r.location,
                "remote_type": r.remote_type,
                "employment_type": r.employment_type,
                "status": r.status,
                "openings": r.openings,
                "filled_count": r.filled_count,
                "salary_min": r.salary_min,
                "salary_max": r.salary_max,
                "job_description_id": r.job_description_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requisitions
        ],
    }


@router.post("/requisitions")
def create_requisition(
    data: RequisitionCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a new job requisition."""
    from datetime import date

    req = models.JobRequisition(
        requisition_id=recruiting_service.generate_requisition_id(db),
        title=data.title,
        department=data.department,
        team=data.team,
        cost_center=data.cost_center,
        location=data.location,
        remote_type=data.remote_type,
        employment_type=data.employment_type,
        position_type=data.position_type,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        wage_type=data.wage_type,
        show_salary_on_posting=data.show_salary_on_posting,
        openings=data.openings,
        is_internal_only=data.is_internal_only,
        internal_visibility=data.internal_visibility,
        internal_visibility_teams=data.internal_visibility_teams,
        replacing_employee_id=data.replacing_employee_id,
        pipeline_template_id=data.pipeline_template_id,
        job_description_id=data.job_description_id,
        description=data.description,
        requirements=data.requirements,
        preferred_qualifications=data.preferred_qualifications,
        responsibilities=data.responsibilities,
        benefits_summary=data.benefits_summary,
        eeo_job_category=data.eeo_job_category,
        target_start_date=date.fromisoformat(data.target_start_date) if data.target_start_date else None,
        target_fill_date=date.fromisoformat(data.target_fill_date) if data.target_fill_date else None,
        hiring_manager_id=data.hiring_manager_id,
        recruiter_id=data.recruiter_id,
        notes=data.notes,
        requested_by=current_user.id,
        status="Draft",
    )
    db.add(req)
    db.flush()

    # Auto-create lifecycle stages
    try:
        lifecycle_service.create_lifecycle_for_requisition(db, req.id)
    except Exception:
        pass  # Don't fail requisition creation if lifecycle fails

    db.commit()
    db.refresh(req)

    return {"message": "Requisition created", "id": req.id, "requisition_id": req.requisition_id}


@router.get("/requisitions/{req_id}")
def get_requisition(
    req_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get a single requisition with full details."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    postings = db.query(models.JobPosting).filter(models.JobPosting.requisition_id == req.id).all()
    app_count = db.query(models.Application).filter(models.Application.requisition_id == req.id).count()

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
        "salary_min": req.salary_min,
        "salary_max": req.salary_max,
        "wage_type": req.wage_type,
        "show_salary_on_posting": req.show_salary_on_posting,
        "openings": req.openings,
        "filled_count": req.filled_count,
        "status": req.status,
        "is_internal_only": req.is_internal_only,
        "internal_visibility": req.internal_visibility,
        "internal_visibility_teams": req.internal_visibility_teams,
        "replacing_employee_id": req.replacing_employee_id,
        "pipeline_template_id": req.pipeline_template_id,
        "description": req.description,
        "requirements": req.requirements,
        "preferred_qualifications": req.preferred_qualifications,
        "responsibilities": req.responsibilities,
        "benefits_summary": req.benefits_summary,
        "eeo_job_category": req.eeo_job_category,
        "target_start_date": req.target_start_date.isoformat() if req.target_start_date else None,
        "target_fill_date": req.target_fill_date.isoformat() if req.target_fill_date else None,
        "hiring_manager_id": req.hiring_manager_id,
        "hiring_manager_name": req.hiring_manager.full_name if req.hiring_manager_id and hasattr(req, 'hiring_manager') and req.hiring_manager else None,
        "recruiter_id": req.recruiter_id,
        "recruiter_name": req.recruiter.full_name if req.recruiter_id and hasattr(req, 'recruiter') and req.recruiter else None,
        "notes": req.notes,
        "posting_channels": getattr(req, 'posting_channels', None),
        "skills_tags": getattr(req, 'skills_tags', None),
        "urgency": getattr(req, 'urgency', None),
        "target_salary": getattr(req, 'target_salary', None),
        "position_supervisor": getattr(req, 'position_supervisor', None),
        "visibility_user_ids": getattr(req, 'visibility_user_ids', None),
        "request_source": getattr(req, 'request_source', None),
        "requires_early_tech_screen": getattr(req, 'requires_early_tech_screen', False),
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "postings": [
            {
                "id": p.id,
                "posting_id": p.posting_id,
                "title": p.title,
                "channel": p.channel,
                "status": p.status,
                "slug": p.slug,
                "application_count": p.application_count,
                "published_at": p.published_at.isoformat() if p.published_at else None,
            }
            for p in postings
        ],
        "application_count": app_count,
    }


@router.put("/requisitions/{req_id}")
def update_requisition(
    req_id: int,
    data: RequisitionUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update a requisition."""
    from datetime import date

    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("job_description_id", None)
    for field in ("target_start_date", "target_fill_date"):
        if field in update_data and update_data[field]:
            update_data[field] = date.fromisoformat(update_data[field])

    for key, value in update_data.items():
        setattr(req, key, value)

    db.commit()
    return {"message": "Requisition updated"}


@router.patch("/requisitions/{req_id}/status")
def change_requisition_status(
    req_id: int,
    data: StatusChange,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Change requisition status with validation."""
    VALID_STATUSES = {"Draft", "Pending Approval", "Approved", "Open", "On Hold", "Filled", "Cancelled"}
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    old_status = req.status
    req.status = data.status

    if data.status == "Approved" and not req.approved_by:
        req.approved_by = current_user.id

    # Auto-advance lifecycle stages based on status transitions
    status_to_stage_key = {
        "Open": "position_posted",
    }
    stage_key = status_to_stage_key.get(data.status)
    if stage_key:
        try:
            lifecycle_service.auto_advance_by_key(db, req.id, stage_key, current_user.id)
        except Exception:
            pass

    db.commit()
    return {"message": f"Status changed from '{old_status}' to '{data.status}'"}


@router.get("/requisitions/{req_id}/applications")
def list_requisition_applications(
    req_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List applications for a specific requisition."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    query = db.query(models.Application).filter(
        models.Application.requisition_id == req_id
    ).options(
        joinedload(models.Application.applicant),
        joinedload(models.Application.resume_analysis),
    )

    if status:
        query = query.filter(models.Application.status == status)

    total = query.count()
    apps = query.order_by(models.Application.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "applications": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "applicant": {
                    "id": a.applicant.id,
                    "name": f"{a.applicant.first_name} {a.applicant.last_name}",
                    "email": a.applicant.email,
                },
                "status": a.status,
                "source": a.source,
                "overall_rating": a.overall_rating,
                "is_favorite": a.is_favorite,
                "is_internal_transfer": a.is_internal_transfer,
                "resume_analysis_score": a.resume_analysis.overall_score if a.resume_analysis else None,
                "resume_analysis_label": a.resume_analysis.threshold_label if a.resume_analysis else None,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in apps
        ],
    }


@router.post("/requisitions/{req_id}/applications")
async def create_application_for_requisition(
    req_id: int,
    background_tasks: BackgroundTasks,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    source: str = Form("Applicant Pool"),
    cover_letter: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Add an applicant and create an application for a requisition."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    # Find or create applicant by email
    applicant = db.query(models.Applicant).filter(
        func.lower(models.Applicant.email) == email.strip().lower()
    ).first()

    if not applicant:
        # Generate applicant ID
        max_app = db.query(func.max(models.Applicant.id)).scalar() or 0
        applicant_id = f"APP-{datetime.now().year}-{str(max_app + 1).zfill(5)}"
        applicant = models.Applicant(
            applicant_id=applicant_id,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email.strip(),
            phone=phone.strip() if phone else None,
            source=source,
        )
        db.add(applicant)
        db.flush()

    # Save resume file if provided
    resume_file_id = None
    if resume and resume.filename:
        from app.services.file_upload_service import FileUploadService
        try:
            file_record = await FileUploadService.upload_and_validate(
                upload_file=resume,
                uploaded_by=current_user.username,
                db=db,
                file_category="resume",
            )
            resume_file_id = file_record.id
        except Exception:
            pass  # Non-critical — application can proceed without resume

    # Generate application ID
    max_application = db.query(func.max(models.Application.id)).scalar() or 0
    application_id = f"APPLICATION-{datetime.now().year}-{str(max_application + 1).zfill(5)}"

    # Get first pipeline stage if available
    first_stage = None
    if req.pipeline_template_id:
        first_stage = db.query(models.PipelineStage).filter(
            models.PipelineStage.template_id == req.pipeline_template_id,
        ).order_by(models.PipelineStage.stage_order).first()

    application = models.Application(
        application_id=application_id,
        applicant_id=applicant.id,
        requisition_id=req_id,
        status="New",
        source=source,
        cover_letter=cover_letter,
        resume_file_id=resume_file_id,
        current_stage_id=first_stage.id if first_stage else None,
        submitted_at=datetime.utcnow(),
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Trigger AI resume analysis in background if resume was uploaded
    if resume_file_id:
        background_tasks.add_task(_run_resume_analysis, application.id)

    return {
        "id": application.id,
        "application_id": application.application_id,
        "applicant_id": applicant.id,
        "status": application.status,
    }


def _run_resume_analysis(application_id: int):
    """Background task: run AI resume analysis with its own DB session."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from app.db.database import SessionLocal
        from app.services.resume_analysis_service import resume_analysis_service
        db = SessionLocal()
        try:
            resume_analysis_service.analyze_resume(db, application_id)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Background resume analysis failed for app {application_id}: {e}")


# ============================================================================
# POSTING ENDPOINTS
# ============================================================================

@router.get("/postings")
def list_postings(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List job postings."""
    query = db.query(models.JobPosting)
    if status:
        query = query.filter(models.JobPosting.status == status)
    if channel:
        query = query.filter(models.JobPosting.channel == channel)

    total = query.count()
    postings = query.order_by(models.JobPosting.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "postings": [
            {
                "id": p.id,
                "posting_id": p.posting_id,
                "requisition_id": p.requisition_id,
                "title": p.title,
                "channel": p.channel,
                "is_internal": p.is_internal,
                "status": p.status,
                "slug": p.slug,
                "view_count": p.view_count,
                "application_count": p.application_count,
                "published_at": p.published_at.isoformat() if p.published_at else None,
                "closes_at": p.closes_at.isoformat() if p.closes_at else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in postings
        ],
    }


@router.post("/postings")
def create_posting(
    data: PostingCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a job posting from a requisition."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == data.requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    title = data.title or req.title
    slug = recruiting_service.generate_slug(db, title)

    posting = models.JobPosting(
        posting_id=recruiting_service.generate_posting_id(db),
        requisition_id=data.requisition_id,
        title=title,
        description_html=data.description_html or req.description,
        short_description=data.short_description,
        channel=data.channel,
        is_internal=data.is_internal,
        allow_easy_apply=data.allow_easy_apply,
        requires_resume=data.requires_resume,
        requires_cover_letter=data.requires_cover_letter,
        custom_questions=data.custom_questions,
        tags=data.tags,
        slug=slug,
        closes_at=datetime.fromisoformat(data.closes_at) if data.closes_at else None,
        created_by=current_user.id,
        status="Draft",
    )
    db.add(posting)
    db.commit()
    db.refresh(posting)

    return {"message": "Posting created", "id": posting.id, "posting_id": posting.posting_id, "slug": slug}


@router.put("/postings/{posting_id}")
def update_posting(
    posting_id: int,
    data: PostingUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update a job posting."""
    posting = db.query(models.JobPosting).filter(models.JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    update_data = data.model_dump(exclude_unset=True)
    if "closes_at" in update_data and update_data["closes_at"]:
        update_data["closes_at"] = datetime.fromisoformat(update_data["closes_at"])

    for key, value in update_data.items():
        setattr(posting, key, value)

    db.commit()
    return {"message": "Posting updated"}


@router.patch("/postings/{posting_id}/publish")
def publish_posting(
    posting_id: int,
    data: StatusChange,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Publish, pause, or close a posting."""
    VALID = {"Published", "Paused", "Closed"}
    if data.status not in VALID:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID)}")

    posting = db.query(models.JobPosting).filter(models.JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    posting.status = data.status
    if data.status == "Published" and not posting.published_at:
        posting.published_at = datetime.utcnow()
    elif data.status == "Closed":
        posting.closed_at = datetime.utcnow()

    db.commit()
    return {"message": f"Posting status changed to '{data.status}'"}


# ============================================================================
# DASHBOARD
# ============================================================================

@router.get("/dashboard")
def recruiting_dashboard(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Recruiting dashboard overview stats."""
    open_reqs = db.query(models.JobRequisition).filter(
        models.JobRequisition.status.in_(["Open", "Approved"])
    ).count()

    active_postings = db.query(models.JobPosting).filter(
        models.JobPosting.status == "Published"
    ).count()

    total_apps = db.query(models.Application).count()
    new_apps = db.query(models.Application).filter(models.Application.status == "New").count()

    apps_by_status = dict(
        db.query(models.Application.status, func.count(models.Application.id))
        .group_by(models.Application.status).all()
    )

    recent_apps = db.query(models.Application).options(
        joinedload(models.Application.applicant),
        joinedload(models.Application.requisition),
    ).order_by(models.Application.created_at.desc()).limit(10).all()

    return {
        "open_requisitions": open_reqs,
        "active_postings": active_postings,
        "total_applications": total_apps,
        "new_applications": new_apps,
        "applications_by_status": apps_by_status,
        "recent_applications": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "requisition_id": a.requisition_id,
                "applicant_name": f"{a.applicant.first_name} {a.applicant.last_name}" if a.applicant else "Unknown",
                "requisition_title": a.requisition.title if a.requisition else "Unknown",
                "status": a.status,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            }
            for a in recent_apps
        ],
    }


# ============================================================================
# PIPELINE TEMPLATE ENDPOINTS (Phase 2)
# ============================================================================

class PipelineStageSchema(BaseModel):
    name: str
    stage_type: str = "custom"
    order_index: int
    is_required: bool = True
    auto_advance: bool = False
    scorecard_template: Optional[dict] = None
    days_sla: Optional[int] = None


class PipelineTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    stages: List[PipelineStageSchema] = []


class PipelineTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    stages: Optional[List[PipelineStageSchema]] = None


class StageAdvance(BaseModel):
    stage_id: int
    notes: Optional[str] = None


class RejectApplication(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None


class ScorecardCreate(BaseModel):
    application_id: int
    stage_id: Optional[int] = None
    interviewer_id: int
    due_date: Optional[str] = None


class ScorecardSubmit(BaseModel):
    overall_rating: float = Field(ge=1.0, le=5.0)
    recommendation: str
    criteria_ratings: Optional[list] = None
    strengths: Optional[str] = None
    concerns: Optional[str] = None
    additional_notes: Optional[str] = None


class InterviewCreate(BaseModel):
    application_id: int
    stage_id: Optional[int] = None
    scheduled_at: str
    duration_minutes: int = 60
    time_zone: Optional[str] = None
    format: str = "Video"
    location: Optional[str] = None
    video_link: Optional[str] = None
    interviewers: Optional[list] = None


class InterviewUpdate(BaseModel):
    scheduled_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    time_zone: Optional[str] = None
    format: Optional[str] = None
    location: Optional[str] = None
    video_link: Optional[str] = None
    interviewers: Optional[list] = None


@router.get("/pipeline-templates")
def list_pipeline_templates(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List all pipeline templates."""
    templates = db.query(models.PipelineTemplate).order_by(
        models.PipelineTemplate.is_default.desc(),
        models.PipelineTemplate.name,
    ).all()

    return {
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "is_default": t.is_default,
                "is_active": t.is_active,
                "stage_count": len(t.stages),
                "stages": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "stage_type": s.stage_type,
                        "order_index": s.order_index,
                        "is_required": s.is_required,
                        "auto_advance": s.auto_advance,
                        "scorecard_template": s.scorecard_template,
                        "days_sla": s.days_sla,
                    }
                    for s in sorted(t.stages, key=lambda s: s.order_index)
                ],
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ],
    }


@router.post("/pipeline-templates")
def create_pipeline_template(
    data: PipelineTemplateCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a new pipeline template with stages."""
    # If setting as default, unset other defaults
    if data.is_default:
        db.query(models.PipelineTemplate).filter(
            models.PipelineTemplate.is_default == True
        ).update({"is_default": False})

    template = models.PipelineTemplate(
        name=data.name,
        description=data.description,
        is_default=data.is_default,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(template)
    db.flush()

    for stage_data in data.stages:
        stage = models.PipelineStage(
            template_id=template.id,
            name=stage_data.name,
            stage_type=stage_data.stage_type,
            order_index=stage_data.order_index,
            is_required=stage_data.is_required,
            auto_advance=stage_data.auto_advance,
            scorecard_template=stage_data.scorecard_template,
            days_sla=stage_data.days_sla,
        )
        db.add(stage)

    db.commit()
    return {"message": "Pipeline template created", "id": template.id}


@router.get("/pipeline-templates/{template_id}")
def get_pipeline_template(
    template_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get a single pipeline template with its stages."""
    template = db.query(models.PipelineTemplate).filter(
        models.PipelineTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Pipeline template not found")

    # Count requisitions using this template
    req_count = db.query(models.JobRequisition).filter(
        models.JobRequisition.pipeline_template_id == template_id
    ).count()

    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "is_default": template.is_default,
        "is_active": template.is_active,
        "requisitions_using": req_count,
        "stages": [
            {
                "id": s.id,
                "name": s.name,
                "stage_type": s.stage_type,
                "order_index": s.order_index,
                "is_required": s.is_required,
                "auto_advance": s.auto_advance,
                "scorecard_template": s.scorecard_template,
                "days_sla": s.days_sla,
            }
            for s in sorted(template.stages, key=lambda s: s.order_index)
        ],
        "created_at": template.created_at.isoformat() if template.created_at else None,
    }


@router.put("/pipeline-templates/{template_id}")
def update_pipeline_template(
    template_id: int,
    data: PipelineTemplateUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update a pipeline template and optionally replace its stages."""
    template = db.query(models.PipelineTemplate).filter(
        models.PipelineTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Pipeline template not found")

    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.is_active is not None:
        template.is_active = data.is_active
    if data.is_default is not None:
        if data.is_default:
            db.query(models.PipelineTemplate).filter(
                models.PipelineTemplate.is_default == True,
                models.PipelineTemplate.id != template_id,
            ).update({"is_default": False})
        template.is_default = data.is_default

    # Replace stages if provided
    if data.stages is not None:
        # Delete existing stages
        db.query(models.PipelineStage).filter(
            models.PipelineStage.template_id == template_id
        ).delete()

        for stage_data in data.stages:
            stage = models.PipelineStage(
                template_id=template_id,
                name=stage_data.name,
                stage_type=stage_data.stage_type,
                order_index=stage_data.order_index,
                is_required=stage_data.is_required,
                auto_advance=stage_data.auto_advance,
                scorecard_template=stage_data.scorecard_template,
                days_sla=stage_data.days_sla,
            )
            db.add(stage)

    db.commit()
    return {"message": "Pipeline template updated"}


@router.delete("/pipeline-templates/{template_id}")
def delete_pipeline_template(
    template_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_ADMIN,
    )),
    db: Session = Depends(get_db),
):
    """Delete a pipeline template (only if not in use)."""
    template = db.query(models.PipelineTemplate).filter(
        models.PipelineTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Pipeline template not found")

    req_count = db.query(models.JobRequisition).filter(
        models.JobRequisition.pipeline_template_id == template_id
    ).count()
    if req_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete template in use by {req_count} requisition(s)"
        )

    db.query(models.PipelineStage).filter(
        models.PipelineStage.template_id == template_id
    ).delete()
    db.delete(template)
    db.commit()
    return {"message": "Pipeline template deleted"}


@router.post("/pipeline-templates/seed-default")
def seed_default_template(
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_ADMIN,
    )),
    db: Session = Depends(get_db),
):
    """Seed the default Standard Hiring Pipeline template."""
    template = pipeline_service.seed_default_pipeline(db)
    db.commit()
    return {"message": "Default pipeline seeded", "id": template.id if template else None}


# ============================================================================
# APPLICATION MANAGEMENT ENDPOINTS (Phase 2)
# ============================================================================

@router.get("/applications")
def list_applications(
    status: Optional[str] = None,
    requisition_id: Optional[int] = None,
    search: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Global application list with filters."""
    query = db.query(models.Application).options(
        joinedload(models.Application.applicant),
        joinedload(models.Application.requisition),
        joinedload(models.Application.current_stage),
    )

    if status:
        query = query.filter(models.Application.status == status)
    if requisition_id:
        query = query.filter(models.Application.requisition_id == requisition_id)
    if is_favorite is not None:
        query = query.filter(models.Application.is_favorite == is_favorite)
    if search:
        query = query.join(models.Applicant).filter(
            or_(
                (models.Applicant.first_name + " " + models.Applicant.last_name).ilike(f"%{search}%"),
                models.Applicant.email.ilike(f"%{search}%"),
                models.Application.application_id.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    apps = query.order_by(models.Application.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "applications": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "applicant": {
                    "id": a.applicant.id,
                    "name": f"{a.applicant.first_name} {a.applicant.last_name}",
                    "email": a.applicant.email,
                },
                "requisition": {
                    "id": a.requisition.id,
                    "title": a.requisition.title,
                    "department": a.requisition.department,
                } if a.requisition else None,
                "status": a.status,
                "current_stage": {
                    "id": a.current_stage.id,
                    "name": a.current_stage.name,
                } if a.current_stage else None,
                "source": a.source,
                "overall_rating": a.overall_rating,
                "is_favorite": a.is_favorite,
                "is_internal_transfer": a.is_internal_transfer,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in apps
        ],
    }


@router.get("/applications/{app_id}")
def get_application_detail(
    app_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Full application detail: profile, timeline, scorecards, interviews, documents."""
    app = db.query(models.Application).options(
        joinedload(models.Application.applicant),
        joinedload(models.Application.requisition),
        joinedload(models.Application.posting),
        joinedload(models.Application.current_stage),
    ).filter(models.Application.id == app_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get pipeline stages for this requisition's template
    pipeline_stages = []
    if app.requisition and app.requisition.pipeline_template_id:
        stages = db.query(models.PipelineStage).filter(
            models.PipelineStage.template_id == app.requisition.pipeline_template_id
        ).order_by(models.PipelineStage.order_index).all()
        pipeline_stages = [
            {
                "id": s.id,
                "name": s.name,
                "stage_type": s.stage_type,
                "order_index": s.order_index,
                "is_required": s.is_required,
                "scorecard_template": s.scorecard_template,
                "days_sla": s.days_sla,
                "completion": pipeline_service.get_stage_completion_status(db, app.id, s.id),
            }
            for s in stages
        ]

    # Get activities
    activities = db.query(models.ApplicationActivity).filter(
        models.ApplicationActivity.application_id == app_id,
    ).order_by(models.ApplicationActivity.created_at.desc()).limit(50).all()

    # Get scorecards
    scorecards = db.query(models.InterviewScorecard).options(
        joinedload(models.InterviewScorecard.interviewer),
        joinedload(models.InterviewScorecard.stage),
    ).filter(
        models.InterviewScorecard.application_id == app_id,
    ).all()

    # Get interviews
    interviews = db.query(models.Interview).options(
        joinedload(models.Interview.stage),
    ).filter(
        models.Interview.application_id == app_id,
    ).order_by(models.Interview.scheduled_at).all()

    # Stage history
    stage_history = db.query(models.ApplicationStageHistory).options(
        joinedload(models.ApplicationStageHistory.stage),
        joinedload(models.ApplicationStageHistory.moved_by_user),
    ).filter(
        models.ApplicationStageHistory.application_id == app_id,
    ).order_by(models.ApplicationStageHistory.entered_at).all()

    # Resolve hiring team from requisition
    hiring_team = []
    if app.requisition:
        req = app.requisition
        if req.hiring_manager_id:
            hm = db.query(models.User).filter(models.User.id == req.hiring_manager_id).first()
            if hm:
                hiring_team.append({"user_id": hm.id, "full_name": hm.full_name, "email": hm.email, "role": "Hiring Manager"})
        if req.recruiter_id:
            rec = db.query(models.User).filter(models.User.id == req.recruiter_id).first()
            if rec:
                hiring_team.append({"user_id": rec.id, "full_name": rec.full_name, "email": rec.email, "role": "Recruiter"})
        visibility_ids = req.visibility_user_ids or []
        if visibility_ids:
            existing_ids = {m["user_id"] for m in hiring_team}
            stakeholder_ids = [uid for uid in visibility_ids if uid not in existing_ids]
            if stakeholder_ids:
                stakeholders = db.query(models.User).filter(models.User.id.in_(stakeholder_ids)).all()
                for s in stakeholders:
                    hiring_team.append({"user_id": s.id, "full_name": s.full_name, "email": s.email, "role": "Stakeholder"})

    return {
        "id": app.id,
        "application_id": app.application_id,
        "status": app.status,
        "applicant": {
            "id": app.applicant.id,
            "applicant_id": app.applicant.applicant_id,
            "name": f"{app.applicant.first_name} {app.applicant.last_name}",
            "first_name": app.applicant.first_name,
            "last_name": app.applicant.last_name,
            "email": app.applicant.email,
            "phone": app.applicant.phone,
            "linkedin_url": app.applicant.linkedin_url,
            "portfolio_url": app.applicant.portfolio_url,
            "current_employer": app.applicant.current_employer,
            "current_title": app.applicant.current_title,
            "years_of_experience": app.applicant.years_of_experience,
            "is_internal": app.applicant.is_internal,
            "source": app.applicant.source,
        },
        "requisition": {
            "id": app.requisition.id,
            "requisition_id": app.requisition.requisition_id,
            "title": app.requisition.title,
            "department": app.requisition.department,
            "location": app.requisition.location,
        } if app.requisition else None,
        "hiring_team": hiring_team,
        "posting": {
            "id": app.posting.id,
            "title": app.posting.title,
            "channel": app.posting.channel,
        } if app.posting else None,
        "current_stage": {
            "id": app.current_stage.id,
            "name": app.current_stage.name,
            "stage_type": app.current_stage.stage_type,
        } if app.current_stage else None,
        "pipeline_stages": pipeline_stages,
        "cover_letter": app.cover_letter,
        "custom_answers": app.custom_answers,
        "source": app.source,
        "overall_rating": app.overall_rating,
        "is_favorite": app.is_favorite,
        "is_internal_transfer": app.is_internal_transfer,
        "rejection_reason": app.rejection_reason,
        "rejection_notes": app.rejection_notes,
        "rejected_at": app.rejected_at.isoformat() if app.rejected_at else None,
        "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "activities": [
            {
                "id": act.id,
                "activity_type": act.activity_type,
                "description": act.description,
                "details": act.details,
                "is_internal": act.is_internal,
                "created_at": act.created_at.isoformat() if act.created_at else None,
                "performed_by": act.performed_by_user.full_name if act.performed_by_user else None,
            }
            for act in activities
        ],
        "scorecards": [
            {
                "id": sc.id,
                "stage": {"id": sc.stage.id, "name": sc.stage.name} if sc.stage else None,
                "interviewer": {
                    "id": sc.interviewer.id,
                    "name": sc.interviewer.full_name,
                } if sc.interviewer else None,
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
            for sc in scorecards
        ],
        "interviews": [
            {
                "id": iv.id,
                "interview_id": iv.interview_id,
                "stage": {"id": iv.stage.id, "name": iv.stage.name} if iv.stage else None,
                "scheduled_at": iv.scheduled_at.isoformat() if iv.scheduled_at else None,
                "duration_minutes": iv.duration_minutes,
                "format": iv.format,
                "location": iv.location,
                "video_link": iv.video_link,
                "interviewers": iv.interviewers,
                "status": iv.status,
                "calendar_event_id": iv.calendar_event_id,
                "calendar_provider": iv.calendar_provider,
                "meeting_link_auto": iv.meeting_link_auto,
                "ics_sent": iv.ics_sent,
            }
            for iv in interviews
        ],
        "stage_history": [
            {
                "id": sh.id,
                "stage": {"id": sh.stage.id, "name": sh.stage.name} if sh.stage else None,
                "entered_at": sh.entered_at.isoformat() if sh.entered_at else None,
                "exited_at": sh.exited_at.isoformat() if sh.exited_at else None,
                "outcome": sh.outcome,
                "moved_by": sh.moved_by_user.full_name if sh.moved_by_user else None,
                "notes": sh.notes,
            }
            for sh in stage_history
        ],
    }


@router.patch("/applications/{app_id}/stage")
def advance_application_stage(
    app_id: int,
    data: StageAdvance,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Move an application to a different pipeline stage."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status in ("Rejected", "Withdrawn", "Hired"):
        raise HTTPException(status_code=400, detail=f"Cannot advance application with status '{app.status}'")

    # Verify stage exists
    stage = db.query(models.PipelineStage).filter(models.PipelineStage.id == data.stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Pipeline stage not found")

    pipeline_service.advance_to_stage(db, app, data.stage_id, current_user.id, data.notes)

    # Update status based on stage type
    stage_status_map = {
        "application_review": "Screening",
        "phone_screen": "Screening",
        "interview": "Interview",
        "assessment": "Interview",
        "reference_check": "Interview",
        "offer": "Offer",
    }
    new_status = stage_status_map.get(stage.stage_type, app.status)
    if new_status != app.status:
        app.status = new_status
        app.status_changed_at = datetime.utcnow()
        app.status_changed_by = current_user.id

    db.commit()
    return {"message": f"Application moved to stage '{stage.name}'"}


@router.patch("/applications/{app_id}/reject")
def reject_application(
    app_id: int,
    data: RejectApplication,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Reject an application."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status in ("Rejected", "Hired"):
        raise HTTPException(status_code=400, detail=f"Cannot reject application with status '{app.status}'")

    pipeline_service.reject_application(db, app, current_user.id, data.reason, data.notes)
    db.commit()
    return {"message": "Application rejected"}


@router.patch("/applications/{app_id}/favorite")
def toggle_favorite(
    app_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Toggle favorite status on an application."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.is_favorite = not app.is_favorite
    db.commit()
    return {"message": f"Application {'favorited' if app.is_favorite else 'unfavorited'}", "is_favorite": app.is_favorite}


@router.delete("/applications/{app_id}")
def delete_application(
    app_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Remove an application and its related records."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Delete related records
    db.query(models.ApplicationActivity).filter(
        models.ApplicationActivity.application_id == app_id
    ).delete()
    db.query(models.ApplicationStageHistory).filter(
        models.ApplicationStageHistory.application_id == app_id
    ).delete()
    db.query(models.ApplicantDocument).filter(
        models.ApplicantDocument.application_id == app_id
    ).delete()
    if hasattr(models, 'InterviewScorecard'):
        db.query(models.InterviewScorecard).filter(
            models.InterviewScorecard.application_id == app_id
        ).delete()
    if hasattr(models, 'ResumeAnalysis'):
        db.query(models.ResumeAnalysis).filter(
            models.ResumeAnalysis.application_id == app_id
        ).delete()

    db.delete(app)
    db.commit()
    return {"message": "Application removed"}


# ============================================================================
# SCORECARD ENDPOINTS (Phase 2)
# ============================================================================

@router.post("/scorecards")
def create_scorecard(
    data: ScorecardCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Assign a scorecard to an interviewer for a specific stage."""
    # Verify application exists
    app = db.query(models.Application).filter(models.Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    stage = None
    if data.stage_id:
        stage = db.query(models.PipelineStage).filter(models.PipelineStage.id == data.stage_id).first()
        if not stage:
            raise HTTPException(status_code=404, detail="Pipeline stage not found")

    due_date = datetime.fromisoformat(data.due_date) if data.due_date else None

    # Get scorecard criteria from stage template
    criteria_template = None
    if stage and stage.scorecard_template and "criteria" in stage.scorecard_template:
        criteria_template = [
            {"criteria": c["name"], "rating": None, "notes": ""}
            for c in stage.scorecard_template["criteria"]
        ]

    scorecard = pipeline_service.assign_scorecard(
        db, data.application_id, data.stage_id, data.interviewer_id,
        due_date=due_date, criteria_template=criteria_template,
    )
    db.commit()
    return {"message": "Scorecard assigned", "id": scorecard.id}


@router.get("/scorecards/{scorecard_id}")
def get_scorecard(
    scorecard_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get a single scorecard."""
    sc = db.query(models.InterviewScorecard).options(
        joinedload(models.InterviewScorecard.interviewer),
        joinedload(models.InterviewScorecard.stage),
        joinedload(models.InterviewScorecard.application).joinedload(models.Application.applicant),
    ).filter(models.InterviewScorecard.id == scorecard_id).first()

    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")

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
        "scorecard_template": sc.stage.scorecard_template if sc.stage else None,
    }


@router.put("/scorecards/{scorecard_id}")
def submit_scorecard(
    scorecard_id: int,
    data: ScorecardSubmit,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Submit or update a scorecard with ratings and feedback."""
    sc = db.query(models.InterviewScorecard).filter(
        models.InterviewScorecard.id == scorecard_id
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")

    valid_recommendations = {"Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"}
    if data.recommendation not in valid_recommendations:
        raise HTTPException(status_code=400, detail=f"Invalid recommendation. Must be one of: {', '.join(valid_recommendations)}")

    pipeline_service.submit_scorecard(
        db, sc,
        overall_rating=data.overall_rating,
        recommendation=data.recommendation,
        criteria_ratings=data.criteria_ratings,
        strengths=data.strengths,
        concerns=data.concerns,
        additional_notes=data.additional_notes,
    )
    db.commit()
    return {"message": "Scorecard submitted"}


# ============================================================================
# INTERVIEW ENDPOINTS (Phase 2)
# ============================================================================

@router.post("/interviews")
async def schedule_interview(
    data: InterviewCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Schedule an interview for an application.

    If the organizer has a calendar connection:
    - Creates a calendar event (with auto Teams/Meet link for Video format)
    - Generates and sends an .ics calendar invitation to the candidate
    """
    app = db.query(models.Application).filter(models.Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    stage = None
    stage_name = "Interview"
    if data.stage_id:
        stage = db.query(models.PipelineStage).filter(models.PipelineStage.id == data.stage_id).first()
        if not stage:
            raise HTTPException(status_code=404, detail="Pipeline stage not found")
        stage_name = stage.name

    scheduled_dt = datetime.fromisoformat(data.scheduled_at)

    interview = models.Interview(
        interview_id=recruiting_service.generate_interview_id(db),
        application_id=data.application_id,
        stage_id=data.stage_id,
        scheduled_at=scheduled_dt,
        duration_minutes=data.duration_minutes,
        time_zone=data.time_zone,
        format=data.format,
        location=data.location,
        video_link=data.video_link,
        interviewers=data.interviewers,
        organizer_id=current_user.id,
        status="Scheduled",
    )
    db.add(interview)

    # --- Calendar integration ---
    calendar_event_id = None
    calendar_provider = None
    auto_video_link = None

    conn = calendar_service.get_user_connection(db, current_user.id)
    if conn:
        provider = calendar_service.get_provider(conn.provider)
        access_token = await calendar_service.get_valid_access_token(db, conn) if provider else None

        if provider and access_token:
            try:
                # Get job title for the event subject
                job_title = ""
                if app.requisition:
                    job_title = app.requisition.title or ""

                # Gather attendee emails
                attendee_emails = []
                if data.interviewers:
                    for iv in data.interviewers:
                        if iv.get("user_id"):
                            user = db.query(models.User).filter(models.User.id == iv["user_id"]).first()
                            if user and user.email:
                                attendee_emails.append(user.email)

                event_req = CreateEventRequest(
                    subject=f"Interview: {job_title} - {stage_name}" if job_title else f"Interview - {stage_name}",
                    start=scheduled_dt,
                    end=scheduled_dt + __import__("datetime").timedelta(minutes=data.duration_minutes),
                    time_zone=data.time_zone or "UTC",
                    attendees=attendee_emails,
                    body=f"Interview for {job_title} position. Stage: {stage_name}.",
                    location=data.location,
                    create_video_meeting=(data.format == "Video"),
                )

                cal_event = await provider.create_event(access_token, event_req)
                calendar_event_id = cal_event.event_id
                calendar_provider = conn.provider

                # If provider auto-generated a video link, use it
                if cal_event.video_link:
                    auto_video_link = cal_event.video_link
                    interview.video_link = auto_video_link
                    interview.meeting_link_auto = True

                interview.calendar_event_id = calendar_event_id
                interview.calendar_provider = calendar_provider

            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Calendar event creation failed (non-blocking): {e}")

    # --- ICS generation + email ---
    try:
        # Get applicant info for the email
        applicant = app.applicant if app.applicant else None
        job_title = app.requisition.title if app.requisition else "Position"

        if applicant and applicant.email:
            ics_bytes = ics_service.generate_interview_ics(
                summary=f"Interview - {job_title}",
                description=f"Interview for {job_title} position. Stage: {stage_name}.",
                start=scheduled_dt,
                duration_minutes=data.duration_minutes,
                time_zone=data.time_zone or "UTC",
                location=data.location,
                video_link=interview.video_link,
                organizer_email=current_user.email if hasattr(current_user, "email") else None,
                organizer_name=current_user.full_name if hasattr(current_user, "full_name") else None,
                uid=f"interview-{interview.interview_id}@hr-dashboard",
            )

            interviewer_names = ", ".join([iv["name"] for iv in (data.interviewers or [])]) or None

            await recruiting_email_service.send_interview_invitation(
                to_email=applicant.email,
                applicant_name=applicant.first_name or applicant.name or "Candidate",
                job_title=job_title,
                interview_date=scheduled_dt.strftime("%B %d, %Y"),
                interview_time=scheduled_dt.strftime("%I:%M %p"),
                duration_minutes=data.duration_minutes,
                format=data.format,
                location=data.location,
                video_link=interview.video_link,
                interviewers=interviewer_names,
                ics_bytes=ics_bytes,
            )
            interview.ics_sent = True
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"ICS email sending failed (non-blocking): {e}")

    # Log activity
    recruiting_service.log_activity(
        db, data.application_id, "interview_scheduled",
        f"Interview scheduled: {stage_name} on {data.scheduled_at}",
        details={
            "stage_id": data.stage_id,
            "format": data.format,
            "scheduled_at": data.scheduled_at,
            "calendar_synced": calendar_event_id is not None,
        },
        performed_by=current_user.id,
        is_internal=False,
    )

    db.commit()
    db.refresh(interview)

    response = {
        "message": "Interview scheduled",
        "id": interview.id,
        "interview_id": interview.interview_id,
    }
    if auto_video_link:
        response["video_link"] = auto_video_link
        response["meeting_link_auto"] = True
    if calendar_event_id:
        response["calendar_synced"] = True
    if interview.ics_sent:
        response["ics_sent"] = True

    return response


@router.put("/interviews/{interview_id}")
async def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Reschedule or update an interview. Updates calendar event if synced."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    update_data = data.model_dump(exclude_unset=True)
    if "scheduled_at" in update_data and update_data["scheduled_at"]:
        update_data["scheduled_at"] = datetime.fromisoformat(update_data["scheduled_at"])

    for key, value in update_data.items():
        setattr(interview, key, value)

    # --- Update calendar event if synced ---
    if interview.calendar_event_id and interview.calendar_provider:
        conn = calendar_service.get_user_connection(db, current_user.id)
        if conn:
            provider = calendar_service.get_provider(conn.provider)
            access_token = await calendar_service.get_valid_access_token(db, conn) if provider else None
            if provider and access_token:
                try:
                    app = db.query(models.Application).filter(models.Application.id == interview.application_id).first()
                    job_title = app.requisition.title if app and app.requisition else "Position"

                    event_req = CreateEventRequest(
                        subject=f"Interview: {job_title}",
                        start=interview.scheduled_at,
                        end=interview.scheduled_at + __import__("datetime").timedelta(minutes=interview.duration_minutes),
                        time_zone=interview.time_zone or "UTC",
                        body=f"Interview for {job_title} (rescheduled).",
                        location=interview.location,
                    )
                    await provider.update_event(access_token, interview.calendar_event_id, event_req)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Calendar event update failed (non-blocking): {e}")

    # --- Re-send ICS to candidate ---
    try:
        app = db.query(models.Application).filter(models.Application.id == interview.application_id).first()
        applicant = app.applicant if app else None
        job_title = app.requisition.title if app and app.requisition else "Position"

        if applicant and applicant.email:
            ics_bytes = ics_service.generate_interview_ics(
                summary=f"Interview - {job_title} (Updated)",
                description=f"Interview rescheduled for {job_title}.",
                start=interview.scheduled_at,
                duration_minutes=interview.duration_minutes,
                time_zone=interview.time_zone or "UTC",
                location=interview.location,
                video_link=interview.video_link,
                organizer_email=current_user.email if hasattr(current_user, "email") else None,
                organizer_name=current_user.full_name if hasattr(current_user, "full_name") else None,
                uid=f"interview-{interview.interview_id}@hr-dashboard",
                sequence=1,
            )

            await recruiting_email_service.send_interview_invitation(
                to_email=applicant.email,
                applicant_name=applicant.first_name or applicant.name or "Candidate",
                job_title=job_title,
                interview_date=interview.scheduled_at.strftime("%B %d, %Y"),
                interview_time=interview.scheduled_at.strftime("%I:%M %p"),
                duration_minutes=interview.duration_minutes,
                format=interview.format or "Video",
                location=interview.location,
                video_link=interview.video_link,
                ics_bytes=ics_bytes,
            )
            interview.ics_sent = True
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Reschedule ICS email failed (non-blocking): {e}")

    recruiting_service.log_activity(
        db, interview.application_id, "interview_rescheduled",
        f"Interview updated",
        performed_by=current_user.id,
    )

    db.commit()
    return {"message": "Interview updated"}


@router.patch("/interviews/{interview_id}/cancel")
async def cancel_interview(
    interview_id: int,
    reason: Optional[str] = Query(None),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Cancel an interview. Deletes calendar event and sends cancellation ICS if synced."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status = "Cancelled"
    interview.cancelled_reason = reason

    # --- Delete calendar event if synced ---
    if interview.calendar_event_id and interview.calendar_provider:
        conn = calendar_service.get_user_connection(db, current_user.id)
        if conn:
            provider = calendar_service.get_provider(conn.provider)
            access_token = await calendar_service.get_valid_access_token(db, conn) if provider else None
            if provider and access_token:
                try:
                    await provider.delete_event(access_token, interview.calendar_event_id)
                    interview.calendar_event_id = None
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Calendar event deletion failed (non-blocking): {e}")

    # --- Send cancellation ICS to candidate ---
    try:
        app = db.query(models.Application).filter(models.Application.id == interview.application_id).first()
        applicant = app.applicant if app else None
        job_title = app.requisition.title if app and app.requisition else "Position"

        if applicant and applicant.email:
            cancel_ics = ics_service.generate_cancellation_ics(
                summary=f"Interview - {job_title}",
                start=interview.scheduled_at,
                duration_minutes=interview.duration_minutes,
                uid=f"interview-{interview.interview_id}@hr-dashboard",
                organizer_email=current_user.email if hasattr(current_user, "email") else None,
                organizer_name=current_user.full_name if hasattr(current_user, "full_name") else None,
            )

            await recruiting_email_service._send(
                to_email=applicant.email,
                subject=f"Interview Cancelled - {job_title}",
                body_html=f"""
                <h2>Interview Cancelled</h2>
                <p>Hi {applicant.first_name or applicant.name or 'Candidate'},</p>
                <p>The interview for <strong>{job_title}</strong> previously scheduled for
                {interview.scheduled_at.strftime("%B %d, %Y at %I:%M %p")} has been cancelled.</p>
                {f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""}
                <p>We apologize for any inconvenience. A cancellation calendar update is attached.</p>
                <br>
                <p>Best regards,<br>HR Team</p>
                """,
                email_type="interview_cancellation",
                ics_bytes=cancel_ics,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Cancellation ICS email failed (non-blocking): {e}")

    recruiting_service.log_activity(
        db, interview.application_id, "interview_cancelled",
        f"Interview cancelled{f': {reason}' if reason else ''}",
        performed_by=current_user.id,
        is_internal=False,
    )

    db.commit()
    return {"message": "Interview cancelled"}


@router.patch("/interviews/{interview_id}/complete")
def complete_interview(
    interview_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Mark an interview as completed."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status = "Completed"

    recruiting_service.log_activity(
        db, interview.application_id, "interview_completed",
        "Interview completed",
        performed_by=current_user.id,
    )

    db.commit()
    return {"message": "Interview marked as completed"}


# ============================================================================
# PIPELINE KANBAN DATA (Phase 2)
# ============================================================================

@router.get("/requisitions/{req_id}/kanban")
def get_requisition_kanban(
    req_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get kanban board data for a requisition's pipeline."""
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    if not req.pipeline_template_id:
        return {"stages": [], "ungrouped": []}

    # Get pipeline stages
    stages = db.query(models.PipelineStage).filter(
        models.PipelineStage.template_id == req.pipeline_template_id
    ).order_by(models.PipelineStage.order_index).all()

    # Get all applications for this requisition
    apps = db.query(models.Application).options(
        joinedload(models.Application.applicant),
    ).filter(
        models.Application.requisition_id == req_id,
        models.Application.status.notin_(["Rejected", "Withdrawn"]),
    ).all()

    # Group applications by current stage
    stage_apps = {s.id: [] for s in stages}
    ungrouped = []

    for app in apps:
        if app.current_stage_id and app.current_stage_id in stage_apps:
            stage_apps[app.current_stage_id].append(app)
        else:
            ungrouped.append(app)

    def serialize_app(a: models.Application) -> dict:
        return {
            "id": a.id,
            "application_id": a.application_id,
            "applicant_name": f"{a.applicant.first_name} {a.applicant.last_name}" if a.applicant else "Unknown",
            "applicant_email": a.applicant.email if a.applicant else None,
            "status": a.status,
            "overall_rating": a.overall_rating,
            "is_favorite": a.is_favorite,
            "is_internal_transfer": a.is_internal_transfer,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        }

    return {
        "requisition_title": req.title,
        "stages": [
            {
                "id": s.id,
                "name": s.name,
                "stage_type": s.stage_type,
                "order_index": s.order_index,
                "applications": [serialize_app(a) for a in stage_apps[s.id]],
                "count": len(stage_apps[s.id]),
            }
            for s in stages
        ],
        "ungrouped": [serialize_app(a) for a in ungrouped],
    }


# ============================================================================
# CANDIDATE COMPARISON (Phase 2)
# ============================================================================

@router.get("/applications/compare")
def compare_candidates(
    ids: str = Query(..., description="Comma-separated application IDs"),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Compare multiple candidates side by side with scorecard averages."""
    app_ids = [int(id.strip()) for id in ids.split(",") if id.strip().isdigit()]
    if len(app_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 application IDs required")
    if len(app_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 applications for comparison")

    candidates = []
    for app_id in app_ids:
        app = db.query(models.Application).options(
            joinedload(models.Application.applicant),
        ).filter(models.Application.id == app_id).first()
        if not app:
            continue

        # Get scorecard summary
        scorecards = db.query(models.InterviewScorecard).filter(
            models.InterviewScorecard.application_id == app_id,
            models.InterviewScorecard.status == "Submitted",
        ).all()

        recommendation_counts = {}
        for sc in scorecards:
            if sc.recommendation:
                recommendation_counts[sc.recommendation] = recommendation_counts.get(sc.recommendation, 0) + 1

        candidates.append({
            "id": app.id,
            "application_id": app.application_id,
            "applicant": {
                "name": f"{app.applicant.first_name} {app.applicant.last_name}",
                "email": app.applicant.email,
                "current_title": app.applicant.current_title,
                "current_employer": app.applicant.current_employer,
                "years_of_experience": app.applicant.years_of_experience,
            },
            "status": app.status,
            "overall_rating": app.overall_rating,
            "scorecard_count": len(scorecards),
            "recommendation_counts": recommendation_counts,
            "is_favorite": app.is_favorite,
            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        })

    return {"candidates": candidates}


# ============================================================================
# OFFER MANAGEMENT ENDPOINTS (Phase 3)
# ============================================================================

class OfferCreate(BaseModel):
    application_id: int
    position_title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[str] = None
    reports_to: Optional[str] = None
    salary: Optional[float] = None
    wage_type: Optional[str] = None
    signing_bonus: Optional[float] = None
    equity_details: Optional[str] = None
    benefits_summary: Optional[str] = None
    expires_at: Optional[str] = None
    contingencies: Optional[dict] = None


class OfferUpdate(BaseModel):
    position_title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[str] = None
    reports_to: Optional[str] = None
    salary: Optional[float] = None
    wage_type: Optional[str] = None
    signing_bonus: Optional[float] = None
    equity_details: Optional[str] = None
    benefits_summary: Optional[str] = None
    expires_at: Optional[str] = None
    contingencies: Optional[dict] = None
    negotiation_notes: Optional[str] = None


class CounterOfferCreate(BaseModel):
    salary: Optional[float] = None
    signing_bonus: Optional[float] = None
    start_date: Optional[str] = None
    negotiation_notes: Optional[str] = None


class DocumentRequestCreate(BaseModel):
    application_id: int
    document_type: str
    description: Optional[str] = None
    is_required: bool = True
    due_date: Optional[str] = None


class EmailCompose(BaseModel):
    application_id: int
    subject: str
    body_html: str


@router.get("/offers")
def list_offers(
    status: Optional[str] = None,
    application_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List offer letters with optional filters."""
    query = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application).joinedload(models.Application.applicant),
    )

    if status:
        query = query.filter(models.OfferLetter.status == status)
    if application_id:
        query = query.filter(models.OfferLetter.application_id == application_id)

    total = query.count()
    offers = query.order_by(models.OfferLetter.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "offers": [
            {
                "id": o.id,
                "offer_id": o.offer_id,
                "application_id": o.application_id,
                "applicant_name": f"{o.application.applicant.first_name} {o.application.applicant.last_name}" if o.application and o.application.applicant else None,
                "position_title": o.position_title,
                "salary": o.salary,
                "status": o.status,
                "is_counter_offer": o.is_counter_offer,
                "sent_at": o.sent_at.isoformat() if o.sent_at else None,
                "responded_at": o.responded_at.isoformat() if o.responded_at else None,
                "expires_at": o.expires_at.isoformat() if o.expires_at else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in offers
        ],
    }


@router.post("/offers")
def create_offer(
    data: OfferCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a new offer letter."""
    from datetime import date as date_type

    app = db.query(models.Application).filter(models.Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    offer = offer_service.create_offer(
        db,
        application_id=data.application_id,
        position_title=data.position_title,
        created_by=current_user.id,
        department=data.department,
        location=data.location,
        employment_type=data.employment_type,
        start_date=date_type.fromisoformat(data.start_date) if data.start_date else None,
        reports_to=data.reports_to,
        salary=data.salary,
        wage_type=data.wage_type,
        signing_bonus=data.signing_bonus,
        equity_details=data.equity_details,
        benefits_summary=data.benefits_summary,
        expires_at=datetime.fromisoformat(data.expires_at) if data.expires_at else None,
        contingencies=data.contingencies,
    )
    db.commit()
    return {"message": "Offer created", "id": offer.id, "offer_id": offer.offer_id}


@router.get("/offers/{offer_id}")
def get_offer(
    offer_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get offer letter details."""
    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application).joinedload(models.Application.applicant),
        joinedload(models.OfferLetter.application).joinedload(models.Application.requisition),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    return {
        "id": offer.id,
        "offer_id": offer.offer_id,
        "application_id": offer.application_id,
        "applicant": {
            "name": f"{offer.application.applicant.first_name} {offer.application.applicant.last_name}",
            "email": offer.application.applicant.email,
        } if offer.application and offer.application.applicant else None,
        "requisition_title": offer.application.requisition.title if offer.application and offer.application.requisition else None,
        "position_title": offer.position_title,
        "department": offer.department,
        "location": offer.location,
        "employment_type": offer.employment_type,
        "start_date": offer.start_date.isoformat() if offer.start_date else None,
        "reports_to": offer.reports_to,
        "salary": offer.salary,
        "wage_type": offer.wage_type,
        "signing_bonus": offer.signing_bonus,
        "equity_details": offer.equity_details,
        "benefits_summary": offer.benefits_summary,
        "status": offer.status,
        "approved_at": offer.approved_at.isoformat() if offer.approved_at else None,
        "sent_at": offer.sent_at.isoformat() if offer.sent_at else None,
        "expires_at": offer.expires_at.isoformat() if offer.expires_at else None,
        "responded_at": offer.responded_at.isoformat() if offer.responded_at else None,
        "response": offer.response,
        "decline_reason": offer.decline_reason,
        "is_counter_offer": offer.is_counter_offer,
        "original_offer_id": offer.original_offer_id,
        "negotiation_notes": offer.negotiation_notes,
        "contingencies": offer.contingencies,
        "created_at": offer.created_at.isoformat() if offer.created_at else None,
    }


@router.put("/offers/{offer_id}")
def update_offer(
    offer_id: int,
    data: OfferUpdate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update an offer letter (only when in Draft status)."""
    from datetime import date as date_type

    offer = db.query(models.OfferLetter).filter(models.OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer.status not in ("Draft", "Pending Approval"):
        raise HTTPException(status_code=400, detail="Can only edit offers in Draft or Pending Approval status")

    update_data = data.model_dump(exclude_unset=True)
    if "start_date" in update_data and update_data["start_date"]:
        update_data["start_date"] = date_type.fromisoformat(update_data["start_date"])
    if "expires_at" in update_data and update_data["expires_at"]:
        update_data["expires_at"] = datetime.fromisoformat(update_data["expires_at"])

    for key, value in update_data.items():
        setattr(offer, key, value)

    db.commit()
    return {"message": "Offer updated"}


@router.patch("/offers/{offer_id}/approve")
def approve_offer(
    offer_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_ADMIN,
    )),
    db: Session = Depends(get_db),
):
    """Approve an offer letter."""
    offer = db.query(models.OfferLetter).filter(models.OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    try:
        offer_service.approve_offer(db, offer, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    return {"message": "Offer approved"}


@router.patch("/offers/{offer_id}/send")
async def send_offer(
    offer_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Send an approved offer to the candidate."""
    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application).joinedload(models.Application.applicant),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    try:
        offer_service.send_offer(db, offer, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Send email notification
    if offer.application and offer.application.applicant:
        applicant = offer.application.applicant
        await recruiting_email_service.send_offer_notification(
            to_email=applicant.email,
            applicant_name=f"{applicant.first_name} {applicant.last_name}",
            job_title=offer.position_title,
            offer_id=offer.offer_id,
            salary=offer.salary,
            start_date=offer.start_date.isoformat() if offer.start_date else None,
            expires_at=offer.expires_at.isoformat() if offer.expires_at else None,
        )

    db.commit()
    return {"message": "Offer sent to candidate"}


@router.patch("/offers/{offer_id}/rescind")
def rescind_offer(
    offer_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_ADMIN,
    )),
    db: Session = Depends(get_db),
):
    """Rescind an offer."""
    offer = db.query(models.OfferLetter).filter(models.OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    try:
        offer_service.rescind_offer(db, offer, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    return {"message": "Offer rescinded"}


@router.post("/offers/{offer_id}/counter")
def create_counter_offer(
    offer_id: int,
    data: CounterOfferCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Create a counter-offer based on an existing offer."""
    from datetime import date as date_type

    original = db.query(models.OfferLetter).filter(models.OfferLetter.id == offer_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original offer not found")

    counter = offer_service.create_counter_offer(
        db, original, current_user.id,
        salary=data.salary,
        signing_bonus=data.signing_bonus,
        start_date=date_type.fromisoformat(data.start_date) if data.start_date else None,
        negotiation_notes=data.negotiation_notes,
    )
    db.commit()
    return {"message": "Counter-offer created", "id": counter.id, "offer_id": counter.offer_id}


# ============================================================================
# DOCUMENT REQUEST ENDPOINTS (Phase 3)
# ============================================================================

@router.get("/document-requests")
def list_document_requests(
    application_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List document requests."""
    query = db.query(models.DocumentRequest).options(
        joinedload(models.DocumentRequest.applicant),
        joinedload(models.DocumentRequest.application),
    )

    if application_id:
        query = query.filter(models.DocumentRequest.application_id == application_id)
    if status:
        query = query.filter(models.DocumentRequest.status == status)

    total = query.count()
    requests = query.order_by(models.DocumentRequest.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "document_requests": [
            {
                "id": r.id,
                "application_id": r.application_id,
                "applicant_name": f"{r.applicant.first_name} {r.applicant.last_name}" if r.applicant else None,
                "document_type": r.document_type,
                "description": r.description,
                "is_required": r.is_required,
                "due_date": r.due_date.isoformat() if r.due_date else None,
                "status": r.status,
                "reminder_count": r.reminder_count,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests
        ],
    }


@router.post("/document-requests")
async def create_document_request(
    data: DocumentRequestCreate,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Request a document from an applicant."""
    from datetime import date as date_type

    app = db.query(models.Application).options(
        joinedload(models.Application.applicant),
        joinedload(models.Application.requisition),
    ).filter(models.Application.id == data.application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    doc_req = models.DocumentRequest(
        application_id=data.application_id,
        applicant_id=app.applicant_id,
        document_type=data.document_type,
        description=data.description,
        is_required=data.is_required,
        due_date=date_type.fromisoformat(data.due_date) if data.due_date else None,
        status="Requested",
        requested_by=current_user.id,
    )
    db.add(doc_req)

    recruiting_service.log_activity(
        db, data.application_id, "document_requested",
        f"Document requested: {data.document_type.replace('_', ' ').title()}",
        details={"document_type": data.document_type, "is_required": data.is_required},
        performed_by=current_user.id,
        is_internal=False,
    )

    db.commit()
    db.refresh(doc_req)

    # Send email notification
    if app.applicant:
        await recruiting_email_service.send_document_request(
            to_email=app.applicant.email,
            applicant_name=f"{app.applicant.first_name} {app.applicant.last_name}",
            job_title=app.requisition.title if app.requisition else "Position",
            document_type=data.document_type,
            description=data.description,
            due_date=data.due_date,
        )

    return {"message": "Document request created", "id": doc_req.id}


@router.patch("/document-requests/{req_id}/review")
def review_document(
    req_id: int,
    accepted: bool = Query(...),
    rejection_reason: Optional[str] = Query(None),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Accept or reject a submitted document."""
    doc_req = db.query(models.DocumentRequest).filter(models.DocumentRequest.id == req_id).first()
    if not doc_req:
        raise HTTPException(status_code=404, detail="Document request not found")

    if doc_req.status != "Submitted":
        raise HTTPException(status_code=400, detail="Can only review submitted documents")

    doc_req.status = "Accepted" if accepted else "Rejected"
    doc_req.reviewed_by = current_user.id
    doc_req.reviewed_at = datetime.utcnow()
    if not accepted:
        doc_req.rejection_reason = rejection_reason

    action = "accepted" if accepted else "rejected"
    recruiting_service.log_activity(
        db, doc_req.application_id, f"document_{action}",
        f"Document {action}: {doc_req.document_type.replace('_', ' ').title()}",
        performed_by=current_user.id,
        is_internal=False,
    )

    db.commit()
    return {"message": f"Document {action}"}


@router.patch("/document-requests/{req_id}/remind")
async def send_document_reminder(
    req_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Send a reminder for an outstanding document request."""
    doc_req = db.query(models.DocumentRequest).options(
        joinedload(models.DocumentRequest.applicant),
    ).filter(models.DocumentRequest.id == req_id).first()

    if not doc_req:
        raise HTTPException(status_code=404, detail="Document request not found")

    if doc_req.status != "Requested":
        raise HTTPException(status_code=400, detail="Can only remind for pending requests")

    doc_req.reminder_count += 1
    doc_req.last_reminded_at = datetime.utcnow()

    if doc_req.applicant:
        await recruiting_email_service.send_document_reminder(
            to_email=doc_req.applicant.email,
            applicant_name=f"{doc_req.applicant.first_name} {doc_req.applicant.last_name}",
            document_type=doc_req.document_type,
            due_date=doc_req.due_date.isoformat() if doc_req.due_date else None,
        )

    db.commit()
    return {"message": "Reminder sent", "reminder_count": doc_req.reminder_count}


# ============================================================================
# EMAIL COMPOSER (Phase 3)
# ============================================================================

@router.post("/send-email")
async def send_recruiting_email(
    data: EmailCompose,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Send a custom email to an applicant."""
    app = db.query(models.Application).options(
        joinedload(models.Application.applicant),
    ).filter(models.Application.id == data.application_id).first()

    if not app or not app.applicant:
        raise HTTPException(status_code=404, detail="Application not found")

    sent = await recruiting_email_service.send_custom_email(
        to_email=app.applicant.email,
        subject=data.subject,
        body_html=data.body_html,
    )

    recruiting_service.log_activity(
        db, data.application_id, "email_sent",
        f"Email sent: {data.subject}",
        details={"subject": data.subject, "sent": sent},
        performed_by=current_user.id,
    )

    db.commit()
    return {"message": "Email sent" if sent else "Email logged (delivery pending)", "sent": sent}


# ============================================================================
# HIRE CONVERSION ENDPOINTS (Phase 4)
# ============================================================================

class HireConversionInitiate(BaseModel):
    hire_date: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None


@router.post("/applications/{application_id}/convert-to-hire")
def initiate_hire_conversion(
    application_id: int,
    data: HireConversionInitiate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Initiate hire conversion for an application with accepted offer."""
    try:
        hire_date = None
        if data.hire_date:
            hire_date = datetime.strptime(data.hire_date, "%Y-%m-%d").date()

        conversion = hire_conversion_service.initiate_conversion(
            db,
            application_id,
            converted_by=current_user.id,
            hire_date=hire_date,
            department=data.department,
            position=data.position,
            location=data.location,
        )
        db.commit()
        return {
            "id": conversion.id,
            "application_id": conversion.application_id,
            "status": conversion.status,
            "hire_date": str(conversion.hire_date) if conversion.hire_date else None,
            "department": conversion.department,
            "position": conversion.position,
            "is_internal_transfer": conversion.is_internal_transfer,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/hire-conversions")
def list_hire_conversions(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all hire conversions."""
    query = db.query(models.HireConversion).options(
        joinedload(models.HireConversion.applicant),
        joinedload(models.HireConversion.offer),
    )
    if status:
        query = query.filter(models.HireConversion.status == status)
    query = query.order_by(models.HireConversion.created_at.desc())
    conversions = query.offset(skip).limit(limit).all()

    return [
        {
            "id": c.id,
            "application_id": c.application_id,
            "applicant_name": f"{c.applicant.first_name} {c.applicant.last_name}" if c.applicant else None,
            "offer_id": c.offer.offer_id if c.offer else None,
            "position": c.position,
            "department": c.department,
            "hire_date": str(c.hire_date) if c.hire_date else None,
            "status": c.status,
            "employee_id": c.employee_id,
            "is_internal_transfer": c.is_internal_transfer,
            "eeo_transferred": c.eeo_transferred,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in conversions
    ]


@router.get("/hire-conversions/{conversion_id}")
def get_hire_conversion(
    conversion_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get hire conversion detail."""
    conversion = db.query(models.HireConversion).options(
        joinedload(models.HireConversion.applicant),
        joinedload(models.HireConversion.offer),
    ).filter(models.HireConversion.id == conversion_id).first()
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")

    return {
        "id": conversion.id,
        "application_id": conversion.application_id,
        "applicant_id": conversion.applicant_id,
        "applicant_name": f"{conversion.applicant.first_name} {conversion.applicant.last_name}" if conversion.applicant else None,
        "applicant_email": conversion.applicant.email if conversion.applicant else None,
        "offer_id": conversion.offer.offer_id if conversion.offer else None,
        "position": conversion.position,
        "department": conversion.department,
        "location": conversion.location,
        "hire_date": str(conversion.hire_date) if conversion.hire_date else None,
        "salary": conversion.salary,
        "wage_type": conversion.wage_type,
        "status": conversion.status,
        "employee_id": conversion.employee_id,
        "user_id": conversion.user_id,
        "is_internal_transfer": conversion.is_internal_transfer,
        "eeo_transferred": conversion.eeo_transferred,
        "error_message": conversion.error_message,
        "created_at": conversion.created_at.isoformat() if conversion.created_at else None,
        "employee_created_at": conversion.employee_created_at.isoformat() if conversion.employee_created_at else None,
        "user_created_at": conversion.user_created_at.isoformat() if conversion.user_created_at else None,
        "onboarding_started_at": conversion.onboarding_started_at.isoformat() if conversion.onboarding_started_at else None,
        "completed_at": conversion.completed_at.isoformat() if conversion.completed_at else None,
    }


@router.post("/hire-conversions/{conversion_id}/create-employee")
def create_employee_from_conversion(
    conversion_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create Employee record from hire conversion."""
    conversion = db.query(models.HireConversion).get(conversion_id)
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")

    try:
        employee = hire_conversion_service.create_employee(db, conversion)
        db.commit()
        return {
            "message": "Employee record created",
            "employee_id": employee.employee_id,
            "name": f"{employee.first_name} {employee.last_name}",
            "conversion_status": conversion.status,
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/hire-conversions/{conversion_id}/create-user")
def create_user_from_conversion(
    conversion_id: int,
    email: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create User account for the new employee."""
    conversion = db.query(models.HireConversion).get(conversion_id)
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")

    try:
        user = hire_conversion_service.create_user(db, conversion, email=email)
        db.commit()
        return {
            "message": "User account created",
            "user_id": user.id,
            "email": user.email,
            "conversion_status": conversion.status,
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class OnboardingStart(BaseModel):
    template_id: Optional[int] = None


@router.post("/hire-conversions/{conversion_id}/start-onboarding")
def start_onboarding_from_conversion(
    conversion_id: int,
    data: OnboardingStart,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Start onboarding for the new employee using a template."""
    conversion = db.query(models.HireConversion).get(conversion_id)
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")

    try:
        tasks = hire_conversion_service.start_onboarding(db, conversion, template_id=data.template_id)
        db.commit()
        return {
            "message": f"Onboarding started with {len(tasks)} tasks",
            "task_count": len(tasks),
            "conversion_status": conversion.status,
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/hire-conversions/{conversion_id}/transfer-eeo")
def transfer_eeo_from_conversion(
    conversion_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Transfer EEO data from applicant to employee record."""
    conversion = db.query(models.HireConversion).get(conversion_id)
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")

    try:
        transferred = hire_conversion_service.transfer_eeo_data(db, conversion)
        db.commit()
        return {
            "message": "EEO data transferred" if transferred else "No EEO data available to transfer",
            "transferred": transferred,
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/hire-conversions/{conversion_id}/complete")
def complete_hire_conversion(
    conversion_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark hire conversion as completed."""
    conversion = db.query(models.HireConversion).get(conversion_id)
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")

    hire_conversion_service.complete_conversion(db, conversion)
    db.commit()
    return {"message": "Hire conversion completed", "status": conversion.status}


# ============================================================================
# ANALYTICS ENDPOINTS (Phase 5)
# ============================================================================

@router.get("/analytics/overview")
def get_analytics_overview(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get recruiting analytics overview stats."""
    return recruiting_analytics_service.get_overview_stats(db)


@router.get("/analytics/funnel")
def get_analytics_funnel(
    requisition_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get pipeline funnel conversion rates."""
    return recruiting_analytics_service.get_pipeline_funnel(db, requisition_id=requisition_id)


@router.get("/analytics/sources")
def get_analytics_sources(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get application source effectiveness."""
    return recruiting_analytics_service.get_source_effectiveness(db)


@router.get("/analytics/time-to-fill")
def get_analytics_time_to_fill(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get time-to-fill metrics by department."""
    return recruiting_analytics_service.get_time_to_fill(db)


@router.get("/analytics/interviewers")
def get_analytics_interviewers(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get interviewer activity stats."""
    return recruiting_analytics_service.get_interviewer_stats(db)


@router.get("/analytics/eeo-flow")
def get_eeo_applicant_flow(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get EEO applicant flow report (aggregate data only)."""
    return recruiting_analytics_service.get_eeo_applicant_flow(db)


# ============================================================================
# COMPLIANCE TIPS
# ============================================================================

class ComplianceTipCreate(BaseModel):
    category: str
    title: str
    content: str
    severity: str = "info"
    order_index: int = 0
    is_active: bool = True


class ComplianceTipUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    severity: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/compliance-tips")
def list_compliance_tips(
    category: Optional[str] = None,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """List all active compliance tips grouped by category."""
    query = db.query(models.InterviewComplianceTip).filter(
        models.InterviewComplianceTip.is_active == True
    )
    if category:
        query = query.filter(models.InterviewComplianceTip.category == category)

    tips = query.order_by(
        models.InterviewComplianceTip.category,
        models.InterviewComplianceTip.order_index,
    ).all()

    # Group by category
    grouped = {}
    for tip in tips:
        if tip.category not in grouped:
            grouped[tip.category] = []
        grouped[tip.category].append({
            "id": tip.id,
            "category": tip.category,
            "title": tip.title,
            "content": tip.content,
            "severity": tip.severity,
            "order_index": tip.order_index,
        })

    return {"tips": grouped, "total": len(tips)}


@router.get("/compliance-tips/{tip_id}")
def get_compliance_tip(
    tip_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get a single compliance tip."""
    tip = db.query(models.InterviewComplianceTip).filter(
        models.InterviewComplianceTip.id == tip_id
    ).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Compliance tip not found")

    return {
        "id": tip.id,
        "category": tip.category,
        "title": tip.title,
        "content": tip.content,
        "severity": tip.severity,
        "order_index": tip.order_index,
        "is_active": tip.is_active,
    }


@router.post("/compliance-tips")
def create_compliance_tip(
    data: ComplianceTipCreate,
    current_user: models.User = Depends(require_permission(Permissions.RECRUITING_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new compliance tip (admin only)."""
    tip = models.InterviewComplianceTip(
        category=data.category,
        title=data.title,
        content=data.content,
        severity=data.severity,
        order_index=data.order_index,
        is_active=data.is_active,
    )
    db.add(tip)
    db.commit()
    db.refresh(tip)
    return {"message": "Compliance tip created", "id": tip.id}


@router.put("/compliance-tips/{tip_id}")
def update_compliance_tip(
    tip_id: int,
    data: ComplianceTipUpdate,
    current_user: models.User = Depends(require_permission(Permissions.RECRUITING_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update a compliance tip (admin only)."""
    tip = db.query(models.InterviewComplianceTip).filter(
        models.InterviewComplianceTip.id == tip_id
    ).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Compliance tip not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tip, key, value)

    db.commit()
    return {"message": "Compliance tip updated"}
