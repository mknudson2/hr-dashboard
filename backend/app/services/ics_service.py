"""
ICS Calendar File Generation Service.

Generates .ics (iCalendar) files for interview invitations and cancellations.
Supports METHOD:REQUEST (invite) and METHOD:CANCEL (cancellation).
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from icalendar import Calendar, Event, vCalAddress, vText

logger = logging.getLogger(__name__)


class IcsService:
    """Generates .ics calendar files for interview events."""

    def generate_interview_ics(
        self,
        summary: str,
        description: str,
        start: datetime,
        duration_minutes: int,
        time_zone: str = "UTC",
        location: Optional[str] = None,
        video_link: Optional[str] = None,
        organizer_email: Optional[str] = None,
        organizer_name: Optional[str] = None,
        attendee_emails: Optional[List[str]] = None,
        uid: Optional[str] = None,
        method: str = "REQUEST",
        sequence: int = 0,
    ) -> bytes:
        """Generate an .ics file for an interview invitation or cancellation.

        Args:
            summary: Event title (e.g., "Interview - Software Engineer")
            description: Event body text
            start: Event start time
            duration_minutes: Duration of the event
            time_zone: IANA timezone string
            location: Physical location or video URL
            video_link: Video meeting link (appended to description if provided)
            organizer_email: Email of the event organizer
            organizer_name: Display name of the organizer
            attendee_emails: List of attendee email addresses
            uid: Unique event ID (for updates/cancellations — reuse the same UID)
            method: "REQUEST" for invitations, "CANCEL" for cancellations
            sequence: Increment for event updates (0 for new, 1+ for updates)

        Returns:
            bytes: The .ics file content
        """
        cal = Calendar()
        cal.add("prodid", "-//HR Dashboard//Calendar Integration//EN")
        cal.add("version", "2.0")
        cal.add("calscale", "GREGORIAN")
        cal.add("method", method)

        event = Event()

        # Unique ID — must stay the same for updates/cancellations
        event_uid = uid or f"{uuid.uuid4()}@hr-dashboard"
        event.add("uid", event_uid)
        event.add("sequence", sequence)

        # Timestamps
        event.add("dtstamp", datetime.utcnow())
        event.add("dtstart", start)
        event.add("dtend", start + timedelta(minutes=duration_minutes))

        # Content
        event.add("summary", summary)

        # Build description with video link if present
        full_description = description
        if video_link:
            full_description += f"\n\nVideo Meeting Link: {video_link}"
        event.add("description", full_description)

        # Location: prefer video link for video meetings, otherwise physical location
        if video_link:
            event.add("location", video_link)
        elif location:
            event.add("location", location)

        # Status
        if method == "CANCEL":
            event.add("status", "CANCELLED")
        else:
            event.add("status", "CONFIRMED")

        # Organizer
        if organizer_email:
            organizer = vCalAddress(f"mailto:{organizer_email}")
            if organizer_name:
                organizer.params["cn"] = vText(organizer_name)
            organizer.params["role"] = vText("CHAIR")
            event.add("organizer", organizer)

        # Attendees
        if attendee_emails:
            for email in attendee_emails:
                attendee = vCalAddress(f"mailto:{email}")
                attendee.params["role"] = vText("REQ-PARTICIPANT")
                attendee.params["rsvp"] = vText("TRUE")
                event.add("attendee", attendee)

        cal.add_component(event)
        return cal.to_ical()

    def generate_cancellation_ics(
        self,
        summary: str,
        start: datetime,
        duration_minutes: int,
        uid: str,
        organizer_email: Optional[str] = None,
        organizer_name: Optional[str] = None,
        attendee_emails: Optional[List[str]] = None,
    ) -> bytes:
        """Convenience method to generate a cancellation .ics.

        Args:
            summary: Original event title
            start: Original event start time
            duration_minutes: Original event duration
            uid: The original event UID (must match the original invitation)
            organizer_email: Email of the organizer
            organizer_name: Display name of the organizer
            attendee_emails: List of attendee emails

        Returns:
            bytes: The cancellation .ics file content
        """
        return self.generate_interview_ics(
            summary=f"CANCELLED: {summary}",
            description="This interview has been cancelled.",
            start=start,
            duration_minutes=duration_minutes,
            organizer_email=organizer_email,
            organizer_name=organizer_name,
            attendee_emails=attendee_emails,
            uid=uid,
            method="CANCEL",
            sequence=1,
        )


# Module-level singleton
ics_service = IcsService()
