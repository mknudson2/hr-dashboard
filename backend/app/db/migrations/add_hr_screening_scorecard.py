"""
Database Migration: Replace HR Screening Interview scorecard with NBS HR Screening Interview template.

Three weighted domains:
  - Domain 1: Remote Work Technical Readiness (20%)
  - Domain 2: Candidate Fit & Communication (30%)
  - Domain 3: Mission, Vision & Values Alignment (50%)

13 criteria with rubrics, suggested questions, red flags, and recommendation thresholds.

Run: python -m app.db.migrations.add_hr_screening_scorecard
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import logging
from sqlalchemy import text
from app.db.database import engine

logger = logging.getLogger(__name__)


HR_SCREENING_TEMPLATE = {
    "title": "HR Screening Interview",
    "description": "Assess readiness for a remote-work environment (tech, setup, etc.), professionalism and presentation, and alignment with NBS mission, vision, and values.",
    "vision": "We create partnerships that improve the lives of employers and their people.",
    "mission": "As a family-centered business, we value our people. We partner with the best industry service providers to flawlessly and profitably deliver the benefits of benefit plans.",
    "sections": [
        {
            "name": "Remote Work Technical Readiness",
            "weight": 0.20,
            "description": "Assess the candidate's ability to function effectively in NBS's fully remote work environment. Focus on practical capability, not theoretical knowledge.",
            "criteria": [
                {
                    "name": "Video/Audio Setup",
                    "weight": 0.05,
                    "suggested_questions": [
                        "Walk me through your typical home office setup for video calls.",
                        "Have you had any challenges with audio or video quality in remote meetings? How did you resolve them?"
                    ],
                    "rubric": {
                        "1": "Cannot operate camera/mic; no awareness of setup requirements",
                        "2": "Basic awareness but struggled during the interview itself",
                        "3": "Functional setup; camera/mic worked without issues",
                        "4": "Professional setup; good lighting, clear audio, stable connection",
                        "5": "Exceptional setup; professional background, studio-quality audio, proactive about tech quality"
                    }
                },
                {
                    "name": "Collaboration Tools Proficiency",
                    "weight": 0.05,
                    "suggested_questions": [
                        "What collaboration tools have you used regularly? (Teams, Slack, Zoom, etc.)",
                        "Describe how you've used tools like shared documents, project boards, or chat platforms in a prior role."
                    ],
                    "rubric": {
                        "1": "No experience with any collaboration platforms",
                        "2": "Limited to one tool; struggles to describe usage beyond basics",
                        "3": "Comfortable with 2+ tools; can describe daily use cases",
                        "4": "Proficient across multiple platforms; can describe workflows",
                        "5": "Power user; has trained others, customized workflows, or integrated tools"
                    }
                },
                {
                    "name": "Self-Sufficiency & Troubleshooting",
                    "weight": 0.05,
                    "suggested_questions": [
                        "Tell me about a time you had a technical issue while working remotely. How did you handle it?",
                        "If your internet went down during an important meeting, what would you do?"
                    ],
                    "rubric": {
                        "1": "No ability to troubleshoot; relies entirely on others for tech issues",
                        "2": "Minimal troubleshooting; would be stuck without IT support",
                        "3": "Can handle basic issues (restart, reconnect); knows when to escalate",
                        "4": "Resourceful problem-solver; has backup plans for common failures",
                        "5": "Highly self-sufficient; proactive about preventing issues, maintains backup internet/hardware"
                    }
                },
                {
                    "name": "Remote Work Environment",
                    "weight": 0.05,
                    "suggested_questions": [
                        "Describe your workspace at home. Do you have a dedicated space for focused work?",
                        "How do you manage distractions when working from home?"
                    ],
                    "rubric": {
                        "1": "No dedicated workspace; significant distractions evident during interview",
                        "2": "Shared/temporary space; some concerns about ability to focus",
                        "3": "Adequate workspace; demonstrates awareness of distraction management",
                        "4": "Dedicated office space; clear strategies for maintaining focus",
                        "5": "Professional home office; ergonomic setup, boundaries well-established with household"
                    }
                }
            ]
        },
        {
            "name": "Candidate Fit & Communication",
            "weight": 0.30,
            "description": "Evaluate the candidate's communication skills, professionalism, preparation, and career alignment. These predict success in NBS's collaborative remote culture.",
            "criteria": [
                {
                    "name": "Communication Clarity",
                    "weight": 0.10,
                    "suggested_questions": [
                        "Tell me about yourself and what drew you to this position.",
                        "How would your previous manager describe your communication style?"
                    ],
                    "rubric": {
                        "1": "Incoherent or extremely difficult to follow; cannot articulate thoughts",
                        "2": "Rambling or vague; requires frequent clarification to understand",
                        "3": "Clear and organized; answers questions directly with adequate detail",
                        "4": "Articulate and engaging; provides structured, thoughtful responses",
                        "5": "Exceptionally clear communicator; concise, compelling, adapts to audience"
                    }
                },
                {
                    "name": "Professionalism & Engagement",
                    "weight": 0.10,
                    "suggested_questions": [
                        "What do you know about NBS and why are you interested in working here?",
                        "What questions do you have for me about the role or the company?"
                    ],
                    "rubric": {
                        "1": "Unprepared; no research on company; disengaged throughout",
                        "2": "Minimal preparation; generic interest; limited engagement",
                        "3": "Adequate preparation; genuine interest; asks relevant questions",
                        "4": "Well-researched; enthusiastic; asks insightful questions about role/culture",
                        "5": "Deep research evident; passion for mission; asks strategic questions showing long-term thinking"
                    }
                },
                {
                    "name": "Career Narrative & Role Fit",
                    "weight": 0.10,
                    "suggested_questions": [
                        "Walk me through your career path and how it led you to apply for this role.",
                        "Where do you see yourself in 2-3 years, and how does this role fit into that?"
                    ],
                    "rubric": {
                        "1": "No coherent career narrative; role appears to be random application",
                        "2": "Disconnected career story; unclear motivation for this specific role",
                        "3": "Logical career progression; reasonable explanation for interest in role",
                        "4": "Compelling narrative; clear alignment between experience and role requirements",
                        "5": "Powerful career story; this role is a natural fit; demonstrates deep understanding of the opportunity"
                    }
                }
            ]
        },
        {
            "name": "Mission, Vision & Values Alignment",
            "weight": 0.50,
            "description": "This is the most heavily weighted domain. NBS values culture-first hiring. Assess each of the six core values independently. Questions are behavioral (STAR format encouraged).",
            "criteria": [
                {
                    "name": "People",
                    "weight": 0.08,
                    "value_description": "Respect, teamwork, collaboration, investing in growth, optimism",
                    "suggested_questions": [
                        "Tell me about a time you worked with someone whose work style or perspective was very different from yours. How did you handle it?",
                        "How do you invest in your own professional development?",
                        "Describe a challenging work situation where maintaining a positive attitude made a difference."
                    ],
                    "rubric": {
                        "1": "Dismissive of others; no interest in growth; pessimistic outlook",
                        "2": "Tolerates differences but doesn't seek collaboration; limited growth mindset",
                        "3": "Respects others; participates in teams; shows willingness to learn",
                        "4": "Actively builds relationships; seeks growth opportunities; uplifts team morale",
                        "5": "Champion of inclusion; mentors others; relentless learner; infectious optimism"
                    }
                },
                {
                    "name": "Partnership",
                    "weight": 0.08,
                    "value_description": "Growing together, shared responsibility, making it easy to work with us",
                    "suggested_questions": [
                        "Describe a time you went above and beyond to make a colleague's or client's experience easier.",
                        "How do you approach building relationships with new team members or stakeholders?"
                    ],
                    "rubric": {
                        "1": "Transactional mindset; no evidence of collaborative relationships",
                        "2": "Works with others when required but doesn't proactively build partnerships",
                        "3": "Good team player; understands shared goals; cooperative",
                        "4": "Actively cultivates partnerships; takes ownership of shared outcomes",
                        "5": "Relationship builder; creates opportunities through connections; elevates partners"
                    }
                },
                {
                    "name": "Integrity",
                    "weight": 0.08,
                    "value_description": "Doing the right thing, earning trust, being genuine and open-minded",
                    "suggested_questions": [
                        "Tell me about a time you had to make a difficult ethical decision at work. What did you do?",
                        "Describe a situation where you had to admit a mistake. How did you handle it?"
                    ],
                    "rubric": {
                        "1": "Evasive about past mistakes; responses feel rehearsed or disingenuous",
                        "2": "Acknowledges integrity matters but struggles to provide concrete examples",
                        "3": "Honest and straightforward; can describe ethical decision-making",
                        "4": "Strong moral compass; takes responsibility; earns trust through transparency",
                        "5": "Integrity-driven leader; proactively does the right thing even at personal cost"
                    }
                },
                {
                    "name": "Accountability",
                    "weight": 0.09,
                    "value_description": "Grit, passion, high expectations, self-discipline, delivering on commitments",
                    "suggested_questions": [
                        "Tell me about a project or goal that required sustained effort over a long period. How did you stay motivated?",
                        "Describe a time you missed a deadline or fell short of expectations. What happened and what did you learn?"
                    ],
                    "rubric": {
                        "1": "Blames others; no evidence of follow-through or self-discipline",
                        "2": "Meets minimum requirements but lacks drive or ownership of outcomes",
                        "3": "Reliable; takes responsibility; meets commitments consistently",
                        "4": "Highly disciplined; passionate about work quality; holds self to high standards",
                        "5": "Extraordinary grit; delivers exceptional results under pressure; inspires accountability in others"
                    }
                },
                {
                    "name": "Impact",
                    "weight": 0.09,
                    "value_description": "Wellbeing of others, community service, giving back, making a difference",
                    "suggested_questions": [
                        "What does 'making a difference' mean to you in a work context?",
                        "Tell me about a time you contributed to your community or helped someone beyond your job description."
                    ],
                    "rubric": {
                        "1": "Self-focused; no awareness of broader impact; disinterested in community",
                        "2": "Recognizes importance of impact but provides no personal examples",
                        "3": "Can articulate desire to make a difference; some community involvement",
                        "4": "Active contributor; genuinely cares about others' wellbeing; volunteers/serves",
                        "5": "Purpose-driven; significant community impact; work is motivated by helping others"
                    }
                },
                {
                    "name": "Innovation",
                    "weight": 0.08,
                    "value_description": "Custom solutions, great processes, efficiency, finding a better way",
                    "suggested_questions": [
                        "Describe a time you improved a process or found a more efficient way to do something.",
                        "When you encounter a problem with no obvious solution, what's your approach?"
                    ],
                    "rubric": {
                        "1": "Resistant to change; no examples of creative thinking or improvement",
                        "2": "Open to new ideas but hasn't initiated improvements independently",
                        "3": "Has improved a process or found efficiencies; shows problem-solving ability",
                        "4": "Proactive innovator; regularly identifies and implements improvements",
                        "5": "Obsessed with finding a better way; has driven significant process transformations"
                    }
                }
            ]
        }
    ],
    "red_flags": [
        "Speaks negatively about all previous employers/managers",
        "Cannot provide specific examples for any behavioral question",
        "Dishonesty or significant inconsistencies in responses",
        "Unwilling to use required technology (camera, Teams, etc.)",
        "Displays disrespect, hostility, or discriminatory attitudes",
        "No interest in company mission; purely transactional motivation",
        "Cannot describe any instance of accountability or learning from failure",
        "Significant unexplained gaps with evasive responses"
    ],
    "recommendation_thresholds": [
        {"min": 4.00, "max": 5.00, "label": "Strong Advance", "action": "Proceed to hiring manager interview with high priority"},
        {"min": 3.00, "max": 3.99, "label": "Advance", "action": "Proceed to hiring manager interview; note areas for deeper exploration"},
        {"min": 2.00, "max": 2.99, "label": "Hold / Discuss", "action": "Consult with hiring manager before advancing; significant concerns present"},
        {"min": 1.00, "max": 1.99, "label": "Do Not Advance", "action": "Decline candidate; document reasoning for compliance records"}
    ]
}


def upgrade():
    """Update HR Screening Interview stage with NBS HR Screening Interview scorecard template."""

    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_stages'"
        ))
        if not result.fetchone():
            logger.warning("pipeline_stages table not found — skipping")
            return

        template_json = json.dumps(HR_SCREENING_TEMPLATE)
        result = conn.execute(text(
            "UPDATE pipeline_stages SET scorecard_template = :template WHERE name = 'HR Screening Interview'"
        ), {"template": template_json})
        conn.commit()
        logger.info(f"Updated HR Screening Interview → HR Screening Interview scorecard ({result.rowcount} rows)")


def downgrade():
    """Revert to previous HR Interview template."""
    from app.db.migrations.update_scorecard_templates import HR_INTERVIEW_TEMPLATE

    with engine.connect() as conn:
        template_json = json.dumps(HR_INTERVIEW_TEMPLATE)
        conn.execute(text(
            "UPDATE pipeline_stages SET scorecard_template = :template WHERE name = 'HR Screening Interview'"
        ), {"template": template_json})
        conn.commit()
        logger.info("Reverted HR Screening Interview scorecard to previous template")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='HR Screening Scorecard Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        logger.info("Rolling back migration...")
        downgrade()
    else:
        logger.info("Running migration...")
        upgrade()
    logger.info("Done!")
