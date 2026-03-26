"""
Stakeholder Service — manages requisition stakeholder access roles (ATS §3.6).
"""

import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)

# Access matrix for stakeholder roles
STAKEHOLDER_ACCESS = {
    "vp_svp": {"pipeline": "full", "scorecards": "full", "offer_comp": "full", "messages": "full"},
    "hiring_manager": {"pipeline": "full", "scorecards": "full", "offer_comp": "full", "messages": "full"},
    "interviewer": {"pipeline": "view", "scorecards": "own_stage", "offer_comp": "none", "messages": "none"},
    "observer": {"pipeline": "view", "scorecards": "none", "offer_comp": "none", "messages": "none"},
}


class StakeholderService:
    """Service for managing requisition stakeholder roles and access."""

    def get_stakeholder_access_level(
        self,
        db: Session,
        user_id: int,
        requisition_id: int,
    ) -> Optional[dict]:
        """Get the access level for a user on a requisition.
        Returns the access matrix dict or None if user is not a stakeholder.
        """
        stakeholder = (
            db.query(models.RequisitionStakeholder)
            .filter(
                models.RequisitionStakeholder.requisition_id == requisition_id,
                models.RequisitionStakeholder.user_id == user_id,
                models.RequisitionStakeholder.is_active == True,
            )
            .first()
        )
        if not stakeholder:
            return None
        return {
            "role": stakeholder.role,
            **STAKEHOLDER_ACCESS.get(stakeholder.role, STAKEHOLDER_ACCESS["observer"]),
        }

    def add_stakeholder(
        self,
        db: Session,
        requisition_id: int,
        user_id: int,
        role: str,
        assigned_by: Optional[int] = None,
    ) -> models.RequisitionStakeholder:
        """Add a stakeholder to a requisition."""
        existing = (
            db.query(models.RequisitionStakeholder)
            .filter(
                models.RequisitionStakeholder.requisition_id == requisition_id,
                models.RequisitionStakeholder.user_id == user_id,
            )
            .first()
        )
        if existing:
            existing.role = role
            existing.is_active = True
            db.flush()
            return existing

        stakeholder = models.RequisitionStakeholder(
            requisition_id=requisition_id,
            user_id=user_id,
            role=role,
            assigned_by=assigned_by,
        )
        db.add(stakeholder)
        db.flush()
        return stakeholder

    def remove_stakeholder(
        self,
        db: Session,
        stakeholder_id: int,
    ) -> bool:
        """Deactivate a stakeholder (soft delete)."""
        stakeholder = db.query(models.RequisitionStakeholder).filter(
            models.RequisitionStakeholder.id == stakeholder_id,
        ).first()
        if not stakeholder:
            return False
        stakeholder.is_active = False
        db.flush()
        return True

    def list_stakeholders(
        self,
        db: Session,
        requisition_id: int,
    ) -> List[models.RequisitionStakeholder]:
        """List all active stakeholders for a requisition."""
        return (
            db.query(models.RequisitionStakeholder)
            .filter(
                models.RequisitionStakeholder.requisition_id == requisition_id,
                models.RequisitionStakeholder.is_active == True,
            )
            .all()
        )


# Singleton instance
stakeholder_service = StakeholderService()
