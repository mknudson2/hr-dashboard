"""
Resume Analysis Service

AI-powered resume analysis that scores resumes against job descriptions
using Claude. Auto-triggered when applications are created with a resume.
"""

import json
import logging
import os
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.db import models
from app.services.recruiting_service import recruiting_service

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


def _extract_resume_text(file_upload: models.FileUpload) -> Optional[str]:
    """Extract text from a resume PDF or DOCX file."""
    if not file_upload or not file_upload.file_path:
        return None

    file_path = file_upload.file_path
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".pdf":
            import pdfplumber
            text_parts = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            return "\n".join(text_parts) if text_parts else None

        elif ext in (".docx", ".doc"):
            from docx import Document
            doc = Document(file_path)
            text_parts = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(text_parts) if text_parts else None

        else:
            logger.warning(f"Unsupported resume format: {ext}")
            return None

    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return None


def _build_job_context(requisition: models.JobRequisition) -> str:
    """Build job context string from requisition and linked job description."""
    parts = []

    parts.append(f"Position: {requisition.title}")

    if requisition.department:
        parts.append(f"Department: {requisition.department}")

    # Pull from linked JobDescription if available
    jd = requisition.job_description if hasattr(requisition, 'job_description') else None

    desc = (jd.description if jd and jd.description else requisition.description)
    if desc:
        parts.append(f"Description:\n{desc}")

    reqs = (jd.requirements if jd and jd.requirements else requisition.requirements)
    if reqs:
        parts.append(f"Requirements:\n{reqs}")

    pref = (jd.preferred_qualifications if jd and jd.preferred_qualifications
            else requisition.preferred_qualifications)
    if pref:
        parts.append(f"Preferred Qualifications:\n{pref}")

    resp = (jd.responsibilities if jd and jd.responsibilities else requisition.responsibilities)
    if resp:
        parts.append(f"Responsibilities:\n{resp}")

    skills = (jd.skills_tags if jd and jd.skills_tags else requisition.skills_tags)
    if skills:
        if isinstance(skills, list):
            parts.append(f"Required Skills: {', '.join(skills)}")
        elif isinstance(skills, str):
            parts.append(f"Required Skills: {skills}")

    return "\n\n".join(parts)


ANALYSIS_PROMPT = """You are an expert HR resume analyst. Analyze this resume against the job description and provide a structured evaluation.

## Job Description
{job_context}

## Resume
{resume_text}

## Instructions
Provide your analysis as a JSON object with exactly this structure:
{{
  "overall_score": <0-100 integer>,
  "skills_match_score": <0-100 integer>,
  "experience_match_score": <0-100 integer>,
  "education_match_score": <0-100 integer>,
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "red_flags": ["red flag 1", ...],
  "suggested_questions": ["question 1", "question 2", ...],
  "summary": "2-3 sentence overall assessment"
}}

Scoring guidelines:
- 90-100: Exceptional match — exceeds all requirements
- 75-89: Strong match — meets most requirements with relevant experience
- 60-74: Moderate match — meets some requirements, gaps in key areas
- 40-59: Weak match — significant gaps in requirements
- 0-39: Poor match — does not meet fundamental requirements

Include 3-5 strengths, 2-4 weaknesses, only genuine red flags (empty array if none), and 3-5 targeted interview questions.

Return ONLY the JSON object, no other text."""


class ResumeAnalysisService:
    """Service for AI-powered resume analysis."""

    def analyze_resume(
        self,
        db: Session,
        application_id: int,
        threshold: float = 70.0,
    ) -> Optional[models.ResumeAnalysis]:
        """
        Analyze a resume against the job description for an application.
        Creates or updates a ResumeAnalysis record.
        """
        # Load application with relationships
        application = db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return None

        # Check for existing analysis
        analysis = db.query(models.ResumeAnalysis).filter(
            models.ResumeAnalysis.application_id == application_id
        ).first()

        if not analysis:
            analysis = models.ResumeAnalysis(
                application_id=application_id,
                threshold_score=threshold,
                status="Pending",
            )
            db.add(analysis)
            db.flush()

        # Check for resume
        if not application.resume_file_id:
            analysis.status = "No Resume"
            db.commit()
            return analysis

        # Load resume file
        resume_file = db.query(models.FileUpload).filter(
            models.FileUpload.id == application.resume_file_id
        ).first()
        if not resume_file:
            analysis.status = "Failed"
            analysis.error_message = "Resume file record not found"
            db.commit()
            return analysis

        # Extract resume text
        analysis.status = "Processing"
        db.commit()

        resume_text = _extract_resume_text(resume_file)
        if not resume_text:
            analysis.status = "Failed"
            analysis.error_message = "Could not extract text from resume file"
            db.commit()
            return analysis

        analysis.resume_text_length = len(resume_text)

        # Build job context
        requisition = db.query(models.JobRequisition).filter(
            models.JobRequisition.id == application.requisition_id
        ).first()
        if not requisition:
            analysis.status = "Failed"
            analysis.error_message = "Requisition not found"
            db.commit()
            return analysis

        job_context = _build_job_context(requisition)
        analysis.job_description_length = len(job_context)

        # Call Claude
        client = _get_anthropic_client()
        if not client:
            analysis.status = "Failed"
            analysis.error_message = "AI service unavailable (API key not configured)"
            db.commit()
            return analysis

        try:
            prompt = ANALYSIS_PROMPT.format(
                job_context=job_context,
                resume_text=resume_text[:15000],  # Limit resume text length
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
            analysis.overall_score = float(result.get("overall_score", 0))
            analysis.skills_match_score = float(result.get("skills_match_score", 0))
            analysis.experience_match_score = float(result.get("experience_match_score", 0))
            analysis.education_match_score = float(result.get("education_match_score", 0))
            analysis.strengths = result.get("strengths", [])
            analysis.weaknesses = result.get("weaknesses", [])
            analysis.red_flags = result.get("red_flags", [])
            analysis.suggested_questions = result.get("suggested_questions", [])
            analysis.summary = result.get("summary", "")
            analysis.threshold_label = "Promising" if analysis.overall_score >= threshold else "Below Threshold"
            analysis.status = "Completed"
            analysis.completed_at = datetime.utcnow()

            db.commit()

            # Log activity
            recruiting_service.log_activity(
                db,
                application_id=application.id,
                activity_type="note_added",
                description=f"AI Resume Analysis completed — Score: {analysis.overall_score}/100 ({analysis.threshold_label})",
                details={
                    "overall_score": analysis.overall_score,
                    "threshold_label": analysis.threshold_label,
                },
                is_internal=True,
            )
            db.commit()

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
            logger.error(f"Resume analysis error for application {application_id}: {e}")
            return analysis


# Singleton instance
resume_analysis_service = ResumeAnalysisService()
