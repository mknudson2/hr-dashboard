"""
Pool Service — applicant pool management for cross-role consideration (ATS §1.4).
"""

import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.db import models

logger = logging.getLogger(__name__)


class PoolService:
    """Service for managing the applicant pool (cross-role candidates)."""

    def get_pool_candidates(
        self,
        db: Session,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[List[models.Applicant], int]:
        """Get applicants who have opted in for cross-role consideration.

        Returns (applicants, total_count).
        """
        query = (
            db.query(models.Applicant)
            .filter(
                models.Applicant.open_to_other_roles == True,
                models.Applicant.global_status == "Active",
            )
        )

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (models.Applicant.first_name.ilike(search_term))
                | (models.Applicant.last_name.ilike(search_term))
                | (models.Applicant.email.ilike(search_term))
                | (models.Applicant.current_title.ilike(search_term))
            )

        total = query.count()
        applicants = (
            query
            .order_by(models.Applicant.pool_opted_in_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return applicants, total

    def create_application_from_pool(
        self,
        db: Session,
        applicant_id: int,
        requisition_id: int,
        source_application_id: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> models.Application:
        """Create a new application for a pool candidate, pre-populated from their profile.

        The candidate enters the new requisition's pipeline at step 1 (fresh pipeline).
        """
        applicant = db.query(models.Applicant).filter(
            models.Applicant.id == applicant_id,
        ).first()
        if not applicant:
            raise ValueError("Applicant not found")

        # Generate application ID
        count = db.query(models.Application).count()
        app_id = f"APPLICATION-{datetime.utcnow().year}-{str(count + 1).zfill(5)}"

        application = models.Application(
            application_id=app_id,
            applicant_id=applicant_id,
            requisition_id=requisition_id,
            status="New",
            source="pool",
            source_detail="Cross-role consideration",
            sourced_from_application_id=source_application_id,
            resume_file_id=applicant.resume_file_id,
            submitted_at=datetime.utcnow(),
        )
        db.add(application)
        db.flush()
        return application


# Singleton instance
pool_service = PoolService()
