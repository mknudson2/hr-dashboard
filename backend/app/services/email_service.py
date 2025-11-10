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

    def send_access_removal_checklist(
        self,
        employee_name: str,
        employee_id: str,
        termination_date: str,
        department: str,
        position: str,
        to_emails: List[str],
        cc_emails: List[str] = None,
        requester_name: str = None
    ):
        """
        Send access removal checklist email to IT/Security team.

        Args:
            employee_name: Name of the departing employee
            employee_id: Employee ID
            termination_date: Last working day
            department: Employee's department
            position: Employee's position
            to_emails: List of email addresses to send to
            cc_emails: List of CC email addresses
            requester_name: Name of person requesting the access removal
        """

        subject = f"🔒 Access Removal Required - {employee_name} ({employee_id})"

        # Create checklist items
        checklist_items = [
            {"system": "Email Account", "action": "Disable email account and set auto-reply", "priority": "Critical"},
            {"system": "Network Access", "action": "Disable Active Directory/LDAP account", "priority": "Critical"},
            {"system": "VPN Access", "action": "Remove VPN credentials and certificates", "priority": "Critical"},
            {"system": "Building Access", "action": "Deactivate badge/key card access", "priority": "High"},
            {"system": "Cloud Services", "action": "Remove access to AWS, Azure, GCP, etc.", "priority": "High"},
            {"system": "SaaS Applications", "action": "Remove access to Salesforce, GitHub, Jira, Slack, etc.", "priority": "High"},
            {"system": "Shared Drives", "action": "Remove access to network drives and document repositories", "priority": "Medium"},
            {"system": "Mobile Device Management", "action": "Wipe company data from mobile devices", "priority": "High"},
            {"system": "Remote Access", "action": "Disable SSH keys, remote desktop, and jump servers", "priority": "High"},
            {"system": "Database Access", "action": "Remove database credentials and permissions", "priority": "High"},
            {"system": "API Keys & Tokens", "action": "Revoke all API keys and access tokens", "priority": "High"},
            {"system": "Security Groups", "action": "Remove from all security groups and distribution lists", "priority": "Medium"}
        ]

        # Create checklist HTML
        checklist_html = ""
        for item in checklist_items:
            priority_class = f"priority-{item['priority'].lower()}"
            badge_class = f"badge-{item['priority'].lower()}"
            checklist_html += f"""
            <div class="checklist-item {priority_class}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div class="system-name">
                            <span class="checkbox">☐</span>
                            {item['system']}
                        </div>
                        <div class="action-text">{item['action']}</div>
                    </div>
                    <span class="priority-badge {badge_class}">{item['priority']}</span>
                </div>
            </div>
"""

        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .info-box {{ background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .info-row {{ display: flex; margin: 8px 0; }}
        .info-label {{ font-weight: bold; min-width: 180px; }}
        .checklist {{ margin: 20px 0; }}
        .checklist-item {{ background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 6px; }}
        .priority-critical {{ border-left: 4px solid #dc2626; }}
        .priority-high {{ border-left: 4px solid #f97316; }}
        .priority-medium {{ border-left: 4px solid #eab308; }}
        .priority-badge {{ display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }}
        .badge-critical {{ background-color: #fee2e2; color: #dc2626; }}
        .badge-high {{ background-color: #ffedd5; color: #f97316; }}
        .badge-medium {{ background-color: #fef3c7; color: #eab308; }}
        .system-name {{ font-weight: bold; font-size: 16px; color: #1f2937; }}
        .action-text {{ color: #6b7280; margin-top: 5px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }}
        .checkbox {{ width: 20px; height: 20px; border: 2px solid #9ca3af; border-radius: 4px; display: inline-block; margin-right: 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🔒 Access Removal Required</h1>
            <p style="margin: 10px 0 0 0;">Action Required: Employee Offboarding</p>
        </div>

        <div class="info-box">
            <h2 style="margin-top: 0;">Employee Information</h2>
            <div class="info-row">
                <span class="info-label">Employee Name:</span>
                <span>{employee_name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Employee ID:</span>
                <span>{employee_id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Position:</span>
                <span>{position}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Department:</span>
                <span>{department}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Last Working Day:</span>
                <span><strong>{termination_date}</strong></span>
            </div>
            {f'<div class="info-row"><span class="info-label">Requested By:</span><span>{requester_name}</span></div>' if requester_name else ''}
        </div>

        <h2>Access Removal Checklist</h2>
        <p>Please complete the following access removal tasks before or on the employee's last working day:</p>

        <div class="checklist">
{checklist_html}
        </div>

        <div class="info-box" style="background-color: #fef3c7; border-left: 4px solid #eab308;">
            <p style="margin: 0;"><strong>⚠️ Important:</strong> All critical and high-priority items must be completed by the employee's last working day. Please notify HR and IT management once all access has been removed.</p>
        </div>

        <div class="footer">
            <p><strong>Need Help?</strong> Contact the IT Service Desk or HR Operations team.</p>
            <p style="font-size: 12px; color: #9ca3af;">This is an automated notification from the HR Offboarding System. Please do not reply to this email.</p>
            <p style="font-size: 12px; color: #9ca3af;">Generated on {datetime.now().strftime('%Y-%m-%d at %I:%M %p')}</p>
        </div>
    </div>
</body>
</html>
"""

        body_text = f"""
ACCESS REMOVAL REQUIRED - {employee_name} ({employee_id})

EMPLOYEE INFORMATION:
- Name: {employee_name}
- Employee ID: {employee_id}
- Position: {position}
- Department: {department}
- Last Working Day: {termination_date}
{"- Requested By: " + requester_name if requester_name else ""}

ACCESS REMOVAL CHECKLIST:

"""
        for item in checklist_items:
            body_text += f"☐ [{item['priority']}] {item['system']}\n   Action: {item['action']}\n\n"

        body_text += """
IMPORTANT: All critical and high-priority items must be completed by the employee's last working day.
Please notify HR and IT management once all access has been removed.
"""

        # Send to all recipients
        for to_email in to_emails:
            self.send_email(to_email, subject, body_html, body_text)

        # Note: CC functionality would require modification of send_email method
        print(f"✅ Access removal checklist sent for {employee_name} to {len(to_emails)} recipient(s)")

    def send_exit_documents(
        self,
        employee_name: str,
        employee_id: str,
        employee_email: str,
        termination_date: str,
        position: str,
        department: str,
        hire_date: str,
        final_pay_date: str,
        pto_balance_hours: float = 0,
        pto_payout_amount: float = 0,
        has_benefits: bool = False,
        termination_reason: str = None,
        cc_emails: List[str] = None
    ):
        """
        Send exit documents package to departing employee.

        Args:
            employee_name: Name of the departing employee
            employee_id: Employee ID
            employee_email: Employee's email address
            termination_date: Last working day
            position: Employee's position
            department: Employee's department
            hire_date: Employee's hire date
            final_pay_date: Date of final paycheck
            pto_balance_hours: Remaining PTO hours
            pto_payout_amount: PTO payout amount
            has_benefits: Whether employee has benefits
            termination_reason: Reason for termination (optional)
            cc_emails: List of CC email addresses
        """

        subject = f"Exit Documents and Information - {employee_name}"

        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .info-box {{ background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .section {{ margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }}
        .section-title {{ font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; }}
        .info-row {{ display: flex; margin: 8px 0; }}
        .info-label {{ font-weight: bold; min-width: 180px; }}
        .checklist-item {{ padding: 10px; margin: 8px 0; background: white; border-left: 4px solid #3b82f6; }}
        .important {{ background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
        th {{ background-color: #f9fafb; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Exit Documents & Information</h1>
            <p style="margin: 10px 0 0 0;">Important information regarding your departure</p>
        </div>

        <div class="info-box">
            <h2 style="margin-top: 0;">Employee Information</h2>
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span>{employee_name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Employee ID:</span>
                <span>{employee_id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Position:</span>
                <span>{position}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Department:</span>
                <span>{department}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Hire Date:</span>
                <span>{hire_date}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Last Working Day:</span>
                <span><strong>{termination_date}</strong></span>
            </div>
        </div>

        <!-- Final Compensation Section -->
        <div class="section">
            <div class="section-title">💰 Final Compensation</div>
            <p>Your final paycheck will be processed and available on <strong>{final_pay_date}</strong>.</p>

            <table>
                <tr>
                    <th>Item</th>
                    <th>Details</th>
                </tr>
                <tr>
                    <td>Final Pay Period</td>
                    <td>Through {termination_date}</td>
                </tr>
                <tr>
                    <td>PTO Balance</td>
                    <td>{pto_balance_hours:.2f} hours</td>
                </tr>
                <tr>
                    <td>PTO Payout</td>
                    <td>${pto_payout_amount:,.2f}</td>
                </tr>
                <tr>
                    <td>Payment Method</td>
                    <td>Direct deposit (if enrolled) or mailed check</td>
                </tr>
            </table>

            <div class="important">
                <p style="margin: 0;"><strong>Note:</strong> Your final paycheck will include any outstanding wages, unused PTO payout (if applicable), and any other earned compensation through your last day of work.</p>
            </div>
        </div>

        <!-- Benefits Continuation Section -->
        {"<div class='section'><div class='section-title'>🏥 Benefits Continuation (COBRA)</div><p>As a former employee, you have the right to continue your health insurance coverage under the Consolidated Omnibus Budget Reconciliation Act (COBRA).</p><div class='checklist-item'><strong>Timeline:</strong> You will receive COBRA election documents within 14 days of your termination date.</div><div class='checklist-item'><strong>Coverage Period:</strong> COBRA coverage can continue for up to 18 months (or longer in certain circumstances).</div><div class='checklist-item'><strong>Cost:</strong> You will be responsible for 100% of the premium plus a 2% administrative fee.</div><div class='checklist-item'><strong>Election Deadline:</strong> You have 60 days from your termination date to elect COBRA coverage.</div><p style='margin-top: 15px;'><strong>Important:</strong> If you do not receive your COBRA documents within 14 days, please contact HR immediately.</p></div>" if has_benefits else ""}

        <!-- Return of Company Property Section -->
        <div class="section">
            <div class="section-title">📦 Return of Company Property</div>
            <p>Please ensure all company property is returned by your last working day:</p>

            <div class="checklist-item">☐ Laptop/Computer Equipment</div>
            <div class="checklist-item">☐ Mobile Phone & Accessories</div>
            <div class="checklist-item">☐ Access Cards/Keys/Badges</div>
            <div class="checklist-item">☐ Company Credit Cards</div>
            <div class="checklist-item">☐ Documents & Files (Physical & Digital)</div>
            <div class="checklist-item">☐ Any Other Company-Owned Equipment</div>

            <p style="margin-top: 15px;"><strong>Return Instructions:</strong> Please coordinate with your manager or IT department to return all items. If working remotely, shipping labels will be provided.</p>
        </div>

        <!-- Exit Interview Section -->
        <div class="section">
            <div class="section-title">💬 Exit Interview</div>
            <p>We value your feedback and would appreciate the opportunity to conduct an exit interview.</p>

            <p>The exit interview is an opportunity to:</p>
            <ul>
                <li>Share your experiences and feedback about your time with the company</li>
                <li>Discuss what we did well and areas for improvement</li>
                <li>Ask any questions about your departure or future opportunities</li>
            </ul>

            <p><strong>Your HR representative will contact you shortly to schedule a convenient time for your exit interview.</strong></p>
        </div>

        <!-- Important Reminders Section -->
        <div class="section">
            <div class="section-title">⚠️ Important Reminders</div>

            <div class="checklist-item">
                <strong>Confidentiality Obligations:</strong> Your confidentiality obligations continue after your employment ends. Please review your confidentiality agreement and ensure you do not disclose any proprietary or confidential company information.
            </div>

            <div class="checklist-item">
                <strong>Non-Compete/Non-Solicitation:</strong> Please review any non-compete or non-solicitation agreements you may have signed. These obligations typically continue for a specified period after termination.
            </div>

            <div class="checklist-item">
                <strong>Final Expense Reports:</strong> Submit any outstanding expense reports by your last working day to ensure timely reimbursement.
            </div>

            <div class="checklist-item">
                <strong>401(k) and Retirement Plans:</strong> You will receive separate communication from our retirement plan administrator regarding your options for your 401(k) account.
            </div>

            <div class="checklist-item">
                <strong>Unemployment Benefits:</strong> If eligible, you may apply for unemployment benefits through your state's unemployment office.
            </div>

            <div class="checklist-item">
                <strong>References:</strong> Please direct any reference requests to HR. We will verify employment dates and position upon request.
            </div>
        </div>

        <!-- Contact Information Section -->
        <div class="section">
            <div class="section-title">📞 Questions or Concerns?</div>
            <p>If you have any questions about this information or your departure, please contact:</p>

            <table>
                <tr>
                    <td><strong>HR Department</strong></td>
                    <td>hr@company.com</td>
                </tr>
                <tr>
                    <td><strong>Payroll Questions</strong></td>
                    <td>payroll@company.com</td>
                </tr>
                <tr>
                    <td><strong>Benefits Questions</strong></td>
                    <td>benefits@company.com</td>
                </tr>
                <tr>
                    <td><strong>IT Support</strong></td>
                    <td>it@company.com</td>
                </tr>
            </table>
        </div>

        <div class="important">
            <p style="margin: 0;"><strong>Thank you for your service and contributions.</strong> We wish you all the best in your future endeavors.</p>
        </div>

        <div class="footer">
            <p><strong>This is an automated notification from the HR Offboarding System.</strong></p>
            <p style="font-size: 12px; color: #9ca3af;">Generated on {datetime.now().strftime('%Y-%m-%d at %I:%M %p')}</p>
            <p style="font-size: 12px; color: #9ca3af;">Please keep this email for your records.</p>
        </div>
    </div>
</body>
</html>
"""

        body_text = f"""
EXIT DOCUMENTS & INFORMATION

EMPLOYEE INFORMATION:
- Name: {employee_name}
- Employee ID: {employee_id}
- Position: {position}
- Department: {department}
- Hire Date: {hire_date}
- Last Working Day: {termination_date}

FINAL COMPENSATION:
Your final paycheck will be processed and available on {final_pay_date}.
- PTO Balance: {pto_balance_hours:.2f} hours
- PTO Payout: ${pto_payout_amount:,.2f}

{"BENEFITS CONTINUATION (COBRA):\nYou will receive COBRA election documents within 14 days of your termination date.\nCoverage can continue for up to 18 months. You have 60 days to elect coverage.\n" if has_benefits else ""}

RETURN OF COMPANY PROPERTY:
Please ensure all company property is returned by your last working day:
- Laptop/Computer Equipment
- Mobile Phone & Accessories
- Access Cards/Keys/Badges
- Company Credit Cards
- Documents & Files
- Any Other Company-Owned Equipment

EXIT INTERVIEW:
Your HR representative will contact you shortly to schedule your exit interview.

IMPORTANT REMINDERS:
- Confidentiality obligations continue after employment ends
- Review any non-compete/non-solicitation agreements
- Submit outstanding expense reports by your last day
- 401(k) information will be sent separately
- You may be eligible for unemployment benefits
- Direct reference requests to HR

QUESTIONS?
Contact HR at hr@company.com or call your HR representative.

Thank you for your service and contributions. We wish you all the best in your future endeavors.
"""

        # Send to employee
        self.send_email(employee_email, subject, body_html, body_text)

        # Send copies to CC if provided
        if cc_emails:
            for cc_email in cc_emails:
                self.send_email(cc_email, f"[CC] {subject}", body_html, body_text)

        print(f"✅ Exit documents sent to {employee_name} at {employee_email}")


# Singleton instance
email_service = EmailService()
