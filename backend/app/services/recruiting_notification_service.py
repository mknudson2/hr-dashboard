"""
RecruitingNotificationService — event-driven notifications for ATS (Phase 1).

Dispatches email (via email_service with Jinja2 templates) and in-app notifications
for recruiting pipeline events. Gracefully degrades if email is disabled.
"""

import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)

# Lazy imports to avoid circular dependencies
_email_service = None
_create_notification = None


def _get_email_service():
    global _email_service
    if _email_service is None:
        try:
            from app.services.email_service import email_service
            _email_service = email_service
        except Exception:
            logger.warning("Email service not available — email notifications disabled")
    return _email_service


def _get_create_notification():
    global _create_notification
    if _create_notification is None:
        try:
            from app.api.in_app_notifications import create_notification
            _create_notification = create_notification
        except Exception:
            logger.warning("In-app notification service not available")
    return _create_notification


_graph_service = None


def _get_graph_service():
    global _graph_service
    if _graph_service is None:
        try:
            from app.services.microsoft_graph_service import microsoft_graph_service
            _graph_service = microsoft_graph_service
        except Exception:
            logger.warning("Microsoft Graph service not available — Teams notifications disabled")
    return _graph_service


PORTAL_URL = os.getenv("APPLICANT_PORTAL_URL", "http://localhost:5175")
HUB_URL = os.getenv("HR_HUB_URL", "http://localhost:5173")
COMPANY_NAME = os.getenv("COMPANY_NAME", "Our Company")


class RecruitingNotificationService:
    """Event-based orchestrator for recruiting notifications."""

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: dict,
    ) -> bool:
        """Send email using Jinja2 template. Returns True if sent."""
        svc = _get_email_service()
        if not svc:
            return False
        try:
            ctx = {
                "company_name": COMPANY_NAME,
                "portal_url": PORTAL_URL,
                "hub_url": HUB_URL,
                **context,
            }
            await svc.send_email(
                to_emails=[to_email],
                subject=subject,
                template_name=template_name,
                context=ctx,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send recruiting email: {e}")
            return False

    def _notify(
        self,
        db: Session,
        title: str,
        message: str,
        notification_type: str = "recruiting",
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        action_url: Optional[str] = None,
        priority: str = "normal",
    ):
        """Create in-app notification."""
        fn = _get_create_notification()
        if not fn:
            return
        try:
            fn(
                db=db,
                title=title,
                message=message,
                notification_type=notification_type,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                action_url=action_url,
                priority=priority,
            )
        except Exception as e:
            logger.error(f"Failed to create in-app notification: {e}")

    def _send_teams_notification(self, db: Session, user_email: str, title: str, body: str, action_url: str = ""):
        """Send optional Teams notification if integration is enabled."""
        try:
            graph = _get_graph_service()
            if not graph or not graph.enabled:
                return
            # Check if Teams notifications integration is enabled
            config = db.query(models.IntegrationConfig).filter(
                models.IntegrationConfig.integration_type == "ms_teams_notifications",
                models.IntegrationConfig.is_enabled == True,
            ).first()
            if not config:
                return
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(graph.send_teams_notification(user_email, title, body, action_url))
                else:
                    loop.run_until_complete(graph.send_teams_notification(user_email, title, body, action_url))
            except RuntimeError:
                asyncio.run(graph.send_teams_notification(user_email, title, body, action_url))
        except Exception:
            logger.warning("Failed to dispatch Teams notification", exc_info=True)

    # ====================================================================
    # Event handlers
    # ====================================================================

    async def on_application_received(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        application_id: str,
        department: Optional[str] = None,
    ):
        """Applicant submitted an application."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"Application Received — {job_title}",
            template_name="recruiting/application_received.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "application_id": application_id,
                "department": department,
            },
        )
        # In-app notification to HR (broadcast)
        self._notify(
            db=db,
            title="New Application",
            message=f"{applicant_name} applied for {job_title}",
            resource_type="application",
            action_url=f"/recruiting/applications/{application_id}",
        )
        # Teams notification to HR users
        hr_users = db.query(models.User).filter(
            models.User.role.in_(["admin", "manager"]),
            models.User.is_active == True,
        ).all()
        for hr_user in hr_users:
            self._send_teams_notification(
                db, hr_user.email,
                f"New Application: {applicant_name}",
                f"New application for {job_title} from {applicant_name}",
                f"/recruiting/applications/{application_id}",
            )

    async def on_stage_advanced(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        stage_label: str,
        stage_description: Optional[str] = None,
    ):
        """Pipeline stage advanced — email applicant + in-app to HR."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"Application Update — {job_title}",
            template_name="recruiting/stage_update.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "stage_label": stage_label,
                "stage_description": stage_description,
            },
        )
        self._notify(
            db=db,
            title="Stage Advanced",
            message=f"{applicant_name} — {job_title} moved to {stage_label}",
            resource_type="requisition",
        )

    async def on_interview_scheduled(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        interview_date: str,
        interview_time: str,
        duration_minutes: int,
        format: str,
        location: Optional[str] = None,
        video_link: Optional[str] = None,
        interviewers: Optional[str] = None,
        interviewer_user_ids: Optional[list[int]] = None,
    ):
        """Interview scheduled — email applicant + in-app to interviewers."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"Interview Scheduled — {job_title}",
            template_name="recruiting/interview_scheduled.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "interview_date": interview_date,
                "interview_time": interview_time,
                "duration_minutes": duration_minutes,
                "format": format,
                "location": location,
                "video_link": video_link,
                "interviewers": interviewers,
            },
        )
        # In-app to each interviewer
        if interviewer_user_ids:
            for uid in interviewer_user_ids:
                self._notify(
                    db=db,
                    title="Interview Assigned",
                    message=f"Interview with {applicant_name} for {job_title} on {interview_date}",
                    user_id=uid,
                    resource_type="interview",
                    priority="high",
                )
            # Teams notification to each interviewer
            interviewer_users = db.query(models.User).filter(
                models.User.id.in_(interviewer_user_ids),
            ).all()
            for user in interviewer_users:
                self._send_teams_notification(
                    db, user.email,
                    f"Interview Scheduled: {applicant_name}",
                    f"Interview for {job_title} on {interview_date}",
                    f"/recruiting/interviews",
                )

    async def on_scorecard_submitted(
        self,
        db: Session,
        interviewer_name: str,
        applicant_name: str,
        job_title: str,
        recommendation: Optional[str] = None,
        hr_user_id: Optional[int] = None,
        hm_user_id: Optional[int] = None,
    ):
        """Scorecard submitted — in-app to HR + HM."""
        msg = f"{interviewer_name} submitted scorecard for {applicant_name} ({job_title})"
        if recommendation:
            msg += f" — {recommendation}"

        # Notify HR (broadcast if no specific user)
        self._notify(
            db=db,
            title="Scorecard Submitted",
            message=msg,
            user_id=hr_user_id,
            resource_type="scorecard",
        )
        if hm_user_id:
            self._notify(
                db=db,
                title="Scorecard Submitted",
                message=msg,
                user_id=hm_user_id,
                resource_type="scorecard",
            )

    async def on_offer_approval_needed(
        self,
        db: Session,
        approver_email: str,
        approver_name: str,
        approver_user_id: int,
        resource_type: str,
        applicant_name: Optional[str] = None,
        job_title: Optional[str] = None,
        requested_by_name: Optional[str] = None,
    ):
        """Approval request created or advanced — email + in-app to next approver."""
        await self._send_email(
            to_email=approver_email,
            subject=f"Approval Required — {resource_type.title()}",
            template_name="recruiting/approval_request.html",
            context={
                "approver_name": approver_name,
                "resource_type": resource_type,
                "applicant_name": applicant_name,
                "job_title": job_title,
                "requested_by_name": requested_by_name,
            },
        )
        self._notify(
            db=db,
            title=f"{resource_type.title()} Approval Required",
            message=f"Please review the {resource_type} for {applicant_name or 'a candidate'}",
            user_id=approver_user_id,
            resource_type="approval",
            action_url=f"/recruiting/offers",
            priority="high",
        )
        # Teams notification to the approver
        self._send_teams_notification(
            db, approver_email,
            f"{resource_type.title()} Approval Required",
            f"Please review the {resource_type} for {applicant_name or 'a candidate'}",
            f"/recruiting/offers",
        )

    async def on_offer_sent(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        offer_id: str,
        department: Optional[str] = None,
        expires_at: Optional[str] = None,
    ):
        """Offer sent to applicant."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"Offer Letter — {job_title}",
            template_name="recruiting/offer_sent.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "offer_id": offer_id,
                "department": department,
                "expires_at": expires_at,
            },
        )

    async def on_offer_responded(
        self,
        db: Session,
        applicant_name: str,
        job_title: str,
        response: str,
        hr_user_id: Optional[int] = None,
        hm_user_id: Optional[int] = None,
    ):
        """Offer accepted/declined — in-app + email to HR/HM."""
        priority = "high" if response == "Declined" else "normal"
        msg = f"{applicant_name} {response.lower()} the offer for {job_title}"

        self._notify(
            db=db,
            title=f"Offer {response}",
            message=msg,
            user_id=hr_user_id,
            resource_type="offer",
            priority=priority,
        )
        if hm_user_id:
            self._notify(
                db=db,
                title=f"Offer {response}",
                message=msg,
                user_id=hm_user_id,
                resource_type="offer",
                priority=priority,
            )

    async def on_new_message(
        self,
        db: Session,
        recipient_email: str,
        recipient_name: str,
        sender_name: str,
        subject: str,
        message_preview: str,
        job_title: Optional[str] = None,
        recipient_user_id: Optional[int] = None,
    ):
        """New message in thread — email to recipient."""
        await self._send_email(
            to_email=recipient_email,
            subject=f"New Message — {subject}",
            template_name="recruiting/new_message.html",
            context={
                "recipient_name": recipient_name,
                "sender_name": sender_name,
                "subject": subject,
                "message_preview": message_preview[:500],
                "job_title": job_title,
            },
        )
        if recipient_user_id:
            self._notify(
                db=db,
                title="New Message",
                message=f"Message from {sender_name}: {subject}",
                user_id=recipient_user_id,
                resource_type="message",
            )

    async def on_application_rejected(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        department: Optional[str] = None,
        feedback: Optional[str] = None,
    ):
        """Application rejected — email to applicant."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"Application Update — {job_title}",
            template_name="recruiting/rejection.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "department": department,
                "feedback": feedback,
            },
        )

    async def on_interview_self_scheduled(
        self,
        db: Session,
        applicant_name: str,
        job_title: str,
        interview_date: str,
        interview_time: str,
        duration_minutes: int,
        interviewer_email: Optional[str] = None,
        interviewer_name: Optional[str] = None,
        interviewer_user_id: Optional[int] = None,
    ):
        """Applicant self-scheduled an interview — email interviewer + in-app to HR."""
        if interviewer_email:
            await self._send_email(
                to_email=interviewer_email,
                subject=f"Interview Booked — {applicant_name} for {job_title}",
                template_name="recruiting/interview_self_scheduled.html",
                context={
                    "interviewer_name": interviewer_name or "Interviewer",
                    "applicant_name": applicant_name,
                    "job_title": job_title,
                    "interview_date": interview_date,
                    "interview_time": interview_time,
                    "duration_minutes": duration_minutes,
                },
            )
        if interviewer_user_id:
            self._notify(
                db=db,
                title="Interview Booked",
                message=f"{applicant_name} booked an interview for {job_title} on {interview_date} at {interview_time}",
                user_id=interviewer_user_id,
                resource_type="interview",
                priority="high",
            )
        # Broadcast to HR
        self._notify(
            db=db,
            title="Interview Self-Scheduled",
            message=f"{applicant_name} self-scheduled an interview for {job_title} on {interview_date}",
            resource_type="interview",
        )

    async def on_negotiation_requested(
        self,
        db: Session,
        applicant_name: str,
        job_title: str,
        offer_id: str,
        desired_salary: Optional[float] = None,
        desired_signing_bonus: Optional[float] = None,
        desired_start_date: Optional[str] = None,
        notes: Optional[str] = None,
        hr_user_id: Optional[int] = None,
        hr_email: Optional[str] = None,
    ):
        """Applicant requested offer negotiation — email + in-app to HR offer creator."""
        terms = []
        if desired_salary is not None:
            terms.append(f"Salary: ${desired_salary:,.0f}")
        if desired_signing_bonus is not None:
            terms.append(f"Signing bonus: ${desired_signing_bonus:,.0f}")
        if desired_start_date:
            terms.append(f"Start date: {desired_start_date}")
        terms_str = "; ".join(terms) if terms else "See notes"

        if hr_email:
            await self._send_email(
                to_email=hr_email,
                subject=f"Negotiation Request — {applicant_name} for {job_title}",
                template_name="recruiting/negotiation_requested.html",
                context={
                    "applicant_name": applicant_name,
                    "job_title": job_title,
                    "offer_id": offer_id,
                    "desired_salary": desired_salary,
                    "desired_signing_bonus": desired_signing_bonus,
                    "desired_start_date": desired_start_date,
                    "notes": notes,
                    "terms_summary": terms_str,
                },
            )

        msg = f"{applicant_name} requested negotiation for {job_title} — {terms_str}"
        self._notify(
            db=db,
            title="Offer Negotiation Requested",
            message=msg,
            user_id=hr_user_id,
            resource_type="offer",
            action_url=f"/recruiting/offers/{offer_id}",
            priority="high",
        )

    async def on_pool_application_created(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        application_id: str,
        department: Optional[str] = None,
    ):
        """HR created an application from the candidate pool — email candidate."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"You're Being Considered — {job_title}",
            template_name="recruiting/pool_application_created.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "application_id": application_id,
                "department": department,
            },
        )
        self._notify(
            db=db,
            title="Pool Application Created",
            message=f"Application created for {applicant_name} from candidate pool — {job_title}",
            resource_type="application",
            action_url=f"/recruiting/applications/{application_id}",
        )

    async def on_candidate_selected(
        self,
        db: Session,
        applicant_email: str,
        applicant_name: str,
        job_title: str,
        application_id: str,
        selected_by_name: Optional[str] = None,
        hr_user_id: Optional[int] = None,
    ):
        """Candidate selected for offer — email candidate + in-app to HR."""
        await self._send_email(
            to_email=applicant_email,
            subject=f"Great News — {job_title}",
            template_name="recruiting/candidate_selected.html",
            context={
                "applicant_name": applicant_name,
                "job_title": job_title,
                "application_id": application_id,
            },
        )
        self._notify(
            db=db,
            title="Candidate Selected",
            message=f"{applicant_name} selected for {job_title}" + (f" by {selected_by_name}" if selected_by_name else ""),
            user_id=hr_user_id,
            resource_type="application",
            action_url=f"/recruiting/applications/{application_id}",
            priority="high",
        )
        # Teams notification to HR
        if hr_user_id:
            hr_user = db.query(models.User).filter(models.User.id == hr_user_id).first()
            if hr_user:
                self._send_teams_notification(
                    db, hr_user.email,
                    f"Candidate Selected: {applicant_name}",
                    f"{applicant_name} selected for {job_title}" + (f" by {selected_by_name}" if selected_by_name else ""),
                    f"/recruiting/applications/{application_id}",
                )

    async def on_counter_offer_created(
        self,
        db: Session,
        applicant_name: str,
        job_title: str,
        offer_id: str,
        counter_salary: Optional[float] = None,
        counter_signing_bonus: Optional[float] = None,
        negotiation_notes: Optional[str] = None,
        approver_emails: Optional[list[str]] = None,
        approver_user_ids: Optional[list[int]] = None,
    ):
        """Counter-offer created — in-app to SVP approvers + email with details."""
        terms = []
        if counter_salary is not None:
            terms.append(f"Salary: ${counter_salary:,.0f}")
        if counter_signing_bonus is not None:
            terms.append(f"Signing bonus: ${counter_signing_bonus:,.0f}")
        terms_str = "; ".join(terms) if terms else "See offer details"

        # Email each approver
        if approver_emails:
            for email in approver_emails:
                await self._send_email(
                    to_email=email,
                    subject=f"Counter-Offer Approval Required — {applicant_name} for {job_title}",
                    template_name="recruiting/counter_offer_approval.html",
                    context={
                        "applicant_name": applicant_name,
                        "job_title": job_title,
                        "offer_id": offer_id,
                        "terms_summary": terms_str,
                        "negotiation_notes": negotiation_notes,
                    },
                )

        # In-app to each approver
        if approver_user_ids:
            for uid in approver_user_ids:
                self._notify(
                    db=db,
                    title="Counter-Offer Approval Required",
                    message=f"Counter-offer for {applicant_name} ({job_title}) — {terms_str}",
                    user_id=uid,
                    resource_type="offer",
                    action_url=f"/recruiting/offers/{offer_id}/negotiation",
                    priority="high",
                )

        # Broadcast to HR
        self._notify(
            db=db,
            title="Counter-Offer Created",
            message=f"Counter-offer created for {applicant_name} — {job_title}: {terms_str}",
            resource_type="offer",
            action_url=f"/recruiting/offers/{offer_id}/negotiation",
        )


    async def on_offer_initiated(
        self,
        db: Session,
        applicant_name: str,
        job_title: str,
        offer_id: str,
        initiated_by_name: str,
        salary: Optional[float] = None,
        approver_user_ids: Optional[list[int]] = None,
    ):
        """Offer initiated by HM — in-app to HR Recruiting + email to approval chain."""
        salary_str = f"${salary:,.0f}" if salary else "TBD"

        # In-app broadcast to HR
        self._notify(
            db=db,
            title="Offer Initiated",
            message=f"{initiated_by_name} initiated an offer for {applicant_name} ({job_title}) — Salary: {salary_str}",
            resource_type="offer",
            action_url=f"/recruiting/offers/{offer_id}",
        )

        # In-app to each approver in the chain
        if approver_user_ids:
            for uid in approver_user_ids:
                self._notify(
                    db=db,
                    title="Offer Approval Required",
                    message=f"New offer for {applicant_name} ({job_title}) — Salary: {salary_str}",
                    user_id=uid,
                    resource_type="offer",
                    action_url=f"/recruiting/offers/{offer_id}",
                    priority="high",
                )
            # Teams notification to each approver
            approver_users = db.query(models.User).filter(
                models.User.id.in_(approver_user_ids),
            ).all()
            for user in approver_users:
                self._send_teams_notification(
                    db, user.email,
                    f"Offer Initiated: {applicant_name}",
                    f"New offer for {applicant_name} ({job_title}) — Salary: {salary_str}",
                    f"/recruiting/offers/{offer_id}",
                )

    async def on_stakeholder_added(
        self,
        db: Session,
        stakeholder_user_id: int,
        stakeholder_name: str,
        requisition_title: str,
        requisition_id: int,
        role: str,
        added_by_name: str,
    ):
        """Stakeholder added to requisition — in-app to the added stakeholder."""
        role_labels = {
            "vp_svp": "VP/SVP",
            "hiring_manager": "Hiring Manager",
            "interviewer": "Interviewer",
            "observer": "Observer",
        }
        role_label = role_labels.get(role, role)
        self._notify(
            db=db,
            title="Added to Requisition",
            message=f"{added_by_name} added you as {role_label} on '{requisition_title}'",
            user_id=stakeholder_user_id,
            resource_type="requisition",
            action_url=f"/hiring/requisitions/{requisition_id}",
        )


# Singleton
recruiting_notification_service = RecruitingNotificationService()
