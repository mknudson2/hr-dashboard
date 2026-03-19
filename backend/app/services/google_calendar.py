"""
Google Workspace Calendar Provider.

Implements CalendarProvider using Google Calendar API for:
- OAuth2 authorization code flow via google-auth-oauthlib
- Free/busy queries
- Calendar event CRUD with auto Google Meet links
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx

from app.services.calendar_service import (
    CalendarEvent,
    CalendarProvider,
    CreateEventRequest,
    FreeBusySlot,
)

logger = logging.getLogger(__name__)

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.freebusy",
    "https://www.googleapis.com/auth/userinfo.email",
]


class GoogleCalendarProvider(CalendarProvider):
    """Google Workspace calendar integration via Google Calendar API."""

    provider_name = "google"

    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "")
        self.client_secret = os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET", "")

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        query = "&".join(f"{k}={httpx.URL('', params={k: v}).params[k]}" for k, v in params.items())
        return f"{GOOGLE_AUTH_BASE}?{query}"

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        if "error" in data:
            raise Exception(f"Token exchange failed: {data.get('error_description', data['error'])}")

        access_token = data["access_token"]
        email = await self._get_user_email(access_token)

        return {
            "access_token": access_token,
            "refresh_token": data.get("refresh_token", ""),
            "expires_in": data.get("expires_in", 3600),
            "email": email,
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh an expired access token."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        if "error" in data:
            raise Exception(f"Token refresh failed: {data.get('error_description', data['error'])}")

        return {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", refresh_token),
            "expires_in": data.get("expires_in", 3600),
        }

    async def get_free_busy(
        self,
        access_token: str,
        emails: List[str],
        start: datetime,
        end: datetime,
        time_zone: str = "UTC",
    ) -> Dict[str, List[FreeBusySlot]]:
        """Query free/busy via Google Calendar freeBusy endpoint."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GOOGLE_CALENDAR_BASE}/freeBusy",
                headers=self._auth_headers(access_token),
                json={
                    "timeMin": start.isoformat() + "Z" if not start.tzinfo else start.isoformat(),
                    "timeMax": end.isoformat() + "Z" if not end.tzinfo else end.isoformat(),
                    "timeZone": time_zone,
                    "items": [{"id": email} for email in emails],
                },
            )
            resp.raise_for_status()
            data = resp.json()

        result: Dict[str, List[FreeBusySlot]] = {}
        for email, cal_data in data.get("calendars", {}).items():
            slots = []
            for busy in cal_data.get("busy", []):
                slots.append(FreeBusySlot(
                    start=datetime.fromisoformat(busy["start"].replace("Z", "+00:00")),
                    end=datetime.fromisoformat(busy["end"].replace("Z", "+00:00")),
                    status="busy",
                ))
            result[email] = slots

        return result

    async def create_event(
        self, access_token: str, event: CreateEventRequest
    ) -> CalendarEvent:
        """Create a calendar event via Google Calendar API, optionally with Meet link."""
        body: Dict = {
            "summary": event.subject,
            "description": event.body,
            "start": {
                "dateTime": event.start.isoformat(),
                "timeZone": event.time_zone,
            },
            "end": {
                "dateTime": event.end.isoformat(),
                "timeZone": event.time_zone,
            },
            "attendees": [{"email": email} for email in event.attendees],
        }

        if event.location:
            body["location"] = event.location

        # Auto-create Google Meet link (requires Google Workspace, not free Gmail)
        if event.create_video_meeting:
            body["conferenceData"] = {
                "createRequest": {
                    "requestId": f"hr-dashboard-{datetime.utcnow().timestamp()}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                },
            }

        params = {}
        if event.create_video_meeting:
            params["conferenceDataVersion"] = "1"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events",
                headers=self._auth_headers(access_token),
                params=params,
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()

        video_link = None
        if data.get("conferenceData", {}).get("entryPoints"):
            for ep in data["conferenceData"]["entryPoints"]:
                if ep.get("entryPointType") == "video":
                    video_link = ep.get("uri")
                    break

        return CalendarEvent(
            event_id=data["id"],
            subject=data.get("summary", event.subject),
            start=event.start,
            end=event.end,
            attendees=event.attendees,
            video_link=video_link,
            location=data.get("location"),
            provider="google",
        )

    async def update_event(
        self, access_token: str, event_id: str, event: CreateEventRequest
    ) -> CalendarEvent:
        """Update an existing calendar event."""
        body: Dict = {
            "summary": event.subject,
            "description": event.body,
            "start": {
                "dateTime": event.start.isoformat(),
                "timeZone": event.time_zone,
            },
            "end": {
                "dateTime": event.end.isoformat(),
                "timeZone": event.time_zone,
            },
            "attendees": [{"email": email} for email in event.attendees],
        }

        if event.location:
            body["location"] = event.location

        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events/{event_id}",
                headers=self._auth_headers(access_token),
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()

        video_link = None
        if data.get("conferenceData", {}).get("entryPoints"):
            for ep in data["conferenceData"]["entryPoints"]:
                if ep.get("entryPointType") == "video":
                    video_link = ep.get("uri")
                    break

        return CalendarEvent(
            event_id=data["id"],
            subject=data.get("summary", event.subject),
            start=event.start,
            end=event.end,
            attendees=event.attendees,
            video_link=video_link,
            location=data.get("location"),
            provider="google",
        )

    async def delete_event(self, access_token: str, event_id: str) -> bool:
        """Delete a calendar event."""
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events/{event_id}",
                headers=self._auth_headers(access_token),
            )
            return resp.status_code in (200, 204)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _auth_headers(self, access_token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def _get_user_email(self, access_token: str) -> str:
        """Get the authenticated user's email from Google."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers=self._auth_headers(access_token),
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("email", "")
