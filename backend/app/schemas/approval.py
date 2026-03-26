"""
Pydantic schemas for Approval Chains API (ATS Phase 1).
"""
from typing import Optional, List
from pydantic import BaseModel, Field


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class ApprovalStepCreate(BaseModel):
    """A step in an approval chain."""
    order_index: int = Field(..., ge=0)
    approver_type: str = Field(..., pattern=r"^(user|role|hiring_manager|department_head)$")
    approver_user_id: Optional[int] = None
    approver_role: Optional[str] = None
    is_required: bool = True
    timeout_hours: Optional[int] = None


class ApprovalChainCreate(BaseModel):
    """Create a new approval chain."""
    name: str
    chain_type: str = Field(..., pattern=r"^(offer|negotiation|requisition)$")
    description: Optional[str] = None
    is_default: bool = False
    steps: List[ApprovalStepCreate]


class ApprovalChainUpdate(BaseModel):
    """Update an existing approval chain."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    steps: Optional[List[ApprovalStepCreate]] = None


class ApprovalActionRequest(BaseModel):
    """Approve or reject an approval request."""
    notes: Optional[str] = None


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class ApprovalStepResponse(BaseModel):
    """An approval step."""
    id: int
    order_index: int
    approver_type: str
    approver_user_id: Optional[int] = None
    approver_user_name: Optional[str] = None
    approver_role: Optional[str] = None
    is_required: bool
    timeout_hours: Optional[int] = None

    class Config:
        from_attributes = True


class ApprovalChainResponse(BaseModel):
    """An approval chain with steps."""
    id: int
    name: str
    chain_type: str
    description: Optional[str] = None
    is_active: bool
    is_default: bool
    steps: List[ApprovalStepResponse]
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ApprovalRequestResponse(BaseModel):
    """An approval request."""
    id: int
    resource_type: str
    resource_id: int
    chain_id: int
    current_step_id: int
    status: str
    requested_by_name: Optional[str] = None
    acted_by_name: Optional[str] = None
    acted_at: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
