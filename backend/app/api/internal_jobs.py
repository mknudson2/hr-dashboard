"""
Internal Jobs API Router — Employee Portal

Allows employees to view internal job postings and apply for transfers.
Uses the same employee auth as the rest of the employee portal.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.db import models, database
from app.api.auth import get_current_user
from app.services.recruiting_service import recruiting_service


router = APIRouter(prefix="/portal", tags=["internal-jobs"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# INTERNAL JOB LISTINGS (employee auth required)
# ============================================================================

@router.get("/internal-jobs")
def list_internal_jobs(
    search: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List internal job postings visible to the current employee."""
    query = db.query(models.JobPosting).filter(
        models.JobPosting.status == "Published",
        models.JobPosting.is_internal == True,
    ).join(models.JobRequisition)

    # Visibility filter
    if current_user.employee_id:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == current_user.employee_id
        ).first()
        if employee:
            query = query.filter(
                # Show all-company postings, department-only if matching, or specific-team
                (models.JobRequisition.internal_visibility == "All") |
                (
                    (models.JobRequisition.internal_visibility == "Department Only") &
                    (models.JobRequisition.department == employee.department)
                )
            )

    if search:
        query = query.filter(models.JobPosting.title.ilike(f"%{search}%"))
    if department:
        query = query.filter(models.JobRequisition.department == department)

    total = query.count()
    postings = query.order_by(models.JobPosting.published_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "jobs": [
            {
                "id": p.id,
                "slug": p.slug,
                "title": p.title,
                "short_description": p.short_description,
                "department": p.requisition.department if p.requisition else None,
                "location": p.requisition.location if p.requisition else None,
                "remote_type": p.requisition.remote_type if p.requisition else None,
                "employment_type": p.requisition.employment_type if p.requisition else None,
                "published_at": p.published_at.isoformat() if p.published_at else None,
            }
            for p in postings
        ],
    }


@router.get("/internal-jobs/{job_id}")
def get_internal_job(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full detail of an internal job posting."""
    posting = db.query(models.JobPosting).filter(
        models.JobPosting.id == job_id,
        models.JobPosting.status == "Published",
        models.JobPosting.is_internal == True,
    ).first()

    if not posting:
        raise HTTPException(status_code=404, detail="Internal job not found")

    req = posting.requisition
    return {
        "id": posting.id,
        "posting_id": posting.posting_id,
        "slug": posting.slug,
        "title": posting.title,
        "description_html": posting.description_html,
        "department": req.department if req else None,
        "location": req.location if req else None,
        "remote_type": req.remote_type if req else None,
        "employment_type": req.employment_type if req else None,
        "requirements": req.requirements if req else None,
        "preferred_qualifications": req.preferred_qualifications if req else None,
        "responsibilities": req.responsibilities if req else None,
        "benefits_summary": req.benefits_summary if req else None,
        "custom_questions": posting.custom_questions,
        "published_at": posting.published_at.isoformat() if posting.published_at else None,
    }


@router.post("/internal-jobs/{job_id}/apply")
def apply_internal_job(
    job_id: int,
    cover_letter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply for an internal job transfer. Pre-fills from employee record."""

    class InternalApplyBody(BaseModel):
        cover_letter: Optional[str] = None
        custom_answers: Optional[dict] = None

    posting = db.query(models.JobPosting).filter(
        models.JobPosting.id == job_id,
        models.JobPosting.status == "Published",
        models.JobPosting.is_internal == True,
    ).first()

    if not posting:
        raise HTTPException(status_code=404, detail="Internal job not found")

    req = posting.requisition

    # Get employee record
    employee = None
    if current_user.employee_id:
        employee = db.query(models.Employee).filter(
            models.Employee.employee_id == current_user.employee_id
        ).first()

    if not employee:
        raise HTTPException(status_code=400, detail="No employee record found for your account")

    # Get or create applicant record linked to employee
    applicant = db.query(models.Applicant).filter(
        models.Applicant.employee_id == employee.employee_id
    ).first()

    if not applicant:
        applicant = models.Applicant(
            applicant_id=recruiting_service.generate_applicant_id(db),
            first_name=employee.first_name,
            last_name=employee.last_name,
            email=current_user.email,
            is_internal=True,
            employee_id=employee.employee_id,
            source="internal",
        )
        db.add(applicant)
        db.flush()

    # Check for duplicate
    existing = db.query(models.Application).filter(
        models.Application.applicant_id == applicant.id,
        models.Application.requisition_id == req.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this position")

    application = models.Application(
        application_id=recruiting_service.generate_application_id(db),
        applicant_id=applicant.id,
        requisition_id=req.id,
        posting_id=posting.id,
        cover_letter=cover_letter,
        source="internal",
        status="New",
        is_internal_transfer=True,
        submitted_at=datetime.utcnow(),
    )
    db.add(application)
    db.flush()

    # Update posting count
    posting.application_count = (posting.application_count or 0) + 1

    recruiting_service.log_activity(
        db,
        application_id=application.id,
        activity_type="status_change",
        description=f"Internal transfer application from {employee.first_name} {employee.last_name}",
        details={"status": "New", "source": "internal", "employee_id": employee.employee_id},
        performed_by=current_user.id,
        is_internal=False,
    )

    db.commit()
    return {"message": "Internal application submitted", "application_id": application.application_id}


@router.get("/my-internal-applications")
def list_my_internal_applications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current employee's internal transfer applications."""
    if not current_user.employee_id:
        return {"applications": []}

    applicant = db.query(models.Applicant).filter(
        models.Applicant.employee_id == current_user.employee_id
    ).first()

    if not applicant:
        return {"applications": []}

    apps = db.query(models.Application).filter(
        models.Application.applicant_id == applicant.id,
        models.Application.is_internal_transfer == True,
    ).options(
        joinedload(models.Application.requisition),
    ).order_by(models.Application.created_at.desc()).all()

    return {
        "applications": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "job_title": a.requisition.title if a.requisition else "Unknown",
                "department": a.requisition.department if a.requisition else None,
                "status": a.status,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            }
            for a in apps
        ],
    }
