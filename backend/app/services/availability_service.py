"""
Availability Service — interviewer time slot management for self-scheduling (ATS §1.3).
"""

import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)


class AvailabilityService:
    """Service for managing interviewer availability slots."""

    def create_slots(
        self,
        db: Session,
        user_id: int,
        slots: list[dict],
        requisition_id: Optional[int] = None,
    ) -> List[models.InterviewerAvailability]:
        """Create one or more availability slots for an interviewer.

        Each slot dict should contain: start_time, end_time, time_zone (optional),
        slot_duration_minutes (optional, default 60).
        """
        created = []
        for slot in slots:
            start = slot["start_time"]
            end = slot["end_time"]
            if isinstance(start, str):
                start = datetime.fromisoformat(start.replace("Z", "+00:00"))
            if isinstance(end, str):
                end = datetime.fromisoformat(end.replace("Z", "+00:00"))
            avail = models.InterviewerAvailability(
                user_id=user_id,
                start_time=start,
                end_time=end,
                time_zone=slot.get("time_zone"),
                slot_duration_minutes=slot.get("slot_duration_minutes", 60),
                requisition_id=requisition_id,
            )
            db.add(avail)
            created.append(avail)
        db.flush()
        return created

    def get_available_slots(
        self,
        db: Session,
        requisition_id: Optional[int] = None,
        after: Optional[datetime] = None,
    ) -> List[models.InterviewerAvailability]:
        """Get unbooked availability slots, optionally filtered by requisition."""
        query = (
            db.query(models.InterviewerAvailability)
            .filter(models.InterviewerAvailability.is_booked == False)
        )
        if requisition_id:
            query = query.filter(
                models.InterviewerAvailability.requisition_id == requisition_id
            )
        if after:
            query = query.filter(models.InterviewerAvailability.start_time > after)
        return query.order_by(models.InterviewerAvailability.start_time).all()

    def book_slot(
        self,
        db: Session,
        slot_id: int,
        interview_id: int,
    ) -> Optional[models.InterviewerAvailability]:
        """Book an availability slot by linking it to an interview."""
        slot = db.query(models.InterviewerAvailability).filter(
            models.InterviewerAvailability.id == slot_id,
            models.InterviewerAvailability.is_booked == False,
        ).first()
        if not slot:
            return None

        slot.is_booked = True
        slot.booked_interview_id = interview_id
        db.flush()
        return slot

    def cancel_booking(
        self,
        db: Session,
        slot_id: int,
    ) -> Optional[models.InterviewerAvailability]:
        """Cancel a booking and make the slot available again."""
        slot = db.query(models.InterviewerAvailability).filter(
            models.InterviewerAvailability.id == slot_id,
        ).first()
        if not slot:
            return None

        slot.is_booked = False
        slot.booked_interview_id = None
        db.flush()
        return slot

    def delete_slot(
        self,
        db: Session,
        slot_id: int,
        user_id: int,
    ) -> bool:
        """Delete an unbooked availability slot (only if owned by user)."""
        slot = db.query(models.InterviewerAvailability).filter(
            models.InterviewerAvailability.id == slot_id,
            models.InterviewerAvailability.user_id == user_id,
            models.InterviewerAvailability.is_booked == False,
        ).first()
        if not slot:
            return False
        db.delete(slot)
        db.flush()
        return True


# Singleton instance
availability_service = AvailabilityService()
