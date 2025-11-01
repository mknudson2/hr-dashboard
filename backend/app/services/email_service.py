"""Email service for sending notifications."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
import os
from datetime import datetime


class EmailService:
    """Service for sending email notifications."""

    def __init__(self):
        # Email configuration (can be moved to environment variables)
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@nbshr.com")
        self.enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"

    def send_email(self, to_email: str, subject: str, body_html: str, body_text: str = None):
        """Send an email notification.

        Args:
            to_email: Recipient email address
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body content (optional)
        """
        if not self.enabled:
            print(f"[EMAIL DISABLED] Would send to {to_email}: {subject}")
            return

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email

            # Add text and HTML parts
            if body_text:
                part1 = MIMEText(body_text, 'plain')
                msg.attach(part1)

            part2 = MIMEText(body_html, 'html')
            msg.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            print(f"✅ Email sent to {to_email}: {subject}")

        except Exception as e:
            print(f"❌ Error sending email to {to_email}: {str(e)}")

    def send_new_hire_notification(self, to_email: str, employee_name: str, hire_date: str, department: str):
        """Send notification for new hire."""
        subject = f"New Hire: {employee_name}"

        body_html = f"""
        <html>
        <body>
            <h2 style="color: #2563eb;">New Employee Added</h2>
            <p>A new employee has been added to the HR system:</p>
            <ul>
                <li><strong>Name:</strong> {employee_name}</li>
                <li><strong>Department:</strong> {department}</li>
                <li><strong>Hire Date:</strong> {hire_date}</li>
            </ul>
            <p>Please welcome {employee_name} to the team!</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated notification from the NBS HR Dashboard.
            </p>
        </body>
        </html>
        """

        body_text = f"""
        New Employee Added

        Name: {employee_name}
        Department: {department}
        Hire Date: {hire_date}

        Please welcome {employee_name} to the team!
        """

        self.send_email(to_email, subject, body_html, body_text)

    def send_termination_notification(self, to_email: str, employee_name: str, termination_date: str, termination_type: str):
        """Send notification for employee termination."""
        subject = f"Employee Termination: {employee_name}"

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

        body_text = f"""
        Employee Termination

        Name: {employee_name}
        Termination Date: {termination_date}
        Type: {termination_type}
        """

        self.send_email(to_email, subject, body_html, body_text)

    def send_wage_change_notification(self, to_email: str, employee_name: str, old_wage: float, new_wage: float, change_reason: str):
        """Send notification for wage change."""
        change_pct = ((new_wage - old_wage) / old_wage * 100) if old_wage > 0 else 0
        change_direction = "increase" if new_wage > old_wage else "decrease"

        subject = f"Wage Change: {employee_name}"

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

        body_text = f"""
        Wage Change Recorded

        Employee: {employee_name}
        Previous Wage: ${old_wage:,.2f}
        New Wage: ${new_wage:,.2f}
        Change: {change_pct:.1f}% {change_direction}
        Reason: {change_reason}
        """

        self.send_email(to_email, subject, body_html, body_text)

    def send_weekly_report(self, to_email: str, stats: dict):
        """Send weekly summary report.

        Args:
            to_email: Recipient email
            stats: Dictionary containing weekly statistics
        """
        subject = f"Weekly HR Summary - {datetime.now().strftime('%B %d, %Y')}"

        body_html = f"""
        <html>
        <body>
            <h2 style="color: #2563eb;">Weekly HR Summary</h2>
            <p>Here's your weekly HR dashboard summary:</p>

            <h3>Employee Metrics</h3>
            <ul>
                <li><strong>Total Active Employees:</strong> {stats.get('active_employees', 0)}</li>
                <li><strong>New Hires This Week:</strong> {stats.get('new_hires', 0)}</li>
                <li><strong>Terminations This Week:</strong> {stats.get('terminations', 0)}</li>
            </ul>

            <h3>YTD Metrics</h3>
            <ul>
                <li><strong>YTD Hires:</strong> {stats.get('ytd_hires', 0)}</li>
                <li><strong>YTD Terminations:</strong> {stats.get('ytd_terminations', 0)}</li>
                <li><strong>Turnover Rate:</strong> {stats.get('turnover_rate', 0):.1f}%</li>
            </ul>

            <h3>International Breakdown</h3>
            <ul>
                <li><strong>Total International:</strong> {stats.get('total_international', 0)}</li>
            </ul>

            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated weekly report from the NBS HR Dashboard.
            </p>
        </body>
        </html>
        """

        body_text = f"""
        Weekly HR Summary - {datetime.now().strftime('%B %d, %Y')}

        Employee Metrics:
        - Total Active Employees: {stats.get('active_employees', 0)}
        - New Hires This Week: {stats.get('new_hires', 0)}
        - Terminations This Week: {stats.get('terminations', 0)}

        YTD Metrics:
        - YTD Hires: {stats.get('ytd_hires', 0)}
        - YTD Terminations: {stats.get('ytd_terminations', 0)}
        - Turnover Rate: {stats.get('turnover_rate', 0):.1f}%

        International Breakdown:
        - Total International: {stats.get('total_international', 0)}
        """

        self.send_email(to_email, subject, body_html, body_text)


# Singleton instance
email_service = EmailService()
