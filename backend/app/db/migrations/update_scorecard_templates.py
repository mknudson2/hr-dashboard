"""
Database Migration: Update pipeline scorecard templates with rubric-enriched criteria
Updates Phone Screen → HR Interview and Team Interview → Hiring Manager Interview
with detailed rubrics for each criterion.

Run: python -m app.db.migrations.update_scorecard_templates
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.db.database import engine


HR_INTERVIEW_TEMPLATE = {
    "criteria": [
        {
            "name": "Company Values Alignment",
            "weight": 1.0,
            "rubric": {
                "1": "No awareness of company values; goals clearly misaligned",
                "2": "Vague understanding; limited alignment examples",
                "3": "Basic understanding; generally aligned but not deeply connected",
                "4": "Clear understanding; genuine alignment with specific examples",
                "5": "Deep, authentic alignment; articulates how they embody values daily"
            }
        },
        {
            "name": "Tech Readiness/Ability",
            "weight": 1.0,
            "rubric": {
                "1": "Unable to use basic required tools; significant training gap",
                "2": "Minimal familiarity with some tools; would need extensive onboarding",
                "3": "Competent with core tools; some gaps in advanced usage",
                "4": "Proficient across required tech stack; quick to learn new tools",
                "5": "Expert-level proficiency; could mentor others on technology usage"
            }
        },
        {
            "name": "Communication Skills",
            "weight": 1.0,
            "rubric": {
                "1": "Difficulty expressing ideas; unclear or disorganized responses",
                "2": "Basic communication; sometimes unclear or overly brief",
                "3": "Adequate communication; gets points across with occasional difficulty",
                "4": "Strong communicator; clear, concise, and well-structured responses",
                "5": "Exceptional communicator; compelling, empathetic, and highly articulate"
            }
        },
        {
            "name": "Remote Work Readiness",
            "weight": 1.0,
            "rubric": {
                "1": "No remote experience; unclear on self-management strategies",
                "2": "Limited remote experience; some concerns about autonomy",
                "3": "Some remote experience; reasonable self-management approach",
                "4": "Proven remote worker; clear strategies for productivity and communication",
                "5": "Thrives remotely; sophisticated systems for collaboration, boundaries, and output"
            }
        },
        {
            "name": "Professional Presentation",
            "weight": 1.0,
            "rubric": {
                "1": "Unprepared; no knowledge of company or role; unprofessional demeanor",
                "2": "Minimal preparation; surface-level knowledge of company",
                "3": "Adequately prepared; reasonable understanding of role and company",
                "4": "Well-prepared; researched company, thoughtful questions, professional demeanor",
                "5": "Exceptionally prepared; deep company research, strategic questions, polished presence"
            }
        }
    ]
}

HM_INTERVIEW_TEMPLATE = {
    "criteria": [
        {
            "name": "Role Effectiveness Potential",
            "weight": 1.0,
            "rubric": {
                "1": "Cannot articulate how they'd approach key responsibilities",
                "2": "Vague understanding of role; limited relevant experience",
                "3": "Reasonable grasp of role; could perform with standard support",
                "4": "Strong understanding; relevant examples of similar work; likely to excel",
                "5": "Immediately effective; deep experience in similar roles; would raise the bar"
            }
        },
        {
            "name": "Knowledge Base / Domain Expertise",
            "weight": 1.0,
            "rubric": {
                "1": "Lacks fundamental domain knowledge; major gaps",
                "2": "Basic awareness but significant knowledge gaps",
                "3": "Solid foundational knowledge; meets minimum requirements",
                "4": "Strong domain expertise; current on industry trends and best practices",
                "5": "Expert-level knowledge; thought leader in the domain; could mentor the team"
            }
        },
        {
            "name": "Training Need Assessment",
            "weight": 1.0,
            "rubric": {
                "1": "Would require extensive, long-term training across all areas",
                "2": "Significant training needed; 3-6 month ramp-up expected",
                "3": "Moderate training needed; standard onboarding should suffice",
                "4": "Minimal training needed; mostly ready to contribute on day one",
                "5": "No significant training needed; could begin contributing immediately"
            }
        },
        {
            "name": "Team Dynamic / Culture Fit",
            "weight": 1.0,
            "rubric": {
                "1": "Work style clearly incompatible with team dynamics",
                "2": "Some concerns about collaboration approach or team compatibility",
                "3": "Neutral fit; no red flags but no strong positive signals",
                "4": "Good fit; complementary skills and compatible work style",
                "5": "Excellent fit; would strengthen team dynamics and bring valuable perspective"
            }
        },
        {
            "name": "Problem-Solving Ability",
            "weight": 1.0,
            "rubric": {
                "1": "Unable to work through presented scenarios; no structured thinking",
                "2": "Basic problem-solving; struggles with complexity or ambiguity",
                "3": "Adequate problem-solving; methodical but may miss edge cases",
                "4": "Strong analytical thinker; considers multiple approaches and trade-offs",
                "5": "Exceptional problem solver; creative, systematic, and anticipates downstream effects"
            }
        }
    ]
}


def upgrade():
    """Update existing pipeline stages with rubric-enriched scorecard templates."""

    with engine.connect() as conn:
        # Check if pipeline_stages table exists
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_stages'"
        ))
        if not result.fetchone():
            print("  pipeline_stages table not found — skipping template update")
            return

        # Update Phone Screen stage → HR Interview template
        hr_json = json.dumps(HR_INTERVIEW_TEMPLATE)
        result = conn.execute(text(
            "UPDATE pipeline_stages SET scorecard_template = :template WHERE name = 'Phone Screen'"
        ), {"template": hr_json})
        conn.commit()
        print(f"  Updated Phone Screen scorecard template ({result.rowcount} rows)")

        # Update Team Interview stage → HM Interview template
        hm_json = json.dumps(HM_INTERVIEW_TEMPLATE)
        result = conn.execute(text(
            "UPDATE pipeline_stages SET scorecard_template = :template WHERE name = 'Team Interview'"
        ), {"template": hm_json})
        conn.commit()
        print(f"  Updated Team Interview scorecard template ({result.rowcount} rows)")


def downgrade():
    """Revert to simple scorecard templates without rubrics."""
    import json

    simple_phone = json.dumps({
        "criteria": [
            {"name": "Communication Skills", "weight": 1.0},
            {"name": "Role Fit", "weight": 1.0},
            {"name": "Motivation", "weight": 1.0}
        ]
    })
    simple_team = json.dumps({
        "criteria": [
            {"name": "Culture Fit", "weight": 1.0},
            {"name": "Collaboration", "weight": 1.0},
            {"name": "Leadership", "weight": 0.5}
        ]
    })

    with engine.connect() as conn:
        conn.execute(text(
            "UPDATE pipeline_stages SET scorecard_template = :template WHERE name = 'Phone Screen'"
        ), {"template": simple_phone})
        conn.execute(text(
            "UPDATE pipeline_stages SET scorecard_template = :template WHERE name = 'Team Interview'"
        ), {"template": simple_team})
        conn.commit()
        print("  Reverted scorecard templates to simple format")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Update Scorecard Templates Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        print("Rolling back migration...")
        downgrade()
    else:
        print("Running migration...")
        upgrade()
    print("Done!")
