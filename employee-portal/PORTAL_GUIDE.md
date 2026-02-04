# Employee HR Portal - User Guide

## Overview

The Employee HR Portal is your one-stop destination for all HR self-service needs. Whether you need to check your PTO balance, submit an FMLA time entry, review your compensation history, or access company policies, everything is available in one unified portal.

**Access URL:** http://localhost:5176 (development)

---

## Navigation Structure

The portal is organized into five main sections, accessible from the left sidebar:

1. **Dashboard** - Your personalized home page
2. **My HR** - Personal information and benefits
3. **Requests & Cases** - Submit and track HR requests
4. **Resources** - Company policies, guides, and forms
5. **Team** - Supervisor-only section for managing direct reports

---

## Dashboard

The Dashboard is your landing page after logging in. It provides a quick overview of your HR status and pending items.

### What You'll See:

- **Action Items** - Urgent items requiring your attention (pending approvals, submissions awaiting review)
- **Quick Stats** - At-a-glance cards showing:
  - Vacation hours available
  - Active FMLA cases
  - FMLA hours remaining
  - Benefits status
- **Quick Actions** - One-click access to common tasks
- **Active FMLA Cases** - Progress bars showing hours used vs. remaining

### For Supervisors:
Additional "Team Overview" section displays:
- Team size
- Team members on FMLA
- Pending approvals count
- Performance review status

---

## My HR Section

Access your personal HR information and records.

### Profile (`/my-hr/profile`)
View and manage your personal information:
- **View:** Name, employee ID, email, phone, department, position, hire date, supervisor
- **Edit:** Emergency contact information (name, phone, relationship)
- Contact HR for changes to other fields

### Compensation (`/my-hr/compensation`)
Review your complete compensation history:
- **Current Salary** - Your base annual salary and pay frequency
- **Salary History** - Timeline of all salary changes with effective dates and change amounts
- **Bonuses** - Record of bonus payments received
- **Equity** - Stock grants and vesting schedules (if applicable)

*Note: This is read-only. Contact HR or your manager for compensation questions.*

### Benefits (`/my-hr/benefits`)
View your current benefits enrollment:
- **Health Insurance** - Medical, dental, vision plans and coverage levels
- **Retirement** - 401(k) contribution rate and employer match
- **Life & Disability** - Coverage amounts
- **Other Benefits** - HSA/FSA balances, additional perks

### Time Off (`/my-hr/time-off`)
Track your paid time off balances:
- **PTO Balances** - Vacation, sick, and personal time available
- **Accrual Information** - How PTO is earned
- **Usage History** - Record of time off taken
- **Upcoming Time Off** - Scheduled PTO

### Documents (`/my-hr/documents`)
Access your personal HR documents:
- Pay stubs
- W-2 tax forms
- Benefits enrollment confirmations
- Offer letters and employment agreements
- Performance reviews

*Documents can be viewed online or downloaded as PDF.*

---

## Requests & Cases Section

Submit new requests and track existing cases.

### FMLA Cases (`/requests/fmla`)
Manage your Family and Medical Leave:
- **View Active Cases** - See all your FMLA cases with status and hours remaining
- **Case Details** - Click any case to see full details, history, and time entries
- **Submit Time** - Log FMLA hours used (`/requests/fmla/submit-time`)
- **Request New Leave** - Start a new FMLA request (`/requests/fmla/new`)

#### Submitting FMLA Time:
1. Select the case
2. Choose the date
3. Enter hours (supports partial days)
4. Add any notes
5. Submit for supervisor approval

### Garnishments (`/requests/garnishments`)
View wage garnishment information (if applicable):
- Active garnishments with payee information
- Payment amounts and schedules
- Remaining balance
- Payment history

*This section only appears if you have active garnishments.*

### PTO Requests (`/requests/pto`)
Request and track paid time off:
- **Submit New Request** - Request vacation, sick, or personal time
- **View Pending** - See requests awaiting supervisor approval
- **Request History** - All past requests with approval status

#### Submitting a PTO Request:
1. Select PTO type (vacation, sick, personal)
2. Choose start and end dates
3. Confirm hours requested
4. Add optional notes
5. Submit for approval

### New Request (`/requests/new`)
Unified request submission for various HR needs:
- FMLA Leave Request
- Accommodation Request
- Other HR requests

---

## Resources Section

Access company information, policies, and forms.

### Employee Handbook (`/resources/handbook`)
The complete employee handbook organized by chapter:
- Welcome & Company Overview
- Employment Policies
- Time Off & Leave Policies
- Benefits Information
- Code of Conduct
- Safety & Security

*Searchable and downloadable as PDF.*

### Benefits Guide (`/resources/benefits`)
Detailed information about all benefit offerings:
- **Health Insurance** - Plan comparisons, coverage details, costs
- **Retirement Plans** - 401(k) details, contribution limits, matching
- **Life & Disability** - Coverage explanations
- **Enrollment Information** - Open enrollment dates, qualifying life events
- **Contact Information** - Benefits team contact details

### FAQs (`/resources/faqs`)
Searchable frequently asked questions:
- Time Off & Leave
- Payroll & Compensation
- Benefits
- IT Support
- General HR

*Can't find your answer? Contact HR directly.*

### Forms (`/resources/forms`)
Downloadable HR forms:
- Direct Deposit Authorization
- W-4 Tax Withholding
- State Tax Forms
- Beneficiary Designation
- FMLA Request Forms
- Emergency Contact Update

*Forms are available in PDF format.*

---

## Team Section (Supervisors Only)

This section is only visible to employees with supervisory responsibilities.

### Team Dashboard (`/team`)
Overview of your team's HR status:
- Team size and org chart position
- Team members currently on leave (FMLA, PTO)
- Pending items requiring your action
- Upcoming reviews and deadlines

### Direct Reports (`/team/reports`)
View and manage your direct reports:
- Employee list with contact information
- Current status (active, on leave, etc.)
- Quick access to each employee's profile
- Department and position information

### Pending Approvals (`/team/approvals`)
Central hub for all items needing your approval:
- **PTO Requests** - Approve or deny time off requests
- **FMLA Time Submissions** - Review and approve FMLA hours
- **Expense Reports** - Review submitted expenses
- **Timesheet Approvals** - Approve timesheets

Each item shows:
- Employee name
- Request type and details
- Submission date
- Approve/Deny actions with optional notes

### Performance Reviews (`/team/performance`)
Manage team performance evaluations:
- Current review cycle status
- Completion progress for your team
- Submit manager reviews
- View self-review submissions
- Access past review history

### Goals (`/team/goals`)
Track team objectives and OKRs:
- View all team member goals
- Progress tracking with completion percentages
- Goal status (on track, at risk, completed)
- Create and assign new goals

### PIPs (`/team/pips`)
Manage Performance Improvement Plans:
- Active PIPs with milestones and deadlines
- Progress tracking
- Document meetings and updates
- PIP history and outcomes

*PIPs should be created in coordination with HR.*

### Personnel Actions (PARs) (`/team/pars`)
Submit personnel action requests for your team:
- **Salary Changes** - Merit increases, adjustments
- **Title Changes** - Promotions, role updates
- **Transfers** - Department or location changes
- **Other Actions** - As needed

#### Submitting a PAR:
1. Select the employee
2. Choose action type
3. Enter current and proposed values
4. Set effective date
5. Provide business justification
6. Submit for HR review

---

## Tips & Best Practices

### For All Employees:
- Check the Dashboard regularly for action items
- Submit FMLA time entries promptly (within 2 business days)
- Keep emergency contact information up to date
- Review your benefits annually during open enrollment

### For Supervisors:
- Review pending approvals daily
- Approve/deny requests within 48 hours when possible
- Document all PAR requests with clear justification
- Keep performance notes throughout the year, not just at review time

---

## Getting Help

- **HR Questions:** hr@company.com
- **Benefits Questions:** benefits@company.com
- **Technical Issues:** it-support@company.com
- **Phone:** 1-800-HR-HELP (1-800-474-3457)

---

## Quick Reference

| Task | Navigation Path |
|------|-----------------|
| Check PTO balance | My HR → Time Off |
| Submit FMLA time | Requests → FMLA Cases → Submit Time |
| Request time off | Requests → PTO Requests |
| View pay stubs | My HR → Documents |
| Update emergency contact | My HR → Profile |
| Download W-2 | My HR → Documents |
| Find a policy | Resources → Handbook |
| Approve team PTO | Team → Pending Approvals |
| Submit a raise request | Team → Personnel Actions |
