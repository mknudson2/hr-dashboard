"""
Recruiting Messaging API — HR/HM side of applicant messaging (ATS §1.5).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.services.rbac_service import Permissions, require_any_permission
from app.services.messaging_service import messaging_service
from app.schemas.messaging import SendMessageRequest, InternalNoteRequest

router = APIRouter(prefix="/recruiting/applications", tags=["Recruiting Messaging"])


def _serialize_message(msg: models.ApplicantMessage) -> dict:
    """Serialize a message for API response."""
    sender_name = "Unknown"
    if msg.sender_type == "applicant" and msg.sender_applicant:
        sender_name = f"{msg.sender_applicant.first_name} {msg.sender_applicant.last_name}"
    elif msg.sender_user:
        sender_name = msg.sender_user.full_name or msg.sender_user.username

    return {
        "id": msg.id,
        "message_id": msg.message_id,
        "thread_id": msg.thread_id,
        "sender_type": msg.sender_type,
        "sender_name": sender_name,
        "subject": msg.subject,
        "body": msg.body,
        "body_html": msg.body_html,
        "is_internal": msg.is_internal,
        "is_read": msg.is_read,
        "read_at": msg.read_at.isoformat() if msg.read_at else None,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "stage_key": msg.stage_key,
    }


@router.get("/{application_id}/messages")
def get_application_messages(
    application_id: int,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_MESSAGES_READ, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Get all message threads for an application (HR/HM view — includes internal notes)."""
    # Verify application exists
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get threads (include internal messages for HR/HM)
    threads = messaging_service.get_threads(db, application_id, include_internal=True)

    # Enrich with applicant name and job title
    applicant = db.query(models.Applicant).filter(
        models.Applicant.id == application.applicant_id
    ).first()
    requisition = db.query(models.JobRequisition).filter(
        models.JobRequisition.id == application.requisition_id
    ).first()

    applicant_name = f"{applicant.first_name} {applicant.last_name}" if applicant else None
    job_title = requisition.title if requisition else None

    # Count unread messages (from applicant side)
    for thread in threads:
        unread = db.query(models.ApplicantMessage).filter(
            models.ApplicantMessage.thread_id == thread["thread_id"],
            models.ApplicantMessage.sender_type == "applicant",
            models.ApplicantMessage.is_read == False,
        ).count()
        thread["unread_count"] = unread
        thread["application_id"] = application_id
        thread["applicant_name"] = applicant_name
        thread["job_title"] = job_title

    return {"threads": threads}


@router.post("/{application_id}/messages")
def send_message_to_applicant(
    application_id: int,
    data: SendMessageRequest,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_MESSAGES_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Send a message to an applicant (or reply to existing thread)."""
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Determine sender type from user role context
    sender_type = "hr"  # Default; could be enhanced based on stakeholder role

    if data.thread_id:
        # Reply to existing thread
        msg = messaging_service.send_message(
            db, data.thread_id, sender_type, current_user.id, data.body,
            stage_key=data.stage_key,
        )
    else:
        # New thread
        if not data.subject:
            raise HTTPException(status_code=422, detail="Subject required for new thread")
        msg = messaging_service.create_thread(
            db, application_id, sender_type, current_user.id, data.subject, data.body,
            stage_key=data.stage_key,
        )

    db.commit()

    # Load relationships for serialization
    db.refresh(msg)
    return _serialize_message(msg)


@router.post("/{application_id}/messages/internal")
def add_internal_note(
    application_id: int,
    data: InternalNoteRequest,
    current_user: models.User = Depends(require_any_permission(
        Permissions.RECRUITING_MESSAGES_WRITE, Permissions.RECRUITING_ADMIN
    )),
    db: Session = Depends(get_db),
):
    """Add an internal-only note (not visible to applicant)."""
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if data.thread_id:
        msg = messaging_service.send_message(
            db, data.thread_id, "hr", current_user.id, data.body, is_internal=True
        )
    else:
        msg = messaging_service.create_thread(
            db, application_id, "hr", current_user.id,
            "Internal Note", data.body, is_internal=True
        )

    db.commit()
    db.refresh(msg)
    return _serialize_message(msg)
