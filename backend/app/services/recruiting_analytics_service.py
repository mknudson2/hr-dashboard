"""
Recruiting Analytics Service

Provides aggregate analytics for the recruiting pipeline:
overview stats, pipeline funnel, source effectiveness,
time-to-fill metrics, and EEO applicant flow reporting.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger(__name__)


class RecruitingAnalyticsService:
    """Service for recruiting analytics and EEO reporting."""

    def get_overview_stats(self, db: Session) -> dict:
        """Get high-level recruiting dashboard stats."""
        open_reqs = db.query(func.count(models.JobRequisition.id)).filter(
            models.JobRequisition.status.in_(["Open", "Approved"])
        ).scalar() or 0

        active_postings = db.query(func.count(models.JobPosting.id)).filter(
            models.JobPosting.status == "Published"
        ).scalar() or 0

        active_applications = db.query(func.count(models.Application.id)).filter(
            models.Application.status.in_(["New", "Screening", "Interview", "Offer"])
        ).scalar() or 0

        new_this_week = db.query(func.count(models.Application.id)).filter(
            models.Application.created_at >= datetime.utcnow() - timedelta(days=7),
        ).scalar() or 0

        offers_pending = db.query(func.count(models.OfferLetter.id)).filter(
            models.OfferLetter.status == "Sent"
        ).scalar() or 0

        hires_this_month = db.query(func.count(models.HireConversion.id)).filter(
            models.HireConversion.status == "Completed",
            models.HireConversion.completed_at >= datetime.utcnow().replace(day=1),
        ).scalar() or 0

        total_applicants = db.query(func.count(models.Applicant.id)).scalar() or 0

        return {
            "open_requisitions": open_reqs,
            "active_postings": active_postings,
            "active_applications": active_applications,
            "new_applications_this_week": new_this_week,
            "offers_pending_response": offers_pending,
            "hires_this_month": hires_this_month,
            "total_applicants": total_applicants,
        }

    def get_pipeline_funnel(self, db: Session, requisition_id: Optional[int] = None) -> dict:
        """Get pipeline funnel conversion rates."""
        query = db.query(models.Application)
        if requisition_id:
            query = query.filter(models.Application.requisition_id == requisition_id)

        total = query.count()
        if total == 0:
            return {"total": 0, "stages": []}

        statuses = ["New", "Screening", "Interview", "Offer", "Hired", "Rejected", "Withdrawn"]
        counts = {}
        for s in statuses:
            counts[s] = query.filter(models.Application.status == s).count()

        stages = []
        for s in statuses:
            stages.append({
                "status": s,
                "count": counts[s],
                "percentage": round((counts[s] / total) * 100, 1) if total > 0 else 0,
            })

        # Conversion rates
        screening_rate = round((counts.get("Screening", 0) + counts.get("Interview", 0) + counts.get("Offer", 0) + counts.get("Hired", 0)) / total * 100, 1) if total > 0 else 0
        interview_rate = round((counts.get("Interview", 0) + counts.get("Offer", 0) + counts.get("Hired", 0)) / total * 100, 1) if total > 0 else 0
        offer_rate = round((counts.get("Offer", 0) + counts.get("Hired", 0)) / total * 100, 1) if total > 0 else 0
        hire_rate = round(counts.get("Hired", 0) / total * 100, 1) if total > 0 else 0

        return {
            "total": total,
            "stages": stages,
            "conversion_rates": {
                "applied_to_screening": screening_rate,
                "applied_to_interview": interview_rate,
                "applied_to_offer": offer_rate,
                "applied_to_hire": hire_rate,
            },
        }

    def get_source_effectiveness(self, db: Session) -> list:
        """Get application and hire counts by source."""
        source_stats = db.query(
            models.Application.source,
            func.count(models.Application.id).label("applications"),
            func.sum(case((models.Application.status == "Hired", 1), else_=0)).label("hires"),
        ).group_by(models.Application.source).all()

        results = []
        for source, apps, hires in source_stats:
            hire_rate = round((hires or 0) / apps * 100, 1) if apps > 0 else 0
            results.append({
                "source": source or "Unknown",
                "applications": apps,
                "hires": hires or 0,
                "hire_rate": hire_rate,
            })

        results.sort(key=lambda x: x["applications"], reverse=True)
        return results

    def get_time_to_fill(self, db: Session) -> dict:
        """Get average time-to-fill metrics by department."""
        # Overall average
        filled_reqs = db.query(models.JobRequisition).filter(
            models.JobRequisition.status == "Filled",
        ).all()

        dept_times: dict[str, list] = {}
        all_times: list[int] = []

        for req in filled_reqs:
            if not req.created_at:
                continue
            # Find the latest hire for this req
            hire = db.query(models.HireConversion).join(
                models.Application,
                models.HireConversion.application_id == models.Application.id,
            ).filter(
                models.Application.requisition_id == req.id,
                models.HireConversion.status == "Completed",
            ).order_by(models.HireConversion.completed_at.desc()).first()

            if hire and hire.completed_at:
                days = (hire.completed_at - req.created_at).days
                all_times.append(days)
                dept = req.department or "Unknown"
                dept_times.setdefault(dept, []).append(days)

        overall_avg = round(sum(all_times) / len(all_times), 1) if all_times else 0

        by_department = []
        for dept, times in sorted(dept_times.items()):
            by_department.append({
                "department": dept,
                "avg_days": round(sum(times) / len(times), 1),
                "min_days": min(times),
                "max_days": max(times),
                "count": len(times),
            })

        return {
            "overall_avg_days": overall_avg,
            "total_filled": len(all_times),
            "by_department": by_department,
        }

    def get_interviewer_stats(self, db: Session) -> list:
        """Get interview activity stats per interviewer."""
        scorecards = db.query(
            models.InterviewScorecard.interviewer_id,
            func.count(models.InterviewScorecard.id).label("total"),
            func.sum(case((models.InterviewScorecard.status == "Submitted", 1), else_=0)).label("submitted"),
            func.sum(case((models.InterviewScorecard.status == "Pending", 1), else_=0)).label("pending"),
            func.avg(models.InterviewScorecard.overall_rating).label("avg_rating"),
        ).group_by(models.InterviewScorecard.interviewer_id).all()

        results = []
        for row in scorecards:
            user = db.query(models.User).get(row.interviewer_id)
            results.append({
                "interviewer_id": row.interviewer_id,
                "interviewer_name": user.username if user else "Unknown",
                "total_scorecards": row.total,
                "submitted": row.submitted or 0,
                "pending": row.pending or 0,
                "avg_rating": round(float(row.avg_rating), 2) if row.avg_rating else None,
            })

        results.sort(key=lambda x: x["total_scorecards"], reverse=True)
        return results

    def get_eeo_applicant_flow(self, db: Session) -> dict:
        """
        Get aggregate EEO applicant flow data.
        Returns ONLY aggregate counts — never individual data.
        Used for EEO-1 Component 2 / OFCCP compliance reporting.
        """
        # Total applicants with EEO data
        total_with_eeo = db.query(func.count(models.ApplicantEEO.id)).filter(
            models.ApplicantEEO.declined_to_identify == False,
        ).scalar() or 0

        total_declined = db.query(func.count(models.ApplicantEEO.id)).filter(
            models.ApplicantEEO.declined_to_identify == True,
        ).scalar() or 0

        # By race/ethnicity
        race_counts = db.query(
            models.ApplicantEEO.race_ethnicity,
            func.count(models.ApplicantEEO.id),
        ).filter(
            models.ApplicantEEO.declined_to_identify == False,
            models.ApplicantEEO.race_ethnicity.isnot(None),
        ).group_by(models.ApplicantEEO.race_ethnicity).all()

        # By gender
        gender_counts = db.query(
            models.ApplicantEEO.gender,
            func.count(models.ApplicantEEO.id),
        ).filter(
            models.ApplicantEEO.declined_to_identify == False,
            models.ApplicantEEO.gender.isnot(None),
        ).group_by(models.ApplicantEEO.gender).all()

        # By veteran status
        veteran_counts = db.query(
            models.ApplicantEEO.veteran_status,
            func.count(models.ApplicantEEO.id),
        ).filter(
            models.ApplicantEEO.declined_to_identify == False,
            models.ApplicantEEO.veteran_status.isnot(None),
        ).group_by(models.ApplicantEEO.veteran_status).all()

        # By disability status
        disability_counts = db.query(
            models.ApplicantEEO.disability_status,
            func.count(models.ApplicantEEO.id),
        ).filter(
            models.ApplicantEEO.declined_to_identify == False,
            models.ApplicantEEO.disability_status.isnot(None),
        ).group_by(models.ApplicantEEO.disability_status).all()

        # Adverse impact: four-fifths rule by race
        # Compare hire rates across groups
        adverse_impact = self._calculate_adverse_impact(db)

        return {
            "total_with_eeo_data": total_with_eeo,
            "total_declined": total_declined,
            "by_race_ethnicity": [
                {"category": cat, "count": count} for cat, count in race_counts
            ],
            "by_gender": [
                {"category": cat, "count": count} for cat, count in gender_counts
            ],
            "by_veteran_status": [
                {"category": cat, "count": count} for cat, count in veteran_counts
            ],
            "by_disability_status": [
                {"category": cat, "count": count} for cat, count in disability_counts
            ],
            "adverse_impact_analysis": adverse_impact,
        }

    def _calculate_adverse_impact(self, db: Session) -> list:
        """
        Calculate four-fifths rule adverse impact analysis.
        Compares hire rates across racial/ethnic groups.
        """
        # Get hire rate by race/ethnicity
        race_stats = db.query(
            models.ApplicantEEO.race_ethnicity,
            func.count(models.ApplicantEEO.id).label("applicants"),
        ).filter(
            models.ApplicantEEO.declined_to_identify == False,
            models.ApplicantEEO.race_ethnicity.isnot(None),
        ).group_by(models.ApplicantEEO.race_ethnicity).all()

        if not race_stats:
            return []

        # For each group, count hires
        groups = []
        for race, applicant_count in race_stats:
            hired = db.query(func.count(models.Application.id)).join(
                models.Applicant,
                models.Application.applicant_id == models.Applicant.id,
            ).join(
                models.ApplicantEEO,
                models.ApplicantEEO.applicant_id == models.Applicant.id,
            ).filter(
                models.Application.status == "Hired",
                models.ApplicantEEO.race_ethnicity == race,
            ).scalar() or 0

            hire_rate = round(hired / applicant_count * 100, 1) if applicant_count > 0 else 0
            groups.append({
                "group": race,
                "applicants": applicant_count,
                "hired": hired,
                "hire_rate": hire_rate,
            })

        # Find highest hire rate
        max_rate = max(g["hire_rate"] for g in groups) if groups else 0

        # Apply four-fifths rule
        for g in groups:
            if max_rate > 0:
                g["impact_ratio"] = round(g["hire_rate"] / max_rate, 3)
                g["potential_adverse_impact"] = g["impact_ratio"] < 0.8
            else:
                g["impact_ratio"] = None
                g["potential_adverse_impact"] = False

        return groups


# Singleton instance
recruiting_analytics_service = RecruitingAnalyticsService()
