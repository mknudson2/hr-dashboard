"""
Recruiting Lifecycle API
Endpoints for managing the lifecycle tracker (Dominos-style) for job requisitions.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.db.database import get_db
from app.db import models
from app.api.auth import get_current_user
from app.services.rbac_service import require_any_permission, Permissions
from app.services.lifecycle_service import lifecycle_service
from app.services.recruiting_email_service import recruiting_email_service

router = APIRouter(
    prefix="/recruiting/lifecycle",
    tags=["recruiting-lifecycle"],
)


# --- Pydantic schemas ---

class AdvanceStageRequest(BaseModel):
    outcome: Optional[str] = None
    notes: Optional[str] = None


class SkipStageRequest(BaseModel):
    reason: Optional[str] = None


class UpdateStageRequest(BaseModel):
    approval_status: Optional[str] = None
    approval_notes: Optional[str] = None
    hr_representative_present: Optional[bool] = None
    hr_representative_id: Optional[int] = None
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None


class AddNoteRequest(BaseModel):
    content: str
    highlights: Optional[List[str]] = None
    recommendation: Optional[str] = None
    recommendation_reason: Optional[str] = None


# --- Helpers ---

def _check_lifecycle_access(db: Session, requisition_id: int, current_user: models.User):
    """Check that the user has access to this requisition's lifecycle.
    Allowed: users with recruiting permissions, hiring manager, recruiter, or visibility list.
    """
    req = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == requisition_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    # Check if user is a stakeholder
    is_stakeholder = (
        req.hiring_manager_id == current_user.id
        or req.recruiter_id == current_user.id
        or req.requested_by == current_user.id
        or (req.visibility_user_ids and current_user.id in req.visibility_user_ids)
    )

    # Check recruiting permissions
    has_permission = False
    if hasattr(current_user, 'role') and current_user.role in ("admin", "manager"):
        has_permission = True
    if hasattr(current_user, 'permissions'):
        if any(p in (current_user.permissions or []) for p in [
            Permissions.RECRUITING_READ, Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
        ]):
            has_permission = True

    if not is_stakeholder and not has_permission:
        raise HTTPException(status_code=403, detail="Not authorized to view this lifecycle")

    return req


def _get_stage(db: Session, requisition_id: int, stage_id: int) -> models.RequisitionLifecycleStage:
    """Get a lifecycle stage and verify it belongs to the requisition."""
    stage = db.query(models.RequisitionLifecycleStage).filter(
        models.RequisitionLifecycleStage.id == stage_id,
        models.RequisitionLifecycleStage.requisition_id == requisition_id,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Lifecycle stage not found")
    return stage


# --- Endpoints ---

@router.get("/{requisition_id}")
def get_lifecycle(
    requisition_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full lifecycle tracker for a requisition."""
    req = _check_lifecycle_access(db, requisition_id, current_user)
    stages = lifecycle_service.get_lifecycle(db, requisition_id)

    return {
        "requisition_id": requisition_id,
        "requisition_title": req.title,
        "requisition_status": req.status,
        "stages": [lifecycle_service.serialize_stage(s) for s in stages],
    }


@router.post("/{requisition_id}/stages/{stage_id}/advance")
def advance_stage(
    requisition_id: int,
    stage_id: int,
    data: AdvanceStageRequest,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Advance/complete a lifecycle stage."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    try:
        stage = lifecycle_service.advance_stage(
            db, stage_id, current_user.id, outcome=data.outcome, notes=data.notes
        )

        # Notify stakeholders (in-app + email)
        req = db.query(models.JobRequisition).filter(models.JobRequisition.id == requisition_id).first()
        if req:
            user_name = current_user.full_name if hasattr(current_user, 'full_name') and current_user.full_name else "HR"
            lifecycle_service.notify_stakeholders(
                db, req,
                title=f"Stage Completed: {stage.stage_label}",
                message=f"{user_name} completed the '{stage.stage_label}' stage for {req.title}",
                triggered_by=current_user.id,
            )

            # Send email to stakeholders
            _send_lifecycle_emails(db, req, stage.stage_label, "completed", current_user.id)

        db.commit()
        return {
            "message": f"Stage '{stage.stage_label}' completed",
            "stage": lifecycle_service.serialize_stage(stage),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{requisition_id}/early-tech-screen")
def trigger_early_tech_screen(
    requisition_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Activate the Tech Screen stage immediately, skipping ahead in the pipeline.
    The normal pipeline flow continues — when it reaches the Tech Screen stage
    (already completed), it will auto-skip past it.
    """
    _check_lifecycle_access(db, requisition_id, current_user)

    try:
        stage = lifecycle_service.trigger_early_tech_screen(
            db, requisition_id, current_user.id
        )

        # Notify stakeholders
        req = db.query(models.JobRequisition).filter(models.JobRequisition.id == requisition_id).first()
        if req:
            user_name = current_user.full_name if hasattr(current_user, 'full_name') and current_user.full_name else "HR"
            lifecycle_service.notify_stakeholders(
                db, req,
                title="Early Tech Screen Triggered",
                message=f"{user_name} triggered an early Tech Screen for {req.title}",
                triggered_by=current_user.id,
            )

        db.commit()
        return {
            "message": "Tech Screen activated early",
            "stage": lifecycle_service.serialize_stage(stage),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{requisition_id}/stages/{stage_id}/skip")
def skip_stage(
    requisition_id: int,
    stage_id: int,
    data: SkipStageRequest,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Skip a lifecycle stage."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    try:
        stage = lifecycle_service.skip_stage(
            db, stage_id, current_user.id, reason=data.reason
        )

        # Notify stakeholders
        req = db.query(models.JobRequisition).filter(models.JobRequisition.id == requisition_id).first()
        if req:
            user_name = current_user.full_name if hasattr(current_user, 'full_name') and current_user.full_name else "HR"
            lifecycle_service.notify_stakeholders(
                db, req,
                title=f"Stage Skipped: {stage.stage_label}",
                message=f"{user_name} skipped the '{stage.stage_label}' stage for {req.title}",
                triggered_by=current_user.id,
            )

        db.commit()
        return {
            "message": f"Stage '{stage.stage_label}' skipped",
            "stage": lifecycle_service.serialize_stage(stage),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{requisition_id}/stages/{stage_id}")
def update_stage(
    requisition_id: int,
    stage_id: int,
    data: UpdateStageRequest,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Update a lifecycle stage (approval, HR presence, outcome)."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    update_fields = data.model_dump(exclude_unset=True)
    try:
        stage = lifecycle_service.update_stage(db, stage_id, **update_fields)
        db.commit()
        return {
            "message": "Stage updated",
            "stage": lifecycle_service.serialize_stage(stage),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{requisition_id}/stages/{stage_id}/notes")
def add_note(
    requisition_id: int,
    stage_id: int,
    data: AddNoteRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a note to a lifecycle stage. Accessible to stakeholders."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    note = lifecycle_service.add_stage_note(
        db,
        stage_id=stage_id,
        author_id=current_user.id,
        content=data.content,
        highlights=data.highlights,
        recommendation=data.recommendation,
        recommendation_reason=data.recommendation_reason,
    )

    # Notify stakeholders about the new note
    req = db.query(models.JobRequisition).filter(models.JobRequisition.id == requisition_id).first()
    if req:
        stage = _get_stage(db, requisition_id, stage_id)
        user_name = current_user.full_name if hasattr(current_user, 'full_name') and current_user.full_name else "A user"
        lifecycle_service.notify_stakeholders(
            db, req,
            title=f"Note Added: {stage.stage_label}",
            message=f"{user_name} added a note to '{stage.stage_label}' for {req.title}",
            triggered_by=current_user.id,
        )

    db.commit()
    return {
        "message": "Note added",
        "note": lifecycle_service.serialize_note(note),
    }


@router.get("/{requisition_id}/stages/{stage_id}/notes")
def get_notes(
    requisition_id: int,
    stage_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notes for a lifecycle stage."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    notes = lifecycle_service.get_stage_notes(db, stage_id)
    return {
        "notes": [lifecycle_service.serialize_note(n) for n in notes],
    }


@router.post("/{requisition_id}/stages/{stage_id}/documents")
def add_document(
    requisition_id: int,
    stage_id: int,
    filename: str = Form(...),
    description: Optional[str] = Form(None),
    file_path: Optional[str] = Form(None),
    file_upload_id: Optional[int] = Form(None),
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Upload/attach a document to a lifecycle stage."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    doc = lifecycle_service.add_stage_document(
        db,
        stage_id=stage_id,
        user_id=current_user.id,
        filename=filename,
        file_path=file_path,
        description=description,
        file_upload_id=file_upload_id,
    )
    db.commit()
    return {
        "message": "Document added",
        "document": lifecycle_service.serialize_document(doc),
    }


@router.get("/{requisition_id}/stages/{stage_id}/documents")
def get_documents(
    requisition_id: int,
    stage_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all documents for a lifecycle stage."""
    _check_lifecycle_access(db, requisition_id, current_user)
    _get_stage(db, requisition_id, stage_id)

    docs = lifecycle_service.get_stage_documents(db, stage_id)
    return {
        "documents": [lifecycle_service.serialize_document(d) for d in docs],
    }


# --- Internal Helpers ---

def _send_lifecycle_emails(
    db: Session,
    requisition: models.JobRequisition,
    stage_name: str,
    stage_status: str,
    triggered_by_id: int,
):
    """Send lifecycle stage update emails to stakeholders."""
    import asyncio
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Collect stakeholder user IDs
        stakeholder_ids = set()
        if requisition.hiring_manager_id:
            stakeholder_ids.add(requisition.hiring_manager_id)
        if requisition.recruiter_id:
            stakeholder_ids.add(requisition.recruiter_id)
        if requisition.requested_by:
            stakeholder_ids.add(requisition.requested_by)

        # Don't email the person who triggered the event
        stakeholder_ids.discard(triggered_by_id)

        if not stakeholder_ids:
            return

        users = db.query(models.User).filter(
            models.User.id.in_(stakeholder_ids),
            models.User.is_active == True,
        ).all()

        for user in users:
            if hasattr(user, 'email') and user.email:
                recipient_name = user.full_name if hasattr(user, 'full_name') and user.full_name else "Team Member"
                try:
                    asyncio.get_event_loop().run_until_complete(
                        recruiting_email_service.send_lifecycle_stage_update(
                            to_email=user.email,
                            recipient_name=recipient_name,
                            job_title=requisition.title,
                            stage_name=stage_name,
                            stage_status=stage_status,
                        )
                    )
                except RuntimeError:
                    pass
    except Exception:
        logger.exception("Failed to send lifecycle email notifications")
