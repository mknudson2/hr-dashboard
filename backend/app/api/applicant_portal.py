"""
Applicant Portal API Router — Public + Applicant-authenticated endpoints

Provides job browsing, application submission, magic link auth,
optional account creation, and applicant self-service.
"""

import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.db import models, database
from app.services.recruiting_service import recruiting_service
from app.services.applicant_auth_service import applicant_auth_service, get_current_applicant
from app.services.offer_service import offer_service


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
    resume: Optional[UploadFile] = File(None),
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

    return {
        "message": "Application submitted successfully",
        "application_id": application.application_id,
    }


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
    ).filter(models.OfferLetter.id == offer_id).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Verify the offer belongs to this applicant
    if not offer.application or offer.application.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Only show offers that have been sent
    if offer.status not in ("Sent", "Accepted", "Declined", "Expired", "Rescinded"):
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
