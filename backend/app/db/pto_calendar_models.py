"""SQLAlchemy models for PTO Team Calendar — ceiling settings and title hierarchy."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base


# ============================================================================
# Title Hierarchy Constants
# ============================================================================

# Numeric rank for each title level (higher = more senior)
TITLE_HIERARCHY = {
    "director": 1,
    "senior_director": 2,
    "vp": 3,
    "svp": 4,
    "president": 5,
    "ceo": 6,
}

# Ordered mapping of position substrings to level names.
# Longest matches first so "senior vice president" matches before "vice president".
TITLE_KEYWORDS = {
    "chief executive officer": "ceo",
    "chief operating officer": "ceo",
    "chief financial officer": "ceo",
    "chief technology officer": "ceo",
    "chief human resources officer": "ceo",
    "ceo": "ceo",
    "coo": "ceo",
    "cfo": "ceo",
    "cto": "ceo",
    "chro": "ceo",
    "senior vice president": "svp",
    "svp": "svp",
    "vice president": "vp",
    "senior director": "senior_director",
    "director": "director",
    "president": "president",
}

# Available ceiling levels for the UI dropdown
AVAILABLE_CEILING_LEVELS = [
    {"value": "director", "label": "Director"},
    {"value": "senior_director", "label": "Senior Director"},
    {"value": "vp", "label": "Vice President"},
    {"value": "svp", "label": "Senior Vice President"},
    {"value": "president", "label": "President"},
    {"value": "ceo", "label": "CEO"},
]

DEFAULT_CEILING = "director"


# ============================================================================
# Database Model
# ============================================================================

class PTOCalendarCeiling(Base):
    """
    Per-user override for PTO calendar visibility ceiling.
    Controls how high up the org chain an employee can see on the team calendar.
    Only settable by HR admins or employees with Director+ title.
    """
    __tablename__ = "pto_calendar_ceilings"

    id = Column(Integer, primary_key=True, index=True)
    set_by_employee_id = Column(
        String,
        ForeignKey("employees.employee_id"),
        unique=True,
        nullable=False,
        index=True,
    )
    ceiling_title_level = Column(String, nullable=False, default=DEFAULT_CEILING)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
