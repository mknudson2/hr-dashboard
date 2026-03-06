"""
Recruiting Lifecycle Service
Manages the lifecycle stages for job requisitions (Dominos-style tracker).
"""

import logging
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.db import models

logger = logging.getLogger(__name__)

# Default lifecycle stage template — single pipeline for all requisitions.
# Tech Screen can be triggered early via the early tech screen toggle.
DEFAULT_STAGES = [
    {"key": "request_submitted", "label": "Request Submitted", "order": 0},
    {"key": "position_posted", "label": "Position Posted", "order": 1},
    {"key": "hr_interview", "label": "HR Interview", "order": 2},
    {"key": "hiring_manager_interview", "label": "Hiring Manager Interview", "order": 3},
    {"key": "tech_screen", "label": "Tech Screen", "order": 4},
    {"key": "offer_extended", "label": "Offer Extended", "order": 5},
    {"key": "offer_response", "label": "Offer Result", "order": 6},
    {"key": "onboarding_date_set", "label": "Onboarding Date Set", "order": 7},
    {"key": "final_approval", "label": "Final Approval / Next Steps", "order": 8},
]


class LifecycleService:
    """Service for managing requisition lifecycle stages."""

    def create_lifecycle_for_requisition(
        self,
        db: Session,
        requisition_id: int,
    ) -> List[models.RequisitionLifecycleStage]:
        """Create default lifecycle stages for a requisition."""
        stages_template = list(DEFAULT_STAGES)
        now = datetime.utcnow()
        created_stages = []

        for stage_def in stages_template:
            stage = models.RequisitionLifecycleStage(
                requisition_id=requisition_id,
                stage_key=stage_def["key"],
                stage_label=stage_def["label"],
                order_index=stage_def["order"],
                status="pending",
            )
            # Auto-complete the first stage (request submitted)
            if stage_def["key"] == "request_submitted":
                stage.status = "completed"
                stage.entered_at = now
                stage.completed_at = now

            db.add(stage)
            created_stages.append(stage)

        # Set the second stage as active
        if len(created_stages) > 1:
            created_stages[1].status = "active"
            created_stages[1].entered_at = now

        db.flush()
        return created_stages

    def get_lifecycle(
        self,
        db: Session,
        requisition_id: int,
    ) -> List[models.RequisitionLifecycleStage]:
        """Get full lifecycle with stages, notes, and documents for a requisition."""
        return (
            db.query(models.RequisitionLifecycleStage)
            .filter(models.RequisitionLifecycleStage.requisition_id == requisition_id)
            .order_by(models.RequisitionLifecycleStage.order_index)
            .all()
        )

    def advance_stage(
        self,
        db: Session,
        stage_id: int,
        user_id: int,
        outcome: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> models.RequisitionLifecycleStage:
        """Mark a stage as completed and activate the next one."""
        stage = db.query(models.RequisitionLifecycleStage).filter(
            models.RequisitionLifecycleStage.id == stage_id
        ).first()
        if not stage:
            raise ValueError("Stage not found")

        now = datetime.utcnow()
        stage.status = "completed"
        stage.completed_at = now
        stage.completed_by = user_id
        if outcome:
            stage.outcome = outcome
        if notes:
            stage.outcome_notes = notes

        # Only auto-activate the next stage if there are no earlier active stages.
        # This prevents out-of-order advancement when a stage (like Tech Screen)
        # was activated early — the normal flow should catch up first.
        earlier_active = (
            db.query(models.RequisitionLifecycleStage)
            .filter(
                models.RequisitionLifecycleStage.requisition_id == stage.requisition_id,
                models.RequisitionLifecycleStage.order_index < stage.order_index,
                models.RequisitionLifecycleStage.status == "active",
            )
            .first()
        )

        if not earlier_active:
            next_stage = (
                db.query(models.RequisitionLifecycleStage)
                .filter(
                    models.RequisitionLifecycleStage.requisition_id == stage.requisition_id,
                    models.RequisitionLifecycleStage.order_index > stage.order_index,
                    models.RequisitionLifecycleStage.status == "pending",
                )
                .order_by(models.RequisitionLifecycleStage.order_index)
                .first()
            )
            if next_stage:
                next_stage.status = "active"
                next_stage.entered_at = now

        db.flush()
        return stage

    def skip_stage(
        self,
        db: Session,
        stage_id: int,
        user_id: int,
        reason: Optional[str] = None,
    ) -> models.RequisitionLifecycleStage:
        """Mark a stage as skipped."""
        stage = db.query(models.RequisitionLifecycleStage).filter(
            models.RequisitionLifecycleStage.id == stage_id
        ).first()
        if not stage:
            raise ValueError("Stage not found")

        stage.status = "skipped"
        stage.completed_at = datetime.utcnow()
        stage.completed_by = user_id
        if reason:
            stage.outcome_notes = reason

        db.flush()
        return stage

    def trigger_early_tech_screen(
        self,
        db: Session,
        requisition_id: int,
        user_id: int,
    ) -> models.RequisitionLifecycleStage:
        """Activate the Tech Screen stage immediately, regardless of current pipeline position.
        The normal pipeline flow continues in parallel — when it naturally reaches
        the Tech Screen stage (already completed), it will skip past it.
        """
        stage = (
            db.query(models.RequisitionLifecycleStage)
            .filter(
                models.RequisitionLifecycleStage.requisition_id == requisition_id,
                models.RequisitionLifecycleStage.stage_key == "tech_screen",
            )
            .first()
        )
        if not stage:
            raise ValueError("Tech Screen stage not found for this requisition")

        if stage.status == "completed":
            raise ValueError("Tech Screen has already been completed")

        if stage.status == "active":
            raise ValueError("Tech Screen is already active")

        now = datetime.utcnow()
        stage.status = "active"
        stage.entered_at = now

        db.flush()
        return stage

    def update_stage(
        self,
        db: Session,
        stage_id: int,
        **kwargs,
    ) -> models.RequisitionLifecycleStage:
        """Update stage fields (approval, HR presence, etc.)."""
        stage = db.query(models.RequisitionLifecycleStage).filter(
            models.RequisitionLifecycleStage.id == stage_id
        ).first()
        if not stage:
            raise ValueError("Stage not found")

        for key, value in kwargs.items():
            if hasattr(stage, key):
                setattr(stage, key, value)

        db.flush()
        return stage

    def add_stage_note(
        self,
        db: Session,
        stage_id: int,
        author_id: int,
        content: str,
        highlights: Optional[list] = None,
        recommendation: Optional[str] = None,
        recommendation_reason: Optional[str] = None,
    ) -> models.LifecycleStageNote:
        """Add a note to a lifecycle stage."""
        note = models.LifecycleStageNote(
            lifecycle_stage_id=stage_id,
            author_id=author_id,
            content=content,
            highlights=highlights,
            recommendation=recommendation,
            recommendation_reason=recommendation_reason,
        )
        db.add(note)
        db.flush()
        return note

    def get_stage_notes(
        self,
        db: Session,
        stage_id: int,
    ) -> List[models.LifecycleStageNote]:
        """Get all notes for a lifecycle stage."""
        return (
            db.query(models.LifecycleStageNote)
            .filter(models.LifecycleStageNote.lifecycle_stage_id == stage_id)
            .order_by(models.LifecycleStageNote.created_at)
            .all()
        )

    def add_stage_document(
        self,
        db: Session,
        stage_id: int,
        user_id: int,
        filename: str,
        file_path: Optional[str] = None,
        description: Optional[str] = None,
        file_upload_id: Optional[int] = None,
    ) -> models.LifecycleStageDocument:
        """Add a document to a lifecycle stage."""
        doc = models.LifecycleStageDocument(
            lifecycle_stage_id=stage_id,
            uploaded_by=user_id,
            filename=filename,
            file_path=file_path,
            description=description,
            file_upload_id=file_upload_id,
        )
        db.add(doc)
        db.flush()
        return doc

    def get_stage_documents(
        self,
        db: Session,
        stage_id: int,
    ) -> List[models.LifecycleStageDocument]:
        """Get all documents for a lifecycle stage."""
        return (
            db.query(models.LifecycleStageDocument)
            .filter(models.LifecycleStageDocument.lifecycle_stage_id == stage_id)
            .order_by(models.LifecycleStageDocument.created_at)
            .all()
        )

    def get_requisitions_for_user(
        self,
        db: Session,
        user_id: int,
    ) -> List[models.JobRequisition]:
        """Get requisitions where user is hiring manager, recruiter, or visibility stakeholder."""
        from sqlalchemy import or_, cast, String

        return (
            db.query(models.JobRequisition)
            .filter(
                or_(
                    models.JobRequisition.hiring_manager_id == user_id,
                    models.JobRequisition.recruiter_id == user_id,
                    models.JobRequisition.requested_by == user_id,
                )
            )
            .order_by(models.JobRequisition.created_at.desc())
            .all()
        )

    def auto_advance_by_key(
        self,
        db: Session,
        requisition_id: int,
        stage_key: str,
        user_id: int,
        outcome: Optional[str] = None,
    ) -> Optional[models.RequisitionLifecycleStage]:
        """Auto-advance a lifecycle stage by its key (for hook integrations)."""
        stage = (
            db.query(models.RequisitionLifecycleStage)
            .filter(
                models.RequisitionLifecycleStage.requisition_id == requisition_id,
                models.RequisitionLifecycleStage.stage_key == stage_key,
                models.RequisitionLifecycleStage.status.in_(["pending", "active"]),
            )
            .first()
        )
        if not stage:
            return None

        return self.advance_stage(db, stage.id, user_id, outcome=outcome)

    def serialize_stage(self, stage: models.RequisitionLifecycleStage) -> dict:
        """Serialize a lifecycle stage to a dict for API responses."""
        return {
            "id": stage.id,
            "requisition_id": stage.requisition_id,
            "stage_key": stage.stage_key,
            "stage_label": stage.stage_label,
            "order_index": stage.order_index,
            "status": stage.status,
            "entered_at": stage.entered_at.isoformat() if stage.entered_at else None,
            "completed_at": stage.completed_at.isoformat() if stage.completed_at else None,
            "completed_by": stage.completed_by,
            "completed_by_name": (
                stage.completed_by_user.full_name
                if stage.completed_by_user else None
            ),
            "approval_status": stage.approval_status,
            "approval_notes": stage.approval_notes,
            "outcome": stage.outcome,
            "outcome_notes": stage.outcome_notes,
            "hr_representative_present": stage.hr_representative_present,
            "hr_representative_id": stage.hr_representative_id,
            "notes_count": len(stage.notes) if stage.notes else 0,
            "documents_count": len(stage.documents) if stage.documents else 0,
            "created_at": stage.created_at.isoformat() if stage.created_at else None,
        }

    def serialize_note(self, note: models.LifecycleStageNote) -> dict:
        """Serialize a lifecycle stage note to a dict."""
        return {
            "id": note.id,
            "lifecycle_stage_id": note.lifecycle_stage_id,
            "author_id": note.author_id,
            "author_name": (
                note.author.full_name
                if note.author else None
            ),
            "content": note.content,
            "highlights": note.highlights,
            "recommendation": note.recommendation,
            "recommendation_reason": note.recommendation_reason,
            "created_at": note.created_at.isoformat() if note.created_at else None,
        }

    def notify_stakeholders(
        self,
        db: Session,
        requisition: models.JobRequisition,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        triggered_by: Optional[int] = None,
    ):
        """Send in-app notifications to all requisition stakeholders."""
        try:
            if not hasattr(models, 'InAppNotification'):
                return

            # Collect stakeholder user IDs
            stakeholder_ids = set()
            if requisition.hiring_manager_id:
                stakeholder_ids.add(requisition.hiring_manager_id)
            if requisition.recruiter_id:
                stakeholder_ids.add(requisition.recruiter_id)
            if requisition.requested_by:
                stakeholder_ids.add(requisition.requested_by)
            if requisition.visibility_user_ids:
                for uid in requisition.visibility_user_ids:
                    stakeholder_ids.add(uid)

            # Don't notify the person who triggered the event
            if triggered_by:
                stakeholder_ids.discard(triggered_by)

            for user_id in stakeholder_ids:
                notification = models.InAppNotification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    notification_type="recruiting",
                    priority="normal",
                    resource_type="requisition",
                    resource_id=requisition.id,
                    action_url=action_url or f"/recruiting/requisitions/{requisition.id}/lifecycle",
                    created_by_user_id=triggered_by,
                )
                db.add(notification)
        except Exception:
            # Don't fail the main operation if notifications fail
            logger.exception("Failed to send lifecycle notifications")

    def serialize_document(self, doc: models.LifecycleStageDocument) -> dict:
        """Serialize a lifecycle stage document to a dict."""
        return {
            "id": doc.id,
            "lifecycle_stage_id": doc.lifecycle_stage_id,
            "uploaded_by": doc.uploaded_by,
            "uploaded_by_name": (
                doc.uploaded_by_user.full_name
                if doc.uploaded_by_user else None
            ),
            "filename": doc.filename,
            "description": doc.description,
            "file_path": doc.file_path,
            "file_upload_id": doc.file_upload_id,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }


# Singleton instance
lifecycle_service = LifecycleService()
