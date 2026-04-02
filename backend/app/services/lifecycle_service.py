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
    {"key": "candidate_selection", "label": "Candidate Selection", "order": 5},
    {"key": "offer_extended", "label": "Offer Extended", "order": 6},
    {"key": "offer_response", "label": "Offer Result", "order": 7},
    {"key": "onboarding_date_set", "label": "Onboarding Date Set", "order": 8},
    {"key": "final_approval", "label": "Final Approval / Next Steps", "order": 9},
]

# Applicant-facing stage mapping (ATS §1.2)
# Maps internal lifecycle stage keys to simplified labels shown to applicants.
APPLICANT_STAGE_MAPPING = {
    "request_submitted": {
        "label": "Application Received",
        "description": "Your application has been received and is being reviewed",
        "group_order": 0,
    },
    "position_posted": {
        "label": "Application Received",
        "description": "Your application has been received and is being reviewed",
        "group_order": 0,
    },
    "hr_interview": {
        "label": "HR Interview",
        "description": "Your HR interview is being scheduled / in progress / complete",
        "group_order": 1,
    },
    "hiring_manager_interview": {
        "label": "Hiring Manager Interview",
        "description": "Your interview with the hiring team is being scheduled / in progress / complete",
        "group_order": 2,
    },
    "tech_screen": {
        "label": "Technical Assessment",
        "description": "Your technical assessment is being scheduled / in progress / complete",
        "group_order": 3,
    },
    "candidate_selection": {
        "label": "Under Review",
        "description": "The hiring team is reviewing all candidates",
        "group_order": 4,
    },
    "offer_extended": {
        "label": "Offer",
        "description": "An offer has been prepared for you",
        "group_order": 5,
    },
    "offer_response": {
        "label": "Offer",
        "description": "An offer has been prepared for you",
        "group_order": 5,
    },
    "onboarding_date_set": {
        "label": "Onboarding",
        "description": "Your start date and onboarding details are being finalized",
        "group_order": 6,
    },
    "final_approval": {
        "label": "Welcome",
        "description": "Final steps before your first day",
        "group_order": 7,
    },
}


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

                # Notify stakeholders to submit availability for HM Interview
                if next_stage.stage_key == "hiring_manager_interview":
                    self._notify_availability_needed(db, stage.requisition_id, next_stage, user_id)
                    self._auto_create_hm_scorecards(db, stage.requisition_id)

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

    def mark_stage_viewed(self, db: Session, stage_id: int, user_id: int):
        """Record that a user has viewed a lifecycle stage (upsert)."""
        from datetime import datetime
        existing = db.query(models.UserStageView).filter(
            models.UserStageView.user_id == user_id,
            models.UserStageView.lifecycle_stage_id == stage_id,
        ).first()
        if existing:
            existing.last_viewed_at = datetime.utcnow()
        else:
            db.add(models.UserStageView(
                user_id=user_id,
                lifecycle_stage_id=stage_id,
                last_viewed_at=datetime.utcnow(),
            ))
        db.flush()

    def get_unread_count(
        self, stage: models.RequisitionLifecycleStage, last_viewed_at
    ) -> int:
        """Count notes + documents created after last_viewed_at.
        If last_viewed_at is None, everything is unread.
        """
        unread = 0
        for note in (stage.notes or []):
            if last_viewed_at is None or (note.created_at and note.created_at > last_viewed_at):
                unread += 1
        for doc in (stage.documents or []):
            if last_viewed_at is None or (doc.created_at and doc.created_at > last_viewed_at):
                unread += 1
        return unread

    def get_user_stage_views(self, db: Session, user_id: int, stage_ids: list[int]) -> dict[int, "datetime"]:
        """Get last_viewed_at for a batch of stage IDs for a user.
        Returns {stage_id: last_viewed_at} dict.
        """
        if not stage_ids:
            return {}
        views = db.query(models.UserStageView).filter(
            models.UserStageView.user_id == user_id,
            models.UserStageView.lifecycle_stage_id.in_(stage_ids),
        ).all()
        return {v.lifecycle_stage_id: v.last_viewed_at for v in views}

    def serialize_stage(self, stage: models.RequisitionLifecycleStage, last_viewed_at=None) -> dict:
        """Serialize a lifecycle stage to a dict for API responses.
        If last_viewed_at is provided, includes unread_count based on items
        created after that timestamp. If not provided, unread_count equals total count.
        """
        notes_count = len(stage.notes) if stage.notes else 0
        documents_count = len(stage.documents) if stage.documents else 0
        unread = self.get_unread_count(stage, last_viewed_at)
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
            "notes_count": notes_count,
            "documents_count": documents_count,
            "unread_count": unread,
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

    def _auto_create_hm_scorecards(
        self,
        db: Session,
        requisition_id: int,
    ):
        """Auto-create pending scorecards for HM Interview stage for each interviewer/HM."""
        try:
            requisition = db.query(models.JobRequisition).filter(
                models.JobRequisition.id == requisition_id
            ).first()
            if not requisition or not requisition.pipeline_template_id:
                return

            # Find the HM Interview pipeline stage
            hm_pipeline_stage = db.query(models.PipelineStage).filter(
                models.PipelineStage.template_id == requisition.pipeline_template_id,
                models.PipelineStage.lifecycle_stage_key == "hiring_manager_interview",
            ).first()
            if not hm_pipeline_stage:
                return

            # Collect interviewer user_ids: stakeholders with role interviewer/hiring_manager + requested_by
            interviewer_ids: set[int] = set()

            stakeholders = db.query(models.RequisitionStakeholder).filter(
                models.RequisitionStakeholder.requisition_id == requisition_id,
                models.RequisitionStakeholder.is_active == True,
                models.RequisitionStakeholder.role.in_(["interviewer", "hiring_manager"]),
            ).all()
            for s in stakeholders:
                if s.user_id:
                    interviewer_ids.add(s.user_id)

            # Include the HM (requested_by is the user_id)
            if requisition.requested_by:
                interviewer_ids.add(requisition.requested_by)

            if not interviewer_ids:
                return

            # Get all active applications
            applications = db.query(models.Application).filter(
                models.Application.requisition_id == requisition_id,
                models.Application.status.notin_(["Rejected", "Withdrawn"]),
            ).all()

            # Build criteria template from stage's scorecard_template
            criteria_template = None
            if hm_pipeline_stage.scorecard_template and "criteria" in hm_pipeline_stage.scorecard_template:
                criteria_template = [
                    {"criteria": c["name"], "rating": None, "notes": ""}
                    for c in hm_pipeline_stage.scorecard_template["criteria"]
                ]

            # Create scorecards — skip if one already exists for this (app, stage, interviewer)
            for app in applications:
                existing = db.query(models.InterviewScorecard).filter(
                    models.InterviewScorecard.application_id == app.id,
                    models.InterviewScorecard.stage_id == hm_pipeline_stage.id,
                ).all()
                existing_interviewer_ids = {sc.interviewer_id for sc in existing}

                for uid in interviewer_ids:
                    if uid in existing_interviewer_ids:
                        continue
                    scorecard = models.InterviewScorecard(
                        application_id=app.id,
                        stage_id=hm_pipeline_stage.id,
                        interviewer_id=uid,
                        status="Pending",
                        criteria_ratings=criteria_template,
                    )
                    db.add(scorecard)

            db.flush()
            logger.info(
                "Auto-created HM Interview scorecards for req %s: %d interviewers x %d apps",
                requisition_id, len(interviewer_ids), len(applications),
            )
        except Exception:
            logger.exception("Failed to auto-create HM Interview scorecards")

    def _notify_availability_needed(
        self,
        db: Session,
        requisition_id: int,
        next_stage: models.RequisitionLifecycleStage,
        triggered_by: int,
    ):
        """Notify all stakeholders to submit interview availability for HM Interview."""
        try:
            if not hasattr(models, 'InAppNotification'):
                return

            requisition = db.query(models.JobRequisition).filter(
                models.JobRequisition.id == requisition_id
            ).first()
            if not requisition:
                return

            # Collect stakeholder user IDs from RequisitionStakeholder table
            stakeholder_ids = set()
            stakeholders = db.query(models.RequisitionStakeholder).filter(
                models.RequisitionStakeholder.requisition_id == requisition_id,
                models.RequisitionStakeholder.is_active == True,
            ).all()
            for s in stakeholders:
                if s.user_id:
                    stakeholder_ids.add(s.user_id)

            # Also include HM and recruiter from requisition record
            if requisition.hiring_manager_id:
                stakeholder_ids.add(requisition.hiring_manager_id)
            if requisition.recruiter_id:
                stakeholder_ids.add(requisition.recruiter_id)

            for uid in stakeholder_ids:
                notification = models.InAppNotification(
                    user_id=uid,
                    title="Submit Your Availability",
                    message=f"The \"{requisition.title}\" position has moved to the Hiring Manager Interview stage. Please submit your available times.",
                    notification_type="recruiting",
                    priority="high",
                    resource_type="requisition",
                    resource_id=requisition.id,
                    action_url=f"/hiring/requisitions/{requisition.id}/availability",
                    created_by_user_id=triggered_by,
                )
                db.add(notification)
        except Exception:
            logger.exception("Failed to send availability notifications")

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

    def initiate_negotiation_loop(
        self,
        db: Session,
        requisition_id: int,
        user_id: int,
        notes: Optional[str] = None,
    ) -> Optional[models.RequisitionLifecycleStage]:
        """Return pipeline to offer_extended for a new negotiation round (ATS §3.5).

        Sets offer_response outcome to 'negotiating' and re-activates offer_extended.
        """
        now = datetime.utcnow()

        offer_response = (
            db.query(models.RequisitionLifecycleStage)
            .filter(
                models.RequisitionLifecycleStage.requisition_id == requisition_id,
                models.RequisitionLifecycleStage.stage_key == "offer_response",
            )
            .first()
        )
        if offer_response:
            offer_response.outcome = "negotiating"
            offer_response.outcome_notes = notes
            offer_response.status = "pending"
            offer_response.completed_at = None

        offer_extended = (
            db.query(models.RequisitionLifecycleStage)
            .filter(
                models.RequisitionLifecycleStage.requisition_id == requisition_id,
                models.RequisitionLifecycleStage.stage_key == "offer_extended",
            )
            .first()
        )
        if offer_extended:
            offer_extended.status = "active"
            offer_extended.entered_at = now
            offer_extended.completed_at = None
            offer_extended.completed_by = None

        db.flush()
        return offer_extended

    def get_applicant_facing_pipeline(
        self,
        db: Session,
        requisition_id: int,
    ) -> list[dict]:
        """Build the simplified applicant-facing pipeline view.

        Groups internal stages into applicant-facing stages per APPLICANT_STAGE_MAPPING.
        Returns a list of {label, description, status, completed_at} dicts.
        """
        stages = self.get_lifecycle(db, requisition_id)

        # Group stages by applicant-facing label
        grouped: dict[int, dict] = {}  # group_order -> {label, description, status, completed_at}

        for stage in stages:
            mapping = APPLICANT_STAGE_MAPPING.get(stage.stage_key)
            if not mapping:
                continue

            group_order = mapping["group_order"]

            if group_order not in grouped:
                grouped[group_order] = {
                    "label": mapping["label"],
                    "description": mapping["description"],
                    "status": "upcoming",
                    "completed_at": None,
                }

            group = grouped[group_order]

            # A group is "current" if any stage in it is active
            if stage.status == "active":
                group["status"] = "current"
            # A group is "completed" only if ALL stages in it are completed/skipped
            elif stage.status in ("completed", "skipped"):
                if group["status"] == "upcoming":
                    group["status"] = "completed"
                if stage.completed_at:
                    existing = group.get("completed_at")
                    if not existing or stage.completed_at > datetime.fromisoformat(existing):
                        group["completed_at"] = stage.completed_at.isoformat()
            else:
                # pending/blocked stage in group — can't be fully completed
                if group["status"] == "completed":
                    group["status"] = "upcoming"

        return [grouped[k] for k in sorted(grouped.keys())]


# Singleton instance
lifecycle_service = LifecycleService()
