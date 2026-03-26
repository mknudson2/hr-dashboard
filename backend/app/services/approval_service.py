"""
Approval Service — configurable approval chains for offers, negotiations, requisitions (ATS §3.4, §3.5).
"""

import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)


class ApprovalService:
    """Service for managing approval chains and requests."""

    def get_chain_for_type(
        self,
        db: Session,
        chain_type: str,
    ) -> Optional[models.ApprovalChain]:
        """Get the default approval chain for a given type."""
        return (
            db.query(models.ApprovalChain)
            .filter(
                models.ApprovalChain.chain_type == chain_type,
                models.ApprovalChain.is_default == True,
                models.ApprovalChain.is_active == True,
            )
            .first()
        )

    def create_approval_request(
        self,
        db: Session,
        resource_type: str,
        resource_id: int,
        chain_id: int,
        requested_by: int,
    ) -> Optional[models.ApprovalRequest]:
        """Create a new approval request using the first step in the chain."""
        first_step = (
            db.query(models.ApprovalStep)
            .filter(models.ApprovalStep.chain_id == chain_id)
            .order_by(models.ApprovalStep.order_index)
            .first()
        )
        if not first_step:
            return None

        request = models.ApprovalRequest(
            resource_type=resource_type,
            resource_id=resource_id,
            chain_id=chain_id,
            current_step_id=first_step.id,
            status="Pending",
            requested_by=requested_by,
        )
        db.add(request)
        db.flush()
        return request

    def approve(
        self,
        db: Session,
        request_id: int,
        user_id: int,
        notes: Optional[str] = None,
    ) -> models.ApprovalRequest:
        """Approve a pending request and advance to the next step if applicable."""
        request = db.query(models.ApprovalRequest).filter(
            models.ApprovalRequest.id == request_id,
        ).first()
        if not request:
            raise ValueError("Approval request not found")
        if request.status != "Pending":
            raise ValueError(f"Request is not pending (current: {request.status})")

        now = datetime.utcnow()

        # Check if there's a next step
        current_step = db.query(models.ApprovalStep).get(request.current_step_id)
        next_step = (
            db.query(models.ApprovalStep)
            .filter(
                models.ApprovalStep.chain_id == request.chain_id,
                models.ApprovalStep.order_index > current_step.order_index,
            )
            .order_by(models.ApprovalStep.order_index)
            .first()
        )

        if next_step:
            # Advance to next step
            request.current_step_id = next_step.id
            request.acted_by = user_id
            request.acted_at = now
            request.notes = notes
            # Status stays "Pending" for the next approver
        else:
            # Final step — mark as approved
            request.status = "Approved"
            request.acted_by = user_id
            request.acted_at = now
            request.notes = notes

        db.flush()
        return request

    def reject(
        self,
        db: Session,
        request_id: int,
        user_id: int,
        notes: Optional[str] = None,
    ) -> models.ApprovalRequest:
        """Reject a pending request."""
        request = db.query(models.ApprovalRequest).filter(
            models.ApprovalRequest.id == request_id,
        ).first()
        if not request:
            raise ValueError("Approval request not found")

        request.status = "Rejected"
        request.acted_by = user_id
        request.acted_at = datetime.utcnow()
        request.notes = notes

        db.flush()
        return request

    def get_pending_for_user(
        self,
        db: Session,
        user_id: int,
    ) -> List[models.ApprovalRequest]:
        """Get all pending approval requests where the current step's approver is this user."""
        return (
            db.query(models.ApprovalRequest)
            .join(models.ApprovalStep, models.ApprovalRequest.current_step_id == models.ApprovalStep.id)
            .filter(
                models.ApprovalRequest.status == "Pending",
                models.ApprovalStep.approver_user_id == user_id,
            )
            .all()
        )


# Singleton instance
approval_service = ApprovalService()
