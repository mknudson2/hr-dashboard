"""
Calendar Sync Service — bridges interview scheduling with Microsoft Teams Calendar (Phase 5).

When interviews are scheduled/rescheduled/cancelled, creates/updates/deletes
corresponding calendar events via MicrosoftCalendarProvider if the ms_teams_calendar
integration is enabled and connected.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class CalendarSyncService:
    """Synchronises interview lifecycle events with Microsoft 365 calendar.

    Each public method is designed to be called from interview scheduling
    endpoints.  If the Microsoft Teams calendar integration is not enabled
    or not connected the methods silently return ``None`` / ``False`` so
    callers never need to guard against the integration being absent.
    """

    # ------------------------------------------------------------------
    # Internal: provider resolution
    # ------------------------------------------------------------------

    def _get_provider(self, db: Session):
        """Return a configured ``MicrosoftCalendarProvider`` with access token, or *None*.

        Queries ``IntegrationConfig`` for the ``ms_teams_calendar`` row.  If
        the integration is enabled and has a stored ``access_token`` the
        provider is instantiated using the persisted credentials (tenant_id,
        client_id, client_secret) and the token is attached.
        """
        try:
            from app.db import models
        except Exception:
            logger.debug("Could not import models — calendar sync unavailable")
            return None, None

        config_row = (
            db.query(models.IntegrationConfig)
            .filter(
                models.IntegrationConfig.integration_type == "ms_teams_calendar",
                models.IntegrationConfig.is_enabled == True,  # noqa: E712
            )
            .first()
        )

        if not config_row or not config_row.config:
            logger.debug("MS Teams calendar integration not configured or disabled")
            return None, None

        cfg: dict = config_row.config
        access_token = cfg.get("access_token")
        if not access_token:
            logger.debug("MS Teams calendar integration has no access_token stored")
            return None, None

        try:
            from app.services.microsoft_calendar import MicrosoftCalendarProvider
        except Exception as exc:
            logger.warning("MicrosoftCalendarProvider could not be imported: %s", exc)
            return None, None

        try:
            # Build the provider with credentials from the stored config.
            # MicrosoftCalendarProvider.__init__ reads from env vars by
            # default — we override the relevant attributes afterwards so
            # the DB-stored values take precedence.
            provider = MicrosoftCalendarProvider()

            tenant_id = cfg.get("tenant_id")
            client_id = cfg.get("client_id")
            client_secret = cfg.get("client_secret")

            if tenant_id:
                provider.tenant_id = tenant_id
            if client_id:
                provider.client_id = client_id
            if client_secret:
                provider.client_secret = client_secret

            return provider, access_token
        except Exception as exc:
            logger.error("Failed to instantiate MicrosoftCalendarProvider: %s", exc)
            return None, None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def on_interview_scheduled(
        self,
        db: Session,
        interview_id: int,
        interviewer_email: str,
        interviewer_name: str,
        applicant_name: str,
        job_title: str,
        start_time: datetime,
        end_time: datetime,
        location: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[str]:
        """Create a calendar event for a newly-scheduled interview.

        Returns the provider ``event_id`` (to persist on the Interview model)
        or ``None`` if the integration is unavailable or the call fails.
        """
        provider, access_token = self._get_provider(db)
        if provider is None:
            return None

        try:
            from app.services.calendar_service import CreateEventRequest

            body_text = f"Interview with {applicant_name} for {job_title}"
            if notes:
                body_text = f"{body_text}\n\n{notes}"

            event_request = CreateEventRequest(
                subject=f"Interview: {applicant_name} \u2014 {job_title}",
                start=start_time,
                end=end_time,
                attendees=[interviewer_email],
                body=body_text,
                location=location,
                create_video_meeting=True,
            )

            calendar_event = await provider.create_event(access_token, event_request)

            logger.info(
                "Calendar event created for interview %s (event_id=%s)",
                interview_id,
                calendar_event.event_id,
            )
            return calendar_event.event_id
        except Exception as exc:
            logger.error(
                "Failed to create calendar event for interview %s: %s",
                interview_id,
                exc,
            )
            return None

    async def on_interview_rescheduled(
        self,
        db: Session,
        event_id: str,
        start_time: datetime,
        end_time: datetime,
        notes: Optional[str] = None,
    ) -> bool:
        """Update the calendar event when an interview is rescheduled.

        Returns ``True`` on success, ``False`` otherwise.
        """
        provider, access_token = self._get_provider(db)
        if provider is None:
            return False

        try:
            from app.services.calendar_service import CreateEventRequest

            # Build a minimal update request — the provider PATCH endpoint
            # accepts partial fields via CreateEventRequest.
            event_request = CreateEventRequest(
                subject="",  # will not be sent if empty by Graph API
                start=start_time,
                end=end_time,
                body=notes or "",
            )

            await provider.update_event(access_token, event_id, event_request)

            logger.info("Calendar event %s updated (rescheduled)", event_id)
            return True
        except Exception as exc:
            logger.error(
                "Failed to update calendar event %s: %s",
                event_id,
                exc,
            )
            return False

    async def on_interview_cancelled(
        self,
        db: Session,
        event_id: str,
    ) -> bool:
        """Delete the calendar event when an interview is cancelled.

        Returns ``True`` on success, ``False`` otherwise.
        """
        provider, access_token = self._get_provider(db)
        if provider is None:
            return False

        try:
            deleted = await provider.delete_event(access_token, event_id)
            if deleted:
                logger.info("Calendar event %s deleted (interview cancelled)", event_id)
            else:
                logger.warning(
                    "Calendar event %s deletion returned non-success status", event_id
                )
            return deleted
        except Exception as exc:
            logger.error(
                "Failed to delete calendar event %s: %s",
                event_id,
                exc,
            )
            return False


# Module-level singleton
calendar_sync_service = CalendarSyncService()
