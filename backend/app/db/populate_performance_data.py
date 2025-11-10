"""
Populate sample performance management data for the HR Dashboard

This script creates:
- Review cycles (annual, quarterly, semi-annual)
- Performance reviews for employees
- Goals and OKRs
- 360-degree feedback
- Performance Improvement Plans (PIPs)

Run this script to populate your database with realistic test data.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.db.models import (
    Base, ReviewCycle, PerformanceReview, PerformanceGoal,
    ReviewFeedback, PerformanceImprovementPlan, ReviewTemplate,
    Employee
)
import random

def get_employees(db: Session):
    """Get all employees from the database"""
    return db.query(Employee).all()

def create_review_cycles(db: Session):
    """Create sample review cycles"""
    print("Creating review cycles...")

    cycles = [
        {
            "name": "2024 Annual Performance Review",
            "cycle_type": "Annual",
            "fiscal_year": 2024,
            "quarter": None,
            "start_date": datetime(2024, 1, 1),
            "end_date": datetime(2024, 12, 31),
            "review_window_start": datetime(2024, 12, 1),
            "review_window_end": datetime(2024, 12, 31),
            "status": "Active",
            "requires_self_review": True,
            "requires_manager_review": True,
            "requires_peer_review": True,
            "total_reviews_expected": 150,
            "total_reviews_completed": 87,
            "completion_percentage": 58.0,
        },
        {
            "name": "2024 Q3 Review",
            "cycle_type": "Quarterly",
            "fiscal_year": 2024,
            "quarter": 3,
            "start_date": datetime(2024, 7, 1),
            "end_date": datetime(2024, 9, 30),
            "review_window_start": datetime(2024, 9, 15),
            "review_window_end": datetime(2024, 10, 15),
            "status": "Closed",
            "requires_self_review": True,
            "requires_manager_review": True,
            "requires_peer_review": False,
            "total_reviews_expected": 150,
            "total_reviews_completed": 150,
            "completion_percentage": 100.0,
        },
        {
            "name": "2024 Mid-Year Review",
            "cycle_type": "Semi-Annual",
            "fiscal_year": 2024,
            "quarter": None,
            "start_date": datetime(2024, 1, 1),
            "end_date": datetime(2024, 6, 30),
            "review_window_start": datetime(2024, 6, 15),
            "review_window_end": datetime(2024, 7, 15),
            "status": "Closed",
            "requires_self_review": True,
            "requires_manager_review": True,
            "requires_peer_review": True,
            "total_reviews_expected": 150,
            "total_reviews_completed": 148,
            "completion_percentage": 98.7,
        },
        {
            "name": "2025 Q1 Review",
            "cycle_type": "Quarterly",
            "fiscal_year": 2025,
            "quarter": 1,
            "start_date": datetime(2025, 1, 1),
            "end_date": datetime(2025, 3, 31),
            "review_window_start": datetime(2025, 3, 15),
            "review_window_end": datetime(2025, 4, 15),
            "status": "Planned",
            "requires_self_review": True,
            "requires_manager_review": True,
            "requires_peer_review": True,
            "total_reviews_expected": 155,
            "total_reviews_completed": 0,
            "completion_percentage": 0.0,
        },
    ]

    created_cycles = []
    for cycle_data in cycles:
        cycle = ReviewCycle(**cycle_data)
        db.add(cycle)
        created_cycles.append(cycle)

    db.commit()
    print(f"✓ Created {len(created_cycles)} review cycles")
    return created_cycles

def create_performance_reviews(db: Session, cycles, employees):
    """Create sample performance reviews"""
    print("Creating performance reviews...")

    if len(employees) == 0:
        print("⚠ No employees found. Skipping performance review creation.")
        return []

    review_types = ["Annual", "Mid-Year", "Quarterly", "Probationary", "Project"]
    statuses = ["Draft", "Pending", "Submitted", "Completed", "Approved"]

    strengths_examples = [
        "Strong technical skills and problem-solving abilities",
        "Excellent communication and collaboration with team members",
        "Demonstrates leadership and mentors junior team members",
        "Consistently meets or exceeds performance expectations",
        "Shows initiative and takes ownership of projects",
        "Adaptable and handles change well",
        "Strong analytical and critical thinking skills",
    ]

    improvements_examples = [
        "Could improve time management for multiple projects",
        "Needs to work on delegation skills",
        "Could benefit from additional training in new technologies",
        "Should focus more on documentation",
        "Could improve public speaking and presentation skills",
        "Needs to be more proactive in seeking feedback",
    ]

    reviews = []

    # Create reviews for the active cycle (2024 Annual)
    active_cycle = [c for c in cycles if c.status == "Active"][0]

    for i, employee in enumerate(employees[:30]):  # Create reviews for first 30 employees
        # Determine status based on position (to show variety)
        if i < 15:
            status = "Completed"
        elif i < 25:
            status = "Submitted"
        else:
            status = "Pending"

        # Create manager review
        review_id = f"REV-2024-{str(i+1).zfill(4)}"
        manager_review = PerformanceReview(
            review_id=review_id,
            employee_id=employee.employee_id,
            cycle_id=active_cycle.id,
            reviewer_id=f"MGR-{random.randint(1000, 9999)}",
            review_type="Annual",
            review_period_start=datetime(2024, 1, 1),
            review_period_end=datetime(2024, 12, 31),
            status=status,
            submitted_date=datetime.now() - timedelta(days=random.randint(1, 30)) if status in ["Completed", "Submitted"] else None,
            overall_rating=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            quality_of_work=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            productivity=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            communication=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            teamwork=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            initiative=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            leadership=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            problem_solving=round(random.uniform(3.0, 5.0), 1) if status == "Completed" else None,
            strengths=random.choice(strengths_examples) if status == "Completed" else None,
            areas_for_improvement=random.choice(improvements_examples) if status == "Completed" else None,
            achievements="Met Q3 targets, launched new feature successfully" if status == "Completed" else None,
            development_plan="Focus on leadership skills, attend management training" if status == "Completed" else None,
        )
        db.add(manager_review)
        reviews.append(manager_review)

        # Create self review for some employees
        if i < 20:
            self_review_id = f"REV-2024-S{str(i+1).zfill(4)}"
            self_status = "Completed" if i < 15 else "Not Started"
            self_review = PerformanceReview(
                review_id=self_review_id,
                employee_id=employee.employee_id,
                cycle_id=active_cycle.id,
                reviewer_id=employee.employee_id,
                review_type="Annual",
                review_period_start=datetime(2024, 1, 1),
                review_period_end=datetime(2024, 12, 31),
                status=self_status,
                submitted_date=datetime.now() - timedelta(days=random.randint(1, 30)) if i < 15 else None,
                overall_rating=round(random.uniform(3.5, 5.0), 1) if i < 15 else None,
                quality_of_work=round(random.uniform(3.5, 5.0), 1) if i < 15 else None,
                productivity=round(random.uniform(3.5, 5.0), 1) if i < 15 else None,
                communication=round(random.uniform(3.5, 5.0), 1) if i < 15 else None,
                teamwork=round(random.uniform(3.5, 5.0), 1) if i < 15 else None,
                strengths="Strong problem solver, collaborative team player" if i < 15 else None,
                areas_for_improvement="Want to develop more leadership skills" if i < 15 else None,
                employee_comments="I'm proud of my contributions this year" if i < 15 else None,
            )
            db.add(self_review)
            reviews.append(self_review)

    db.commit()
    print(f"✓ Created {len(reviews)} performance reviews")
    return reviews

def create_goals(db: Session, cycles, employees):
    """Create sample goals and OKRs"""
    print("Creating goals and OKRs...")

    if len(employees) == 0:
        print("⚠ No employees found. Skipping goal creation.")
        return []

    goal_types = ["OKR", "SMART", "Personal Development", "Project", "Annual"]
    statuses = ["Not Started", "In Progress", "On Track", "At Risk", "Completed"]

    goal_templates = [
        {
            "title": "Increase team productivity by 20%",
            "description": "Implement new workflow automation tools and optimize current processes",
            "type": "OKR",
        },
        {
            "title": "Complete AWS certification",
            "description": "Study for and pass AWS Solutions Architect certification",
            "type": "Personal Development",
        },
        {
            "title": "Launch mobile app version",
            "description": "Design, develop, and launch mobile applications for iOS and Android",
            "type": "Project",
        },
        {
            "title": "Reduce bug backlog by 50%",
            "description": "Address technical debt and improve code quality",
            "type": "SMART",
        },
        {
            "title": "Mentor 2 junior developers",
            "description": "Provide regular guidance and support to junior team members",
            "type": "Personal Development",
        },
        {
            "title": "Improve customer satisfaction score",
            "description": "Increase CSAT from 4.2 to 4.5 through better service delivery",
            "type": "OKR",
        },
        {
            "title": "Implement CI/CD pipeline",
            "description": "Set up automated testing and deployment processes",
            "type": "Project",
        },
        {
            "title": "Complete leadership training program",
            "description": "Attend and complete all modules of the leadership development course",
            "type": "Personal Development",
        },
    ]

    goals = []
    active_cycle = [c for c in cycles if c.status == "Active"][0]

    goal_counter = 1
    for employee in employees[:40]:  # Create goals for first 40 employees
        # Each employee gets 2-4 goals
        num_goals = random.randint(2, 4)
        selected_goals = random.sample(goal_templates, num_goals)

        for goal_template in selected_goals:
            # Random status distribution
            status_weights = [5, 20, 45, 20, 10]  # Not Started, In Progress, On Track, At Risk, Completed
            status = random.choices(statuses, weights=status_weights)[0]

            # Progress based on status
            progress_map = {
                "Not Started": 0,
                "In Progress": random.randint(10, 40),
                "On Track": random.randint(40, 75),
                "At Risk": random.randint(20, 60),
                "Completed": 100,
            }

            start_date = datetime(2024, 1, 1)
            target_date_days = datetime.now() + timedelta(days=random.randint(30, 180))

            goal = PerformanceGoal(
                goal_id=f"GOAL-2024-{str(goal_counter).zfill(4)}",
                employee_id=employee.employee_id,
                cycle_id=active_cycle.id,
                goal_type=goal_template["type"],
                goal_title=goal_template["title"],
                goal_description=goal_template["description"],
                start_date=start_date,
                target_date=target_date_days,
                status=status,
                progress_percentage=progress_map[status],
                weight=random.choice([0.1, 0.15, 0.2, 0.25, 0.3]),
                priority=random.choice(["Low", "Medium", "High"]),
            )
            db.add(goal)
            goals.append(goal)
            goal_counter += 1

    db.commit()
    print(f"✓ Created {len(goals)} goals and OKRs")
    return goals

def create_feedback(db: Session, employees):
    """Create sample 360-degree feedback"""
    print("Creating 360-degree feedback...")

    if len(employees) == 0:
        print("⚠ No employees found. Skipping feedback creation.")
        return []

    feedback_types = ["360 Review", "Upward Feedback", "Peer Feedback", "Direct Report Feedback"]
    relationships = ["Manager", "Peer", "Direct Report", "Skip Level", "Cross-functional"]
    statuses = ["Requested", "Pending", "Submitted", "Reviewed"]

    feedback_comments = [
        "Great team player, always willing to help others",
        "Excellent technical skills and attention to detail",
        "Could improve communication in meetings",
        "Very reliable and consistently delivers quality work",
        "Shows strong leadership potential",
        "Needs to be more proactive in asking questions",
        "Outstanding problem-solving abilities",
        "Would benefit from better time management",
    ]

    feedback_list = []

    for employee in employees[:30]:  # Create feedback for first 30 employees
        # Each employee receives 2-5 feedback entries
        num_feedback = random.randint(2, 5)

        for _ in range(num_feedback):
            # Select random reviewer
            reviewer = random.choice([e for e in employees if e.employee_id != employee.employee_id])

            status = random.choice(statuses)

            feedback = ReviewFeedback(
                review_id=None,  # Not tied to a specific review
                employee_id=employee.employee_id,
                reviewer_id=reviewer.employee_id,
                feedback_type=random.choice(feedback_types),
                relationship_to_employee=random.choice(relationships),
                requested_date=datetime.now() - timedelta(days=random.randint(30, 90)),
                submitted_date=datetime.now() - timedelta(days=random.randint(1, 60)) if status in ["Submitted", "Reviewed"] else None,
                status=status,
                overall_rating=round(random.uniform(3.0, 5.0), 1) if status in ["Submitted", "Reviewed"] else None,
                quality_of_work=round(random.uniform(3.0, 5.0), 1) if status in ["Submitted", "Reviewed"] else None,
                collaboration=round(random.uniform(3.0, 5.0), 1) if status in ["Submitted", "Reviewed"] else None,
                communication=round(random.uniform(3.0, 5.0), 1) if status in ["Submitted", "Reviewed"] else None,
                strengths=random.choice(feedback_comments) if status in ["Submitted", "Reviewed"] else None,
                additional_comments=random.choice(feedback_comments) if status in ["Submitted", "Reviewed"] else None,
                is_anonymous=random.choice([True, False]),
            )
            db.add(feedback)
            feedback_list.append(feedback)

    db.commit()
    print(f"✓ Created {len(feedback_list)} 360-degree feedback entries")
    return feedback_list

def create_pips(db: Session, employees):
    """Create sample Performance Improvement Plans"""
    print("Creating Performance Improvement Plans...")

    if len(employees) == 0:
        print("⚠ No employees found. Skipping PIP creation.")
        return []

    statuses = ["Active", "In Progress", "Successful", "Extended", "Terminated"]

    pip_templates = [
        {
            "reason": "Consistent failure to meet project deadlines and deliverables",
            "areas": "Time management, prioritization, communication",
            "success": "Complete all assigned tasks on time for 90 consecutive days, improve sprint completion rate to 90%+",
        },
        {
            "reason": "Poor team collaboration and communication issues",
            "areas": "Interpersonal skills, teamwork, conflict resolution",
            "success": "Receive positive feedback from 3+ team members, no escalated conflicts for 60 days",
        },
        {
            "reason": "Technical skill gaps affecting project quality",
            "areas": "Technical proficiency, code quality, best practices",
            "success": "Complete required training courses, pass code review standards for 30 consecutive days",
        },
    ]

    pips = []

    # Create PIPs for 3-5 employees (realistic number)
    for employee in employees[:5]:
        template = random.choice(pip_templates)
        status = random.choice(statuses)

        # Active PIPs are typically 30-90 days
        start_date = datetime.now() - timedelta(days=random.randint(10, 60))
        end_date = start_date + timedelta(days=random.choice([30, 60, 90]))

        pip = PerformanceImprovementPlan(
            pip_id=f"PIP-2024-{str(len(pips)+1).zfill(3)}",
            employee_id=employee.employee_id,
            manager_id=f"MGR-{random.randint(1000, 9999)}",
            title=f"Performance Improvement Plan - {employee.first_name} {employee.last_name}",
            reason=template["reason"],
            performance_issues=template["areas"],
            start_date=start_date,
            end_date=end_date,
            status=status,
            expectations="Meet all project deadlines, improve communication, complete required training",
            success_criteria=template["success"],
            support_provided="Manager coaching, training budget, flexible schedule for learning",
            progress_notes="Week 1: Initial meeting completed. Week 2: Training started." if status != "Active" else None,
            review_frequency="Weekly",
        )
        db.add(pip)
        pips.append(pip)

    db.commit()
    print(f"✓ Created {len(pips)} Performance Improvement Plans")
    return pips

def create_review_templates(db: Session):
    """Create sample review templates"""
    print("Creating review templates...")

    templates = [
        {
            "name": "Standard Annual Review",
            "template_type": "Annual",
            "description": "Comprehensive annual performance review template",
            "is_active": True,
            "rating_scale": '{"min": 1, "max": 5, "labels": {"1": "Needs Improvement", "2": "Below Expectations", "3": "Meets Expectations", "4": "Exceeds Expectations", "5": "Outstanding"}}',
        },
        {
            "name": "Quarterly Check-in",
            "template_type": "Quarterly",
            "description": "Quick quarterly progress review",
            "is_active": True,
            "rating_scale": '{"min": 1, "max": 5}',
        },
        {
            "name": "Probationary Review",
            "template_type": "Probationary",
            "description": "New hire probationary period evaluation",
            "is_active": True,
            "rating_scale": '{"min": 1, "max": 3, "labels": {"1": "Not Meeting", "2": "Meeting", "3": "Exceeding"}}',
        },
    ]

    created_templates = []
    for template_data in templates:
        template = ReviewTemplate(**template_data)
        db.add(template)
        created_templates.append(template)

    db.commit()
    print(f"✓ Created {len(created_templates)} review templates")
    return created_templates

def main():
    """Main function to populate all performance data"""
    print("\n" + "="*60)
    print("Performance Management Data Population Script")
    print("="*60 + "\n")

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create database session
    db = SessionLocal()

    try:
        # Get existing employees
        employees = get_employees(db)
        print(f"Found {len(employees)} employees in database\n")

        if len(employees) == 0:
            print("⚠ WARNING: No employees found in database!")
            print("Please run the employee data population script first.\n")
            return

        # Create all sample data
        cycles = create_review_cycles(db)
        reviews = create_performance_reviews(db, cycles, employees)
        goals = create_goals(db, cycles, employees)
        feedback = create_feedback(db, employees)
        pips = create_pips(db, employees)
        templates = create_review_templates(db)

        print("\n" + "="*60)
        print("✓ Performance data population completed successfully!")
        print("="*60)
        print(f"\nSummary:")
        print(f"  • Review Cycles: {len(cycles)}")
        print(f"  • Performance Reviews: {len(reviews)}")
        print(f"  • Goals/OKRs: {len(goals)}")
        print(f"  • 360° Feedback: {len(feedback)}")
        print(f"  • PIPs: {len(pips)}")
        print(f"  • Review Templates: {len(templates)}")
        print(f"\nYou can now access the Performance page in the HR Dashboard!")
        print(f"Navigate to: http://localhost:5175/performance\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
