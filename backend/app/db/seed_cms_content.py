#!/usr/bin/env python3
"""
Seed CMS content into the hr_resources table.

Migrates the hardcoded data from resources_portal.py into the database.
Idempotent: skips if CMS records already exist.

Usage:
    python -m app.db.seed_cms_content
"""
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import SessionLocal, engine
from app.db import models
import logging

logger = logging.getLogger(__name__)


def seed_cms_content():
    """Seed all CMS content into the database."""
    logger.info("=" * 60)
    logger.info("CMS Content Seeding")
    logger.info("=" * 60)

    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if CMS content already exists
        existing = db.query(models.HRResource).filter(
            models.HRResource.resource_type.in_([
                "handbook_chapter", "handbook_section",
                "benefits_category", "benefits_plan", "benefits_config",
                "faq", "form"
            ])
        ).first()

        if existing:
            logger.warning("CMS content already exists. Skipping seed.")
            return

        logger.info("Seeding handbook content...")
        seed_handbook(db)

        logger.info("Seeding benefits content...")
        seed_benefits(db)

        logger.info("Seeding FAQ content...")
        seed_faqs(db)

        logger.info("Seeding forms content...")
        seed_forms(db)

        db.commit()
        logger.info("=" * 60)
        logger.info("CMS content seeding completed successfully!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"\nError during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_handbook(db):
    """Seed handbook chapters and sections."""
    chapters_data = [
        {
            "title": "1. Welcome & Company Overview",
            "order": 1,
            "sections": [
                {
                    "title": "Welcome Message",
                    "content": "<p>Welcome to our company! We're excited to have you as part of our team.</p><p>This handbook is designed to help you understand our policies, procedures, and culture.</p>",
                    "order": 1,
                },
                {
                    "title": "Our Mission & Values",
                    "content": "<p><strong>Mission:</strong> To deliver exceptional value to our customers while fostering a positive workplace.</p><p><strong>Core Values:</strong></p><ul><li>Integrity</li><li>Innovation</li><li>Collaboration</li><li>Excellence</li></ul>",
                    "order": 2,
                },
            ]
        },
        {
            "title": "2. Employment Policies",
            "order": 2,
            "sections": [
                {
                    "title": "Equal Employment Opportunity",
                    "content": "<p>We are an equal opportunity employer. We do not discriminate based on race, color, religion, sex, national origin, age, disability, or any other protected characteristic.</p>",
                    "order": 1,
                },
                {
                    "title": "At-Will Employment",
                    "content": "<p>Employment with the company is at-will, meaning either party may terminate the employment relationship at any time, with or without cause or notice.</p>",
                    "order": 2,
                },
            ]
        },
        {
            "title": "3. Time Off & Leave",
            "order": 3,
            "sections": [
                {
                    "title": "Paid Time Off (PTO)",
                    "content": "<p>Full-time employees accrue PTO based on length of service:</p><ul><li>0-2 years: 15 days per year</li><li>3-5 years: 20 days per year</li><li>6+ years: 25 days per year</li></ul><p>PTO can be used for vacation, personal time, or illness.</p>",
                    "order": 1,
                },
                {
                    "title": "Family and Medical Leave (FMLA)",
                    "content": "<p>Eligible employees may take up to 12 weeks of unpaid, job-protected leave per year for qualifying family and medical reasons under the FMLA.</p><p>To be eligible, you must have worked for the company for at least 12 months and have worked at least 1,250 hours in the past 12 months.</p>",
                    "order": 2,
                },
            ]
        },
        {
            "title": "4. Benefits",
            "order": 4,
            "sections": [
                {
                    "title": "Health Insurance",
                    "content": "<p>We offer comprehensive health insurance coverage including medical, dental, and vision plans. Coverage begins on the first of the month following your start date.</p>",
                    "order": 1,
                },
                {
                    "title": "Retirement Plans",
                    "content": "<p>We offer a 401(k) plan with company matching. Employees can contribute up to the IRS limit, and the company matches 50% of contributions up to 6% of salary.</p>",
                    "order": 2,
                },
            ]
        },
    ]

    for ch in chapters_data:
        chapter = models.HRResource(
            resource_type="handbook_chapter",
            title=ch["title"],
            sort_order=ch["order"],
            is_active=True,
        )
        db.add(chapter)
        db.flush()  # Get ID
        logger.info(f"+ Chapter: {ch['title']}")

        for sec in ch["sections"]:
            section = models.HRResource(
                resource_type="handbook_section",
                title=sec["title"],
                content=sec["content"],
                sort_order=sec["order"],
                parent_id=chapter.id,
                is_active=True,
            )
            db.add(section)
            logger.info(f"+ Section: {sec['title']}")


def seed_benefits(db):
    """Seed benefit categories, plans, and config."""
    categories_data = [
        {
            "name": "Health Insurance",
            "icon": "heart",
            "description": "Medical, dental, and vision coverage for you and your family",
            "order": 1,
            "plans": [
                {
                    "name": "PPO Gold",
                    "type": "Medical",
                    "description": "Our most comprehensive plan with low deductibles and wide network access.",
                    "coverage_details": "$500 individual / $1,000 family deductible. 80% coinsurance after deductible.",
                    "employee_cost": "$150-450/month depending on coverage tier",
                    "employer_contribution": "Company pays 75% of premium",
                    "enrollment_info": "Enroll during open enrollment or within 30 days of a qualifying life event.",
                    "order": 1,
                },
                {
                    "name": "HDHP with HSA",
                    "type": "Medical",
                    "description": "High deductible plan with health savings account for tax-advantaged savings.",
                    "coverage_details": "$1,500 individual / $3,000 family deductible. 100% coverage after deductible.",
                    "employee_cost": "$75-225/month depending on coverage tier",
                    "employer_contribution": "Company contributes $1,000/year to HSA",
                    "enrollment_info": "Enroll during open enrollment. HSA contributions can be adjusted anytime.",
                    "order": 2,
                },
            ]
        },
        {
            "name": "Retirement",
            "icon": "piggybank",
            "description": "Plan for your future with our retirement savings programs",
            "order": 2,
            "plans": [
                {
                    "name": "401(k) Plan",
                    "type": "Retirement",
                    "description": "Tax-advantaged retirement savings with company matching.",
                    "coverage_details": "Traditional and Roth 401(k) options available.",
                    "employee_cost": "You choose your contribution (up to IRS limits)",
                    "employer_contribution": "50% match on first 6% of salary",
                    "enrollment_info": "Eligible immediately upon hire. Auto-enrollment at 3% unless you opt out.",
                    "order": 1,
                },
            ]
        },
        {
            "name": "Life & Disability",
            "icon": "umbrella",
            "description": "Protection for you and your loved ones",
            "order": 3,
            "plans": [
                {
                    "name": "Basic Life Insurance",
                    "type": "Life Insurance",
                    "description": "Company-paid life insurance coverage.",
                    "coverage_details": "1x annual salary up to $200,000",
                    "employee_cost": "$0 - Company paid",
                    "employer_contribution": "100% employer paid",
                    "enrollment_info": "Automatically enrolled upon hire.",
                    "order": 1,
                },
                {
                    "name": "Short-Term Disability",
                    "type": "Disability",
                    "description": "Income protection for short-term illness or injury.",
                    "coverage_details": "60% of salary for up to 12 weeks",
                    "employee_cost": "$0 - Company paid",
                    "employer_contribution": "100% employer paid",
                    "enrollment_info": "Automatically enrolled upon hire.",
                    "order": 2,
                },
            ]
        },
    ]

    for cat in categories_data:
        category = models.HRResource(
            resource_type="benefits_category",
            title=cat["name"],
            description=cat["description"],
            sort_order=cat["order"],
            metadata_json=json.dumps({"icon": cat["icon"]}),
            is_active=True,
        )
        db.add(category)
        db.flush()
        logger.info(f"+ Category: {cat['name']}")

        for plan in cat["plans"]:
            plan_resource = models.HRResource(
                resource_type="benefits_plan",
                title=plan["name"],
                description=plan["description"],
                sort_order=plan["order"],
                parent_id=category.id,
                metadata_json=json.dumps({
                    "type": plan["type"],
                    "coverage_details": plan["coverage_details"],
                    "employee_cost": plan["employee_cost"],
                    "employer_contribution": plan["employer_contribution"],
                    "enrollment_info": plan["enrollment_info"],
                }),
                is_active=True,
            )
            db.add(plan_resource)
            logger.info(f"+ Plan: {plan['name']}")

    # Benefits config
    config = models.HRResource(
        resource_type="benefits_config",
        title="Benefits Configuration",
        sort_order=0,
        metadata_json=json.dumps({
            "enrollment_open": False,
            "start_date": None,
            "end_date": None,
            "contact_email": "benefits@company.com",
            "contact_phone": "1-800-BENEFITS",
        }),
        is_active=True,
    )
    db.add(config)
    logger.info("+ Benefits config")


def seed_faqs(db):
    """Seed FAQ content."""
    faqs_data = [
        {
            "question": "How do I request time off?",
            "answer": "<p>You can request time off through the Employee HR Portal:</p><ol><li>Go to Requests & Cases > PTO Requests</li><li>Click 'New Request'</li><li>Select your dates and type of leave</li><li>Submit for supervisor approval</li></ol>",
            "category": "Time Off",
            "tags": ["pto", "vacation", "time off", "leave"],
            "order": 1,
        },
        {
            "question": "How do I update my direct deposit information?",
            "answer": "<p>To update your direct deposit information:</p><ol><li>Go to My HR > Profile</li><li>Click on 'Payment Information'</li><li>Update your bank account details</li><li>Changes take effect on the next pay cycle</li></ol><p>For security, you may be asked to verify your identity.</p>",
            "category": "Payroll",
            "tags": ["direct deposit", "payroll", "bank", "payment"],
            "order": 2,
        },
        {
            "question": "When is open enrollment?",
            "answer": "<p>Open enrollment typically occurs in November each year for coverage beginning January 1st. You'll receive email notifications with specific dates and instructions.</p><p>You can also make changes within 30 days of a qualifying life event (marriage, birth of child, etc.).</p>",
            "category": "Benefits",
            "tags": ["benefits", "enrollment", "insurance", "health"],
            "order": 3,
        },
        {
            "question": "How do I apply for FMLA leave?",
            "answer": "<p>To apply for FMLA leave:</p><ol><li>Go to Requests & Cases > Request FMLA Leave</li><li>Complete the leave request form</li><li>HR will review your eligibility</li><li>If eligible, you'll receive certification forms</li></ol><p>You should apply at least 30 days in advance for foreseeable leave.</p>",
            "category": "Leave",
            "tags": ["fmla", "leave", "medical", "family"],
            "order": 4,
        },
        {
            "question": "How do I enroll in the 401(k) plan?",
            "answer": "<p>New employees are automatically enrolled in the 401(k) at 3% unless you opt out. To change your contribution:</p><ol><li>Visit the 401(k) provider portal (link in Resources)</li><li>Log in with your credentials</li><li>Update your contribution percentage</li></ol><p>You can change your contribution at any time.</p>",
            "category": "Benefits",
            "tags": ["401k", "retirement", "savings", "contribution"],
            "order": 5,
        },
    ]

    for faq in faqs_data:
        resource = models.HRResource(
            resource_type="faq",
            title=faq["question"],
            content=faq["answer"],
            category=faq["category"],
            sort_order=faq["order"],
            metadata_json=json.dumps({"tags": faq["tags"]}),
            is_active=True,
        )
        db.add(resource)
        logger.info(f"+ FAQ: {faq['question'][:50]}...")


def seed_forms(db):
    """Seed forms content."""
    forms_data = [
        {
            "name": "Direct Deposit Authorization",
            "description": "Use this form to set up or change your direct deposit information.",
            "category": "Payroll",
            "file_type": "PDF",
            "file_size": "125 KB",
            "download_url": "/api/portal/resources/forms/1/download",
            "external_url": None,
            "order": 1,
        },
        {
            "name": "W-4 Employee Withholding Certificate",
            "description": "Federal tax withholding form. Update when your tax situation changes.",
            "category": "Tax Forms",
            "file_type": "PDF",
            "file_size": "156 KB",
            "download_url": "/api/portal/resources/forms/2/download",
            "external_url": "https://www.irs.gov/pub/irs-pdf/fw4.pdf",
            "order": 2,
        },
        {
            "name": "State Tax Withholding Form",
            "description": "State income tax withholding certificate.",
            "category": "Tax Forms",
            "file_type": "PDF",
            "file_size": "98 KB",
            "download_url": "/api/portal/resources/forms/3/download",
            "external_url": None,
            "order": 3,
        },
        {
            "name": "Beneficiary Designation Form",
            "description": "Designate beneficiaries for life insurance and retirement plans.",
            "category": "Benefits",
            "file_type": "PDF",
            "file_size": "112 KB",
            "download_url": "/api/portal/resources/forms/4/download",
            "external_url": None,
            "order": 4,
        },
        {
            "name": "FMLA Leave Request Form",
            "description": "Initial request form for Family and Medical Leave.",
            "category": "Leave",
            "file_type": "PDF",
            "file_size": "145 KB",
            "download_url": "/api/portal/resources/forms/5/download",
            "external_url": None,
            "order": 5,
        },
        {
            "name": "Emergency Contact Form",
            "description": "Update your emergency contact information.",
            "category": "Personal Information",
            "file_type": "PDF",
            "file_size": "78 KB",
            "download_url": "/api/portal/resources/forms/6/download",
            "external_url": None,
            "order": 6,
        },
    ]

    for form in forms_data:
        resource = models.HRResource(
            resource_type="form",
            title=form["name"],
            description=form["description"],
            category=form["category"],
            sort_order=form["order"],
            metadata_json=json.dumps({
                "file_type": form["file_type"],
                "file_size": form["file_size"],
                "download_url": form["download_url"],
                "external_url": form["external_url"],
            }),
            is_active=True,
        )
        db.add(resource)
        logger.info(f"+ Form: {form['name']}")


if __name__ == "__main__":
    seed_cms_content()
