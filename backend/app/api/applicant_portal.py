"""
Applicant Portal API Router — Public + Applicant-authenticated endpoints

Provides job browsing, application submission, magic link auth,
optional account creation, and applicant self-service.
"""

import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.db import models, database
from app.services.recruiting_service import recruiting_service
from app.services.applicant_auth_service import applicant_auth_service, get_current_applicant
from app.services.offer_service import offer_service
from app.services.lifecycle_service import lifecycle_service
from app.services.messaging_service import messaging_service
from app.schemas.messaging import ReplyRequest


router = APIRouter(prefix="/applicant-portal", tags=["applicant-portal"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class MagicLinkRequest(BaseModel):
    email: str


class ApplicantRegister(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str


class ApplicantLogin(BaseModel):
    email: str
    password: str


class EEOSubmission(BaseModel):
    race_ethnicity: Optional[str] = None
    gender: Optional[str] = None
    veteran_status: Optional[str] = None
    disability_status: Optional[str] = None
    declined_to_identify: bool = False


# ============================================================================
# PUBLIC JOB LISTINGS
# ============================================================================

@router.get("/jobs")
def list_public_jobs(
    search: Optional[str] = None,
    department: Optional[str] = None,
    location: Optional[str] = None,
    remote_type: Optional[str] = None,
    employment_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Public job listings — no auth required."""
    query = db.query(models.JobPosting).filter(
        models.JobPosting.status == "Published",
        models.JobPosting.is_internal == False,
    ).join(models.JobRequisition)

    if search:
        query = query.filter(
            models.JobPosting.title.ilike(f"%{search}%")
        )
    if department:
        query = query.filter(models.JobRequisition.department == department)
    if location:
        query = query.filter(models.JobRequisition.location.ilike(f"%{location}%"))
    if remote_type:
        query = query.filter(models.JobRequisition.remote_type == remote_type)
    if employment_type:
        query = query.filter(models.JobRequisition.employment_type == employment_type)

    total = query.count()
    postings = query.order_by(models.JobPosting.published_at.desc()).offset(skip).limit(limit).all()

    results = []
    for p in postings:
        req = p.requisition
        results.append({
            "id": p.id,
            "slug": p.slug,
            "title": p.title,
            "short_description": p.short_description,
            "department": req.department if req else None,
            "location": req.location if req else None,
            "remote_type": req.remote_type if req else None,
            "employment_type": req.employment_type if req else None,
            "salary_min": req.salary_min if req and req.show_salary_on_posting else None,
            "salary_max": req.salary_max if req and req.show_salary_on_posting else None,
            "published_at": p.published_at.isoformat() if p.published_at else None,
        })

    # Collect filter options
    departments = db.query(models.JobRequisition.department).join(models.JobPosting).filter(
        models.JobPosting.status == "Published",
        models.JobPosting.is_internal == False,
        models.JobRequisition.department.isnot(None),
    ).distinct().all()

    return {
        "total": total,
        "jobs": results,
        "filters": {
            "departments": [d[0] for d in departments if d[0]],
        },
    }


@router.get("/jobs/{slug}")
def get_public_job(slug: str, db: Session = Depends(get_db)):
    """Get a single job posting by slug — public."""
    posting = db.query(models.JobPosting).filter(
        models.JobPosting.slug == slug,
        models.JobPosting.status == "Published",
    ).first()

    if not posting:
        raise HTTPException(status_code=404, detail="Job not found")

    # Increment view count
    posting.view_count = (posting.view_count or 0) + 1
    db.commit()

    req = posting.requisition
    return {
        "id": posting.id,
        "posting_id": posting.posting_id,
        "slug": posting.slug,
        "title": posting.title,
        "description_html": posting.description_html,
        "short_description": posting.short_description,
        "department": req.department if req else None,
        "location": req.location if req else None,
        "remote_type": req.remote_type if req else None,
        "employment_type": req.employment_type if req else None,
        "salary_min": req.salary_min if req and req.show_salary_on_posting else None,
        "salary_max": req.salary_max if req and req.show_salary_on_posting else None,
        "requirements": req.requirements if req else None,
        "preferred_qualifications": req.preferred_qualifications if req else None,
        "responsibilities": req.responsibilities if req else None,
        "benefits_summary": req.benefits_summary if req else None,
        "requires_resume": posting.requires_resume,
        "requires_cover_letter": posting.requires_cover_letter,
        "custom_questions": posting.custom_questions,
        "allow_easy_apply": posting.allow_easy_apply,
        "published_at": posting.published_at.isoformat() if posting.published_at else None,
        "closes_at": posting.closes_at.isoformat() if posting.closes_at else None,
    }


@router.get("/postings/{posting_id}/requirements")
def get_posting_requirements(posting_id: int, db: Session = Depends(get_db)):
    """Get resume/cover letter requirements for a posting — used by the application form."""
    posting = db.query(models.JobPosting).filter(models.JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Posting not found")
    return {
        "title": posting.title,
        "requires_resume": posting.requires_resume,
        "requires_cover_letter": posting.requires_cover_letter,
    }


# ============================================================================
# APPLICATION SUBMISSION (public, no account required)
# ============================================================================

@router.post("/apply")
async def submit_application(
    posting_id: int = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
    custom_answers: Optional[str] = Form(None),  # JSON string
    open_to_other_roles: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """Submit a job application. No account required."""
    import json

    # Validate posting
    posting = db.query(models.JobPosting).filter(
        models.JobPosting.id == posting_id,
        models.JobPosting.status == "Published",
    ).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found or closed")

    if posting.closes_at and posting.closes_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This job posting has closed")

    if posting.requires_resume and not resume:
        raise HTTPException(status_code=400, detail="Resume is required for this position")

    req = posting.requisition

    # Get or create applicant
    applicant, created = recruiting_service.get_or_create_applicant(
        db, email=email, first_name=first_name, last_name=last_name,
        phone=phone, source=posting.channel or "portal",
    )

    # Handle cross-role opt-in
    if open_to_other_roles and open_to_other_roles.lower() == 'true':
        if not applicant.open_to_other_roles:
            applicant.open_to_other_roles = True
            applicant.pool_opted_in_at = datetime.utcnow()

    # Check for duplicate application
    existing = db.query(models.Application).filter(
        models.Application.applicant_id == applicant.id,
        models.Application.requisition_id == req.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this position")

    # Handle resume upload
    resume_file_id = None
    if resume:
        import uuid
        upload_dir = os.path.join("app", "data", "uploads", "resumes")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(resume.filename or "file")[1]
        safe_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(upload_dir, safe_name)

        content = await resume.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_record = models.FileUpload(
            file_name=safe_name,
            original_filename=resume.filename or "resume",
            file_type=ext.lstrip("."),
            file_size=len(content),
            file_path=file_path,
            mime_type=resume.content_type,
            upload_source="applicant_portal",
            uploaded_by=f"applicant:{applicant.id}",
            status="completed",
        )
        db.add(file_record)
        db.flush()
        resume_file_id = file_record.id

    # Parse custom answers
    parsed_answers = None
    if custom_answers:
        try:
            parsed_answers = json.loads(custom_answers)
        except json.JSONDecodeError:
            parsed_answers = None

    # Create application
    application = models.Application(
        application_id=recruiting_service.generate_application_id(db),
        applicant_id=applicant.id,
        requisition_id=req.id,
        posting_id=posting.id,
        cover_letter=cover_letter,
        custom_answers=parsed_answers,
        resume_file_id=resume_file_id,
        source=posting.channel or "portal",
        status="New",
        submitted_at=datetime.utcnow(),
    )
    db.add(application)
    db.flush()

    # Update posting application count
    posting.application_count = (posting.application_count or 0) + 1

    # Log activity
    recruiting_service.log_activity(
        db,
        application_id=application.id,
        activity_type="status_change",
        description="Application submitted",
        details={"status": "New", "source": application.source},
        is_internal=False,
    )

    db.commit()

    # Trigger AI resume analysis in background if resume was uploaded
    if resume_file_id:
        background_tasks.add_task(_run_resume_analysis, application.id)

    return {
        "message": "Application submitted successfully",
        "application_id": application.application_id,
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
# APPLICANT AUTH — MAGIC LINK
# ============================================================================

@router.post("/auth/magic-link")
def request_magic_link(
    data: MagicLinkRequest,
    db: Session = Depends(get_db),
):
    """Request a magic link email for applicant login."""
    applicant = recruiting_service.find_applicant_by_email(db, data.email)
    if not applicant:
        # Don't reveal if email exists
        return {"message": "If an account with that email exists, a magic link has been sent."}

    token = applicant_auth_service.generate_magic_link(db, applicant)

    # In production, send email with link. For now, return token in dev.
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response_data = {"message": "If an account with that email exists, a magic link has been sent."}
    if not is_production:
        response_data["_dev_token"] = token
        response_data["_dev_link"] = f"http://localhost:5175/auth/verify/{token}"

    return response_data


@router.get("/auth/verify/{token}")
def verify_magic_link(
    token: str,
    db: Session = Depends(get_db),
):
    """Verify magic link token and return JWT."""
    applicant = applicant_auth_service.verify_magic_link(db, token)
    if not applicant:
        raise HTTPException(status_code=400, detail="Invalid or expired magic link")

    access_token, expires_at = applicant_auth_service.create_applicant_token(applicant)

    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

    response = JSONResponse(content={
        "message": "Authenticated successfully",
        "applicant": {
            "id": applicant.id,
            "applicant_id": applicant.applicant_id,
            "first_name": applicant.first_name,
            "last_name": applicant.last_name,
            "email": applicant.email,
        },
    })

    response.set_cookie(
        key="applicant_access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax" if not is_production else "strict",
        max_age=72 * 3600,
        path="/",
    )

    return response


# ============================================================================
# APPLICANT AUTH — ACCOUNT (optional)
# ============================================================================

@router.post("/auth/register")
def register_applicant(
    data: ApplicantRegister,
    db: Session = Depends(get_db),
):
    """Create an applicant account with password."""
    existing = recruiting_service.find_applicant_by_email(db, data.email)
    if existing and existing.has_account:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if existing:
        # Upgrade existing applicant to have an account
        applicant = existing
    else:
        applicant = models.Applicant(
            applicant_id=recruiting_service.generate_applicant_id(db),
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email.lower(),
            source="portal",
        )
        db.add(applicant)
        db.flush()

    applicant.has_account = True
    applicant.password_hash = applicant_auth_service.hash_password(data.password)
    applicant.account_created_at = datetime.utcnow()
    db.commit()

    # Create JWT and set cookie
    access_token, expires_at = applicant_auth_service.create_applicant_token(applicant)
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

    response = JSONResponse(content={
        "message": "Account created successfully",
        "applicant": {
            "id": applicant.id,
            "applicant_id": applicant.applicant_id,
            "first_name": applicant.first_name,
            "last_name": applicant.last_name,
            "email": applicant.email,
        },
    })

    response.set_cookie(
        key="applicant_access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax" if not is_production else "strict",
        max_age=72 * 3600,
        path="/",
    )

    return response


@router.post("/auth/login")
def login_applicant(
    data: ApplicantLogin,
    db: Session = Depends(get_db),
):
    """Login with applicant account credentials."""
    applicant = recruiting_service.find_applicant_by_email(db, data.email)
    if not applicant or not applicant.has_account or not applicant.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not applicant_auth_service.verify_password(data.password, applicant.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if applicant.global_status == "Blacklisted":
        raise HTTPException(status_code=403, detail="Account access restricted")

    applicant.last_login = datetime.utcnow()
    db.commit()

    access_token, expires_at = applicant_auth_service.create_applicant_token(applicant)
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

    response = JSONResponse(content={
        "message": "Login successful",
        "applicant": {
            "id": applicant.id,
            "applicant_id": applicant.applicant_id,
            "first_name": applicant.first_name,
            "last_name": applicant.last_name,
            "email": applicant.email,
        },
    })

    response.set_cookie(
        key="applicant_access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax" if not is_production else "strict",
        max_age=72 * 3600,
        path="/",
    )

    return response


# ============================================================================
# APPLICANT SELF-SERVICE (authenticated)
# ============================================================================

@router.get("/my-applications")
def list_my_applications(
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """List the authenticated applicant's applications."""
    apps = db.query(models.Application).filter(
        models.Application.applicant_id == applicant.id,
    ).options(
        joinedload(models.Application.requisition),
        joinedload(models.Application.posting),
    ).order_by(models.Application.created_at.desc()).all()

    return {
        "applications": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "job_title": a.requisition.title if a.requisition else "Unknown",
                "department": a.requisition.department if a.requisition else None,
                "location": a.requisition.location if a.requisition else None,
                "status": a.status,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            }
            for a in apps
        ],
    }


@router.get("/my-applications/{app_id}")
def get_my_application(
    app_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get details of a specific application including public timeline."""
    application = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.applicant_id == applicant.id,
    ).options(
        joinedload(models.Application.requisition),
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Only show non-internal activities
    activities = db.query(models.ApplicationActivity).filter(
        models.ApplicationActivity.application_id == application.id,
        models.ApplicationActivity.is_internal == False,
    ).order_by(models.ApplicationActivity.created_at.desc()).all()

    return {
        "id": application.id,
        "application_id": application.application_id,
        "job_title": application.requisition.title if application.requisition else "Unknown",
        "department": application.requisition.department if application.requisition else None,
        "location": application.requisition.location if application.requisition else None,
        "status": application.status,
        "submitted_at": application.submitted_at.isoformat() if application.submitted_at else None,
        "timeline": [
            {
                "activity_type": act.activity_type,
                "description": act.description,
                "created_at": act.created_at.isoformat() if act.created_at else None,
            }
            for act in activities
        ],
    }


# ============================================================================
# EEO SELF-IDENTIFICATION (voluntary)
# ============================================================================

@router.post("/eeo")
def submit_eeo(
    data: EEOSubmission,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Submit voluntary EEO self-identification data."""
    existing = db.query(models.ApplicantEEO).filter(
        models.ApplicantEEO.applicant_id == applicant.id,
    ).first()

    if existing:
        existing.race_ethnicity = data.race_ethnicity
        existing.gender = data.gender
        existing.veteran_status = data.veteran_status
        existing.disability_status = data.disability_status
        existing.declined_to_identify = data.declined_to_identify
        existing.self_identified_at = datetime.utcnow()
    else:
        eeo = models.ApplicantEEO(
            applicant_id=applicant.id,
            race_ethnicity=data.race_ethnicity,
            gender=data.gender,
            veteran_status=data.veteran_status,
            disability_status=data.disability_status,
            declined_to_identify=data.declined_to_identify,
            self_identified_at=datetime.utcnow(),
        )
        db.add(eeo)

    db.commit()
    return {"message": "EEO information saved"}


@router.post("/auth/logout")
def logout_applicant():
    """Logout applicant by clearing cookie."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="applicant_access_token", path="/")
    return response


@router.get("/auth/verify")
def verify_applicant_token(
    applicant: models.Applicant = Depends(get_current_applicant),
):
    """Verify if the applicant token is valid."""
    return {
        "valid": True,
        "applicant": {
            "id": applicant.id,
            "applicant_id": applicant.applicant_id,
            "first_name": applicant.first_name,
            "last_name": applicant.last_name,
            "email": applicant.email,
        },
    }


# ============================================================================
# OFFER ENDPOINTS - Applicant Side (Phase 3)
# ============================================================================

@router.get("/my-offers")
def list_my_offers(
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """List offers for the authenticated applicant."""
    applications = db.query(models.Application).filter(
        models.Application.applicant_id == applicant.id,
    ).all()
    app_ids = [a.id for a in applications]

    if not app_ids:
        return {"offers": []}

    offers = db.query(models.OfferLetter).filter(
        models.OfferLetter.application_id.in_(app_ids),
        models.OfferLetter.status.in_(["Sent", "Accepted", "Declined", "Expired"]),
    ).order_by(models.OfferLetter.created_at.desc()).all()

    return {
        "offers": [
            {
                "id": o.id,
                "offer_id": o.offer_id,
                "application_id": o.application_id,
                "position_title": o.position_title,
                "department": o.department,
                "salary": o.salary,
                "status": o.status,
                "sent_at": o.sent_at.isoformat() if o.sent_at else None,
                "expires_at": o.expires_at.isoformat() if o.expires_at else None,
            }
            for o in offers
        ],
    }


@router.get("/my-offers/{offer_id}")
def get_my_offer(
    offer_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get full offer details for the authenticated applicant."""
    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application),
        joinedload(models.OfferLetter.offer_letter_file),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Verify the offer belongs to this applicant
    if not offer.application or offer.application.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Only show offers that have been sent
    if offer.status not in ("Sent", "Accepted", "Declined", "Expired", "Rescinded", "Negotiating"):
        raise HTTPException(status_code=404, detail="Offer not found")

    return {
        "id": offer.id,
        "offer_id": offer.offer_id,
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
        "sent_at": offer.sent_at.isoformat() if offer.sent_at else None,
        "expires_at": offer.expires_at.isoformat() if offer.expires_at else None,
        "responded_at": offer.responded_at.isoformat() if offer.responded_at else None,
        "contingencies": offer.contingencies,
        "is_counter_offer": offer.is_counter_offer,
        "negotiation_notes": offer.negotiation_notes,
        "offer_letter_file_url": f"/applicant-portal/my-offers/{offer.id}/download-letter" if offer.offer_letter_file_id else None,
        "version": offer.version or 1,
        "version_notes": offer.version_notes,
    }


class OfferResponse(BaseModel):
    response: str  # "accept" or "decline"
    decline_reason: Optional[str] = None


@router.post("/my-offers/{offer_id}/respond")
def respond_to_offer(
    offer_id: int,
    data: OfferResponse,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Accept or decline an offer."""
    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if not offer.application or offer.application.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        if data.response == "accept":
            offer_service.accept_offer(db, offer)
        elif data.response == "decline":
            offer_service.decline_offer(db, offer, data.decline_reason)
        else:
            raise HTTPException(status_code=400, detail="Response must be 'accept' or 'decline'")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    return {"message": f"Offer {data.response}ed"}


# ============================================================================
# DOCUMENT REQUEST ENDPOINTS - Applicant Side (Phase 3)
# ============================================================================

@router.get("/my-document-requests")
def list_my_document_requests(
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """List document requests for the authenticated applicant."""
    requests = db.query(models.DocumentRequest).filter(
        models.DocumentRequest.applicant_id == applicant.id,
    ).order_by(models.DocumentRequest.created_at.desc()).all()

    return {
        "document_requests": [
            {
                "id": r.id,
                "application_id": r.application_id,
                "document_type": r.document_type,
                "description": r.description,
                "is_required": r.is_required,
                "due_date": r.due_date.isoformat() if r.due_date else None,
                "status": r.status,
                "rejection_reason": r.rejection_reason,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests
        ],
    }


@router.post("/my-document-requests/{req_id}/upload")
async def upload_document(
    req_id: int,
    file: UploadFile = File(...),
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Upload a document for a document request."""
    import uuid

    doc_req = db.query(models.DocumentRequest).filter(
        models.DocumentRequest.id == req_id,
        models.DocumentRequest.applicant_id == applicant.id,
    ).first()

    if not doc_req:
        raise HTTPException(status_code=404, detail="Document request not found")

    if doc_req.status not in ("Requested", "Rejected"):
        raise HTTPException(status_code=400, detail="Cannot upload for this request")

    # Save file
    upload_dir = os.path.join("app", "data", "uploads", "applicant_documents")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, safe_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create FileUpload record
    file_ext = ext.lstrip(".") if ext else "unknown"
    file_record = models.FileUpload(
        file_name=safe_name,
        original_filename=file.filename or safe_name,
        file_type=file_ext,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        uploaded_by=f"applicant:{applicant.id}",
        status="completed",
    )
    db.add(file_record)
    db.flush()

    # Update document request
    doc_req.file_upload_id = file_record.id
    doc_req.status = "Submitted"

    recruiting_service.log_activity(
        db, doc_req.application_id, "document_uploaded",
        f"Document uploaded: {doc_req.document_type.replace('_', ' ').title()}",
        details={"document_type": doc_req.document_type, "file_name": file.filename},
        is_internal=False,
    )

    db.commit()
    return {"message": "Document uploaded successfully"}


# ============================================================================
# APPLICANT PROFILE ENDPOINTS (Phase 5)
# ============================================================================

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_employer: Optional[str] = None
    current_title: Optional[str] = None


@router.get("/profile")
def get_applicant_profile(
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get applicant's own profile."""
    return {
        "id": applicant.id,
        "applicant_id": applicant.applicant_id,
        "first_name": applicant.first_name,
        "last_name": applicant.last_name,
        "email": applicant.email,
        "phone": applicant.phone,
        "linkedin_url": applicant.linkedin_url,
        "portfolio_url": applicant.portfolio_url,
        "current_employer": applicant.current_employer,
        "current_title": applicant.current_title,
        "years_of_experience": applicant.years_of_experience,
        "has_account": applicant.has_account,
        "open_to_other_roles": applicant.open_to_other_roles,
        "pool_opted_in_at": applicant.pool_opted_in_at.isoformat() if applicant.pool_opted_in_at else None,
        "created_at": applicant.created_at.isoformat() if applicant.created_at else None,
    }


@router.put("/profile")
def update_applicant_profile(
    data: ProfileUpdate,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Update applicant's own profile."""
    if data.first_name is not None:
        applicant.first_name = data.first_name
    if data.last_name is not None:
        applicant.last_name = data.last_name
    if data.phone is not None:
        applicant.phone = data.phone
    if data.linkedin_url is not None:
        applicant.linkedin_url = data.linkedin_url
    if data.portfolio_url is not None:
        applicant.portfolio_url = data.portfolio_url
    if data.current_employer is not None:
        applicant.current_employer = data.current_employer
    if data.current_title is not None:
        applicant.current_title = data.current_title

    db.commit()
    return {"message": "Profile updated"}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/profile/change-password")
def change_applicant_password(
    data: PasswordChange,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Change applicant's password."""
    if not applicant.has_account or not applicant.password_hash:
        raise HTTPException(status_code=400, detail="No account password set")

    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    if not pwd_context.verify(data.current_password, applicant.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    applicant.password_hash = pwd_context.hash(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/my-applications/{application_id}/withdraw")
def withdraw_application(
    application_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Withdraw an application."""
    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.applicant_id == applicant.id,
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status in ("Hired", "Withdrawn"):
        raise HTTPException(status_code=400, detail=f"Cannot withdraw application with status '{application.status}'")

    application.status = "Withdrawn"
    application.status_changed_at = datetime.utcnow()

    recruiting_service.log_activity(
        db, application.id, "status_change",
        "Application withdrawn by applicant",
        details={"previous_status": application.status},
        is_internal=False,
    )

    db.commit()
    return {"message": "Application withdrawn"}


# ============================================================================
# ATS PHASE 0 — APPLICANT PORTAL STUBS
# ============================================================================

@router.get("/my-applications/{app_id}/pipeline")
def get_applicant_pipeline(
    app_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get the applicant-facing pipeline progress tracker."""
    # Verify applicant owns this application
    application = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if not application.requisition_id:
        return []

    pipeline = lifecycle_service.get_applicant_facing_pipeline(db, application.requisition_id)
    return pipeline


@router.get("/my-messages")
def list_applicant_messages(
    stage_key: Optional[str] = None,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """List message threads for the authenticated applicant.
    Optionally filter by stage_key to scope threads to a pipeline step.
    """
    # Get all application IDs for this applicant
    app_ids = [
        a.id for a in db.query(models.Application.id).filter(
            models.Application.applicant_id == applicant.id
        ).all()
    ]

    if not app_ids:
        return {"threads": []}

    all_threads = []
    for app_id in app_ids:
        threads = messaging_service.get_threads(db, app_id, include_internal=False, stage_key=stage_key)
        # Enrich with application context
        app = db.query(models.Application).options(
            joinedload(models.Application.requisition)
        ).filter(models.Application.id == app_id).first()
        for thread in threads:
            # Count unread messages from HR/HM side
            unread = db.query(models.ApplicantMessage).filter(
                models.ApplicantMessage.thread_id == thread["thread_id"],
                models.ApplicantMessage.sender_type != "applicant",
                models.ApplicantMessage.is_read == False,
            ).count()
            thread["unread_count"] = unread
            thread["application_id"] = app_id
            thread["applicant_name"] = f"{applicant.first_name} {applicant.last_name}"
            thread["job_title"] = app.requisition.title if app and app.requisition else None
        all_threads.extend(threads)

    # Sort by most recent
    all_threads.sort(key=lambda t: t.get("last_message_at", ""), reverse=True)
    return {"threads": all_threads}


@router.get("/my-messages/{thread_id}")
def get_applicant_thread(
    thread_id: str,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get messages in a thread (excludes internal notes)."""
    # Verify applicant owns this thread
    first_msg = db.query(models.ApplicantMessage).filter(
        models.ApplicantMessage.thread_id == thread_id
    ).first()
    if not first_msg:
        raise HTTPException(status_code=404, detail="Thread not found")

    app = db.query(models.Application).filter(
        models.Application.id == first_msg.application_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Mark messages from HR/HM as read
    messaging_service.mark_read(db, thread_id, "applicant", applicant.id)
    db.commit()

    messages = messaging_service.get_messages(db, thread_id, include_internal=False)

    result = []
    for msg in messages:
        sender_name = "Unknown"
        if msg.sender_type == "applicant":
            sender_name = f"{applicant.first_name} {applicant.last_name}"
        elif msg.sender_user:
            sender_name = msg.sender_user.full_name or msg.sender_user.username

        result.append({
            "id": msg.id,
            "message_id": msg.message_id,
            "thread_id": msg.thread_id,
            "sender_type": msg.sender_type,
            "sender_name": sender_name,
            "subject": msg.subject,
            "body": msg.body,
            "is_internal": False,
            "is_read": msg.is_read,
            "read_at": msg.read_at.isoformat() if msg.read_at else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        })

    return {"messages": result}


@router.post("/my-messages/{thread_id}/reply")
def reply_to_thread(
    thread_id: str,
    data: ReplyRequest,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Reply to a message thread."""
    # Verify applicant owns this thread
    first_msg = db.query(models.ApplicantMessage).filter(
        models.ApplicantMessage.thread_id == thread_id
    ).first()
    if not first_msg:
        raise HTTPException(status_code=404, detail="Thread not found")

    app = db.query(models.Application).filter(
        models.Application.id == first_msg.application_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Thread not found")

    msg = messaging_service.send_message(
        db, thread_id, "applicant", applicant.id, data.body
    )
    db.commit()

    return {
        "id": msg.id,
        "message_id": msg.message_id,
        "thread_id": msg.thread_id,
        "sender_type": "applicant",
        "sender_name": f"{applicant.first_name} {applicant.last_name}",
        "body": msg.body,
        "is_internal": False,
        "is_read": False,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


@router.get("/interviews/available-slots/{app_id}")
def get_available_interview_slots(
    app_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get available interview time slots for self-scheduling."""
    from app.services.availability_service import availability_service
    from datetime import datetime

    application = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    slots = availability_service.get_available_slots(
        db, requisition_id=application.requisition_id, after=datetime.utcnow()
    )

    return {
        "slots": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "user_name": s.user.full_name if s.user else None,
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "time_zone": s.time_zone,
                "slot_duration_minutes": s.slot_duration_minutes,
                "is_booked": s.is_booked,
                "requisition_id": s.requisition_id,
            }
            for s in slots
        ]
    }


@router.post("/interviews/book/{app_id}")
def book_interview_slot(
    app_id: int,
    request: dict,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Book an interview slot (self-scheduling)."""
    from app.services.availability_service import availability_service
    from app.services.recruiting_service import recruiting_service

    slot_id = request.get("slot_id")
    if not slot_id:
        raise HTTPException(status_code=400, detail="slot_id is required")

    application = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify the slot exists and is available
    slot = db.query(models.InterviewerAvailability).filter(
        models.InterviewerAvailability.id == slot_id,
        models.InterviewerAvailability.is_booked == False,
    ).first()
    if not slot:
        raise HTTPException(status_code=400, detail="Slot not available")

    interviewer = slot.user

    # Find the HR interview stage for this application's pipeline
    hr_stage = None
    if application.current_stage_id:
        hr_stage = db.query(models.PipelineStage).filter(
            models.PipelineStage.id == application.current_stage_id,
        ).first()
    # If current stage isn't an interview stage, look for the first hr_interview stage
    if not hr_stage or hr_stage.lifecycle_stage_key != "hr_interview":
        template_id = application.requisition.pipeline_template_id if application.requisition else None
        if template_id:
            hr_stage = db.query(models.PipelineStage).filter(
                models.PipelineStage.template_id == template_id,
                models.PipelineStage.lifecycle_stage_key == "hr_interview",
            ).first()
        # Fallback: find any hr_interview stage in the system
        if not hr_stage:
            hr_stage = db.query(models.PipelineStage).filter(
                models.PipelineStage.lifecycle_stage_key == "hr_interview",
            ).first()

    # Create the interview record
    interview = models.Interview(
        interview_id=recruiting_service.generate_interview_id(db),
        application_id=app_id,
        stage_id=hr_stage.id if hr_stage else None,
        scheduled_at=slot.start_time,
        duration_minutes=slot.slot_duration_minutes,
        time_zone=slot.time_zone,
        format="Video",
        interviewers=[{
            "user_id": slot.user_id,
            "name": interviewer.full_name if interviewer else "Interviewer",
            "role": "interviewer",
        }],
        status="Scheduled",
        applicant_notified=True,
        video_link=None,  # Set below after flush
        meeting_link_auto=True,
    )
    db.add(interview)
    db.flush()

    # Auto-generate Teams meeting link
    interview.video_link = f"https://teams.microsoft.com/l/meetup-join/{interview.interview_id}"

    # Auto-create HR Interview scorecard for the interviewer
    if slot.user_id and hr_stage:
        scorecard = models.InterviewScorecard(
            application_id=app_id,
            stage_id=hr_stage.id,
            interviewer_id=slot.user_id,
            status="Pending",
        )
        db.add(scorecard)

    # Book the slot
    availability_service.book_slot(db, slot_id, interview.id)

    # Log activity
    recruiting_service.log_activity(
        db, app_id, "interview_self_scheduled",
        f"Candidate self-scheduled interview for {slot.start_time.strftime('%b %d at %I:%M %p') if slot.start_time else 'TBD'}",
        is_internal=False,
    )
    db.commit()

    return {
        "message": "Interview booked successfully",
        "interview": {
            "id": interview.id,
            "interview_id": interview.interview_id,
            "scheduled_at": interview.scheduled_at.isoformat() if interview.scheduled_at else None,
            "duration_minutes": interview.duration_minutes,
            "format": interview.format,
            "time_zone": interview.time_zone,
            "status": interview.status,
            "interviewers": interview.interviewers,
            "video_link": interview.video_link,
        },
    }


@router.get("/my-applications/{app_id}/interviews")
def get_application_interviews(
    app_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get all scheduled/completed interviews for an application."""
    application = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    interviews = db.query(models.Interview).filter(
        models.Interview.application_id == app_id,
        models.Interview.status.in_(["Scheduled", "Confirmed", "Completed"]),
    ).order_by(models.Interview.scheduled_at).all()

    return {
        "interviews": [
            {
                "id": iv.id,
                "interview_id": iv.interview_id,
                "scheduled_at": iv.scheduled_at.isoformat() if iv.scheduled_at else None,
                "duration_minutes": iv.duration_minutes,
                "format": iv.format,
                "time_zone": iv.time_zone,
                "status": iv.status,
                "interviewers": iv.interviewers or [],
                "stage_name": iv.stage.name if iv.stage else None,
                "stage_lifecycle_key": iv.stage.lifecycle_stage_key if iv.stage else None,
                "video_link": iv.video_link,
                "applicant_confirmed": iv.applicant_confirmed,
                "alternative_times": iv.alternative_times,
                "meeting_link_auto": iv.meeting_link_auto,
            }
            for iv in interviews
        ],
    }


@router.post("/interviews/{interview_id}/confirm")
def confirm_interview(
    interview_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Applicant confirms attendance for a scheduled interview."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Verify interview belongs to this applicant
    app = db.query(models.Application).filter(
        models.Application.id == interview.application_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not app:
        raise HTTPException(status_code=403, detail="Not authorized")

    interview.applicant_confirmed = True
    interview.status = "Confirmed"
    db.flush()

    # Log activity
    recruiting_service.log_activity(
        db, interview.application_id, "interview_confirmed",
        "Candidate confirmed interview attendance",
        is_internal=False,
    )
    db.commit()

    return {"message": "Interview confirmed", "status": "Confirmed"}


@router.post("/interviews/{interview_id}/select-alternative")
def select_alternative_time(
    interview_id: int,
    request: dict,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Applicant selects an alternative interview time (2nd or 3rd choice)."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = db.query(models.Application).filter(
        models.Application.id == interview.application_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not app:
        raise HTTPException(status_code=403, detail="Not authorized")

    alt_index = request.get("alternative_index", 0)
    if not interview.alternative_times or alt_index >= len(interview.alternative_times):
        raise HTTPException(status_code=400, detail="Invalid alternative time selection")

    alt = interview.alternative_times[alt_index]
    new_scheduled_at = datetime.fromisoformat(alt["scheduled_at"])
    new_duration = alt.get("duration_minutes", interview.duration_minutes)

    # Cancel original interview
    interview.status = "Cancelled"
    interview.cancelled_reason = "Candidate selected alternative time"

    # Create new interview at alternative time
    new_interview = models.Interview(
        interview_id=recruiting_service.generate_interview_id(db),
        application_id=interview.application_id,
        stage_id=interview.stage_id,
        scheduled_at=new_scheduled_at,
        duration_minutes=new_duration,
        time_zone=interview.time_zone,
        format=interview.format,
        interviewers=interview.interviewers,
        organizer_id=interview.organizer_id,
        status="Confirmed",
        applicant_confirmed=True,
        applicant_notified=True,
        video_link=f"https://teams.microsoft.com/l/meetup-join/{recruiting_service.generate_interview_id(db)}-alt",
        meeting_link_auto=True,
    )
    db.add(new_interview)
    db.flush()

    recruiting_service.log_activity(
        db, interview.application_id, "interview_rescheduled",
        f"Candidate selected alternative time: {new_scheduled_at.strftime('%b %d at %I:%M %p')}",
        is_internal=False,
    )
    db.commit()

    return {
        "message": "Interview rescheduled to alternative time",
        "new_interview_id": new_interview.id,
        "scheduled_at": new_scheduled_at.isoformat(),
    }


@router.post("/interviews/{interview_id}/cancel-for-reschedule")
def cancel_for_reschedule(
    interview_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Applicant cancels their self-scheduled HR interview to pick a new time."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = db.query(models.Application).filter(
        models.Application.id == interview.application_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not app:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Cancel the interview
    interview.status = "Cancelled"
    interview.cancelled_reason = "Candidate rescheduling"

    # Unbook the slot so it's available again
    slot = db.query(models.InterviewerAvailability).filter(
        models.InterviewerAvailability.interview_id == interview.id,
    ).first()
    if slot:
        slot.is_booked = False
        slot.interview_id = None

    recruiting_service.log_activity(
        db, interview.application_id, "interview_rescheduled",
        "Candidate cancelled interview to reschedule",
        is_internal=False,
    )

    # Notify HR/recruiter
    if hasattr(models, 'InAppNotification') and app.requisition:
        recruiter_id = app.requisition.recruiter_id or app.requisition.hiring_manager_id
        if recruiter_id:
            notification = models.InAppNotification(
                user_id=recruiter_id,
                title="Interview Rescheduled by Candidate",
                message=f"{applicant.first_name} {applicant.last_name} has rescheduled their HR screening interview for {app.requisition.title}.",
                notification_type="recruiting",
                priority="medium",
                resource_type="interview",
                resource_id=interview.id,
                action_url=f"/recruiting/applications/{app.id}",
            )
            db.add(notification)

    db.commit()

    return {"message": "Interview cancelled. Please select a new time."}


@router.post("/interviews/{interview_id}/request-reschedule")
def request_reschedule(
    interview_id: int,
    request: dict,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Applicant requests a reschedule — none of the offered times work."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = db.query(models.Application).filter(
        models.Application.id == interview.application_id,
        models.Application.applicant_id == applicant.id,
    ).first()
    if not app:
        raise HTTPException(status_code=403, detail="Not authorized")

    reason = request.get("reason", "")
    suggested_times = request.get("suggested_times", "")

    if not reason:
        raise HTTPException(status_code=400, detail="Please explain why and offer suggestions")

    # Cancel original interview
    interview.status = "Cancelled"
    interview.cancelled_reason = f"Candidate requested reschedule: {reason}"

    recruiting_service.log_activity(
        db, interview.application_id, "interview_reschedule_requested",
        f"Candidate requested reschedule. Reason: {reason}. Suggested times: {suggested_times}",
        is_internal=False,
    )

    # Notify HR/recruiter via in-app notification
    if hasattr(models, 'InAppNotification') and app.requisition:
        recruiter_id = app.requisition.recruiter_id or app.requisition.hiring_manager_id
        if recruiter_id:
            notification = models.InAppNotification(
                user_id=recruiter_id,
                title="Interview Reschedule Requested",
                message=f"{applicant.first_name} {applicant.last_name} needs a new interview time for {app.requisition.title}. Reason: {reason}",
                notification_type="recruiting",
                priority="high",
                resource_type="interview",
                resource_id=interview.id,
                action_url=f"/recruiting/applications/{app.id}",
            )
            db.add(notification)

    db.commit()

    return {"message": "Reschedule request submitted. HR will contact you with new options."}


@router.put("/profile/pool-preference")
def update_pool_preference(
    request: dict,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Update cross-role consideration opt-in preference."""
    from datetime import datetime

    open_to_other_roles = request.get("open_to_other_roles", False)

    if open_to_other_roles and not applicant.open_to_other_roles:
        applicant.pool_opted_in_at = datetime.utcnow()
    elif not open_to_other_roles:
        applicant.pool_opted_in_at = None

    applicant.open_to_other_roles = open_to_other_roles
    db.commit()

    return {
        "message": "Pool preference updated",
        "open_to_other_roles": applicant.open_to_other_roles,
        "pool_opted_in_at": applicant.pool_opted_in_at.isoformat() if applicant.pool_opted_in_at else None,
    }


class NegotiationRequest(BaseModel):
    desired_salary: Optional[float] = None
    desired_signing_bonus: Optional[float] = None
    desired_start_date: Optional[str] = None
    notes: str


@router.post("/my-offers/{offer_id}/negotiate")
def submit_counter_proposal(
    offer_id: int,
    data: NegotiationRequest,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Submit a counter-proposal for an offer."""
    from app.services.recruiting_service import recruiting_service

    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if not offer.application or offer.application.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if offer.status != "Sent":
        raise HTTPException(status_code=400, detail="Can only negotiate an active offer")

    # Check expiration
    if offer.expires_at:
        from datetime import datetime
        if datetime.utcnow() > offer.expires_at:
            raise HTTPException(status_code=400, detail="Offer has expired")

    # Update offer status
    offer.status = "Negotiating"
    offer.negotiation_notes = data.notes

    # Log activity with details
    details = {
        "desired_salary": data.desired_salary,
        "desired_signing_bonus": data.desired_signing_bonus,
        "desired_start_date": data.desired_start_date,
        "notes": data.notes,
    }
    recruiting_service.log_activity(
        db, offer.application_id, "negotiation_requested",
        f"Candidate submitted a counter-proposal: {data.notes[:100]}",
        details=details,
        is_internal=False,
    )
    db.commit()

    return {
        "message": "Negotiation request submitted",
        "status": "Negotiating",
    }


@router.get("/my-offers/{offer_id}/download-letter")
def download_offer_letter(
    offer_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Download the offer letter PDF for the authenticated applicant."""
    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application),
        joinedload(models.OfferLetter.offer_letter_file),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if not offer.application or offer.application.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if offer.status not in ("Sent", "Accepted", "Declined", "Expired", "Rescinded", "Negotiating"):
        raise HTTPException(status_code=404, detail="Offer not found")

    if not offer.offer_letter_file:
        raise HTTPException(status_code=404, detail="Offer letter file not available")

    file_upload = offer.offer_letter_file
    if not file_upload.file_path or not os.path.exists(file_upload.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_upload.file_path,
        filename=file_upload.original_filename or f"offer-letter-{offer.offer_id}.pdf",
        media_type=file_upload.mime_type or "application/pdf",
    )


@router.get("/my-offers/{offer_id}/versions")
def get_offer_versions(
    offer_id: int,
    applicant: models.Applicant = Depends(get_current_applicant),
    db: Session = Depends(get_db),
):
    """Get all versions of an offer letter for the authenticated applicant."""
    offer = db.query(models.OfferLetter).options(
        joinedload(models.OfferLetter.application),
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if not offer.application or offer.application.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Walk the version chain
    versions = []
    current = offer
    visited = set()

    while current and current.id not in visited:
        visited.add(current.id)
        if current.status not in ("Draft",):  # Only show non-draft versions
            versions.append({
                "id": current.id,
                "version": current.version,
                "status": current.status,
                "salary": current.salary,
                "signing_bonus": current.signing_bonus,
                "sent_at": current.sent_at.isoformat() if current.sent_at else None,
                "version_notes": current.version_notes,
                "is_counter_offer": current.is_counter_offer,
                "is_current": current.id == offer.id,
            })
        # Walk backwards
        if current.previous_offer_id:
            current = db.query(models.OfferLetter).filter(
                models.OfferLetter.id == current.previous_offer_id
            ).first()
        else:
            current = None

    # Reverse to show oldest first
    versions.reverse()

    return {"versions": versions}
