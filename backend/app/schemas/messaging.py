"""
Pydantic schemas for Recruiting Messaging API (ATS Phase 1).
"""
from typing import Optional, List
from pydantic import BaseModel


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class SendMessageRequest(BaseModel):
    """Send a message (new thread or reply)."""
    thread_id: Optional[str] = None  # None = create new thread
    subject: Optional[str] = None    # Required for new thread
    body: str
    stage_key: Optional[str] = None  # Pipeline stage context (e.g., "hr_interview")


class InternalNoteRequest(BaseModel):
    """Add an internal-only note."""
    thread_id: Optional[str] = None  # None = create new thread
    body: str


class ReplyRequest(BaseModel):
    """Applicant reply to a thread."""
    body: str


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class MessageResponse(BaseModel):
    """A single message."""
    id: int
    message_id: str
    thread_id: str
    sender_type: str
    sender_name: str
    subject: Optional[str] = None
    body: str
    body_html: Optional[str] = None
    is_internal: bool
    is_read: bool
    read_at: Optional[str] = None
    created_at: str
    stage_key: Optional[str] = None

    class Config:
        from_attributes = True


class ThreadResponse(BaseModel):
    """A message thread summary."""
    thread_id: str
    application_id: int
    applicant_name: Optional[str] = None
    job_title: Optional[str] = None
    subject: str
    last_message_at: str
    unread_count: int
    message_count: int
    stage_key: Optional[str] = None


class ThreadListResponse(BaseModel):
    """List of threads."""
    threads: List[ThreadResponse]
