"""
Pipeline Service

Handles pipeline stage advancement, scorecard management,
stage completion checks, and aggregate scoring.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import models
from app.services.recruiting_service import recruiting_service


class PipelineService:
    """Service for managing application pipeline operations."""

    # ========================================================================
    # STAGE ADVANCEMENT
    # ========================================================================

    def advance_to_stage(
        self,
        db: Session,
        application: models.Application,
        target_stage_id: int,
        moved_by: int,
        notes: Optional[str] = None,
    ) -> models.ApplicationStageHistory:
        """
        Move an application to a new pipeline stage.
        Closes the current stage history entry and creates a new one.
        """
        # Close current stage history if one is active
        if application.current_stage_id:
            current_history = db.query(models.ApplicationStageHistory).filter(
                models.ApplicationStageHistory.application_id == application.id,
                models.ApplicationStageHistory.stage_id == application.current_stage_id,
                models.ApplicationStageHistory.exited_at.is_(None),
            ).first()
            if current_history:
                current_history.exited_at = datetime.utcnow()
                current_history.outcome = "passed"

        # Create new stage history entry
        new_history = models.ApplicationStageHistory(
            application_id=application.id,
            stage_id=target_stage_id,
            entered_at=datetime.utcnow(),
            moved_by=moved_by,
            notes=notes,
        )
        db.add(new_history)

        # Update application's current stage
        old_stage_id = application.current_stage_id
        application.current_stage_id = target_stage_id

        # Get stage names for logging
        target_stage = db.query(models.PipelineStage).get(target_stage_id)
        old_stage = db.query(models.PipelineStage).get(old_stage_id) if old_stage_id else None

        old_name = old_stage.name if old_stage else "New"
        new_name = target_stage.name if target_stage else "Unknown"

        # Log activity
        recruiting_service.log_activity(
            db,
            application.id,
            "stage_change",
            f"Moved from '{old_name}' to '{new_name}'",
            details={"from_stage_id": old_stage_id, "to_stage_id": target_stage_id},
            performed_by=moved_by,
            is_internal=False,
        )

        db.flush()
        return new_history

    def reject_application(
        self,
        db: Session,
        application: models.Application,
        rejected_by: int,
        reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Reject an application and close its current pipeline stage."""
        # Close current stage history
        if application.current_stage_id:
            current_history = db.query(models.ApplicationStageHistory).filter(
                models.ApplicationStageHistory.application_id == application.id,
                models.ApplicationStageHistory.stage_id == application.current_stage_id,
                models.ApplicationStageHistory.exited_at.is_(None),
            ).first()
            if current_history:
                current_history.exited_at = datetime.utcnow()
                current_history.outcome = "rejected"

        application.status = "Rejected"
        application.status_changed_at = datetime.utcnow()
        application.status_changed_by = rejected_by
        application.rejection_reason = reason
        application.rejection_notes = notes
        application.rejected_at = datetime.utcnow()
        application.rejected_by = rejected_by

        recruiting_service.log_activity(
            db,
            application.id,
            "status_change",
            f"Application rejected{f': {reason}' if reason else ''}",
            details={"reason": reason, "notes": notes},
            performed_by=rejected_by,
            is_internal=False,
        )

        db.flush()

    # ========================================================================
    # SCORECARD MANAGEMENT
    # ========================================================================

    def assign_scorecard(
        self,
        db: Session,
        application_id: int,
        stage_id: int,
        interviewer_id: int,
        due_date: Optional[datetime] = None,
        criteria_template: Optional[list] = None,
    ) -> models.InterviewScorecard:
        """Create a pending scorecard assignment for an interviewer."""
        scorecard = models.InterviewScorecard(
            application_id=application_id,
            stage_id=stage_id,
            interviewer_id=interviewer_id,
            status="Pending",
            due_date=due_date,
            criteria_ratings=criteria_template,
        )
        db.add(scorecard)
        db.flush()
        return scorecard

    def submit_scorecard(
        self,
        db: Session,
        scorecard: models.InterviewScorecard,
        overall_rating: float,
        recommendation: str,
        criteria_ratings: Optional[list] = None,
        strengths: Optional[str] = None,
        concerns: Optional[str] = None,
        additional_notes: Optional[str] = None,
    ) -> None:
        """Submit a completed scorecard."""
        scorecard.overall_rating = overall_rating
        scorecard.recommendation = recommendation
        scorecard.criteria_ratings = criteria_ratings
        scorecard.strengths = strengths
        scorecard.concerns = concerns
        scorecard.additional_notes = additional_notes
        scorecard.status = "Submitted"
        scorecard.submitted_at = datetime.utcnow()

        # Log activity
        interviewer = db.query(models.User).get(scorecard.interviewer_id)
        interviewer_name = interviewer.full_name if interviewer else "Unknown"

        recruiting_service.log_activity(
            db,
            scorecard.application_id,
            "scorecard_submitted",
            f"Scorecard submitted by {interviewer_name}: {recommendation} ({overall_rating}/5)",
            details={
                "interviewer_id": scorecard.interviewer_id,
                "rating": overall_rating,
                "recommendation": recommendation,
            },
            performed_by=scorecard.interviewer_id,
        )

        # Update application's overall rating (average of all submitted scorecards)
        self._update_aggregate_rating(db, scorecard.application_id)

        db.flush()

    # ========================================================================
    # AGGREGATE SCORING
    # ========================================================================

    def _update_aggregate_rating(self, db: Session, application_id: int) -> None:
        """Recalculate aggregate rating from all submitted scorecards."""
        avg_rating = db.query(func.avg(models.InterviewScorecard.overall_rating)).filter(
            models.InterviewScorecard.application_id == application_id,
            models.InterviewScorecard.status == "Submitted",
            models.InterviewScorecard.overall_rating.isnot(None),
        ).scalar()

        if avg_rating is not None:
            application = db.query(models.Application).get(application_id)
            if application:
                application.overall_rating = round(float(avg_rating), 2)

    def get_stage_completion_status(
        self,
        db: Session,
        application_id: int,
        stage_id: int,
    ) -> dict:
        """Check completion status for a stage (scorecards, interviews)."""
        scorecards = db.query(models.InterviewScorecard).filter(
            models.InterviewScorecard.application_id == application_id,
            models.InterviewScorecard.stage_id == stage_id,
        ).all()

        interviews = db.query(models.Interview).filter(
            models.Interview.application_id == application_id,
            models.Interview.stage_id == stage_id,
        ).all()

        total_scorecards = len(scorecards)
        submitted_scorecards = sum(1 for s in scorecards if s.status == "Submitted")

        total_interviews = len(interviews)
        completed_interviews = sum(1 for i in interviews if i.status == "Completed")

        return {
            "stage_id": stage_id,
            "scorecards_total": total_scorecards,
            "scorecards_submitted": submitted_scorecards,
            "scorecards_complete": total_scorecards > 0 and submitted_scorecards == total_scorecards,
            "interviews_total": total_interviews,
            "interviews_completed": completed_interviews,
            "interviews_complete": total_interviews > 0 and completed_interviews == total_interviews,
            "all_complete": (
                (total_scorecards == 0 or submitted_scorecards == total_scorecards)
                and (total_interviews == 0 or completed_interviews == total_interviews)
            ),
        }

    # ========================================================================
    # PIPELINE TEMPLATE SEEDING
    # ========================================================================

    def seed_default_pipeline(self, db: Session) -> Optional[models.PipelineTemplate]:
        """Create the default Standard Hiring Pipeline if none exists."""
        existing = db.query(models.PipelineTemplate).filter(
            models.PipelineTemplate.is_default == True
        ).first()
        if existing:
            return existing

        template = models.PipelineTemplate(
            name="Standard Hiring Pipeline",
            description="Default hiring pipeline: Application Review → Phone Screen → Technical Interview → Team Interview → Reference Check → Offer",
            is_default=True,
            is_active=True,
        )
        db.add(template)
        db.flush()

        stages = [
            ("Application Review", "application_review", 1, True, False, None, 3),
            ("Phone Screen", "phone_screen", 2, True, False,
             {"criteria": [{"name": "Communication Skills", "weight": 1.0}, {"name": "Role Fit", "weight": 1.0}, {"name": "Motivation", "weight": 1.0}]},
             5),
            ("Technical Interview", "interview", 3, True, False,
             {"criteria": [{"name": "Technical Skills", "weight": 1.5}, {"name": "Problem Solving", "weight": 1.5}, {"name": "Communication", "weight": 1.0}]},
             7),
            ("Team Interview", "interview", 4, True, False,
             {"criteria": [{"name": "Culture Fit", "weight": 1.0}, {"name": "Collaboration", "weight": 1.0}, {"name": "Leadership", "weight": 0.5}]},
             5),
            ("Reference Check", "reference_check", 5, False, False, None, 5),
            ("Offer", "offer", 6, True, False, None, 3),
        ]

        for name, stage_type, order, required, auto, scorecard, sla in stages:
            stage = models.PipelineStage(
                template_id=template.id,
                name=name,
                stage_type=stage_type,
                order_index=order,
                is_required=required,
                auto_advance=auto,
                scorecard_template=scorecard,
                days_sla=sla,
            )
            db.add(stage)

        db.flush()
        return template


# Singleton instance
pipeline_service = PipelineService()
