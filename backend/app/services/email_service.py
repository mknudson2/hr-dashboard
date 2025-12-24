"""Email service for sending notifications with template support."""
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import aiofiles
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class EmailService:
    """Service for sending email notifications using templates."""

    def __init__(self):
        """Initialize email service with configuration."""
        # Email enabled flag
        self.enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"

        # Provider selection
        self.provider = os.getenv("EMAIL_PROVIDER", "gmail").lower()

        # Template configuration
        self.templates_dir = Path(__file__).parent.parent.parent / "templates" / "emails"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=True
        )

        # Add custom currency filter
        def currency_filter(value):
            """Format a number as currency with comma separators."""
            if value is None:
                return '0.00'
            try:
                return '{:,.2f}'.format(float(value))
            except (ValueError, TypeError):
                return '0.00'

        self.jinja_env.filters['currency'] = currency_filter

        # Configure FastMail based on provider
        self.fastmail = self._configure_provider()

        # Common template variables
        self.company_name = os.getenv("COMPANY_NAME", "NBS")
        self.current_year = datetime.now().year

    def _configure_provider(self) -> FastMail:
        """Configure email provider (Gmail or Outlook)."""
        if self.provider == "gmail":
            config = ConnectionConfig(
                MAIL_USERNAME=os.getenv("GMAIL_USERNAME", os.getenv("SMTP_USERNAME", "")),
                MAIL_PASSWORD=os.getenv("GMAIL_APP_PASSWORD", os.getenv("SMTP_PASSWORD", "")),
                MAIL_FROM=os.getenv("GMAIL_FROM_EMAIL", os.getenv("FROM_EMAIL", "noreply@nbshr.com")),
                MAIL_PORT=int(os.getenv("GMAIL_SMTP_PORT", os.getenv("SMTP_PORT", "587"))),
                MAIL_SERVER=os.getenv("GMAIL_SMTP_SERVER", os.getenv("SMTP_SERVER", "smtp.gmail.com")),
                MAIL_FROM_NAME=os.getenv("GMAIL_FROM_NAME", "NBS HR Dashboard"),
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )
        elif self.provider == "outlook":
            # Outlook OAuth 2.0 configuration
            # Note: This requires additional OAuth implementation
            config = ConnectionConfig(
                MAIL_USERNAME=os.getenv("OUTLOOK_FROM_EMAIL", ""),
                MAIL_PASSWORD="",  # OAuth doesn't use password
                MAIL_FROM=os.getenv("OUTLOOK_FROM_EMAIL", ""),
                MAIL_PORT=int(os.getenv("OUTLOOK_SMTP_PORT", "587")),
                MAIL_SERVER=os.getenv("OUTLOOK_SMTP_SERVER", "smtp.office365.com"),
                MAIL_FROM_NAME=os.getenv("OUTLOOK_FROM_NAME", "HR Department"),
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )
        else:
            raise ValueError(f"Unsupported email provider: {self.provider}")

        return FastMail(config)

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render Jinja2 template with context.

        Args:
            template_name: Template file name (e.g., 'onboarding/welcome.html')
            context: Dictionary of template variables

        Returns:
            Rendered HTML string
        """
        try:
            # Add common variables to context
            context.setdefault('company_name', self.company_name)
            context.setdefault('current_year', self.current_year)

            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except TemplateNotFound:
            raise ValueError(f"Template not found: {template_name}")
        except Exception as e:
            raise ValueError(f"Error rendering template {template_name}: {str(e)}")

    async def send_email(
        self,
        to_emails: List[EmailStr],
        subject: str,
        template_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        body_html: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        cc_emails: Optional[List[EmailStr]] = None,
        bcc_emails: Optional[List[EmailStr]] = None
    ):
        """Send an email notification.

        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            template_name: Template file name (optional, use this OR body_html)
            context: Dictionary of template variables (required if template_name is used)
            body_html: Direct HTML body content (optional, use this OR template_name)
            attachments: List of file paths to attach
            cc_emails: List of CC email addresses
            bcc_emails: List of BCC email addresses
        """
        if not self.enabled:
            print(f"[EMAIL DISABLED] Would send to {to_emails}: {subject}")
            if template_name:
                print(f"  Template: {template_name}")
            return

        # Ensure to_emails is a list
        if isinstance(to_emails, str):
            to_emails = [to_emails]

        try:
            # Render template or use direct HTML
            if template_name:
                if not context:
                    context = {}
                html_content = self._render_template(template_name, context)
            elif body_html:
                html_content = body_html
            else:
                raise ValueError("Either template_name or body_html must be provided")

            # Create message
            message = MessageSchema(
                subject=subject,
                recipients=to_emails,
                body=html_content,
                subtype=MessageType.html,
                cc=cc_emails or [],
                bcc=bcc_emails or [],
                attachments=attachments or []
            )

            # Send email
            await self.fastmail.send_message(message)

            print(f"✅ Email sent to {to_emails}: {subject}")

        except Exception as e:
            print(f"❌ Error sending email to {to_emails}: {str(e)}")
            raise

    # ==========================================================================
    # ONBOARDING EMAILS
    # ==========================================================================

    async def send_welcome_email(
        self,
        to_email: EmailStr,
        employee_name: str,
        role: str,
        start_date: str,
        department: Optional[str] = None,
        manager_name: Optional[str] = None,
        manager_email: Optional[str] = None
    ):
        """Send welcome email to new hire."""
        context = {
            'employee_name': employee_name,
            'role': role,
            'start_date': start_date,
            'department': department,
            'manager_name': manager_name,
            'manager_email': manager_email,
            'from_name': 'HR Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"Welcome to {self.company_name}! - {employee_name}",
            template_name='onboarding/welcome.html',
            context=context
        )

    async def send_first_day_info(
        self,
        to_email: EmailStr,
        employee_name: str,
        start_date: str,
        start_time: str = "8:00 AM",
        office_location: Optional[str] = None,
        parking_info: Optional[str] = None,
        dress_code: Optional[str] = None,
        manager_name: Optional[str] = None
    ):
        """Send first day information email."""
        context = {
            'employee_name': employee_name,
            'start_date': start_date,
            'start_time': start_time,
            'office_location': office_location,
            'parking_info': parking_info,
            'dress_code': dress_code,
            'manager_name': manager_name,
            'from_name': 'HR Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"Your First Day at {self.company_name} - {start_date}",
            template_name='onboarding/first_day_info.html',
            context=context
        )

    # ==========================================================================
    # NBS TERMINATION EMAILS
    # ==========================================================================

    async def send_nbs_term_email(
        self,
        email_type: str,
        to_emails: List[EmailStr],
        employee_name: str,
        employee_id: str,
        termination_date: str,
        verb: str = "has",
        pronoun: str = "their",
        pronoun2: str = "them",
        department: Optional[str] = None,
        role: Optional[str] = None,
        supervisor: Optional[str] = None,
        transition_notes: Optional[str] = None,
        cc_emails: Optional[List[EmailStr]] = None
    ):
        """Send NBS termination notification email.

        Args:
            email_type: Type of notification (401k, accounting, cobra, concur, crm,
                       data_admin, flex, retirement, welfare, leadership)
            to_emails: List of recipient email addresses
            employee_name: Name of terminated employee
            employee_id: Employee ID
            termination_date: Last working day
            verb: "has" or "have" for grammatical agreement
            pronoun: "his", "her", "their" (possessive)
            pronoun2: "him", "her", "them" (objective)
            department: Employee department (optional)
            role: Employee role (optional)
            supervisor: Employee supervisor (optional, for leadership email)
            transition_notes: Transition notes (optional, for leadership email)
            cc_emails: CC recipients (optional)
        """
        template_map = {
            '401k': 'offboarding/nbs_term_401k.html',
            'accounting': 'offboarding/nbs_term_accounting.html',
            'cobra': 'offboarding/nbs_term_cobra.html',
            'concur': 'offboarding/nbs_term_concur.html',
            'crm': 'offboarding/nbs_term_crm.html',
            'data_admin': 'offboarding/nbs_term_data_admin.html',
            'flex': 'offboarding/nbs_term_flex.html',
            'retirement': 'offboarding/nbs_term_retirement.html',
            'welfare': 'offboarding/nbs_term_welfare.html',
            'leadership': 'offboarding/nbs_term_leadership.html'
        }

        template_name = template_map.get(email_type.lower())
        if not template_name:
            raise ValueError(f"Invalid NBS term email type: {email_type}")

        subject_prefix = {
            '401k': '401(k) Notification',
            'accounting': 'Accounting Notification',
            'cobra': 'COBRA Notification',
            'concur': 'Concur Notification',
            'crm': 'CRM Notification',
            'data_admin': 'Data Admin Notification',
            'flex': 'Flex Benefits Notification',
            'retirement': 'Retirement Platform Notification',
            'welfare': 'Welfare Benefits Notification',
            'leadership': 'Leadership Notification'
        }

        context = {
            'employee_name': employee_name,
            'employee_id': employee_id,
            'termination_date': termination_date,
            'verb': verb,
            'pronoun': pronoun,
            'pronoun2': pronoun2,
            'department': department,
            'role': role,
            'supervisor': supervisor,
            'transition_notes': transition_notes,
            'from_name': 'HR Team'
        }

        await self.send_email(
            to_emails=to_emails,
            subject=f"{subject_prefix[email_type.lower()]} - Terminating Employee: {employee_name}",
            template_name=template_name,
            context=context,
            cc_emails=cc_emails
        )

    # ==========================================================================
    # FMLA EMAILS
    # ==========================================================================

    async def send_fmla_approval(
        self,
        to_email: EmailStr,
        employee_name: str,
        leave_type: str,
        start_date: str,
        return_date: str,
        duration: int,
        intermittent: Optional[str] = None,
        medical_certification_required: bool = False,
        recertification_date: Optional[str] = None
    ):
        """Send FMLA approval notification."""
        context = {
            'employee_name': employee_name,
            'leave_type': leave_type,
            'start_date': start_date,
            'return_date': return_date,
            'duration': duration,
            'intermittent': intermittent,
            'medical_certification_required': medical_certification_required,
            'recertification_date': recertification_date,
            'from_name': 'HR Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"FMLA Leave Approved - {employee_name}",
            template_name='fmla/fmla_approval.html',
            context=context
        )

    async def send_fmla_reminder(
        self,
        to_email: EmailStr,
        employee_name: str,
        start_date: str,
        return_date: str,
        days_until_return: int,
        fitness_for_duty_required: bool = False,
        manager_name: Optional[str] = None,
        manager_email: Optional[str] = None
    ):
        """Send FMLA return reminder."""
        context = {
            'employee_name': employee_name,
            'start_date': start_date,
            'return_date': return_date,
            'days_until_return': days_until_return,
            'fitness_for_duty_required': fitness_for_duty_required,
            'manager_name': manager_name,
            'manager_email': manager_email,
            'from_name': 'HR Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"FMLA Return Reminder - {return_date}",
            template_name='fmla/fmla_reminder.html',
            context=context
        )

    async def send_fmla_return_welcome(
        self,
        to_email: EmailStr,
        employee_name: str,
        return_date: str,
        manager_name: Optional[str] = None,
        accommodations: Optional[str] = None,
        fitness_for_duty_required: bool = False
    ):
        """Send welcome back email for FMLA return."""
        context = {
            'employee_name': employee_name,
            'return_date': return_date,
            'manager_name': manager_name,
            'accommodations': accommodations,
            'fitness_for_duty_required': fitness_for_duty_required,
            'from_name': 'HR Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"Welcome Back! - {employee_name}",
            template_name='fmla/fmla_return.html',
            context=context
        )

    # ==========================================================================
    # EVENT EMAILS
    # ==========================================================================

    async def send_birthday_email(
        self,
        to_email: EmailStr,
        employee_name: str,
        birthday_message: Optional[str] = None,
        team_celebration: bool = False,
        celebration_date: Optional[str] = None,
        celebration_time: Optional[str] = None,
        celebration_location: Optional[str] = None
    ):
        """Send birthday email."""
        context = {
            'employee_name': employee_name,
            'birthday_message': birthday_message,
            'team_celebration': team_celebration,
            'celebration_date': celebration_date,
            'celebration_time': celebration_time,
            'celebration_location': celebration_location,
            'from_name': 'Your NBS Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"Happy Birthday {employee_name}!",
            template_name='events/birthday.html',
            context=context
        )

    async def send_anniversary_email(
        self,
        to_email: EmailStr,
        employee_name: str,
        years: int,
        start_date: str,
        current_role: str,
        department: Optional[str] = None,
        achievements: Optional[List[str]] = None,
        anniversary_message: Optional[str] = None,
        message_from: Optional[str] = None,
        celebration: bool = False,
        celebration_date: Optional[str] = None,
        celebration_time: Optional[str] = None,
        celebration_location: Optional[str] = None,
        gift_info: Optional[str] = None
    ):
        """Send work anniversary email."""
        context = {
            'employee_name': employee_name,
            'years': years,
            'start_date': start_date,
            'current_role': current_role,
            'department': department,
            'achievements': achievements,
            'anniversary_message': anniversary_message,
            'message_from': message_from,
            'celebration': celebration,
            'celebration_date': celebration_date,
            'celebration_time': celebration_time,
            'celebration_location': celebration_location,
            'gift_info': gift_info,
            'from_name': 'The NBS Team'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"Happy {years}-Year Work Anniversary {employee_name}!",
            template_name='events/anniversary.html',
            context=context
        )

    # ==========================================================================
    # FMLA NOTICE EMAILS
    # ==========================================================================

    async def send_fmla_notice(
        self,
        to_email: EmailStr,
        employee_name: str,
        leave_start_date: str,
        leave_reason: str,
        is_eligible: bool,
        certification_required: bool = False,
        certification_due_date: Optional[str] = None,
        notice_pdf_path: Optional[str] = None,
        cc_hr: bool = True
    ):
        """Send FMLA Notice of Eligibility and Rights & Responsibilities to employee.

        Args:
            to_email: Employee's email address
            employee_name: Employee's full name
            leave_start_date: Date leave will begin (formatted string)
            leave_reason: Reason for leave (own_health, family_care, etc.)
            is_eligible: Whether employee is FMLA eligible
            certification_required: Whether employee must provide certification
            certification_due_date: Deadline for certification (formatted string)
            notice_pdf_path: Path to the filled WH-381 form PDF
            cc_hr: Whether to CC HR on the email
        """
        # Map leave reasons to user-friendly text
        leave_reason_text = {
            'own_health': 'your own serious health condition',
            'family_care': 'caring for a family member with a serious health condition',
            'birth_adoption': 'the birth or adoption of a child',
            'military_exigency': 'a qualifying military exigency',
            'military_caregiver': 'caring for a covered servicemember'
        }.get(leave_reason, leave_reason)

        context = {
            'employee_name': employee_name,
            'leave_start_date': leave_start_date,
            'leave_reason': leave_reason_text,
            'is_eligible': is_eligible,
            'certification_required': certification_required,
            'certification_due_date': certification_due_date,
            'hr_contact_name': 'Michael Knudson',
            'hr_contact_email': 'mknudson@nbsbenefits.com',
            'from_name': 'HR Department'
        }

        # Prepare CC list
        cc_emails = []
        if cc_hr:
            cc_emails.append('mknudson@nbsbenefits.com')

        # Prepare attachments
        attachments = []
        if notice_pdf_path:
            attachments.append(notice_pdf_path)

        subject = f"FMLA Notice of Eligibility - {employee_name}"
        if not is_eligible:
            subject = f"FMLA Notice of Ineligibility - {employee_name}"

        await self.send_email(
            to_emails=[to_email],
            subject=subject,
            template_name='fmla/notice_of_eligibility.html',
            context=context,
            attachments=attachments,
            cc_emails=cc_emails if cc_emails else None
        )

    async def send_fmla_certification_reminder(
        self,
        to_email: EmailStr,
        employee_name: str,
        certification_due_date: str,
        days_remaining: int,
        certification_type: str = 'medical'
    ):
        """Send reminder to employee about pending FMLA certification.

        Args:
            to_email: Employee's email address
            employee_name: Employee's full name
            certification_due_date: Deadline for certification
            days_remaining: Number of days until deadline
            certification_type: Type of certification needed
        """
        cert_type_text = {
            'health_care_provider_employee': 'medical certification for your own health condition',
            'health_care_provider_family': 'medical certification for your family member',
            'qualifying_exigency': 'qualifying exigency certification',
            'military_caregiver': 'military caregiver certification'
        }.get(certification_type, 'medical certification')

        context = {
            'employee_name': employee_name,
            'certification_due_date': certification_due_date,
            'days_remaining': days_remaining,
            'certification_type': cert_type_text,
            'hr_contact_name': 'Michael Knudson',
            'hr_contact_email': 'mknudson@nbsbenefits.com',
            'is_urgent': days_remaining <= 7,
            'from_name': 'HR Department'
        }

        subject = f"FMLA Certification Due"
        if days_remaining <= 3:
            subject = f"URGENT: FMLA Certification Due in {days_remaining} Days"

        await self.send_email(
            to_emails=[to_email],
            subject=subject,
            template_name='fmla/certification_reminder.html',
            context=context
        )

    async def send_fmla_approval_notification(
        self,
        to_email: EmailStr,
        employee_name: str,
        leave_start_date: str,
        leave_end_date: Optional[str] = None,
        is_intermittent: bool = False,
        hours_approved: Optional[int] = None
    ):
        """Send FMLA approval notification to employee.

        Args:
            to_email: Employee's email address
            employee_name: Employee's full name
            leave_start_date: Date leave begins
            leave_end_date: Date leave ends (if continuous)
            is_intermittent: Whether this is intermittent leave
            hours_approved: Number of hours approved (if applicable)
        """
        context = {
            'employee_name': employee_name,
            'leave_start_date': leave_start_date,
            'leave_end_date': leave_end_date,
            'is_intermittent': is_intermittent,
            'hours_approved': hours_approved,
            'hr_contact_name': 'Michael Knudson',
            'hr_contact_email': 'mknudson@nbsbenefits.com',
            'from_name': 'HR Department'
        }

        await self.send_email(
            to_emails=[to_email],
            subject=f"FMLA Leave Approved - {employee_name}",
            template_name='fmla/approval.html',
            context=context
        )

    # ==========================================================================
    # LEGACY METHODS (for backward compatibility)
    # ==========================================================================

    async def send_new_hire_notification(
        self,
        to_email: str,
        employee_name: str,
        hire_date: str,
        department: str
    ):
        """Legacy method - redirects to send_welcome_email."""
        await self.send_welcome_email(
            to_email=to_email,
            employee_name=employee_name,
            role="New Employee",
            start_date=hire_date,
            department=department
        )

    async def send_termination_notification(
        self,
        to_email: str,
        employee_name: str,
        termination_date: str,
        termination_type: str
    ):
        """Legacy method - sends basic termination notification."""
        body_html = f"""
        <html>
        <body>
            <h2 style="color: #dc2626;">Employee Termination</h2>
            <p>An employee termination has been recorded:</p>
            <ul>
                <li><strong>Name:</strong> {employee_name}</li>
                <li><strong>Termination Date:</strong> {termination_date}</li>
                <li><strong>Type:</strong> {termination_type}</li>
            </ul>
            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated notification from the NBS HR Dashboard.
            </p>
        </body>
        </html>
        """

        await self.send_email(
            to_emails=[to_email],
            subject=f"Employee Termination: {employee_name}",
            body_html=body_html
        )

    async def send_wage_change_notification(
        self,
        to_email: str,
        employee_name: str,
        old_wage: float,
        new_wage: float,
        change_reason: str
    ):
        """Legacy method - sends wage change notification."""
        change_pct = ((new_wage - old_wage) / old_wage * 100) if old_wage > 0 else 0
        change_direction = "increase" if new_wage > old_wage else "decrease"

        body_html = f"""
        <html>
        <body>
            <h2 style="color: #059669;">Wage Change Recorded</h2>
            <p>A wage change has been recorded for:</p>
            <ul>
                <li><strong>Employee:</strong> {employee_name}</li>
                <li><strong>Previous Wage:</strong> ${old_wage:,.2f}</li>
                <li><strong>New Wage:</strong> ${new_wage:,.2f}</li>
                <li><strong>Change:</strong> {change_pct:.1f}% {change_direction}</li>
                <li><strong>Reason:</strong> {change_reason}</li>
            </ul>
            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated notification from the NBS HR Dashboard.
            </p>
        </body>
        </html>
        """

        await self.send_email(
            to_emails=[to_email],
            subject=f"Wage Change: {employee_name}",
            body_html=body_html
        )

    # ==========================================================================
    # GARNISHMENT TERMINATION EMAILS
    # ==========================================================================

    async def send_garnishment_termination(
        self,
        to_email: EmailStr,
        employee_name: str,
        employee_id: str,
        termination_date: str,
        case_number: str,
        garnishment_type: str,
        agency_name: str,
        case_reference: Optional[str] = None,
        amount_paid: Optional[float] = None,
        amount_remaining: Optional[float] = None,
        department: Optional[str] = None,
        from_name: Optional[str] = None,
        from_email: Optional[EmailStr] = None
    ):
        """
        Send garnishment agency termination notification email.

        Args:
            to_email: Agency email address
            employee_name: Full name of terminated employee
            employee_id: Employee ID
            termination_date: Date of termination
            case_number: Garnishment case number
            garnishment_type: Type of garnishment (Child Support, Tax Levy, etc.)
            agency_name: Name of garnishment agency
            case_reference: Agency's case reference number (optional)
            amount_paid: Total amount paid to agency (optional)
            amount_remaining: Amount still owed (optional)
            department: Employee's department (optional)
            from_name: Sender name (optional)
            from_email: Sender email (optional)
        """
        context = {
            "employee_name": employee_name,
            "employee_id": employee_id,
            "termination_date": termination_date,
            "case_number": case_number,
            "garnishment_type": garnishment_type,
            "agency_name": agency_name,
            "case_reference": case_reference,
            "amount_paid": amount_paid,
            "amount_remaining": amount_remaining,
            "department": department,
            "from_name": from_name or "HR Department",
            "from_email": from_email
        }

        html_content = self._render_template(
            "emails/offboarding/garnishment_termination.html",
            context
        )

        subject = f"Employee Termination Notification - {employee_name} - Case #{case_number}"

        await self.send_email(
            to_emails=[to_email],
            subject=subject,
            body_html=html_content
        )

    async def send_funds_transfer(
        self,
        to_email: EmailStr,
        employee_name: str,
        employee_id: str,
        termination_date: str,
        payroll_direct_deposits: Optional[float] = None,
        payroll_tax: Optional[float] = None,
        payroll_401k: Optional[float] = None,
        payroll_hsa: Optional[float] = None,
        payroll_garnishment: Optional[float] = None,
        payroll_total: Optional[float] = None,
        insurance_employer_employee: Optional[float] = None,
        insurance_employer_spouse: Optional[float] = None,
        insurance_employer_children: Optional[float] = None,
        insurance_employer_family: Optional[float] = None,
        insurance_employer_kaiser: Optional[float] = None,
        insurance_employee_employee: Optional[float] = None,
        insurance_employee_spouse: Optional[float] = None,
        insurance_employee_children: Optional[float] = None,
        insurance_employee_family: Optional[float] = None,
        insurance_employee_kaiser: Optional[float] = None,
        insurance_total: Optional[float] = None,
        department: Optional[str] = None,
        from_name: Optional[str] = None
    ):
        """
        Send funds transfer request email for terminated employee.

        Args:
            to_email: Recipient email (typically Shelli)
            employee_name: Full name of terminated employee
            employee_id: Employee ID
            termination_date: Date of termination
            payroll_direct_deposits: Direct deposit amount
            payroll_tax: Tax amount
            payroll_401k: 401k amount (EE + ER)
            payroll_hsa: HSA amount (EE + ER)
            payroll_garnishment: Garnishment amount
            payroll_total: Total for payroll account
            insurance_employer_employee: Employer contribution for Employee coverage
            insurance_employer_spouse: Employer contribution for Employee + Spouse
            insurance_employer_children: Employer contribution for Employee + Child(ren)
            insurance_employer_family: Employer contribution for Family coverage
            insurance_employer_kaiser: Employer contribution for Kaiser
            insurance_employee_employee: Employee contribution for Employee coverage
            insurance_employee_spouse: Employee contribution for Employee + Spouse
            insurance_employee_children: Employee contribution for Employee + Child(ren)
            insurance_employee_family: Employee contribution for Family coverage
            insurance_employee_kaiser: Employee contribution for Kaiser
            insurance_total: Total for insurance account
            department: Employee's department (optional)
            from_name: Sender name (optional)
        """
        # Calculate employer and employee totals
        insurance_employer_total = (
            (insurance_employer_employee or 0) +
            (insurance_employer_spouse or 0) +
            (insurance_employer_children or 0) +
            (insurance_employer_family or 0) +
            (insurance_employer_kaiser or 0)
        )

        insurance_employee_total = (
            (insurance_employee_employee or 0) +
            (insurance_employee_spouse or 0) +
            (insurance_employee_children or 0) +
            (insurance_employee_family or 0) +
            (insurance_employee_kaiser or 0)
        )

        # Calculate employee initials (e.g., "Mark Garcia" -> "MG")
        name_parts = employee_name.strip().split()
        employee_initials = ''.join([part[0].upper() for part in name_parts if part])

        context = {
            "employee_name": employee_name,
            "employee_initials": employee_initials,
            "employee_id": employee_id,
            "termination_date": termination_date,
            "payroll_direct_deposits": payroll_direct_deposits,
            "payroll_tax": payroll_tax,
            "payroll_401k": payroll_401k,
            "payroll_hsa": payroll_hsa,
            "payroll_garnishment": payroll_garnishment,
            "payroll_total": payroll_total,
            "insurance_employer_employee": insurance_employer_employee,
            "insurance_employer_spouse": insurance_employer_spouse,
            "insurance_employer_children": insurance_employer_children,
            "insurance_employer_family": insurance_employer_family,
            "insurance_employer_kaiser": insurance_employer_kaiser,
            "insurance_employee_employee": insurance_employee_employee,
            "insurance_employee_spouse": insurance_employee_spouse,
            "insurance_employee_children": insurance_employee_children,
            "insurance_employee_family": insurance_employee_family,
            "insurance_employee_kaiser": insurance_employee_kaiser,
            "insurance_employer_total": insurance_employer_total,
            "insurance_employee_total": insurance_employee_total,
            "insurance_total": insurance_total,
            "department": department,
            "from_name": from_name or "HR Department"
        }

        html_content = self._render_template(
            "offboarding/funds_transfer.html",
            context
        )

        subject = f"Funds Transfer Request - {employee_name} - Final Paycheck"

        await self.send_email(
            to_emails=[to_email],
            subject=subject,
            body_html=html_content
        )


# Singleton instance
email_service = EmailService()
