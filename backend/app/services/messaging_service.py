"""
Messaging Service — bidirectional communication between applicants and HR/HM (ATS §1.5).
"""

import logging
import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)


def _generate_message_id() -> str:
    """Generate a unique message ID."""
    return f"MSG-{uuid.uuid4().hex[:12].upper()}"


def _generate_thread_id() -> str:
    """Generate a unique thread ID."""
    return f"THR-{uuid.uuid4().hex[:12].upper()}"


class MessagingService:
    """Service for managing applicant ↔ HR/HM messaging."""

    def create_thread(
        self,
        db: Session,
        application_id: int,
        sender_type: str,
        sender_id: int,
        subject: str,
        body: str,
        is_internal: bool = False,
        stage_key: Optional[str] = None,
    ) -> models.ApplicantMessage:
        """Create a new message thread with the first message."""
        thread_id = _generate_thread_id()

        if sender_type == "applicant":
            sender_applicant_id = sender_id
            sender_user_id = None
        else:
            sender_applicant_id = None
            sender_user_id = sender_id

        message = models.ApplicantMessage(
            message_id=_generate_message_id(),
            application_id=application_id,
            thread_id=thread_id,
            sender_type=sender_type,
            sender_applicant_id=sender_applicant_id,
            sender_user_id=sender_user_id,
            subject=subject,
            body=body,
            is_internal=is_internal,
            stage_key=stage_key,
        )
        db.add(message)
        db.flush()
        return message

    def send_message(
        self,
        db: Session,
        thread_id: str,
        sender_type: str,
        sender_id: int,
        body: str,
        is_internal: bool = False,
        parent_message_id: Optional[int] = None,
        stage_key: Optional[str] = None,
    ) -> models.ApplicantMessage:
        """Send a reply to an existing thread."""
        # Get the thread's application_id from any existing message
        existing = (
            db.query(models.ApplicantMessage)
            .filter(models.ApplicantMessage.thread_id == thread_id)
            .first()
        )
        if not existing:
            raise ValueError(f"Thread {thread_id} not found")

        if sender_type == "applicant":
            sender_applicant_id = sender_id
            sender_user_id = None
        else:
            sender_applicant_id = None
            sender_user_id = sender_id

        # Inherit stage_key from thread if not explicitly provided
        if stage_key is None:
            stage_key = existing.stage_key

        message = models.ApplicantMessage(
            message_id=_generate_message_id(),
            application_id=existing.application_id,
            thread_id=thread_id,
            parent_message_id=parent_message_id,
            sender_type=sender_type,
            sender_applicant_id=sender_applicant_id,
            sender_user_id=sender_user_id,
            body=body,
            is_internal=is_internal,
            stage_key=stage_key,
        )
        db.add(message)
        db.flush()
        return message

    def get_threads(
        self,
        db: Session,
        application_id: int,
        include_internal: bool = True,
        stage_key: Optional[str] = None,
    ) -> list[dict]:
        """Get all message threads for an application.
        If include_internal is False, filters out internal-only threads.
        If stage_key is provided, only returns threads scoped to that stage.
        """
        from sqlalchemy import func, case

        query = (
            db.query(
                models.ApplicantMessage.thread_id,
                func.min(models.ApplicantMessage.subject).label("subject"),
                func.min(models.ApplicantMessage.stage_key).label("stage_key"),
                func.count(models.ApplicantMessage.id).label("message_count"),
                func.max(models.ApplicantMessage.created_at).label("last_message_at"),
            )
            .filter(models.ApplicantMessage.application_id == application_id)
        )

        if not include_internal:
            query = query.filter(models.ApplicantMessage.is_internal == False)

        if stage_key:
            query = query.filter(models.ApplicantMessage.stage_key == stage_key)

        threads = (
            query
            .group_by(models.ApplicantMessage.thread_id)
            .order_by(func.max(models.ApplicantMessage.created_at).desc())
            .all()
        )

        return [
            {
                "thread_id": t.thread_id,
                "subject": t.subject,
                "stage_key": t.stage_key,
                "message_count": t.message_count,
                "last_message_at": t.last_message_at.isoformat() if t.last_message_at else None,
            }
            for t in threads
        ]

    def get_messages(
        self,
        db: Session,
        thread_id: str,
        include_internal: bool = True,
    ) -> List[models.ApplicantMessage]:
        """Get all messages in a thread."""
        query = (
            db.query(models.ApplicantMessage)
            .filter(models.ApplicantMessage.thread_id == thread_id)
        )
        if not include_internal:
            query = query.filter(models.ApplicantMessage.is_internal == False)
        return query.order_by(models.ApplicantMessage.created_at).all()

    def mark_read(
        self,
        db: Session,
        thread_id: str,
        reader_type: str,
        reader_id: int,
    ) -> int:
        """Mark all messages in a thread as read for a given reader.
        Returns count of newly marked messages.
        """
        from datetime import datetime

        query = (
            db.query(models.ApplicantMessage)
            .filter(
                models.ApplicantMessage.thread_id == thread_id,
                models.ApplicantMessage.is_read == False,
            )
        )

        # Only mark messages from the other side as read
        if reader_type == "applicant":
            query = query.filter(models.ApplicantMessage.sender_type != "applicant")
        else:
            query = query.filter(models.ApplicantMessage.sender_type == "applicant")

        messages = query.all()
        now = datetime.utcnow()
        for msg in messages:
            msg.is_read = True
            msg.read_at = now

        db.flush()
        return len(messages)


# Singleton instance
messaging_service = MessagingService()
