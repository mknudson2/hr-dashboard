"""
Recruiting Service

Handles ID generation, applicant deduplication, slug generation,
and activity logging for the recruiting pipeline.
"""

import re
import secrets
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import models


class RecruitingService:
    """Service for recruiting operations."""

    # ========================================================================
    # ID GENERATION
    # ========================================================================

    def generate_requisition_id(self, db: Session) -> str:
        """Generate next requisition ID: REQ-YYYY-NNN."""
        year = datetime.utcnow().year
        prefix = f"REQ-{year}-"
        last = db.query(models.JobRequisition).filter(
            models.JobRequisition.requisition_id.like(f"{prefix}%")
        ).order_by(models.JobRequisition.id.desc()).first()

        if last:
            try:
                num = int(last.requisition_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"{prefix}{num:03d}"

    def generate_posting_id(self, db: Session) -> str:
        """Generate next posting ID: POST-YYYY-NNN."""
        year = datetime.utcnow().year
        prefix = f"POST-{year}-"
        last = db.query(models.JobPosting).filter(
            models.JobPosting.posting_id.like(f"{prefix}%")
        ).order_by(models.JobPosting.id.desc()).first()

        if last:
            try:
                num = int(last.posting_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"{prefix}{num:03d}"

    def generate_applicant_id(self, db: Session) -> str:
        """Generate next applicant ID: APP-YYYY-NNNNN."""
        year = datetime.utcnow().year
        prefix = f"APP-{year}-"
        last = db.query(models.Applicant).filter(
            models.Applicant.applicant_id.like(f"{prefix}%")
        ).order_by(models.Applicant.id.desc()).first()

        if last:
            try:
                num = int(last.applicant_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"{prefix}{num:05d}"

    def generate_application_id(self, db: Session) -> str:
        """Generate next application ID: APPLICATION-YYYY-NNNNN."""
        year = datetime.utcnow().year
        prefix = f"APPLICATION-{year}-"
        last = db.query(models.Application).filter(
            models.Application.application_id.like(f"{prefix}%")
        ).order_by(models.Application.id.desc()).first()

        if last:
            try:
                num = int(last.application_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"{prefix}{num:05d}"

    def generate_interview_id(self, db: Session) -> str:
        """Generate next interview ID: INT-YYYY-NNN."""
        year = datetime.utcnow().year
        prefix = f"INT-{year}-"
        last = db.query(models.Interview).filter(
            models.Interview.interview_id.like(f"{prefix}%")
        ).order_by(models.Interview.id.desc()).first()

        if last:
            try:
                num = int(last.interview_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"{prefix}{num:03d}"

    # ========================================================================
    # SLUG GENERATION
    # ========================================================================

    def generate_slug(self, db: Session, title: str) -> str:
        """Generate a unique URL-friendly slug from a job title."""
        # Convert to lowercase, replace non-alphanumeric with hyphens
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        # Truncate to reasonable length
        slug = slug[:80]

        # Ensure uniqueness
        base_slug = slug
        counter = 1
        while db.query(models.JobPosting).filter(
            models.JobPosting.slug == slug
        ).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    # ========================================================================
    # APPLICANT DEDUPLICATION
    # ========================================================================

    def find_applicant_by_email(self, db: Session, email: str) -> Optional[models.Applicant]:
        """Find an existing applicant by email address."""
        return db.query(models.Applicant).filter(
            func.lower(models.Applicant.email) == email.lower()
        ).first()

    def get_or_create_applicant(
        self,
        db: Session,
        email: str,
        first_name: str,
        last_name: str,
        phone: Optional[str] = None,
        source: str = "portal",
        source_detail: Optional[str] = None,
    ) -> tuple[models.Applicant, bool]:
        """Get existing applicant by email or create new one. Returns (applicant, created)."""
        existing = self.find_applicant_by_email(db, email)
        if existing:
            return existing, False

        applicant = models.Applicant(
            applicant_id=self.generate_applicant_id(db),
            first_name=first_name,
            last_name=last_name,
            email=email.lower(),
            phone=phone,
            source=source,
            source_detail=source_detail,
        )
        db.add(applicant)
        db.flush()
        return applicant, True

    # ========================================================================
    # MAGIC LINK
    # ========================================================================

    def generate_magic_link_token(self) -> str:
        """Generate a cryptographically secure magic link token."""
        return secrets.token_urlsafe(48)

    # ========================================================================
    # ACTIVITY LOGGING
    # ========================================================================

    def log_activity(
        self,
        db: Session,
        application_id: int,
        activity_type: str,
        description: str,
        details: Optional[dict] = None,
        performed_by: Optional[int] = None,
        is_internal: bool = True,
    ) -> models.ApplicationActivity:
        """Log an activity event on an application."""
        activity = models.ApplicationActivity(
            application_id=application_id,
            activity_type=activity_type,
            description=description,
            details=details,
            performed_by=performed_by,
            is_internal=is_internal,
        )
        db.add(activity)
        return activity


# Singleton instance
recruiting_service = RecruitingService()
