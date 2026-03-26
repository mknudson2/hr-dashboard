"""Pydantic schemas for applicant pool / cross-role consideration (ATS §1.4)."""

from typing import Optional, List
from pydantic import BaseModel


class PoolPreferenceUpdate(BaseModel):
    open_to_other_roles: bool
    preferred_roles: Optional[List[str]] = None
    preferred_departments: Optional[List[str]] = None


class CreateApplicationFromPoolRequest(BaseModel):
    requisition_id: int
    source_application_id: Optional[int] = None
    notes: Optional[str] = None
