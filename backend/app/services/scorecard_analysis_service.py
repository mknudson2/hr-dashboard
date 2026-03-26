"""
Scorecard Analysis Service

AI-powered synthesis of multiple interview scorecards for a candidate
using Claude. Identifies consensus strengths, concerns, disagreements,
and provides an overall hiring recommendation.
"""

import json
import logging
import os
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.db import models

logger = logging.getLogger(__name__)


def _get_anthropic_client():
    """Get Anthropic client. Returns None if unavailable."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        logger.warning("anthropic package not installed")
        return None


SCORECARD_SYNTHESIS_PROMPT = """You are an expert HR analyst. Synthesize these interview scorecards for a single candidate and provide a comprehensive analysis.

## Scorecards
{scorecards_text}

## Instructions
Analyze all scorecards and provide your synthesis as a JSON object:
{{
  "consensus_strengths": ["areas where interviewers agree the candidate excels"],
  "consensus_concerns": ["areas where interviewers share concerns"],
  "disagreements": [{{"topic": "...", "views": ["interviewer A thinks...", "interviewer B thinks..."]}}],
  "red_flags": ["any red flags raised by multiple interviewers or serious flags from one"],
  "overall_recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "confidence_level": "High" | "Medium" | "Low",
  "summary": "2-3 paragraph synthesis of all feedback",
  "suggested_next_steps": ["actionable next steps for the hiring process"]
}}

Consider:
- Weight of each interviewer's recommendation
- Consistency vs. disagreement across interviewers
- Severity and frequency of concerns
- Set confidence to "High" if interviewers largely agree, "Low" if views are split

Return ONLY the JSON object, no other text."""


def _build_scorecards_text(db: Session, scorecards: list) -> str:
    """Build a structured text representation of all scorecards for the prompt."""
    parts = []
    for i, sc in enumerate(scorecards, 1):
        # Look up interviewer display name
        interviewer = db.query(models.User).filter(
            models.User.id == sc.interviewer_id
        ).first()
        interviewer_name = (
            interviewer.display_name or interviewer.username
            if interviewer else f"Interviewer #{sc.interviewer_id}"
        )

        section = [f"### Scorecard {i} — {interviewer_name}"]
        section.append(f"Overall Rating: {sc.overall_rating}/5" if sc.overall_rating else "Overall Rating: N/A")
        section.append(f"Recommendation: {sc.recommendation or 'N/A'}")

        # Criteria ratings
        if sc.criteria_ratings:
            criteria = sc.criteria_ratings if isinstance(sc.criteria_ratings, list) else []
            if criteria:
                section.append("Criteria Ratings:")
                for cr in criteria:
                    name = cr.get("criteria", "Unknown")
                    rating = cr.get("rating", "N/A")
                    notes = cr.get("notes", "")
                    line = f"  - {name}: {rating}/5"
                    if notes:
                        line += f" — {notes}"
                    section.append(line)

        if sc.strengths:
            section.append(f"Strengths: {sc.strengths}")
        if sc.concerns:
            section.append(f"Concerns: {sc.concerns}")
        if sc.additional_notes:
            section.append(f"Additional Notes: {sc.additional_notes}")

        parts.append("\n".join(section))

    return "\n\n".join(parts)


class ScorecardAnalysisService:
    """Service for AI-powered synthesis of interview scorecards."""

    def analyze_scorecards(
        self,
        db: Session,
        application_id: int,
    ) -> Optional[models.ScorecardAnalysis]:
        """
        Analyze all submitted scorecards for an application.
        Creates or updates a ScorecardAnalysis record.
        """
        # Check for existing analysis
        analysis = db.query(models.ScorecardAnalysis).filter(
            models.ScorecardAnalysis.application_id == application_id
        ).first()

        if not analysis:
            analysis = models.ScorecardAnalysis(
                application_id=application_id,
                status="Pending",
            )
            db.add(analysis)
            db.flush()

        # Query submitted scorecards for this application
        scorecards = db.query(models.InterviewScorecard).filter(
            models.InterviewScorecard.application_id == application_id,
            models.InterviewScorecard.status == "Submitted",
        ).all()

        if len(scorecards) < 2:
            analysis.status = "Failed"
            analysis.error_message = "At least 2 submitted scorecards required"
            analysis.scorecard_count = len(scorecards)
            db.commit()
            return analysis

        analysis.scorecard_count = len(scorecards)
        analysis.status = "Processing"
        db.commit()

        # Build prompt text from scorecards
        scorecards_text = _build_scorecards_text(db, scorecards)

        # Call Claude
        client = _get_anthropic_client()
        if not client:
            analysis.status = "Failed"
            analysis.error_message = "AI service unavailable (API key not configured)"
            db.commit()
            return analysis

        try:
            prompt = SCORECARD_SYNTHESIS_PROMPT.format(
                scorecards_text=scorecards_text,
            )

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text.strip()

            # Parse JSON from response (handle markdown code blocks)
            json_text = response_text
            if json_text.startswith("```"):
                lines = json_text.split("\n")
                json_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            result = json.loads(json_text)

            # Store results
            analysis.consensus_strengths = result.get("consensus_strengths", [])
            analysis.consensus_concerns = result.get("consensus_concerns", [])
            analysis.disagreements = result.get("disagreements", [])
            analysis.red_flags = result.get("red_flags", [])
            analysis.overall_recommendation = result.get("overall_recommendation", "")
            analysis.confidence_level = result.get("confidence_level", "")
            analysis.summary = result.get("summary", "")
            analysis.suggested_next_steps = result.get("suggested_next_steps", [])
            analysis.status = "Completed"
            analysis.completed_at = datetime.utcnow()
            analysis.error_message = None

            db.commit()

            logger.info(
                f"Scorecard analysis completed for application {application_id}: "
                f"{analysis.overall_recommendation} ({analysis.confidence_level} confidence)"
            )

            return analysis

        except json.JSONDecodeError as e:
            analysis.status = "Failed"
            analysis.error_message = f"Failed to parse AI response: {str(e)}"
            db.commit()
            logger.error(f"JSON parse error for application {application_id}: {e}")
            return analysis

        except Exception as e:
            analysis.status = "Failed"
            analysis.error_message = f"AI analysis error: {str(e)}"
            db.commit()
            logger.error(f"Scorecard analysis error for application {application_id}: {e}")
            return analysis


# Singleton instance
scorecard_analysis_service = ScorecardAnalysisService()
