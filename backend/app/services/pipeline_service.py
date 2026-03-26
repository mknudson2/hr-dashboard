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

        # Auto-advance requisition lifecycle if the pipeline stage has a mapping
        if target_stage and target_stage.lifecycle_stage_key and application.requisition_id:
            from app.services.lifecycle_service import lifecycle_service
            try:
                lifecycle_service.auto_advance_by_key(
                    db, application.requisition_id,
                    target_stage.lifecycle_stage_key, moved_by,
                )
            except Exception:
                pass  # Don't fail pipeline advance if lifecycle hook fails

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
        application.disposition_stage_id = application.current_stage_id

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

    def withdraw_application(
        self,
        db: Session,
        application: models.Application,
        withdrawn_by: int,
        reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Mark an application as withdrawn by the candidate."""
        # Close current stage history
        if application.current_stage_id:
            current_history = db.query(models.ApplicationStageHistory).filter(
                models.ApplicationStageHistory.application_id == application.id,
                models.ApplicationStageHistory.stage_id == application.current_stage_id,
                models.ApplicationStageHistory.exited_at.is_(None),
            ).first()
            if current_history:
                current_history.exited_at = datetime.utcnow()
                current_history.outcome = "withdrawn"

        application.status = "Withdrawn"
        application.status_changed_at = datetime.utcnow()
        application.status_changed_by = withdrawn_by
        application.disposition_stage_id = application.current_stage_id
        application.withdrawn_at = datetime.utcnow()
        application.withdrawn_reason = reason

        recruiting_service.log_activity(
            db,
            application.id,
            "status_change",
            f"Application withdrawn{f': {reason}' if reason else ''}",
            details={"reason": reason, "notes": notes},
            performed_by=withdrawn_by,
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
    # HR / HM SCORECARD TEMPLATE CONSTANTS
    # ========================================================================

    HR_INTERVIEW_TEMPLATE = {
        "criteria": [
            {
                "name": "Company Values Alignment", "weight": 1.0,
                "rubric": {
                    "1": "No awareness of company values; goals clearly misaligned",
                    "2": "Vague understanding; limited alignment examples",
                    "3": "Basic understanding; generally aligned but not deeply connected",
                    "4": "Clear understanding; genuine alignment with specific examples",
                    "5": "Deep, authentic alignment; articulates how they embody values daily"
                }
            },
            {
                "name": "Tech Readiness/Ability", "weight": 1.0,
                "rubric": {
                    "1": "Unable to use basic required tools; significant training gap",
                    "2": "Minimal familiarity with some tools; would need extensive onboarding",
                    "3": "Competent with core tools; some gaps in advanced usage",
                    "4": "Proficient across required tech stack; quick to learn new tools",
                    "5": "Expert-level proficiency; could mentor others on technology usage"
                }
            },
            {
                "name": "Communication Skills", "weight": 1.0,
                "rubric": {
                    "1": "Difficulty expressing ideas; unclear or disorganized responses",
                    "2": "Basic communication; sometimes unclear or overly brief",
                    "3": "Adequate communication; gets points across with occasional difficulty",
                    "4": "Strong communicator; clear, concise, and well-structured responses",
                    "5": "Exceptional communicator; compelling, empathetic, and highly articulate"
                }
            },
            {
                "name": "Remote Work Readiness", "weight": 1.0,
                "rubric": {
                    "1": "No remote experience; unclear on self-management strategies",
                    "2": "Limited remote experience; some concerns about autonomy",
                    "3": "Some remote experience; reasonable self-management approach",
                    "4": "Proven remote worker; clear strategies for productivity and communication",
                    "5": "Thrives remotely; sophisticated systems for collaboration, boundaries, and output"
                }
            },
            {
                "name": "Professional Presentation", "weight": 1.0,
                "rubric": {
                    "1": "Unprepared; no knowledge of company or role; unprofessional demeanor",
                    "2": "Minimal preparation; surface-level knowledge of company",
                    "3": "Adequately prepared; reasonable understanding of role and company",
                    "4": "Well-prepared; researched company, thoughtful questions, professional demeanor",
                    "5": "Exceptionally prepared; deep company research, strategic questions, polished presence"
                }
            }
        ]
    }

    HM_INTERVIEW_TEMPLATE = {
        "criteria": [
            {
                "name": "Role Effectiveness Potential", "weight": 1.0,
                "rubric": {
                    "1": "Cannot articulate how they'd approach key responsibilities",
                    "2": "Vague understanding of role; limited relevant experience",
                    "3": "Reasonable grasp of role; could perform with standard support",
                    "4": "Strong understanding; relevant examples of similar work; likely to excel",
                    "5": "Immediately effective; deep experience in similar roles; would raise the bar"
                }
            },
            {
                "name": "Knowledge Base / Domain Expertise", "weight": 1.0,
                "rubric": {
                    "1": "Lacks fundamental domain knowledge; major gaps",
                    "2": "Basic awareness but significant knowledge gaps",
                    "3": "Solid foundational knowledge; meets minimum requirements",
                    "4": "Strong domain expertise; current on industry trends and best practices",
                    "5": "Expert-level knowledge; thought leader in the domain; could mentor the team"
                }
            },
            {
                "name": "Training Need Assessment", "weight": 1.0,
                "rubric": {
                    "1": "Would require extensive, long-term training across all areas",
                    "2": "Significant training needed; 3-6 month ramp-up expected",
                    "3": "Moderate training needed; standard onboarding should suffice",
                    "4": "Minimal training needed; mostly ready to contribute on day one",
                    "5": "No significant training needed; could begin contributing immediately"
                }
            },
            {
                "name": "Team Dynamic / Culture Fit", "weight": 1.0,
                "rubric": {
                    "1": "Work style clearly incompatible with team dynamics",
                    "2": "Some concerns about collaboration approach or team compatibility",
                    "3": "Neutral fit; no red flags but no strong positive signals",
                    "4": "Good fit; complementary skills and compatible work style",
                    "5": "Excellent fit; would strengthen team dynamics and bring valuable perspective"
                }
            },
            {
                "name": "Problem-Solving Ability", "weight": 1.0,
                "rubric": {
                    "1": "Unable to work through presented scenarios; no structured thinking",
                    "2": "Basic problem-solving; struggles with complexity or ambiguity",
                    "3": "Adequate problem-solving; methodical but may miss edge cases",
                    "4": "Strong analytical thinker; considers multiple approaches and trade-offs",
                    "5": "Exceptional problem solver; creative, systematic, and anticipates downstream effects"
                }
            }
        ]
    }

    def seed_hr_hm_templates(self, db: Session) -> None:
        """Update Phone Screen and Team Interview stages with rubric-enriched templates."""
        stages = db.query(models.PipelineStage).filter(
            models.PipelineStage.name.in_(["Phone Screen", "Team Interview"])
        ).all()

        for stage in stages:
            if stage.name == "Phone Screen":
                stage.scorecard_template = self.HR_INTERVIEW_TEMPLATE
            elif stage.name == "Team Interview":
                stage.scorecard_template = self.HM_INTERVIEW_TEMPLATE

        if stages:
            db.commit()

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
            description="Default hiring pipeline: Application Review → HR Screening → HM Interview → Tech Screen → Offer Extended → Offer Accepted",
            is_default=True,
            is_active=True,
        )
        db.add(template)
        db.flush()

        from app.db.migrations.add_hr_screening_scorecard import HR_SCREENING_TEMPLATE

        # Stages aligned with requisition lifecycle:
        # (name, stage_type, order, required, auto_advance, scorecard, sla, lifecycle_stage_key)
        stages = [
            ("Application Review", "application_review", 1, True, False, None, 3, None),
            ("HR Screening Interview", "interview", 2, True, False, HR_SCREENING_TEMPLATE, 5, "hr_interview"),
            ("HM Interview", "interview", 3, True, False, self.HM_INTERVIEW_TEMPLATE, 5, "hiring_manager_interview"),
            ("Tech Screen", "assessment", 4, False, False, None, 5, "tech_screen"),
            ("Candidate Selection", "decision", 5, True, False, None, 5, "candidate_selection"),
            ("Offer Extended", "offer", 6, True, False, None, 3, "offer_extended"),
            ("Offer Accepted", "offer_accepted", 7, True, False, None, 3, "offer_response"),
            ("Onboarding Date Set", "onboarding", 8, True, False, None, 5, "onboarding_date_set"),
            ("Final Approval", "approval", 9, True, False, None, 3, "final_approval"),
        ]

        for name, stage_type, order, required, auto, scorecard, sla, lifecycle_key in stages:
            stage = models.PipelineStage(
                template_id=template.id,
                name=name,
                stage_type=stage_type,
                order_index=order,
                is_required=required,
                auto_advance=auto,
                scorecard_template=scorecard,
                days_sla=sla,
                lifecycle_stage_key=lifecycle_key,
            )
            db.add(stage)

        db.flush()
        return template


# Singleton instance
pipeline_service = PipelineService()
