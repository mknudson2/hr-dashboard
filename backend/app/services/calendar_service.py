"""
Calendar Service — Provider abstraction and facade for calendar integrations.

Supports Microsoft 365 and Google Workspace calendars via a unified interface.
Handles OAuth flows, token refresh, free/busy queries, and event CRUD.
"""

import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class FreeBusySlot:
    """A single busy/tentative time range for a calendar."""
    start: datetime
    end: datetime
    status: str = "busy"  # "busy", "tentative", "oof" (out of office)


@dataclass
class CalendarEvent:
    """Represents a calendar event returned from a provider."""
    event_id: str
    subject: str
    start: datetime
    end: datetime
    attendees: List[str] = field(default_factory=list)
    video_link: Optional[str] = None
    location: Optional[str] = None
    provider: str = ""


@dataclass
class CreateEventRequest:
    """Request to create a calendar event."""
    subject: str
    start: datetime
    end: datetime
    time_zone: str = "UTC"
    attendees: List[str] = field(default_factory=list)
    body: str = ""
    location: Optional[str] = None
    create_video_meeting: bool = False


# ============================================================================
# ABSTRACT PROVIDER
# ============================================================================

class CalendarProvider(ABC):
    """Abstract base class for calendar providers (Microsoft, Google)."""

    provider_name: str = ""

    @abstractmethod
    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL."""
        ...

    @abstractmethod
    async def exchange_code(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for tokens.

        Returns dict with: access_token, refresh_token, expires_in, email
        """
        ...

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh an expired access token.

        Returns dict with: access_token, expires_in
        """
        ...

    @abstractmethod
    async def get_free_busy(
        self,
        access_token: str,
        emails: List[str],
        start: datetime,
        end: datetime,
        time_zone: str = "UTC",
    ) -> Dict[str, List[FreeBusySlot]]:
        """Get free/busy information for a list of users.

        Returns dict keyed by email with list of busy slots.
        """
        ...

    @abstractmethod
    async def create_event(
        self, access_token: str, event: CreateEventRequest
    ) -> CalendarEvent:
        """Create a calendar event, optionally with auto-generated video meeting link."""
        ...

    @abstractmethod
    async def update_event(
        self, access_token: str, event_id: str, event: CreateEventRequest
    ) -> CalendarEvent:
        """Update an existing calendar event."""
        ...

    @abstractmethod
    async def delete_event(self, access_token: str, event_id: str) -> bool:
        """Delete/cancel a calendar event."""
        ...


# ============================================================================
# CALENDAR SERVICE FACADE
# ============================================================================

class CalendarService:
    """
    Facade that manages configured calendar providers and handles token refresh.

    Auto-discovers configured providers from environment variables.
    Singleton pattern — instantiated at module level.
    """

    def __init__(self):
        self._providers: Dict[str, CalendarProvider] = {}
        self._discover_providers()

    def _discover_providers(self):
        """Check env vars and instantiate available providers."""
        # Microsoft 365
        if os.getenv("MICROSOFT_CALENDAR_CLIENT_ID"):
            try:
                from app.services.microsoft_calendar import MicrosoftCalendarProvider
                self._providers["microsoft"] = MicrosoftCalendarProvider()
                logger.info("Microsoft 365 calendar provider configured")
            except Exception as e:
                logger.warning(f"Failed to initialize Microsoft calendar provider: {e}")

        # Google Workspace
        if os.getenv("GOOGLE_CALENDAR_CLIENT_ID"):
            try:
                from app.services.google_calendar import GoogleCalendarProvider
                self._providers["google"] = GoogleCalendarProvider()
                logger.info("Google Workspace calendar provider configured")
            except Exception as e:
                logger.warning(f"Failed to initialize Google calendar provider: {e}")

        if not self._providers:
            logger.info("No calendar providers configured (calendar integration disabled)")

    @property
    def available_providers(self) -> List[str]:
        """List of configured provider names."""
        return list(self._providers.keys())

    def get_provider(self, name: str) -> Optional[CalendarProvider]:
        """Get a specific provider by name."""
        return self._providers.get(name)

    def has_providers(self) -> bool:
        """Check if any calendar providers are configured."""
        return len(self._providers) > 0

    # ------------------------------------------------------------------
    # Token management helpers
    # ------------------------------------------------------------------

    async def get_valid_access_token(
        self, db: Session, connection
    ) -> Optional[str]:
        """Get a valid access token for a calendar connection, refreshing if needed.

        Args:
            db: Database session
            connection: CalendarConnection model instance

        Returns:
            Valid access token string, or None if refresh failed
        """
        from app.db import models

        if not connection or not connection.is_active:
            return None

        # Check if token is still valid (with 5-minute buffer)
        if connection.token_expiry and connection.token_expiry > datetime.utcnow() + timedelta(minutes=5):
            return connection.access_token

        # Token expired — attempt refresh
        provider = self.get_provider(connection.provider)
        if not provider or not connection.refresh_token:
            return None

        try:
            tokens = await provider.refresh_access_token(connection.refresh_token)
            connection.access_token = tokens["access_token"]
            connection.token_expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
            connection.last_sync_error = None
            db.commit()
            return connection.access_token
        except Exception as e:
            logger.error(f"Token refresh failed for user {connection.user_id}: {e}")
            connection.last_sync_error = str(e)
            db.commit()
            return None

    def get_user_connection(self, db: Session, user_id: int):
        """Get the calendar connection for a user, if any."""
        from app.db import models
        return db.query(models.CalendarConnection).filter(
            models.CalendarConnection.user_id == user_id,
            models.CalendarConnection.is_active == True,
        ).first()


# Module-level singleton
calendar_service = CalendarService()
