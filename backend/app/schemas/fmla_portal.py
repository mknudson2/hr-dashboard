"""
Pydantic schemas for FMLA Self-Service Portal API.
Used for request/response validation and serialization.
"""
from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# =============================================================================
# EMPLOYEE SCHEMAS - Time Submission
# =============================================================================

class TimeSubmissionCreate(BaseModel):
    """Schema for employee submitting time entry for approval."""
    case_id: int
    leave_date: str  # ISO format date string
    hours_requested: float = Field(..., gt=0, le=24)
    entry_type: str  # "Full Day", "Partial Day", "Intermittent"
    employee_notes: Optional[str] = None


class TimeSubmissionResponse(BaseModel):
    """Response schema for time submission."""
    id: int
    case_id: int
    employee_id: str
    leave_date: str
    hours_requested: float
    entry_type: Optional[str]
    employee_notes: Optional[str]
    status: str
    submitted_at: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[str]
    reviewer_notes: Optional[str]
    approved_hours: Optional[float]

    class Config:
        from_attributes = True


class TimeSubmissionListResponse(BaseModel):
    """Response schema for list of time submissions."""
    submissions: List[TimeSubmissionResponse]
    total: int
    pending_count: int


# =============================================================================
# EMPLOYEE SCHEMAS - Leave Request
# =============================================================================

class LeaveRequestCreate(BaseModel):
    """Schema for employee submitting new FMLA leave request."""
    leave_type: str  # "Employee Medical", "Family Care", "Military Family", "Bonding"
    reason: Optional[str] = None
    requested_start_date: str  # ISO format date string
    requested_end_date: Optional[str] = None
    intermittent: bool = False
    reduced_schedule: bool = False
    estimated_hours_per_week: Optional[float] = None


class LeaveRequestResponse(BaseModel):
    """Response schema for leave request."""
    id: int
    employee_id: str
    leave_type: str
    reason: Optional[str]
    requested_start_date: str
    requested_end_date: Optional[str]
    intermittent: bool
    reduced_schedule: bool
    estimated_hours_per_week: Optional[float]
    status: str
    submitted_at: str
    hr_notes: Optional[str]
    linked_case_id: Optional[int]

    class Config:
        from_attributes = True


# =============================================================================
# EMPLOYEE SCHEMAS - Case View
# =============================================================================

class CaseResponse(BaseModel):
    """Response schema for FMLA case."""
    id: int
    case_number: str
    employee_id: str
    employee_name: str
    status: str
    leave_type: str
    reason: Optional[str]
    request_date: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    hours_approved: float
    hours_used: float
    hours_remaining: float
    intermittent: bool
    reduced_schedule: bool

    class Config:
        from_attributes = True


class MyCasesResponse(BaseModel):
    """Response for employee's FMLA cases."""
    cases: List[CaseResponse]
    total_cases: int
    active_cases: int
    rolling_12mo_hours_used: float
    rolling_12mo_hours_available: float


# =============================================================================
# SUPERVISOR SCHEMAS - Review Actions
# =============================================================================

class SubmissionReviewRequest(BaseModel):
    """Schema for supervisor reviewing a time submission."""
    action: str  # "approved", "rejected", "revised"
    reason_for_change: str = Field(..., min_length=10)  # Required explanation
    approved_hours: Optional[float] = None  # Required if action is "revised"
    reviewer_notes: Optional[str] = None


class SubmissionReviewResponse(BaseModel):
    """Response after reviewing a submission."""
    submission_id: int
    status: str
    approved_hours: Optional[float]
    reviewed_at: str
    audit_log_id: int


# =============================================================================
# SUPERVISOR SCHEMAS - Team View
# =============================================================================

class TeamMemberSubmission(BaseModel):
    """Submission details with employee info for supervisor view."""
    id: int
    employee_id: str
    employee_name: str
    department: Optional[str]
    case_number: str
    leave_date: str
    hours_requested: float
    entry_type: Optional[str]
    employee_notes: Optional[str]
    status: str
    submitted_at: str


class TeamSubmissionsResponse(BaseModel):
    """Response for supervisor's team submissions."""
    pending_submissions: List[TeamMemberSubmission]
    recent_submissions: List[TeamMemberSubmission]
    pending_count: int
    approved_today: int
    rejected_today: int


class TeamCaseSummary(BaseModel):
    """Summary of team member's FMLA case."""
    employee_id: str
    employee_name: str
    department: Optional[str]
    case_id: int
    case_number: str
    status: str
    leave_type: str
    start_date: Optional[str]
    hours_used: float
    hours_remaining: float
    pending_submissions: int


class TeamCasesResponse(BaseModel):
    """Response for supervisor's team FMLA cases."""
    cases: List[TeamCaseSummary]
    total_team_members_on_fmla: int
    total_pending_submissions: int


# =============================================================================
# AUDIT LOG SCHEMAS
# =============================================================================

class AuditLogEntry(BaseModel):
    """Schema for audit log entry."""
    id: int
    supervisor_id: int
    supervisor_name: str
    employee_id: str
    employee_name: str
    action_type: str
    target_type: str
    target_id: int
    previous_value: Optional[Any]
    new_value: Optional[Any]
    reason_for_change: str
    created_at: str
    ip_address: Optional[str]


class AuditLogResponse(BaseModel):
    """Response for audit log queries."""
    entries: List[AuditLogEntry]
    total: int


# =============================================================================
# REPORT SCHEMAS
# =============================================================================

class ReportExportRequest(BaseModel):
    """Schema for requesting report export."""
    format: str = "csv"  # "csv" or "pdf"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    include_pending: bool = True
    include_approved: bool = True
    include_rejected: bool = True


class ReportSummary(BaseModel):
    """Summary data for team FMLA report."""
    total_submissions: int
    total_hours_approved: float
    total_hours_rejected: float
    by_employee: List[dict]
    by_status: dict
    date_range: dict


# =============================================================================
# DASHBOARD SCHEMAS
# =============================================================================

class EmployeeDashboardResponse(BaseModel):
    """Dashboard data for employee."""
    employee_id: str
    employee_name: str
    active_cases: List[CaseResponse]
    pending_submissions: List[TimeSubmissionResponse]
    recent_submissions: List[TimeSubmissionResponse]
    rolling_12mo_hours_used: float
    rolling_12mo_hours_available: float


class SupervisorDashboardResponse(BaseModel):
    """Dashboard data for supervisor."""
    team_size: int
    team_members_on_fmla: int
    pending_submissions: int
    submissions_to_review: List[TeamMemberSubmission]
    recent_activity: List[AuditLogEntry]
