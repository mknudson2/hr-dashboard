"""
Microsoft 365 Calendar Provider.

Implements CalendarProvider using Microsoft Graph API for:
- OAuth2 authorization code flow via MSAL
- Free/busy schedule queries
- Calendar event CRUD with auto Teams meeting links
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx
import msal

from app.services.calendar_service import (
    CalendarEvent,
    CalendarProvider,
    CreateEventRequest,
    FreeBusySlot,
)

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
SCOPES = ["Calendars.ReadWrite", "OnlineMeetings.ReadWrite", "User.Read"]


class MicrosoftCalendarProvider(CalendarProvider):
    """Microsoft 365 calendar integration via Microsoft Graph API."""

    provider_name = "microsoft"

    def __init__(self):
        self.client_id = os.getenv("MICROSOFT_CALENDAR_CLIENT_ID", "")
        self.client_secret = os.getenv("MICROSOFT_CALENDAR_CLIENT_SECRET", "")
        self.tenant_id = os.getenv("MICROSOFT_CALENDAR_TENANT_ID", "common")
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"

        self._msal_app = msal.ConfidentialClientApplication(
            client_id=self.client_id,
            client_credential=self.client_secret,
            authority=self.authority,
        )

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Microsoft OAuth authorization URL."""
        return self._msal_app.get_authorization_request_url(
            scopes=SCOPES,
            state=state,
            redirect_uri=redirect_uri,
        )

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for tokens."""
        result = self._msal_app.acquire_token_by_authorization_code(
            code=code,
            scopes=SCOPES,
            redirect_uri=redirect_uri,
        )

        if "error" in result:
            raise Exception(f"Token exchange failed: {result.get('error_description', result['error'])}")

        access_token = result["access_token"]

        # Get user's email from Graph
        email = await self._get_user_email(access_token)

        return {
            "access_token": access_token,
            "refresh_token": result.get("refresh_token", ""),
            "expires_in": result.get("expires_in", 3600),
            "email": email,
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh an expired access token using MSAL."""
        # MSAL handles refresh via accounts, but for stored refresh tokens we use the raw flow
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.authority}/oauth2/v2.0/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "scope": " ".join(SCOPES),
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
        """Query free/busy via Microsoft Graph getSchedule endpoint."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GRAPH_BASE}/me/calendar/getSchedule",
                headers=self._auth_headers(access_token),
                json={
                    "schedules": emails,
                    "startTime": {
                        "dateTime": start.isoformat(),
                        "timeZone": time_zone,
                    },
                    "endTime": {
                        "dateTime": end.isoformat(),
                        "timeZone": time_zone,
                    },
                    "availabilityViewInterval": 30,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        result: Dict[str, List[FreeBusySlot]] = {}
        for schedule in data.get("value", []):
            email = schedule.get("scheduleId", "")
            slots = []
            for item in schedule.get("scheduleItems", []):
                slots.append(FreeBusySlot(
                    start=datetime.fromisoformat(item["start"]["dateTime"]),
                    end=datetime.fromisoformat(item["end"]["dateTime"]),
                    status=item.get("status", "busy").lower(),
                ))
            result[email] = slots

        return result

    async def create_event(
        self, access_token: str, event: CreateEventRequest
    ) -> CalendarEvent:
        """Create a calendar event via Microsoft Graph, optionally with Teams meeting."""
        body = {
            "subject": event.subject,
            "body": {
                "contentType": "HTML",
                "content": event.body,
            },
            "start": {
                "dateTime": event.start.isoformat(),
                "timeZone": event.time_zone,
            },
            "end": {
                "dateTime": event.end.isoformat(),
                "timeZone": event.time_zone,
            },
            "attendees": [
                {
                    "emailAddress": {"address": email},
                    "type": "required",
                }
                for email in event.attendees
            ],
        }

        if event.location:
            body["location"] = {"displayName": event.location}

        if event.create_video_meeting:
            body["isOnlineMeeting"] = True
            body["onlineMeetingProvider"] = "teamsForBusiness"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GRAPH_BASE}/me/events",
                headers=self._auth_headers(access_token),
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()

        video_link = None
        if data.get("onlineMeeting"):
            video_link = data["onlineMeeting"].get("joinUrl")

        return CalendarEvent(
            event_id=data["id"],
            subject=data.get("subject", event.subject),
            start=event.start,
            end=event.end,
            attendees=event.attendees,
            video_link=video_link,
            location=data.get("location", {}).get("displayName"),
            provider="microsoft",
        )

    async def update_event(
        self, access_token: str, event_id: str, event: CreateEventRequest
    ) -> CalendarEvent:
        """Update an existing calendar event."""
        body = {
            "subject": event.subject,
            "body": {
                "contentType": "HTML",
                "content": event.body,
            },
            "start": {
                "dateTime": event.start.isoformat(),
                "timeZone": event.time_zone,
            },
            "end": {
                "dateTime": event.end.isoformat(),
                "timeZone": event.time_zone,
            },
            "attendees": [
                {
                    "emailAddress": {"address": email},
                    "type": "required",
                }
                for email in event.attendees
            ],
        }

        if event.location:
            body["location"] = {"displayName": event.location}

        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{GRAPH_BASE}/me/events/{event_id}",
                headers=self._auth_headers(access_token),
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()

        video_link = None
        if data.get("onlineMeeting"):
            video_link = data["onlineMeeting"].get("joinUrl")

        return CalendarEvent(
            event_id=data["id"],
            subject=data.get("subject", event.subject),
            start=event.start,
            end=event.end,
            attendees=event.attendees,
            video_link=video_link,
            location=data.get("location", {}).get("displayName"),
            provider="microsoft",
        )

    async def delete_event(self, access_token: str, event_id: str) -> bool:
        """Delete a calendar event."""
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{GRAPH_BASE}/me/events/{event_id}",
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
        """Get the authenticated user's email from Graph."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_BASE}/me",
                headers=self._auth_headers(access_token),
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("mail") or data.get("userPrincipalName", "")
