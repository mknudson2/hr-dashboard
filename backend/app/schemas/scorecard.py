"""
Pydantic schemas for Scorecard Templates API (ATS Phase 1).
"""
from typing import Optional, List
from pydantic import BaseModel, Field


# =============================================================================
# SCORECARD TEMPLATE SCHEMAS
# =============================================================================

class CriterionSchema(BaseModel):
    """A single criterion within a scorecard section."""
    name: str
    description: Optional[str] = None
    weight: float = Field(default=1.0, ge=0)
    rubric: Optional[dict] = None  # {"1": "Poor", "2": "Below Average", ..., "5": "Excellent"}
    suggested_questions: Optional[List[str]] = None
    value_description: Optional[str] = None


class SectionSchema(BaseModel):
    """A section containing multiple criteria."""
    name: str
    weight: float = Field(default=1.0, ge=0)
    description: Optional[str] = None
    criteria: List[CriterionSchema]


class ScorecardTemplateCreate(BaseModel):
    """Request to create a new scorecard template."""
    name: str
    description: Optional[str] = None
    template_type: str = Field(..., pattern=r"^(hr|hm|tech_screen)$")
    sections: List[SectionSchema]
    recommendation_options: List[str] = [
        "Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"
    ]
    red_flags: Optional[List[str]] = None
    suggested_questions: Optional[List[str]] = None


class ScorecardTemplateUpdate(BaseModel):
    """Request to update an existing scorecard template."""
    name: Optional[str] = None
    description: Optional[str] = None
    sections: Optional[List[SectionSchema]] = None
    recommendation_options: Optional[List[str]] = None
    red_flags: Optional[List[str]] = None
    suggested_questions: Optional[List[str]] = None


class ScorecardTemplateResponse(BaseModel):
    """Response for a scorecard template."""
    id: int
    template_id: str
    name: str
    description: Optional[str] = None
    template_type: str
    sections: list
    recommendation_options: list
    red_flags: Optional[list] = None
    suggested_questions: Optional[list] = None
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
