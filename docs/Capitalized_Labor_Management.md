# Capitalized Labor Management

## Overview

The Capitalized Labor Management page is a comprehensive time tracking and labor cost capitalization system designed for organizations that need to track and capitalize labor costs associated with software development, asset construction, or other qualifying projects under accounting standards (such as ASC 350 for internally-developed software).

**Labor capitalization** is an accounting practice where labor costs associated with creating or developing certain assets (like software or infrastructure) are recorded as capital assets on the balance sheet rather than being expensed immediately. This spreads the cost recognition over the useful life of the asset through amortization.

---

## Page Structure

The page is organized into three main tabs:

1. **Time Tracking** - For employees to log their work hours
2. **Timesheet Approval** - For managers to review and approve submitted timesheets
3. **Analytics** - For analyzing capitalization rates and generating reports

---

## Tab 1: Time Tracking

### Purpose
Allows employees to record their daily work hours against specific projects, categorizing the type of labor and whether it qualifies for capitalization.

### Features

#### Current Timesheet Summary
Displays a summary card showing:
- **Pay Period Range**: The start and end dates of the current pay period
- **Status Badge**: Current timesheet status (draft, submitted, approved, needs_revision)
- **Total Hours**: Sum of all hours logged in the current pay period
- **Regular Hours**: Non-overtime hours worked
- **Overtime Hours**: Hours marked as overtime (displayed in orange)

#### Add Time Entry Form
A form to create new time entries with the following fields:

| Field | Description | Options/Format |
|-------|-------------|----------------|
| **Project** | The project to log time against | Dropdown of active projects (shows project code and name) |
| **Date** | The work date | Date picker (defaults to today) |
| **Hours** | Number of hours worked | Numeric input (supports quarter-hour increments: 0.25) |
| **Labor Type** | Classification of the work performed | Direct, Indirect, or Overhead |
| **Overtime** | Whether the hours are overtime | Yes/No dropdown |
| **Task Description** | Brief description of work done | Free text field |

##### Labor Type Definitions:
- **Direct Labor**: Time spent directly working on project tasks (coding, designing, building, etc.)
- **Indirect Labor**: Time spent on activities supporting the project but not directly creating the asset (project meetings, planning, coordination)
- **Overhead Labor**: General administrative activities that can be allocated to capital projects (management oversight, facilities)

#### Action Buttons
- **Add Entry**: Saves the time entry to the current timesheet
- **Submit Timesheet**: Submits the timesheet for manager approval (only visible when status is "draft")

#### Time Entries List
A table displaying all time entries for the current pay period:

| Column | Description |
|--------|-------------|
| Date | Work date |
| Project | Project name |
| Task | Task description |
| Hours | Hours logged (right-aligned, 2 decimal places) |
| Type | Labor type badge (direct/indirect/overhead) |
| Capitalizable | Checkmark (✓) if the project is capitalizable, dash (-) if not |

### How Capitalization Is Determined
When a time entry is created, the system automatically:
1. Looks up the selected project
2. Checks the project's `is_capitalizable` flag
3. If capitalizable, marks the time entry as capitalizable and assigns the project's `capitalization_type`
4. This determination is automatic based on project configuration

---

## Tab 2: Timesheet Approval

### Purpose
Enables managers to review, approve, or reject timesheets submitted by their team members.

### Features

#### Statistics Cards
Three cards displaying approval workflow metrics:
- **Pending**: Number of timesheets awaiting approval (orange)
- **Approved**: Number of approved timesheets (green)
- **Needs Revision**: Number of rejected timesheets requiring employee revision (red)

#### Filter Tabs
Quick filters to view timesheets by status:
- **Submitted** (default): Timesheets awaiting approval
- **Approved**: Previously approved timesheets
- **Needs Revision**: Rejected timesheets
- **All**: All timesheets regardless of status

#### Timesheets List
A list of timesheet cards showing:
- **Employee Name**: Name of the employee who submitted
- **Pay Period**: Date range of the timesheet
- **Status Badge**: Color-coded status indicator
- **Total Hours**: Sum of all hours on the timesheet

Clicking a timesheet card selects it and displays details in the right panel.

#### Timesheet Details Panel
When a timesheet is selected, displays:
- **Employee Information**: Employee name
- **Hour Breakdown**:
  - Total hours
  - Regular hours
  - Overtime hours (OT, displayed in orange)
- **Time Entries**: Scrollable list of all entries showing:
  - Project name
  - Hours worked
  - Task description

#### Approval Actions
For timesheets with "submitted" status:
- **Approve Button** (green): Approves the timesheet and all its time entries
- **Reject Button** (red): Opens rejection modal

#### Rejection Modal
When rejecting a timesheet:
1. A modal dialog appears
2. Manager must provide a rejection reason (textarea)
3. Options:
   - **Cancel**: Close without rejecting
   - **Submit Rejection**: Reject the timesheet with the provided reason

### Timesheet Status Workflow

```
draft → submitted → approved
              ↓
       needs_revision → submitted (resubmission)
```

1. **Draft**: Initial state, employee is entering time
2. **Submitted**: Employee has submitted for approval
3. **Approved**: Manager has approved (time entries become locked and marked as approved)
4. **Needs Revision**: Manager rejected with feedback, employee must revise and resubmit

---

## Tab 3: Analytics

### Purpose
Provides comprehensive analytics on labor capitalization, enabling financial reporting and analysis of labor distribution across projects and employees.

### Features

#### Date Filter Controls
Filter analytics by date range:
- **Start Date**: Beginning of analysis period
- **End Date**: End of analysis period
- **Apply Filters**: Apply the selected date range
- **Clear**: Reset to all-time data
- **Export CSV**: Download a comprehensive report

#### Summary Statistics Cards
Four key metrics displayed as interactive cards:

| Metric | Description | Additional Info |
|--------|-------------|-----------------|
| **Total Hours** | Sum of all approved time entries | Shows breakdown of Regular vs OT hours |
| **Capitalizable** | Hours worked on capitalizable projects | Shows percentage of total |
| **Non-Capitalizable** | Hours worked on non-capitalizable projects | Shows percentage of total |
| **Overtime Rate** | Percentage of total hours that are overtime | Shows total OT hours |

#### Labor Type Distribution
Visual progress bars showing the breakdown of hours by labor type:
- **Direct Labor** (blue bar): Hours spent directly on project work
- **Indirect Labor** (green bar): Supporting project activities
- **Overhead Labor** (orange bar): Administrative activities

Each bar shows:
- Label
- Hours worked
- Visual representation as percentage of total

#### Project-Level Analysis Table
Detailed breakdown by project:

| Column | Description |
|--------|-------------|
| Project | Project name and code |
| Total Hrs | Total approved hours |
| Cap. Hrs | Capitalizable hours (green) |
| Direct | Direct labor hours (blue) |
| Indirect | Indirect labor hours (green) |
| Overhead | Overhead labor hours (orange) |
| Employees | Count of unique employees who logged time |

#### Employee-Level Analysis Table
Breakdown by employee:

| Column | Description |
|--------|-------------|
| Employee | Employee name |
| Total Hours | Total approved hours worked |
| Cap. Hours | Capitalizable hours (green) |
| Cap. Rate | Capitalization rate as a percentage with color-coded badge |
| Projects | Number of unique projects worked on |

**Capitalization Rate Color Coding:**
- Green (≥50%): High capitalization rate
- Yellow (25-49%): Medium capitalization rate
- Gray (<25%): Low capitalization rate

#### CSV Export
The Export CSV feature generates a comprehensive report containing:

1. **Header Section**:
   - Report type
   - Date range

2. **Summary Section**:
   - Total hours
   - Capitalizable hours
   - Non-capitalizable hours
   - Capitalization rate

3. **Project Breakdown Section** (CSV format):
   - Project Code
   - Project Name
   - Total Hours
   - Capitalizable Hours
   - Non-Capitalizable Hours
   - Employee Count

4. **Employee Breakdown Section** (CSV format):
   - Employee Name
   - Total Hours
   - Capitalizable Hours
   - Non-Capitalizable Hours
   - Capitalization Rate
   - Project Count

---

## Project Configuration

Projects determine whether time logged against them is capitalizable. Key project fields:

| Field | Description |
|-------|-------------|
| `project_code` | Unique identifier (e.g., "PROJ-2025-001") |
| `project_name` | Human-readable name |
| `is_capitalizable` | Boolean flag determining if labor costs can be capitalized |
| `capitalization_type` | Type of capitalization (e.g., "software_development", "asset_construction") |
| `capitalization_start_date` | Date when capitalization eligibility begins |
| `capitalization_end_date` | Date when capitalization eligibility ends |
| `department` | Department owning the project |
| `cost_center` | Cost center for accounting |
| `status` | Project status (active, completed, on_hold, cancelled) |
| `total_budget` | Total project budget |
| `labor_budget` | Budget allocated for labor |
| `amortization_period_months` | How long the capitalized asset will be amortized |

---

## Data Flow

### Time Entry Creation
1. Employee selects a project and enters time details
2. System finds or creates a timesheet for the current pay period
3. Time entry is created with:
   - `is_capitalizable` automatically set based on project configuration
   - `capitalization_category` set to project's `capitalization_type` if capitalizable
4. Audit log entry created tracking the creation
5. Timesheet totals recalculated

### Timesheet Submission
1. Employee clicks "Submit Timesheet"
2. Status changes from "draft" to "submitted"
3. Submission timestamp recorded
4. Timesheet appears in manager's approval queue

### Timesheet Approval
1. Manager reviews timesheet details and time entries
2. Manager clicks "Approve"
3. Status changes to "approved"
4. All time entries marked as `is_approved = true`
5. Approved timestamp and approver ID recorded
6. Time entries now included in analytics calculations

### Timesheet Rejection
1. Manager reviews timesheet
2. Manager clicks "Reject" and provides reason
3. Status changes to "needs_revision"
4. Rejection reason stored
5. Revision count incremented
6. Employee must revise and resubmit

---

## Audit Trail

The system maintains comprehensive audit logs for compliance:

### Time Entry Audit (`TimeEntryAudit`)
Tracks all changes to time entries:
- **Action**: created, updated, deleted
- **Changed By**: User who made the change
- **Old Values**: Previous state (JSON)
- **New Values**: New state (JSON)
- **Change Reason**: Optional reason for edit
- **Timestamp**: When the change occurred

### Edit Restrictions
- Time entries on submitted or approved timesheets cannot be edited
- Time entries on submitted or approved timesheets cannot be deleted
- All edits are tracked with before/after values

---

## Key Business Rules

1. **Automatic Pay Period Assignment**: Time entries are automatically assigned to the current pay period
2. **Project-Based Capitalization**: Capitalizability is determined by project configuration, not individual entries
3. **Overtime Tracking**: Both regular and overtime hours are tracked separately for accurate cost allocation
4. **Approval Required for Analytics**: Only approved time entries are included in analytics calculations
5. **Revision Tracking**: System tracks how many times a timesheet has been revised
6. **Immutable Approved Data**: Once approved, time entries cannot be modified

---

## Use Cases

### For Employees
- Log daily work hours against assigned projects
- Track progress toward pay period completion
- View breakdown of capitalizable vs non-capitalizable work
- Submit timesheets for manager approval
- Revise rejected timesheets based on manager feedback

### For Managers
- Review team timesheets before approval
- Ensure accurate project and labor type coding
- Approve or reject timesheets with feedback
- Monitor team utilization and capitalization rates

### For Finance/Accounting
- Generate reports on capitalizable labor costs
- Export data for GL journal entries
- Analyze capitalization rates by project and employee
- Support audit requirements with detailed tracking
- Plan for future amortization schedules

---

## Technical Notes

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/capitalized-labor/projects` | GET | List all projects |
| `/capitalized-labor/projects/{id}` | GET | Get project details |
| `/capitalized-labor/time-entries` | GET/POST | List or create time entries |
| `/capitalized-labor/time-entries/{id}` | PUT/DELETE | Update or delete time entry |
| `/capitalized-labor/timesheets` | GET | List timesheets |
| `/capitalized-labor/timesheets/{id}` | GET | Get timesheet with entries |
| `/capitalized-labor/timesheets/{id}/submit` | POST | Submit timesheet |
| `/capitalized-labor/timesheets/{id}/approve` | POST | Approve timesheet |
| `/capitalized-labor/timesheets/{id}/reject` | POST | Reject timesheet |
| `/capitalized-labor/analytics/summary` | GET | Get capitalization summary |
| `/capitalized-labor/analytics/by-project` | GET | Get project analytics |
| `/capitalized-labor/analytics/by-employee` | GET | Get employee analytics |

### Database Tables

- `projects` - Project definitions and capitalization settings
- `pay_periods` - Pay period definitions
- `timesheets` - Employee timesheet headers
- `time_entries` - Individual time entries
- `time_entry_audits` - Audit trail for time entries
- `capitalization_calculations` - Monthly capitalization calculations
- `capitalization_audit_logs` - Audit trail for capitalization events
