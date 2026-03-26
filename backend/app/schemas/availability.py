"""Pydantic schemas for interviewer availability (ATS §1.3)."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class AvailabilitySlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    time_zone: Optional[str] = None
    slot_duration_minutes: int = 60


class CreateAvailabilitySlotsRequest(BaseModel):
    slots: List[AvailabilitySlotCreate]
    requisition_id: Optional[int] = None


class BookInterviewSlotRequest(BaseModel):
    slot_id: int


class AvailabilitySlotResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    start_time: str
    end_time: str
    time_zone: Optional[str] = None
    slot_duration_minutes: int
    is_booked: bool
    requisition_id: Optional[int] = None

    class Config:
        from_attributes = True
