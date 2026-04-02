"""Notification service for triggering email notifications based on employee events."""
import asyncio
import logging
from sqlalchemy.orm import Session
from app.db import models
from app.services.email_service import email_service
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for handling notification triggers."""

    def notify_new_hire(self, db: Session, employee: models.Employee):
        """Send notification for new hire.

        Args:
            db: Database session
            employee: Employee model instance
        """
        # Get all subscribers who want new hire notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.new_hires == True,
        ).all()

        employee_name = f"{employee.first_name} {employee.last_name}"
        hire_date = employee.hire_date.strftime("%Y-%m-%d") if employee.hire_date else "N/A"
        department = employee.department or "N/A"

        for subscriber in subscribers:
            email_service.send_new_hire_notification(
                to_email=subscriber.email,
                employee_name=employee_name,
                hire_date=hire_date,
                department=department,
            )

    def notify_termination(self, db: Session, employee: models.Employee):
        """Send notification for employee termination.

        Args:
            db: Database session
            employee: Employee model instance
        """
        # Get all subscribers who want termination notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.terminations == True,
        ).all()

        employee_name = f"{employee.first_name} {employee.last_name}"
        termination_date = employee.termination_date.strftime("%Y-%m-%d") if employee.termination_date else "N/A"
        termination_type = employee.termination_type or "N/A"

        for subscriber in subscribers:
            email_service.send_termination_notification(
                to_email=subscriber.email,
                employee_name=employee_name,
                termination_date=termination_date,
                termination_type=termination_type,
            )

    def notify_wage_change(self, db: Session, employee: models.Employee, old_wage: float, new_wage: float, reason: str):
        """Send notification for wage change.

        Args:
            db: Database session
            employee: Employee model instance
            old_wage: Previous wage amount
            new_wage: New wage amount
            reason: Reason for wage change
        """
        # Get all subscribers who want wage change notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.wage_changes == True,
        ).all()

        employee_name = f"{employee.first_name} {employee.last_name}"

        for subscriber in subscribers:
            email_service.send_wage_change_notification(
                to_email=subscriber.email,
                employee_name=employee_name,
                old_wage=old_wage,
                new_wage=new_wage,
                change_reason=reason,
            )

    def send_weekly_reports(self, db: Session):
        """Send weekly summary reports to all subscribers.

        Args:
            db: Database session
        """
        # Get all subscribers who want weekly reports
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.weekly_report == True,
        ).all()

        # Calculate weekly stats
        current_year = datetime.now().year
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)

        employees = db.query(models.Employee).all()

        # Active employees
        active_employees = sum(
            1 for e in employees
            if e.hire_date
            and e.hire_date <= today
            and (e.termination_date is None or e.termination_date > today)
        )

        # New hires this week
        new_hires_week = sum(
            1 for e in employees
            if e.hire_date and week_ago <= e.hire_date <= today
        )

        # Terminations this week
        terminations_week = sum(
            1 for e in employees
            if e.termination_date and week_ago <= e.termination_date <= today
        )

        # YTD metrics
        ytd_hires = sum(
            1 for e in employees
            if e.hire_date and e.hire_date.year == current_year
        )

        ytd_terminations = sum(
            1 for e in employees
            if e.termination_date and e.termination_date.year == current_year
        )

        # Turnover rate
        turnover_rate = (ytd_terminations / active_employees * 100) if active_employees > 0 else 0

        # International employees
        total_international = sum(
            1 for e in employees
            if e.location and e.location.lower() not in ["united states", "usa", "us"]
        )

        stats = {
            "active_employees": active_employees,
            "new_hires": new_hires_week,
            "terminations": terminations_week,
            "ytd_hires": ytd_hires,
            "ytd_terminations": ytd_terminations,
            "turnover_rate": turnover_rate,
            "total_international": total_international,
        }

        for subscriber in subscribers:
            email_service.send_weekly_report(
                to_email=subscriber.email,
                stats=stats,
            )

    def notify_fmla_leave_request(
        self,
        db: Session,
        leave_request: models.FMLACaseRequest,
        employee: models.Employee
    ):
        """Send notification to HR when an employee submits an FMLA leave request.

        Args:
            db: Database session
            leave_request: FMLACaseRequest model instance
            employee: Employee model instance
        """
        # Get all subscribers who want FMLA leave request notifications
        subscribers = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.email_alerts == True,
            models.NotificationPreference.fmla_leave_requests == True,
        ).all()

        if not subscribers:
            logger.info("No subscribers for FMLA leave request notifications")
            return

        employee_name = f"{employee.first_name} {employee.last_name}"
        start_date = leave_request.requested_start_date.strftime("%B %d, %Y") if leave_request.requested_start_date else "N/A"
        end_date = leave_request.requested_end_date.strftime("%B %d, %Y") if leave_request.requested_end_date else "Ongoing/Unknown"

        # Build schedule type
        schedule_parts = []
        if leave_request.intermittent:
            schedule_parts.append("Intermittent")
        if leave_request.reduced_schedule:
            schedule_parts.append("Reduced Schedule")
        schedule_type = ", ".join(schedule_parts) if schedule_parts else "Continuous"

        # Create HTML email content
        html_content = f"""
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">New FMLA Leave Request</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">Employee Self-Service Portal</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="color: #475569; margin: 0 0 20px;">A new FMLA leave request has been submitted and requires your review.</p>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Employee</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">{employee_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Employee ID</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{employee.employee_id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Department</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{employee.department or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Leave Type</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">{leave_request.leave_type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Start Date</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{start_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">End Date</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{end_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Schedule Type</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{schedule_type}</td>
                    </tr>
                    {"<tr><td style='padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;'>Est. Hours/Week</td><td style='padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;'>" + str(leave_request.estimated_hours_per_week) + "</td></tr>" if leave_request.estimated_hours_per_week else ""}
                    <tr>
                        <td style="padding: 12px 0; color: #64748b;">Submitted</td>
                        <td style="padding: 12px 0; color: #1e293b;">{leave_request.submitted_at.strftime("%B %d, %Y at %I:%M %p") if leave_request.submitted_at else "Just now"}</td>
                    </tr>
                </table>

                {"<div style='margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;'><p style='margin: 0 0 8px; color: #64748b; font-size: 14px;'>Employee Notes:</p><p style='margin: 0; color: #1e293b;'>" + leave_request.reason + "</p></div>" if leave_request.reason else ""}

                <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>Action Required:</strong> Please review this request in the HR Hub under FMLA → Pending Leave Requests.
                    </p>
                </div>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated notification from the HR Hub system.
            </p>
        </body>
        </html>
        """

        async def send_emails():
            for subscriber in subscribers:
                try:
                    await email_service.send_email(
                        to_emails=[subscriber.email],
                        subject=f"New FMLA Leave Request - {employee_name}",
                        body_html=html_content
                    )
                except Exception as e:
                    logger.error("FMLA notification failed to send to %s", subscriber.email, exc_info=True)

        # Run async in sync context
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(send_emails())
        except RuntimeError:
            asyncio.run(send_emails())

    async def notify_fmla_request_decision(
        self,
        db: Session,
        leave_request: models.FMLACaseRequest,
        employee: models.Employee,
        decision: str,  # "approved" or "denied"
        hr_notes: Optional[str] = None,
        template_id: Optional[str] = None,
        custom_values: Optional[dict] = None
    ):
        """Send notification to employee when their FMLA leave request is approved/denied.

        Uses customizable email templates from the CustomEmailTemplate system.

        Args:
            db: Database session
            leave_request: FMLACaseRequest model instance
            employee: Employee model instance
            decision: "approved" or "denied"
            hr_notes: Optional notes from HR
            template_id: Optional custom template ID to use
            custom_values: Optional custom values for template placeholders
        """
        employee_email = employee.email or employee.work_email
        if not employee_email:
            logger.warning("No email address for employee %s", employee.employee_id)
            return

        employee_name = f"{employee.first_name} {employee.last_name}"
        start_date = leave_request.requested_start_date.strftime("%B %d, %Y") if leave_request.requested_start_date else "N/A"
        end_date = leave_request.requested_end_date.strftime("%B %d, %Y") if leave_request.requested_end_date else "Ongoing"

        # Check if a custom template should be used
        if template_id:
            template = db.query(models.CustomEmailTemplate).filter(
                models.CustomEmailTemplate.template_id == template_id,
                models.CustomEmailTemplate.is_active == True
            ).first()

            if template:
                from app.services.template_rendering_service import template_rendering_service

                # Build context with request data
                context = {
                    "employee_name": employee_name,
                    "employee_first_name": employee.first_name,
                    "leave_type": leave_request.leave_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "decision": decision,
                    "hr_notes": hr_notes or "",
                    **(custom_values or {})
                }

                # Render template
                rendered_subject, _ = template_rendering_service.render(
                    template.subject_line, employee, context
                )
                rendered_body, _ = template_rendering_service.render(
                    template.html_content, employee, context
                )

                await email_service.send_email(
                    to_emails=[employee_email],
                    subject=rendered_subject,
                    body_html=rendered_body
                )
                return

        # Default email if no custom template
        status_color = "#10b981" if decision == "approved" else "#ef4444"
        status_bg = "#ecfdf5" if decision == "approved" else "#fef2f2"
        status_text = "Approved" if decision == "approved" else "Denied"

        html_content = f"""
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">FMLA Leave Request Update</h1>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="color: #475569; margin: 0 0 20px;">Dear {employee.first_name},</p>

                <div style="background: {status_bg}; border: 1px solid {status_color}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0; color: {status_color}; font-weight: 600; font-size: 18px;">
                        Your FMLA leave request has been {status_text.lower()}.
                    </p>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Leave Type</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">{leave_request.leave_type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Start Date</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{start_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #64748b;">End Date</td>
                        <td style="padding: 12px 0; color: #1e293b;">{end_date}</td>
                    </tr>
                </table>

                {"<div style='margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;'><p style='margin: 0 0 8px; color: #64748b; font-size: 14px;'>HR Notes:</p><p style='margin: 0; color: #1e293b;'>" + hr_notes + "</p></div>" if hr_notes else ""}

                <p style="color: #475569; margin: 24px 0 0;">
                    {"If you have any questions about your leave, please contact the HR department." if decision == "approved" else "If you have questions about this decision or would like to discuss alternatives, please contact the HR department."}
                </p>

                <p style="color: #475569; margin: 16px 0 0;">
                    Best regards,<br>
                    HR Department
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated notification from the HR Hub system.
            </p>
        </body>
        </html>
        """

        await email_service.send_email(
            to_emails=[employee_email],
            subject=f"FMLA Leave Request {status_text} - {leave_request.leave_type}",
            body_html=html_content
        )


    def notify_garnishment_payment_recorded(
        self,
        db: Session,
        garnishment: models.Garnishment,
        payment: models.GarnishmentPayment,
        employee: models.Employee
    ):
        """Send notification to employee when a garnishment payment is recorded.

        Args:
            db: Database session
            garnishment: Garnishment model instance
            payment: GarnishmentPayment model instance
            employee: Employee model instance
        """
        employee_email = employee.email or employee.work_email
        if not employee_email:
            logger.warning("Garnishment payment notification skipped: no email address for employee %s", employee.employee_id)
            return

        employee_name = f"{employee.first_name} {employee.last_name}"
        payment_date = payment.payment_date.strftime("%B %d, %Y") if payment.payment_date else "N/A"
        amount = f"${payment.amount:,.2f}" if payment.amount else "$0.00"
        remaining = f"${garnishment.amount_remaining:,.2f}" if garnishment.amount_remaining else "$0.00"
        percent_complete = ((garnishment.amount_paid or 0) / (garnishment.total_amount or 1)) * 100

        html_content = f"""
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Garnishment Payment Recorded</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">Case: {garnishment.case_number}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="color: #475569; margin: 0 0 20px;">Dear {employee.first_name},</p>
                <p style="color: #475569; margin: 0 0 20px;">A payment has been recorded for your {garnishment.garnishment_type} garnishment.</p>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Payment Date</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">{payment_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Amount Paid</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">{amount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Remaining Balance</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{remaining}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #64748b;">Progress</td>
                        <td style="padding: 12px 0; color: #1e293b;">{percent_complete:.1f}% complete</td>
                    </tr>
                </table>

                <div style="margin-top: 20px; background: #e0e7ff; border-radius: 8px; overflow: hidden;">
                    <div style="background: #4f46e5; height: 8px; width: {min(percent_complete, 100):.0f}%;"></div>
                </div>

                <p style="color: #475569; margin: 24px 0 0;">
                    You can view your garnishment details and download payment calculations in the Employee Portal.
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated notification from the HR Hub system.
            </p>
        </body>
        </html>
        """

        async def send_email():
            try:
                await email_service.send_email(
                    to_emails=[employee_email],
                    subject=f"Garnishment Payment Recorded - {garnishment.case_number}",
                    body_html=html_content
                )
            except Exception as e:
                logger.error("Failed to send garnishment payment notification", exc_info=True)

        # Run async in sync context
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(send_email())
        except RuntimeError:
            asyncio.run(send_email())

    def notify_garnishment_document_uploaded(
        self,
        db: Session,
        garnishment: models.Garnishment,
        document: models.GarnishmentDocument,
        employee: models.Employee
    ):
        """Send notification to employee when a garnishment document is uploaded.

        Args:
            db: Database session
            garnishment: Garnishment model instance
            document: GarnishmentDocument model instance
            employee: Employee model instance
        """
        employee_email = employee.email or employee.work_email
        if not employee_email:
            logger.warning("Garnishment document notification skipped: no email address for employee %s", employee.employee_id)
            return

        upload_date = document.uploaded_date.strftime("%B %d, %Y") if document.uploaded_date else "Today"

        html_content = f"""
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">New Garnishment Document</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">Case: {garnishment.case_number}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="color: #475569; margin: 0 0 20px;">Dear {employee.first_name},</p>
                <p style="color: #475569; margin: 0 0 20px;">A new document has been added to your {garnishment.garnishment_type} garnishment case.</p>

                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Document Details</p>
                    <p style="margin: 0; color: #1e293b; font-weight: 500;">{document.document_name}</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Type: {document.document_type}</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Uploaded: {upload_date}</p>
                </div>

                <p style="color: #475569; margin: 0;">
                    You can view and download this document in the Employee Portal under My Garnishments.
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated notification from the HR Hub system.
            </p>
        </body>
        </html>
        """

        async def send_email():
            try:
                await email_service.send_email(
                    to_emails=[employee_email],
                    subject=f"New Document Added - Garnishment {garnishment.case_number}",
                    body_html=html_content
                )
            except Exception as e:
                logger.error("Failed to send garnishment document notification", exc_info=True)

        # Run async in sync context
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(send_email())
        except RuntimeError:
            asyncio.run(send_email())

    def notify_garnishment_status_changed(
        self,
        db: Session,
        garnishment: models.Garnishment,
        employee: models.Employee,
        old_status: str,
        new_status: str
    ):
        """Send notification to employee when garnishment status changes.

        Args:
            db: Database session
            garnishment: Garnishment model instance
            employee: Employee model instance
            old_status: Previous status
            new_status: New status
        """
        employee_email = employee.email or employee.work_email
        if not employee_email:
            logger.warning("Garnishment status notification skipped: no email address for employee %s", employee.employee_id)
            return

        # Determine color based on status
        status_colors = {
            "Satisfied": ("#10b981", "#ecfdf5"),
            "Released": ("#10b981", "#ecfdf5"),
            "Closed": ("#6b7280", "#f3f4f6"),
            "Active": ("#3b82f6", "#eff6ff"),
            "Pending": ("#f59e0b", "#fffbeb"),
        }
        status_color, status_bg = status_colors.get(new_status, ("#3b82f6", "#eff6ff"))

        # Special message for satisfied garnishments
        is_satisfied = new_status in ("Satisfied", "Released")
        status_message = (
            "Your garnishment has been fully satisfied. No further deductions will be taken."
            if is_satisfied
            else f"The status of your garnishment has been updated from {old_status} to {new_status}."
        )

        html_content = f"""
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Garnishment Status Update</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">Case: {garnishment.case_number}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="color: #475569; margin: 0 0 20px;">Dear {employee.first_name},</p>

                <div style="background: {status_bg}; border: 1px solid {status_color}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0; color: {status_color}; font-weight: 600; font-size: 18px;">
                        Status: {new_status}
                    </p>
                </div>

                <p style="color: #475569; margin: 0 0 20px;">{status_message}</p>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Garnishment Type</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{garnishment.garnishment_type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Creditor/Agency</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{garnishment.agency_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Total Amount</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${garnishment.total_amount:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #64748b;">Amount Paid</td>
                        <td style="padding: 12px 0; color: #1e293b;">${garnishment.amount_paid:,.2f}</td>
                    </tr>
                </table>

                <p style="color: #475569; margin: 24px 0 0;">
                    {"Congratulations on completing this obligation!" if is_satisfied else "If you have questions about this status change, please contact HR."}
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated notification from the HR Hub system.
            </p>
        </body>
        </html>
        """

        async def send_email():
            try:
                await email_service.send_email(
                    to_emails=[employee_email],
                    subject=f"Garnishment Status Update - {new_status}",
                    body_html=html_content
                )
            except Exception as e:
                logger.error("Failed to send garnishment status notification", exc_info=True)

        # Run async in sync context
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(send_email())
        except RuntimeError:
            asyncio.run(send_email())


# Singleton instance
notification_service = NotificationService()
