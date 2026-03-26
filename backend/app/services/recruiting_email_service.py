"""
Recruiting Email Service

Handles sending email notifications for the recruiting pipeline:
application confirmations, interview invitations, rejections, offers, document requests.

Uses the existing email_service singleton for actual email delivery.
"""

import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)

# Try to import email_service; if unavailable, log a warning
try:
    from app.services.email_service import email_service
    HAS_EMAIL_SERVICE = True
except ImportError:
    HAS_EMAIL_SERVICE = False
    logger.warning("email_service not available; recruiting emails will be logged only")


class RecruitingEmailService:
    """Service for sending recruiting-related email notifications."""

    def _log_email(self, email_type: str, to_email: str, context: Dict[str, Any]) -> None:
        """Log email attempts for audit trail."""
        logger.info(f"Recruiting email [{email_type}] to {to_email}: {context.get('subject', 'No subject')}")

    async def _send(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        email_type: str = "recruiting",
        ics_bytes: Optional[bytes] = None,
        attachment_paths: Optional[List[str]] = None,
    ) -> bool:
        """Send an email using the global email_service. Returns True if sent.

        Args:
            ics_bytes: Optional .ics calendar file content to attach as 'invite.ics'.
            attachment_paths: Optional list of file paths to attach.
        """
        self._log_email(email_type, to_email, {"subject": subject})

        if not HAS_EMAIL_SERVICE:
            logger.info(f"[DEV] Would send '{subject}' to {to_email}" +
                         (" (with attachments)" if ics_bytes or attachment_paths else ""))
            return False

        try:
            # Build attachments list
            attachments = list(attachment_paths) if attachment_paths else []
            ics_path = None
            if ics_bytes:
                import tempfile
                import os
                fd, ics_path = tempfile.mkstemp(suffix=".ics", prefix="interview_")
                with os.fdopen(fd, "wb") as f:
                    f.write(ics_bytes)
                attachments.append(ics_path)

            await email_service.send_email(
                to_emails=[to_email],
                subject=subject,
                body_html=body_html,
                attachments=attachments if attachments else None,
            )

            # Clean up temp ICS file only (other attachments managed by caller)
            if ics_path:
                import os
                try:
                    os.unlink(ics_path)
                except OSError:
                    pass

            return True
        except Exception as e:
            logger.error(f"Failed to send {email_type} email to {to_email}: {e}")
            return False

    # ========================================================================
    # APPLICATION NOTIFICATIONS
    # ========================================================================

    async def send_application_confirmation(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        application_id: str,
    ) -> bool:
        """Send confirmation email when an application is submitted."""
        subject = f"Application Received - {job_title}"
        body_html = f"""
        <h2>Thank you for applying, {applicant_name}!</h2>
        <p>We've received your application for <strong>{job_title}</strong>.</p>
        <p>Your application ID is: <strong>{application_id}</strong></p>
        <p>We'll review your application and get back to you soon. You can track your application
        status by signing in to our applicant portal.</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "application_confirmation")

    async def send_application_status_update(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        new_status: str,
    ) -> bool:
        """Send status update notification to applicant."""
        subject = f"Application Update - {job_title}"
        body_html = f"""
        <h2>Application Update</h2>
        <p>Hi {applicant_name},</p>
        <p>Your application for <strong>{job_title}</strong> has been updated.</p>
        <p>Current status: <strong>{new_status}</strong></p>
        <p>Sign in to our applicant portal for more details.</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "status_update")

    # ========================================================================
    # INTERVIEW NOTIFICATIONS
    # ========================================================================

    async def send_interview_invitation(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        interview_date: str,
        interview_time: str,
        duration_minutes: int,
        format: str,
        location: Optional[str] = None,
        video_link: Optional[str] = None,
        interviewers: Optional[str] = None,
        ics_bytes: Optional[bytes] = None,
    ) -> bool:
        """Send interview invitation to candidate with optional .ics calendar attachment."""
        subject = f"Interview Invitation - {job_title}"
        location_info = ""
        if format == "Video" and video_link:
            location_info = f"<p><strong>Video Link:</strong> <a href='{video_link}'>{video_link}</a></p>"
        elif format == "In-Person" and location:
            location_info = f"<p><strong>Location:</strong> {location}</p>"
        elif format == "Phone":
            location_info = "<p>You will receive a phone call at the scheduled time.</p>"

        calendar_note = ""
        if ics_bytes:
            calendar_note = "<p><em>A calendar invitation (.ics) is attached to this email.</em></p>"

        body_html = f"""
        <h2>Interview Invitation</h2>
        <p>Hi {applicant_name},</p>
        <p>We'd like to invite you to an interview for the <strong>{job_title}</strong> position.</p>
        <p><strong>Date:</strong> {interview_date}</p>
        <p><strong>Time:</strong> {interview_time}</p>
        <p><strong>Duration:</strong> {duration_minutes} minutes</p>
        <p><strong>Format:</strong> {format}</p>
        {location_info}
        {f"<p><strong>Interviewer(s):</strong> {interviewers}</p>" if interviewers else ""}
        {calendar_note}
        <p>Please confirm your availability by signing in to the applicant portal.</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "interview_invitation", ics_bytes=ics_bytes)

    async def send_interview_reminder(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        interview_date: str,
        interview_time: str,
    ) -> bool:
        """Send interview reminder (typically 24 hours before)."""
        subject = f"Interview Reminder - {job_title}"
        body_html = f"""
        <h2>Interview Reminder</h2>
        <p>Hi {applicant_name},</p>
        <p>This is a friendly reminder about your upcoming interview for <strong>{job_title}</strong>.</p>
        <p><strong>Date:</strong> {interview_date}</p>
        <p><strong>Time:</strong> {interview_time}</p>
        <p>We look forward to speaking with you!</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "interview_reminder")

    # ========================================================================
    # REJECTION NOTIFICATIONS
    # ========================================================================

    async def send_rejection(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
    ) -> bool:
        """Send rejection notification to applicant."""
        subject = f"Application Update - {job_title}"
        body_html = f"""
        <h2>Application Update</h2>
        <p>Dear {applicant_name},</p>
        <p>Thank you for your interest in the <strong>{job_title}</strong> position and for taking
        the time to apply.</p>
        <p>After careful consideration, we have decided to move forward with other candidates
        whose qualifications more closely match our current needs.</p>
        <p>We encourage you to apply for future positions that match your skills and experience.
        We wish you the best in your job search.</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "rejection")

    # ========================================================================
    # OFFER NOTIFICATIONS
    # ========================================================================

    async def send_offer_notification(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        offer_id: str,
        salary: Optional[float] = None,
        start_date: Optional[str] = None,
        expires_at: Optional[str] = None,
        custom_subject: Optional[str] = None,
        custom_body_html: Optional[str] = None,
        attachment_paths: Optional[List[str]] = None,
    ) -> bool:
        """Send offer notification to applicant.

        If custom_subject/custom_body_html are provided (from a template),
        they override the default hardcoded email content.
        """
        if custom_subject and custom_body_html:
            subject = custom_subject
            body_html = custom_body_html
        else:
            subject = f"Offer Letter - {job_title}"
            salary_info = f"<p><strong>Compensation:</strong> ${salary:,.2f}</p>" if salary else ""
            start_info = f"<p><strong>Proposed Start Date:</strong> {start_date}</p>" if start_date else ""
            expiry_info = f"<p>This offer expires on <strong>{expires_at}</strong>.</p>" if expires_at else ""

            body_html = f"""
            <h2>Congratulations, {applicant_name}!</h2>
            <p>We are pleased to extend an offer for the <strong>{job_title}</strong> position.</p>
            <p><strong>Offer ID:</strong> {offer_id}</p>
            {salary_info}
            {start_info}
            {expiry_info}
            <p>Please sign in to our applicant portal to review the full offer details and respond.</p>
            <br>
            <p>Best regards,<br>HR Team</p>
            """
        return await self._send(to_email, subject, body_html, "offer_notification", attachment_paths=attachment_paths)

    async def send_offer_response_notification(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        response: str,
    ) -> bool:
        """Notify HR team when candidate responds to offer."""
        subject = f"Offer {response.title()} - {applicant_name} - {job_title}"
        body_html = f"""
        <h2>Offer Response</h2>
        <p><strong>{applicant_name}</strong> has <strong>{response}</strong> the offer
        for <strong>{job_title}</strong>.</p>
        <p>Please review in the recruiting dashboard.</p>
        """
        return await self._send(to_email, subject, body_html, "offer_response")

    # ========================================================================
    # DOCUMENT REQUEST NOTIFICATIONS
    # ========================================================================

    async def send_document_request(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        document_type: str,
        description: Optional[str] = None,
        due_date: Optional[str] = None,
    ) -> bool:
        """Notify applicant that a document is being requested."""
        subject = f"Document Request - {job_title}"
        due_info = f"<p><strong>Due Date:</strong> {due_date}</p>" if due_date else ""

        body_html = f"""
        <h2>Document Request</h2>
        <p>Hi {applicant_name},</p>
        <p>As part of your application for <strong>{job_title}</strong>, we need the following document:</p>
        <p><strong>Document:</strong> {document_type.replace('_', ' ').title()}</p>
        {f"<p><strong>Details:</strong> {description}</p>" if description else ""}
        {due_info}
        <p>Please sign in to the applicant portal to upload the requested document.</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "document_request")

    async def send_document_reminder(
        self,
        to_email: str,
        applicant_name: str,
        document_type: str,
        due_date: Optional[str] = None,
    ) -> bool:
        """Send reminder for outstanding document request."""
        subject = "Document Reminder"
        body_html = f"""
        <h2>Document Reminder</h2>
        <p>Hi {applicant_name},</p>
        <p>This is a reminder that we are still waiting for the following document:</p>
        <p><strong>{document_type.replace('_', ' ').title()}</strong></p>
        {f"<p>Due Date: {due_date}</p>" if due_date else ""}
        <p>Please upload it through the applicant portal at your earliest convenience.</p>
        <br>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "document_reminder")

    # ========================================================================
    # CUSTOM EMAIL
    # ========================================================================

    async def send_custom_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
    ) -> bool:
        """Send a custom email to a candidate."""
        return await self._send(to_email, subject, body_html, "custom")

    # ========================================================================
    # RECRUITING LIFECYCLE NOTIFICATIONS
    # ========================================================================

    async def send_new_requisition_request_notification(
        self,
        to_email: str,
        requester_name: str,
        job_title: str,
        requisition_id: str,
        department: str = "",
    ) -> bool:
        """Notify recruiting team of a new requisition request from the employee portal."""
        subject = f"New Position Request: {job_title}"
        body_html = f"""
        <h2>New Requisition Request</h2>
        <p><strong>{requester_name}</strong> has submitted a new position request via the Employee Portal.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 4px 12px; font-weight: bold;">Position:</td><td style="padding: 4px 12px;">{job_title}</td></tr>
            <tr><td style="padding: 4px 12px; font-weight: bold;">Requisition ID:</td><td style="padding: 4px 12px;">{requisition_id}</td></tr>
            <tr><td style="padding: 4px 12px; font-weight: bold;">Department:</td><td style="padding: 4px 12px;">{department or 'N/A'}</td></tr>
        </table>
        <p>Please review and approve or discuss with the hiring manager.</p>
        <p>Best regards,<br>HR System</p>
        """
        return await self._send(to_email, subject, body_html, "requisition_request")

    async def send_lifecycle_stage_update(
        self,
        to_email: str,
        recipient_name: str,
        job_title: str,
        stage_name: str,
        stage_status: str,
    ) -> bool:
        """Notify stakeholders about a lifecycle stage update."""
        subject = f"Hiring Update: {job_title} - {stage_name} {stage_status}"
        body_html = f"""
        <h2>Hiring Process Update</h2>
        <p>Hi {recipient_name},</p>
        <p>The hiring process for <strong>{job_title}</strong> has been updated:</p>
        <p style="padding: 12px; background: #f3f4f6; border-radius: 8px;">
            <strong>{stage_name}</strong> — {stage_status}
        </p>
        <p>Log in to the portal to view full details and progress.</p>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "lifecycle_update")

    async def send_interview_compliance_reminder(
        self,
        to_email: str,
        interviewer_name: str,
        job_title: str,
        interview_date: str,
    ) -> bool:
        """Send pre-interview compliance reminder with tips."""
        subject = f"Interview Reminder & Compliance Tips: {job_title}"
        body_html = f"""
        <h2>Interview Compliance Reminder</h2>
        <p>Hi {interviewer_name},</p>
        <p>You have an upcoming interview for <strong>{job_title}</strong> on {interview_date}.</p>
        <h3>Quick Compliance Reminders:</h3>
        <ul>
            <li>Ask all candidates the same core questions</li>
            <li>Avoid questions about protected characteristics (age, race, religion, marital status, etc.)</li>
            <li>Use the standardized scorecard to evaluate candidates</li>
            <li>Document specific, observable behaviors — not subjective impressions</li>
            <li>Complete your scorecard immediately after the interview</li>
        </ul>
        <p>For full compliance guidelines, check the Compliance Tips panel in the scorecard form.</p>
        <p>Best regards,<br>HR Team</p>
        """
        return await self._send(to_email, subject, body_html, "compliance_reminder")


# Singleton instance
recruiting_email_service = RecruitingEmailService()
