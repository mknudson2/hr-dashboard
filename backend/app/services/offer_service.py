"""
Offer Service

Handles offer letter ID generation, status transitions, accept/decline logic,
and offer-related business rules.
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session
from app.db import models
from app.services.recruiting_service import recruiting_service


class OfferService:
    """Service for managing offer letter lifecycle."""

    def generate_offer_id(self, db: Session) -> str:
        """Generate next offer ID: OFFER-YYYY-NNN."""
        year = datetime.utcnow().year
        prefix = f"OFFER-{year}-"
        last = db.query(models.OfferLetter).filter(
            models.OfferLetter.offer_id.like(f"{prefix}%")
        ).order_by(models.OfferLetter.id.desc()).first()

        if last:
            try:
                num = int(last.offer_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"{prefix}{num:03d}"

    def create_offer(
        self,
        db: Session,
        application_id: int,
        position_title: str,
        created_by: int,
        department: Optional[str] = None,
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        start_date: Optional[date] = None,
        reports_to: Optional[str] = None,
        salary: Optional[float] = None,
        wage_type: Optional[str] = None,
        signing_bonus: Optional[float] = None,
        equity_details: Optional[str] = None,
        benefits_summary: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        contingencies: Optional[dict] = None,
    ) -> models.OfferLetter:
        """Create a new offer letter in Draft status."""
        offer = models.OfferLetter(
            offer_id=self.generate_offer_id(db),
            application_id=application_id,
            position_title=position_title,
            department=department,
            location=location,
            employment_type=employment_type,
            start_date=start_date,
            reports_to=reports_to,
            salary=salary,
            wage_type=wage_type,
            signing_bonus=signing_bonus,
            equity_details=equity_details,
            benefits_summary=benefits_summary,
            expires_at=expires_at,
            contingencies=contingencies,
            status="Draft",
            created_by=created_by,
        )
        db.add(offer)
        db.flush()

        recruiting_service.log_activity(
            db,
            application_id,
            "offer_created",
            f"Offer letter created: {position_title}",
            details={"offer_id": offer.offer_id, "salary": salary},
            performed_by=created_by,
        )

        return offer

    def approve_offer(self, db: Session, offer: models.OfferLetter, approved_by: int) -> None:
        """Approve an offer letter for sending."""
        if offer.status not in ("Draft", "Pending Approval"):
            raise ValueError(f"Cannot approve offer with status '{offer.status}'")

        offer.status = "Approved"
        offer.approved_by = approved_by
        offer.approved_at = datetime.utcnow()

        recruiting_service.log_activity(
            db,
            offer.application_id,
            "offer_approved",
            "Offer letter approved",
            details={"offer_id": offer.offer_id},
            performed_by=approved_by,
        )
        db.flush()

    def send_offer(self, db: Session, offer: models.OfferLetter, sent_by: int) -> None:
        """Mark offer as sent to candidate."""
        if offer.status != "Approved":
            raise ValueError(f"Cannot send offer with status '{offer.status}'")

        offer.status = "Sent"
        offer.sent_at = datetime.utcnow()

        # Update application status to Offer
        application = db.query(models.Application).get(offer.application_id)
        if application and application.status != "Offer":
            application.status = "Offer"
            application.status_changed_at = datetime.utcnow()
            application.status_changed_by = sent_by
            application.offer_extended_at = datetime.utcnow()

        recruiting_service.log_activity(
            db,
            offer.application_id,
            "offer_sent",
            "Offer letter sent to candidate",
            details={"offer_id": offer.offer_id},
            performed_by=sent_by,
            is_internal=False,
        )
        db.flush()

    def accept_offer(self, db: Session, offer: models.OfferLetter) -> None:
        """Accept an offer (called from applicant side)."""
        if offer.status != "Sent":
            raise ValueError(f"Cannot accept offer with status '{offer.status}'")

        offer.status = "Accepted"
        offer.responded_at = datetime.utcnow()
        offer.response = "accepted"

        application = db.query(models.Application).get(offer.application_id)
        if application:
            application.offer_accepted_at = datetime.utcnow()

        recruiting_service.log_activity(
            db,
            offer.application_id,
            "offer_accepted",
            "Candidate accepted the offer",
            details={"offer_id": offer.offer_id},
            is_internal=False,
        )
        db.flush()

    def decline_offer(self, db: Session, offer: models.OfferLetter, reason: Optional[str] = None) -> None:
        """Decline an offer (called from applicant side)."""
        if offer.status != "Sent":
            raise ValueError(f"Cannot decline offer with status '{offer.status}'")

        offer.status = "Declined"
        offer.responded_at = datetime.utcnow()
        offer.response = "declined"
        offer.decline_reason = reason

        application = db.query(models.Application).get(offer.application_id)
        if application:
            application.offer_declined_at = datetime.utcnow()

        recruiting_service.log_activity(
            db,
            offer.application_id,
            "offer_declined",
            f"Candidate declined the offer{f': {reason}' if reason else ''}",
            details={"offer_id": offer.offer_id, "reason": reason},
            is_internal=False,
        )
        db.flush()

    def rescind_offer(self, db: Session, offer: models.OfferLetter, rescinded_by: int) -> None:
        """Rescind an offer (HR action)."""
        if offer.status not in ("Approved", "Sent"):
            raise ValueError(f"Cannot rescind offer with status '{offer.status}'")

        offer.status = "Rescinded"

        recruiting_service.log_activity(
            db,
            offer.application_id,
            "offer_rescinded",
            "Offer letter rescinded",
            details={"offer_id": offer.offer_id},
            performed_by=rescinded_by,
            is_internal=False,
        )
        db.flush()

    def create_counter_offer(
        self,
        db: Session,
        original_offer: models.OfferLetter,
        created_by: int,
        salary: Optional[float] = None,
        signing_bonus: Optional[float] = None,
        start_date: Optional[date] = None,
        negotiation_notes: Optional[str] = None,
    ) -> models.OfferLetter:
        """Create a counter-offer based on an existing offer."""
        counter = models.OfferLetter(
            offer_id=self.generate_offer_id(db),
            application_id=original_offer.application_id,
            position_title=original_offer.position_title,
            department=original_offer.department,
            location=original_offer.location,
            employment_type=original_offer.employment_type,
            start_date=start_date or original_offer.start_date,
            reports_to=original_offer.reports_to,
            salary=salary if salary is not None else original_offer.salary,
            wage_type=original_offer.wage_type,
            signing_bonus=signing_bonus if signing_bonus is not None else original_offer.signing_bonus,
            equity_details=original_offer.equity_details,
            benefits_summary=original_offer.benefits_summary,
            contingencies=original_offer.contingencies,
            is_counter_offer=True,
            original_offer_id=original_offer.id,
            negotiation_notes=negotiation_notes,
            status="Draft",
            created_by=created_by,
        )
        db.add(counter)
        db.flush()

        recruiting_service.log_activity(
            db,
            original_offer.application_id,
            "counter_offer_created",
            "Counter-offer created",
            details={
                "original_offer_id": original_offer.offer_id,
                "counter_offer_id": counter.offer_id,
                "new_salary": salary,
            },
            performed_by=created_by,
        )

        return counter


# Singleton instance
offer_service = OfferService()
