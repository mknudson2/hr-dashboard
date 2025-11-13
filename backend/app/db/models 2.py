from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


# app/db/models.py
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    status = Column(String)
    type = Column(String)
    location = Column(String)
    department = Column(String)
    cost_center = Column(String)
    team = Column(String)
    hire_date = Column(Date)
    termination_date = Column(Date, nullable=True)
    termination_type = Column(String, nullable=True)

    # Position information
    position = Column(String, nullable=True)
    supervisor = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # "Full Time", "Part Time", "Contract", "Intern"

    # Compensation information
    wage = Column(Float, nullable=True)
    wage_type = Column(String, nullable=True)  # "Hourly" or "Salary"
    annual_wage = Column(Float, nullable=True)  # Annual equivalent
    hourly_wage = Column(Float, nullable=True)  # Hourly rate
    benefits_cost = Column(Float, nullable=True)  # Annual benefits cost
    benefits_cost_annual = Column(Float, nullable=True)  # Alias for clarity
    employer_taxes_annual = Column(Float, nullable=True)  # FICA, Medicare, unemployment, etc.
    total_compensation = Column(Float, nullable=True)  # Total employer cost (wage + benefits + taxes)

    # Time tracking
    tenure_years = Column(Float, nullable=True)
    pto_allotted = Column(Float, nullable=True)
    pto_used = Column(Float, nullable=True)
    attendance_days = Column(Float, nullable=True)
    expected_days = Column(Float, nullable=True)

    # Personal information
    birth_date = Column(Date, nullable=True)

    # Privacy settings
    show_birthday = Column(Boolean, default=True)  # Show birthday on dashboard/exports
    show_tenure = Column(Boolean, default=True)  # Show tenure on dashboard/exports
    show_exact_dates = Column(Boolean, default=True)  # Show exact dates or just month

    # Benefits - Health Insurance
    medical_plan = Column(String, nullable=True)  # Plan name (e.g., "PPO Gold", "HMO Silver")
    medical_tier = Column(String, nullable=True)  # "Employee Only", "Employee + Spouse", "Employee + Children", "Family"
    medical_ee_cost = Column(Float, nullable=True)  # Employee monthly cost
    medical_er_cost = Column(Float, nullable=True)  # Employer monthly cost

    dental_plan = Column(String, nullable=True)
    dental_tier = Column(String, nullable=True)
    dental_ee_cost = Column(Float, nullable=True)
    dental_er_cost = Column(Float, nullable=True)

    vision_plan = Column(String, nullable=True)
    vision_tier = Column(String, nullable=True)
    vision_ee_cost = Column(Float, nullable=True)
    vision_er_cost = Column(Float, nullable=True)

    # Benefits - Retirement
    retirement_plan_type = Column(String, nullable=True)  # "401k", "401k Roth", "Both"
    retirement_ee_contribution_pct = Column(Float, nullable=True)  # Employee contribution %
    retirement_ee_contribution_amount = Column(Float, nullable=True)  # Monthly dollar amount
    retirement_er_match_pct = Column(Float, nullable=True)  # Employer match %
    retirement_er_match_amount = Column(Float, nullable=True)  # Monthly dollar amount
    retirement_vesting_schedule = Column(String, nullable=True)  # "Immediate", "3 Year Cliff", "5 Year Graded"
    retirement_vested_pct = Column(Float, nullable=True)  # Current vested percentage

    # Benefits - Flexible Spending & Health Savings
    hsa_ee_contribution = Column(Float, nullable=True)  # Monthly employee HSA contribution
    hsa_er_contribution = Column(Float, nullable=True)  # Monthly employer HSA contribution
    hra_er_contribution = Column(Float, nullable=True)  # Monthly employer HRA contribution (employer-only)
    fsa_contribution = Column(Float, nullable=True)  # Monthly FSA contribution
    lfsa_contribution = Column(Float, nullable=True)  # Monthly Limited FSA contribution (dental/vision only)
    dependent_care_fsa = Column(Float, nullable=True)  # Monthly dependent care FSA

    # Benefits - Insurance
    life_insurance_coverage = Column(Float, nullable=True)  # Coverage amount
    life_insurance_ee_cost = Column(Float, nullable=True)  # Employee monthly cost
    life_insurance_er_cost = Column(Float, nullable=True)  # Employer monthly cost

    disability_std = Column(Boolean, default=False)  # Short-term disability enrolled
    disability_std_cost = Column(Float, nullable=True)  # Monthly cost (usually ER paid)
    disability_ltd = Column(Boolean, default=False)  # Long-term disability enrolled
    disability_ltd_cost = Column(Float, nullable=True)  # Monthly cost

    # Benefits - Other
    other_benefits = Column(String, nullable=True)  # JSON string or comma-separated list
    commuter_benefits = Column(Float, nullable=True)  # Monthly commuter benefit
    wellness_stipend = Column(Float, nullable=True)  # Monthly wellness stipend

    # EEO (Equal Employment Opportunity) Classification
    eeo_job_category = Column(String, nullable=True)  # EEO-1 Job Category
    # Categories: "Executive/Senior Officials and Managers", "First/Mid Officials and Managers",
    # "Professionals", "Technicians", "Sales Workers", "Administrative Support",
    # "Craft Workers", "Operatives", "Laborers and Helpers", "Service Workers"

    eeo_race_ethnicity = Column(String, nullable=True)  # Self-identified race/ethnicity
    # Categories: "Hispanic or Latino", "White (Not Hispanic or Latino)",
    # "Black or African American (Not Hispanic or Latino)",
    # "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
    # "Asian (Not Hispanic or Latino)",
    # "American Indian or Alaska Native (Not Hispanic or Latino)",
    # "Two or More Races (Not Hispanic or Latino)"

    eeo_gender = Column(String, nullable=True)  # Self-identified gender
    # Categories: "Male", "Female"

    eeo_veteran_status = Column(String, nullable=True)  # Veteran status
    # Categories: "Protected Veteran", "Not a Protected Veteran", "I don't wish to answer"

    eeo_disability_status = Column(String, nullable=True)  # Disability status
    # Categories: "Yes, I Have A Disability", "No, I Don't Have A Disability", "I Don't Wish To Answer"


class WageHistory(Base):
    __tablename__ = "wage_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    effective_date = Column(Date)
    wage = Column(Float)
    change_reason = Column(String, nullable=True)  # e.g., "Merit Increase", "Promotion", "Annual Review"
    change_amount = Column(Float, nullable=True)
    change_percentage = Column(Float, nullable=True)


class Bonus(Base):
    __tablename__ = "bonuses"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    bonus_type = Column(String)  # "Annual", "Performance", "Signing", "Retention", "Commission", "Spot"
    amount = Column(Float)
    target_amount = Column(Float, nullable=True)  # For performance bonuses
    payment_date = Column(Date)
    fiscal_year = Column(Integer, nullable=True)
    quarter = Column(Integer, nullable=True)  # 1-4 for quarterly bonuses
    status = Column(String, default="Pending")  # "Pending", "Approved", "Paid", "Cancelled"
    notes = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    approved_date = Column(Date, nullable=True)
    is_conditional = Column(Boolean, default=False)  # Whether bonus has conditions to meet
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class BonusCondition(Base):
    """Checklist item/condition for conditional bonuses"""
    __tablename__ = "bonus_conditions"

    id = Column(Integer, primary_key=True, index=True)
    bonus_id = Column(Integer, ForeignKey("bonuses.id"), index=True)
    condition_text = Column(String, nullable=False)  # Description of the condition
    is_completed = Column(Boolean, default=False)  # Whether condition is met
    completion_date = Column(Date, nullable=True)  # When condition was completed
    completed_by = Column(String, nullable=True)  # Who verified completion
    target_value = Column(String, nullable=True)  # Target value/metric (e.g., "100 sales", "$50,000 revenue")
    actual_value = Column(String, nullable=True)  # Actual achieved value
    due_date = Column(Date, nullable=True)  # Deadline for this condition
    weight = Column(Float, nullable=True)  # Weight/percentage of total bonus (0-100)
    notes = Column(String, nullable=True)
    display_order = Column(Integer, default=0)  # Order to display conditions
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class EquityGrant(Base):
    __tablename__ = "equity_grants"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    grant_type = Column(String)  # "Stock Options", "RSU", "ISO", "NSO", "Phantom Stock"
    grant_date = Column(Date)
    shares_granted = Column(Integer)
    strike_price = Column(Float, nullable=True)  # For options
    vesting_start_date = Column(Date)
    vesting_duration_months = Column(Integer)  # Total vesting period
    cliff_months = Column(Integer, default=12)  # Cliff period before any vesting
    vesting_schedule = Column(String, nullable=True)  # "4-year with 1-year cliff", "Monthly", "Quarterly"
    shares_vested = Column(Integer, default=0)
    shares_exercised = Column(Integer, default=0)
    expiration_date = Column(Date, nullable=True)  # For options
    status = Column(String, default="Active")  # "Active", "Fully Vested", "Expired", "Cancelled", "Exercised"
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class WageIncreaseCycle(Base):
    __tablename__ = "wage_increase_cycles"

    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(String, unique=True, index=True)  # "WIC-2025-001"

    # Cycle details
    name = Column(String, nullable=False)  # "2025 Annual Merit Increases"
    fiscal_year = Column(Integer, nullable=False)
    cycle_type = Column(String, default="Annual")  # "Annual", "Mid-Year", "Promotion", "Market Adjustment"

    # Dates
    planning_start_date = Column(Date, nullable=True)
    planning_end_date = Column(Date, nullable=True)
    effective_date = Column(Date, nullable=False)  # When increases go into effect

    # Budget
    total_budget = Column(Float, default=0.0)  # Total budget for this cycle
    budget_used = Column(Float, default=0.0)  # Amount allocated/spent
    budget_remaining = Column(Float, default=0.0)  # Remaining budget
    budget_percentage = Column(Float, nullable=True)  # % of total payroll

    # Status
    status = Column(String, default="Planning")  # "Planning", "Review", "Approved", "Implemented", "Closed"

    # Completion tracking
    total_employees_eligible = Column(Integer, default=0)
    total_employees_reviewed = Column(Integer, default=0)
    total_employees_approved = Column(Integer, default=0)

    # Guidelines
    min_increase_percentage = Column(Float, nullable=True)  # e.g., 0.0
    max_increase_percentage = Column(Float, nullable=True)  # e.g., 10.0
    target_increase_percentage = Column(Float, nullable=True)  # e.g., 3.5

    # Notes
    notes = Column(String, nullable=True)
    guidelines = Column(String, nullable=True)  # Guidelines for managers

    # Approval tracking
    approved_by = Column(String, nullable=True)
    approved_date = Column(Date, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class CompensationReview(Base):
    __tablename__ = "compensation_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    cycle_id = Column(Integer, ForeignKey("wage_increase_cycles.id"), nullable=True, index=True)

    review_date = Column(Date)
    review_type = Column(String)  # "Annual", "Promotion", "Merit", "Market Adjustment", "Cost of Living"
    current_salary = Column(Float)
    proposed_salary = Column(Float, nullable=True)
    salary_increase = Column(Float, nullable=True)
    increase_percentage = Column(Float, nullable=True)
    effective_date = Column(Date, nullable=True)
    status = Column(String, default="Pending")  # "Pending", "Approved", "Rejected", "Implemented"
    performance_rating = Column(String, nullable=True)  # "Exceeds", "Meets", "Below", etc.
    market_position = Column(String, nullable=True)  # "Below Market", "At Market", "Above Market"
    reviewer_name = Column(String, nullable=True)
    reviewer_title = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    justification = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    approved_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class MarketBenchmark(Base):
    __tablename__ = "market_benchmarks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Job identification
    job_title = Column(String, nullable=False, index=True)
    job_family = Column(String, nullable=True)  # e.g., "Engineering", "Sales", "Finance"
    job_level = Column(String, nullable=True)  # e.g., "Entry", "Mid", "Senior", "Lead", "Manager"

    # Geographic data
    location = Column(String, nullable=True, index=True)  # City, State, or "Remote"
    metro_area = Column(String, nullable=True)
    region = Column(String, nullable=True)  # e.g., "Northeast", "West Coast"

    # Salary benchmarks (all annual figures)
    percentile_10 = Column(Float, nullable=True)
    percentile_25 = Column(Float, nullable=True)
    percentile_50 = Column(Float, nullable=True)  # Median
    percentile_75 = Column(Float, nullable=True)
    percentile_90 = Column(Float, nullable=True)

    average_base_salary = Column(Float, nullable=True)
    average_total_comp = Column(Float, nullable=True)  # Including bonuses, equity

    # Data source and freshness
    data_source = Column(String, nullable=True)  # e.g., "BLS", "Payscale", "Internal Survey"
    survey_year = Column(Integer, nullable=True)
    survey_sample_size = Column(Integer, nullable=True)

    # Additional context
    years_experience_min = Column(Integer, nullable=True)
    years_experience_max = Column(Integer, nullable=True)
    education_level = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)  # e.g., "Small", "Medium", "Large"

    notes = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# ============================================================================
# PERFORMANCE MANAGEMENT MODELS
# ============================================================================

class ReviewCycle(Base):
    __tablename__ = "review_cycles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Cycle information
    name = Column(String, nullable=False)  # "2024 Annual Review", "Q1 2024"
    cycle_type = Column(String, nullable=False)  # "Annual", "Semi-Annual", "Quarterly", "Probationary"
    fiscal_year = Column(Integer, nullable=False)
    quarter = Column(Integer, nullable=True)  # 1, 2, 3, 4 for quarterly

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    review_window_start = Column(Date, nullable=False)  # When reviews can be submitted
    review_window_end = Column(Date, nullable=False)

    # Status
    status = Column(String, default="Planned")  # "Planned", "Active", "In Progress", "Completed", "Closed"

    # Settings
    requires_self_review = Column(Boolean, default=True)
    requires_manager_review = Column(Boolean, default=True)
    requires_peer_review = Column(Boolean, default=False)
    min_peer_reviewers = Column(Integer, default=0)
    max_peer_reviewers = Column(Integer, default=5)

    # Completion tracking
    total_reviews_expected = Column(Integer, default=0)
    total_reviews_completed = Column(Integer, default=0)
    completion_percentage = Column(Float, default=0.0)

    notes = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    review_id = Column(String, unique=True, index=True)  # "REV-2024-001"

    # Employee and cycle
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    cycle_id = Column(Integer, ForeignKey("review_cycles.id"), nullable=True)

    # Review details
    review_type = Column(String, nullable=False)  # "Annual", "Probationary", "Promotion", "Ad-hoc"
    review_period_start = Column(Date, nullable=False)
    review_period_end = Column(Date, nullable=False)

    # Reviewer information
    reviewer_id = Column(String, nullable=True)  # Manager/reviewer employee ID
    reviewer_name = Column(String, nullable=True)
    reviewer_title = Column(String, nullable=True)

    # Status and workflow
    status = Column(String, default="Not Started")  # "Not Started", "Self-Review Complete", "Manager Review In Progress", "Completed", "Acknowledged"
    submitted_date = Column(Date, nullable=True)
    acknowledged_date = Column(Date, nullable=True)

    # Ratings (1-5 scale)
    overall_rating = Column(Float, nullable=True)
    quality_of_work = Column(Float, nullable=True)
    productivity = Column(Float, nullable=True)
    communication = Column(Float, nullable=True)
    teamwork = Column(Float, nullable=True)
    initiative = Column(Float, nullable=True)
    leadership = Column(Float, nullable=True)
    problem_solving = Column(Float, nullable=True)
    attendance_punctuality = Column(Float, nullable=True)

    # Comments
    strengths = Column(String, nullable=True)
    areas_for_improvement = Column(String, nullable=True)
    achievements = Column(String, nullable=True)
    manager_comments = Column(String, nullable=True)
    employee_comments = Column(String, nullable=True)

    # Development and goals
    development_plan = Column(String, nullable=True)
    next_steps = Column(String, nullable=True)
    goals_for_next_period = Column(String, nullable=True)

    # Recommendations
    salary_recommendation = Column(String, nullable=True)  # "Increase", "No Change", "Decrease"
    salary_increase_percentage = Column(Float, nullable=True)
    promotion_recommended = Column(Boolean, default=False)
    promotion_details = Column(String, nullable=True)

    # Follow-up
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date, nullable=True)
    follow_up_notes = Column(String, nullable=True)

    # Signatures/acknowledgment
    manager_signature = Column(String, nullable=True)
    employee_signature = Column(String, nullable=True)
    hr_signature = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="performance_reviews")


class PerformanceGoal(Base):
    __tablename__ = "performance_goals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    goal_id = Column(String, unique=True, index=True)  # "GOAL-2024-001"

    # Employee and review
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    review_id = Column(Integer, ForeignKey("performance_reviews.id"), nullable=True)
    cycle_id = Column(Integer, ForeignKey("review_cycles.id"), nullable=True)

    # Goal details
    goal_title = Column(String, nullable=False)
    goal_description = Column(String, nullable=True)
    goal_type = Column(String, nullable=False)  # "Objective", "Key Result", "SMART Goal", "Development Goal", "Project"
    category = Column(String, nullable=True)  # "Individual", "Team", "Department", "Company"

    # OKR structure
    parent_goal_id = Column(Integer, ForeignKey("performance_goals.id"), nullable=True)  # For Key Results
    is_objective = Column(Boolean, default=False)
    is_key_result = Column(Boolean, default=False)

    # Metrics and measurement
    measurement_criteria = Column(String, nullable=True)
    target_value = Column(String, nullable=True)
    current_value = Column(String, nullable=True)
    unit_of_measure = Column(String, nullable=True)

    # Dates
    start_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    completed_date = Column(Date, nullable=True)

    # Status and progress
    status = Column(String, default="Not Started")  # "Not Started", "On Track", "At Risk", "Behind", "Completed", "Cancelled"
    progress_percentage = Column(Float, default=0.0)
    priority = Column(String, default="Medium")  # "Low", "Medium", "High", "Critical"

    # Weight and scoring
    weight = Column(Float, default=1.0)  # Relative importance (0-1)
    score = Column(Float, nullable=True)  # Achievement score (0-100)

    # Comments and updates
    notes = Column(String, nullable=True)
    last_update_notes = Column(String, nullable=True)
    last_updated_by = Column(String, nullable=True)

    # Alignment
    aligned_to_company_goal = Column(String, nullable=True)
    aligned_to_team_goal = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="goals")


class ReviewFeedback(Base):
    __tablename__ = "review_feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Review and participants
    review_id = Column(Integer, ForeignKey("performance_reviews.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)  # Person being reviewed
    reviewer_id = Column(String, nullable=False)  # Person giving feedback (can be employee_id or external)
    reviewer_name = Column(String, nullable=True)

    # Feedback type
    feedback_type = Column(String, nullable=False)  # "Self", "Manager", "Peer", "Direct Report", "Skip Level", "360"
    relationship_to_employee = Column(String, nullable=True)  # "Manager", "Peer", "Direct Report", "Cross-functional"

    # Status
    status = Column(String, default="Requested")  # "Requested", "In Progress", "Submitted", "Reviewed"
    requested_date = Column(Date, nullable=True)
    submitted_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)

    # Ratings (1-5 scale)
    overall_rating = Column(Float, nullable=True)
    quality_of_work = Column(Float, nullable=True)
    collaboration = Column(Float, nullable=True)
    communication = Column(Float, nullable=True)
    leadership = Column(Float, nullable=True)
    technical_skills = Column(Float, nullable=True)

    # Qualitative feedback
    strengths = Column(String, nullable=True)
    areas_for_improvement = Column(String, nullable=True)
    specific_examples = Column(String, nullable=True)
    additional_comments = Column(String, nullable=True)

    # Visibility
    is_anonymous = Column(Boolean, default=False)
    visible_to_employee = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="feedback_received")


class PerformanceImprovementPlan(Base):
    __tablename__ = "performance_improvement_plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pip_id = Column(String, unique=True, index=True)  # "PIP-2024-001"

    # Employee and manager
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    manager_id = Column(String, nullable=True)
    manager_name = Column(String, nullable=True)
    hr_partner = Column(String, nullable=True)

    # PIP details
    title = Column(String, nullable=False)
    reason = Column(String, nullable=False)  # Why PIP is needed
    performance_issues = Column(String, nullable=False)  # Specific issues

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    review_frequency = Column(String, nullable=True)  # "Weekly", "Bi-weekly", "Monthly"
    next_review_date = Column(Date, nullable=True)

    # Status
    status = Column(String, default="Active")  # "Draft", "Active", "Extended", "Successfully Completed", "Unsuccessful", "Terminated"

    # Goals and expectations
    expectations = Column(String, nullable=False)  # Clear expectations
    success_criteria = Column(String, nullable=False)  # How success will be measured
    support_provided = Column(String, nullable=True)  # Resources, training, mentoring

    # Progress tracking
    progress_notes = Column(String, nullable=True)
    milestones_met = Column(String, nullable=True)
    areas_of_concern = Column(String, nullable=True)

    # Outcome
    outcome = Column(String, nullable=True)  # Final outcome
    outcome_date = Column(Date, nullable=True)
    outcome_notes = Column(String, nullable=True)

    # Consequences
    consequences_of_failure = Column(String, nullable=True)

    # Signatures
    employee_acknowledged = Column(Boolean, default=False)
    employee_acknowledgment_date = Column(Date, nullable=True)
    manager_signature = Column(String, nullable=True)
    hr_signature = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="improvement_plans")


class ReviewTemplate(Base):
    __tablename__ = "review_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Template details
    name = Column(String, nullable=False)
    template_type = Column(String, nullable=False)  # "Annual", "Probationary", "Project", "360"
    description = Column(String, nullable=True)

    # Template structure (JSON)
    competencies = Column(String, nullable=True)  # JSON list of competencies to rate
    questions = Column(String, nullable=True)  # JSON list of questions
    rating_scale = Column(String, nullable=True)  # JSON definition of rating scale

    # Settings
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)

    # Sections
    include_self_review = Column(Boolean, default=True)
    include_goal_setting = Column(Boolean, default=True)
    include_development_plan = Column(Boolean, default=True)

    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    file_path = Column(String)
    processed = Column(Boolean, default=False)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    email_alerts = Column(Boolean, default=True)
    new_hires = Column(Boolean, default=True)
    terminations = Column(Boolean, default=True)
    wage_changes = Column(Boolean, default=False)
    pto_requests = Column(Boolean, default=True)
    weekly_report = Column(Boolean, default=True)


class FMLACase(Base):
    __tablename__ = "fmla_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)

    # Case details
    status = Column(String)  # "Pending", "Approved", "Denied", "Active", "Closed", "Expired"
    leave_type = Column(String)  # "Employee Medical", "Family Care", "Military Family", "Bonding"
    reason = Column(String, nullable=True)

    # Dates
    request_date = Column(Date)
    start_date = Column(Date)
    end_date = Column(Date, nullable=True)
    certification_date = Column(Date, nullable=True)
    recertification_date = Column(Date, nullable=True)
    return_to_work_date = Column(Date, nullable=True)

    # Hours tracking
    hours_approved = Column(Float, default=480.0)  # Standard 12 weeks = 480 hours
    hours_used = Column(Float, default=0.0)
    hours_remaining = Column(Float, default=480.0)

    # Additional info
    intermittent = Column(Boolean, default=False)  # Intermittent leave vs continuous
    reduced_schedule = Column(Boolean, default=False)  # Reduced schedule leave
    notes = Column(String, nullable=True)

    # Relationship
    employee = relationship("Employee", backref="fmla_cases")


class FMLALeaveEntry(Base):
    __tablename__ = "fmla_leave_entries"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("fmla_cases.id"), index=True)

    # Leave entry details
    leave_date = Column(Date)
    hours_taken = Column(Float)
    entry_type = Column(String)  # "Full Day", "Partial Day", "Intermittent"
    notes = Column(String, nullable=True)

    # Relationship
    fmla_case = relationship("FMLACase", backref="leave_entries")


class FMLACaseNote(Base):
    __tablename__ = "fmla_case_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("fmla_cases.id"), index=True)
    note_text = Column(String)
    created_at = Column(Date)

    # Relationship
    fmla_case = relationship("FMLACase", backref="case_notes")


class Garnishment(Base):
    __tablename__ = "garnishments"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)

    # Case details
    status = Column(String)  # "Active", "Pending", "Closed", "Released"
    garnishment_type = Column(String)  # "Child Support", "Tax Levy", "Creditor", "Student Loan", "Other"

    # Agency/Office information
    agency_name = Column(String)
    agency_address = Column(String, nullable=True)
    agency_phone = Column(String, nullable=True)
    agency_fax = Column(String, nullable=True)
    agency_email = Column(String, nullable=True)
    case_reference = Column(String, nullable=True)  # Agency's case/reference number

    # Dates
    received_date = Column(Date)  # Date writ was received
    start_date = Column(Date)  # Date deductions begin
    end_date = Column(Date, nullable=True)  # Date garnishment ends/ended
    release_date = Column(Date, nullable=True)  # Date release was received

    # Financial details
    total_amount = Column(Float, default=0.0)  # Total amount of garnishment
    amount_paid = Column(Float, default=0.0)  # Amount paid to date
    amount_remaining = Column(Float, default=0.0)  # Amount still owed

    # Deduction details
    deduction_type = Column(String, nullable=True)  # "Percentage", "Fixed Amount", "CCPA Calculation"
    deduction_amount = Column(Float, nullable=True)  # Fixed amount per pay period
    deduction_percentage = Column(Float, nullable=True)  # Percentage of disposable income

    # Priority and notes
    priority_order = Column(Integer, default=1)  # For multiple garnishments
    notes = Column(String, nullable=True)

    # Relationship
    employee = relationship("Employee", backref="garnishments")


class GarnishmentPayment(Base):
    __tablename__ = "garnishment_payments"

    id = Column(Integer, primary_key=True, index=True)
    garnishment_id = Column(Integer, ForeignKey("garnishments.id"), index=True)

    # Payment details
    payment_date = Column(Date)
    pay_period_start = Column(Date)
    pay_period_end = Column(Date)
    amount = Column(Float)
    check_number = Column(String, nullable=True)

    # Wage calculation details (for answer to interrogatories)
    gross_wages = Column(Float, nullable=True)
    pretax_deductions = Column(Float, nullable=True)
    taxes_withheld = Column(Float, nullable=True)
    disposable_income = Column(Float, nullable=True)

    notes = Column(String, nullable=True)

    # Relationship
    garnishment = relationship("Garnishment", backref="payments")


class GarnishmentDocument(Base):
    __tablename__ = "garnishment_documents"

    id = Column(Integer, primary_key=True, index=True)
    garnishment_id = Column(Integer, ForeignKey("garnishments.id"), index=True)

    # Document details
    document_type = Column(String)  # "Writ", "Release", "Answer to Interrogatories", "Calculation", "Other"
    document_name = Column(String)
    file_path = Column(String)  # Path where document is stored
    uploaded_date = Column(Date)
    notes = Column(String, nullable=True)

    # Relationship
    garnishment = relationship("Garnishment", backref="documents")


class GarnishmentNote(Base):
    __tablename__ = "garnishment_notes"

    id = Column(Integer, primary_key=True, index=True)
    garnishment_id = Column(Integer, ForeignKey("garnishments.id"), index=True)
    note_text = Column(String)
    created_at = Column(Date)

    # Relationship
    garnishment = relationship("Garnishment", backref="case_notes")


class Termination(Base):
    __tablename__ = "terminations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)

    # Termination details
    termination_date = Column(Date)
    termination_type = Column(String)  # "Voluntary", "Involuntary"
    termination_reason = Column(String, nullable=True)  # "Resignation", "Retirement", "Performance", "Layoff", etc.

    # Position details at time of termination
    position = Column(String, nullable=True)
    supervisor = Column(String, nullable=True)
    department = Column(String, nullable=True)
    cost_center = Column(String, nullable=True)
    team = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # "Full Time", "Part Time"

    # Compensation at time of termination
    annual_wage = Column(Float, default=0.0)
    hourly_wage = Column(Float, nullable=True)
    benefits_cost_annual = Column(Float, default=0.0)  # Annual benefits cost
    employer_taxes_annual = Column(Float, default=0.0)  # FICA, Medicare, unemployment, etc.
    total_compensation = Column(Float, default=0.0)  # Total employer cost

    # Cost tracking
    severance_cost = Column(Float, default=0.0)
    unused_pto_payout = Column(Float, default=0.0)
    recruitment_cost = Column(Float, default=0.0)  # Cost to replace
    training_cost = Column(Float, default=0.0)  # Cost to train replacement
    total_turnover_cost = Column(Float, default=0.0)

    # Additional info
    rehire_eligible = Column(Boolean, default=True)
    notes = Column(String, nullable=True)

    # Relationship
    employee = relationship("Employee", backref="termination_record")


class InternalChange(Base):
    __tablename__ = "internal_changes"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)

    # Change details
    change_date = Column(Date)
    change_type = Column(String)  # "Position Change", "Compensation Change", "Employment Type Change", "Department Transfer"
    change_reason = Column(String, nullable=True)  # "Promotion", "Lateral Move", "Demotion", "Reorganization", "Merit Increase"

    # Position details - BEFORE change
    position_before = Column(String, nullable=True)
    supervisor_before = Column(String, nullable=True)
    department_before = Column(String, nullable=True)
    cost_center_before = Column(String, nullable=True)
    team_before = Column(String, nullable=True)
    employment_type_before = Column(String, nullable=True)  # "Full Time", "Part Time"

    # Position details - AFTER change
    position_after = Column(String, nullable=True)
    supervisor_after = Column(String, nullable=True)
    department_after = Column(String, nullable=True)
    cost_center_after = Column(String, nullable=True)
    team_after = Column(String, nullable=True)
    employment_type_after = Column(String, nullable=True)

    # Compensation - BEFORE change
    annual_wage_before = Column(Float, default=0.0)
    hourly_wage_before = Column(Float, nullable=True)
    benefits_cost_before = Column(Float, default=0.0)
    employer_taxes_before = Column(Float, default=0.0)
    total_compensation_before = Column(Float, default=0.0)

    # Compensation - AFTER change
    annual_wage_after = Column(Float, default=0.0)
    hourly_wage_after = Column(Float, nullable=True)
    benefits_cost_after = Column(Float, default=0.0)
    employer_taxes_after = Column(Float, default=0.0)
    total_compensation_after = Column(Float, default=0.0)

    # Cost impact
    compensation_change_amount = Column(Float, default=0.0)  # Positive = increase, Negative = decrease
    compensation_change_percentage = Column(Float, default=0.0)
    annual_cost_impact = Column(Float, default=0.0)  # Impact on company costs

    # Additional info
    notes = Column(String, nullable=True)

    # Relationship
    employee = relationship("Employee", backref="internal_changes")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String, unique=True, index=True)

    # Basic info
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    event_type = Column(String, nullable=False)  # Reference to event_types.type_name
    category = Column(String, nullable=True)

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String, nullable=True)  # "Daily", "Weekly", "Monthly", "Yearly", "Custom"
    recurrence_end_date = Column(Date, nullable=True)

    # Status and details
    status = Column(String, default="scheduled")  # "scheduled", "in_progress", "completed", "cancelled"
    location = Column(String, nullable=True)
    organizer = Column(String, nullable=True)
    participants = Column(String, nullable=True)  # JSON or comma-separated employee IDs

    # Employee association
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True, index=True)
    department = Column(String, nullable=True)

    # Notifications
    reminder_days = Column(Integer, nullable=True)  # Days before event to send reminder

    # Priority and notes
    priority = Column(String, default="medium")  # "low", "medium", "high", "critical"
    notes = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # JSON array of tags

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationship
    employee = relationship("Employee", backref="events")


class EventType(Base):
    __tablename__ = "event_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_id = Column(String, unique=True, index=True)
    type_name = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=True)
    default_duration_days = Column(Integer, nullable=True)
    default_reminder_days = Column(Integer, nullable=True)
    color_code = Column(String, nullable=True)  # Hex color for UI
    description = Column(String, nullable=True)


# ============================================================================
# ONBOARDING & OFFBOARDING MODELS
# ============================================================================

class OnboardingTemplate(Base):
    __tablename__ = "onboarding_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(String, unique=True, index=True)  # "OB-TEMPLATE-001"

    # Template details
    name = Column(String, nullable=False)  # "Standard Employee Onboarding", "Executive Onboarding"
    description = Column(String, nullable=True)
    department = Column(String, nullable=True)  # Specific to department or "All"
    role_type = Column(String, nullable=True)  # "Executive", "Manager", "Individual Contributor", "Intern"

    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)

    # Settings
    duration_days = Column(Integer, default=90)  # Typical onboarding period
    auto_assign = Column(Boolean, default=True)  # Automatically create tasks when employee is hired

    # Email settings
    send_welcome_email = Column(Boolean, default=True)
    welcome_email_template = Column(String, nullable=True)

    # Metadata
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String, unique=True, index=True)  # "OB-TASK-2025-001"

    # Assignment
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    template_id = Column(Integer, ForeignKey("onboarding_templates.id"), nullable=True)

    # Task details
    task_name = Column(String, nullable=False)
    task_description = Column(String, nullable=True)
    category = Column(String, nullable=False)  # "HR", "IT", "Facilities", "Manager", "Self"

    # Responsible party
    assigned_to = Column(String, nullable=True)  # Employee ID or role of person responsible
    assigned_to_role = Column(String, nullable=True)  # "HR Manager", "IT Admin", "Direct Manager"

    # Timing
    due_date = Column(Date, nullable=True)
    days_from_start = Column(Integer, nullable=True)  # Days from hire date (e.g., -1 = day before, 0 = first day, 5 = fifth day)
    completed_date = Column(Date, nullable=True)

    # Status
    status = Column(String, default="Not Started")  # "Not Started", "In Progress", "Completed", "Skipped", "Blocked"
    priority = Column(String, default="Medium")  # "Low", "Medium", "High", "Critical"

    # Details
    notes = Column(String, nullable=True)
    completion_notes = Column(String, nullable=True)
    completed_by = Column(String, nullable=True)
    task_details = Column(JSON, nullable=True)  # Stores task-specific data (equipment, interview times, etc.)

    # Dependencies
    depends_on_task_id = Column(Integer, ForeignKey("onboarding_tasks.id"), nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="onboarding_tasks")


class OffboardingTemplate(Base):
    __tablename__ = "offboarding_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(String, unique=True, index=True)  # "OFF-TEMPLATE-001"

    # Template details
    name = Column(String, nullable=False)  # "Standard Employee Offboarding", "Executive Offboarding"
    description = Column(String, nullable=True)
    termination_type = Column(String, nullable=True)  # "Voluntary", "Involuntary", "Retirement", "All"
    department = Column(String, nullable=True)  # Specific to department or "All"
    role_type = Column(String, nullable=True)  # "Executive", "Manager", "Individual Contributor"

    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)

    # Settings
    duration_days = Column(Integer, default=30)  # Typical offboarding period
    auto_assign = Column(Boolean, default=True)  # Automatically create tasks when termination is entered

    # Exit interview
    require_exit_interview = Column(Boolean, default=True)
    exit_interview_template = Column(String, nullable=True)

    # Metadata
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class OffboardingTask(Base):
    __tablename__ = "offboarding_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String, unique=True, index=True)  # "OFF-TASK-2025-001"

    # Assignment
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    template_id = Column(Integer, ForeignKey("offboarding_templates.id"), nullable=True)

    # Task details
    task_name = Column(String, nullable=False)
    task_description = Column(String, nullable=True)
    category = Column(String, nullable=False)  # "HR", "IT", "Facilities", "Manager", "Finance", "Legal"

    # Responsible party
    assigned_to = Column(String, nullable=True)  # Employee ID or role of person responsible
    assigned_to_role = Column(String, nullable=True)  # "HR Manager", "IT Admin", "Direct Manager"

    # Timing
    due_date = Column(Date, nullable=True)
    days_from_termination = Column(Integer, nullable=True)  # Days from termination date (e.g., -5 = 5 days before, 0 = last day)
    completed_date = Column(String, nullable=True)  # Stores ISO 8601 timestamp string for precise completion time

    # Status
    status = Column(String, default="Not Started")  # "Not Started", "In Progress", "Completed", "Skipped", "N/A"
    priority = Column(String, default="Medium")  # "Low", "Medium", "High", "Critical"

    # Details
    notes = Column(String, nullable=True)  # Current/latest note (for backward compatibility)
    notes_history = Column(JSON, nullable=True)  # Array of all notes with timestamps [{note, timestamp, created_by}]
    completion_notes = Column(String, nullable=True)
    completed_by = Column(String, nullable=True)
    task_details = Column(JSON, nullable=True)  # Stores task-specific data (equipment, interview times, PTO calculations, etc.)
    uncheck_history = Column(JSON, nullable=True)  # Stores array of uncheck events [{action, timestamp, reason}]

    # Dependencies
    depends_on_task_id = Column(Integer, ForeignKey("offboarding_tasks.id"), nullable=True)

    # Hierarchy (for nested/sub-tasks)
    parent_task_id = Column(Integer, ForeignKey("offboarding_tasks.id"), nullable=True)
    has_subtasks = Column(Boolean, default=False)  # True if this task has child tasks
    is_subtask = Column(Boolean, default=False)    # True if this is a child task

    # Archival (when employee status reverts from Terminated to Active)
    archived = Column(Boolean, default=False)  # True if task was archived due to status change

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="offboarding_tasks")
    subtasks = relationship("OffboardingTask", foreign_keys=[parent_task_id], backref="parent_task", remote_side="OffboardingTask.id")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    equipment_id = Column(String, unique=True, index=True)  # "EQUIP-2025-001" or asset tag

    # Equipment details
    equipment_type = Column(String, nullable=False)  # "Laptop", "Monitor", "Phone", "Keyboard", "Mouse", "Dock", "Headset"
    category = Column(String, nullable=True)  # "Computer", "Peripheral", "Mobile", "Furniture", "Access Card"

    # Item details
    manufacturer = Column(String, nullable=True)  # "Apple", "Dell", "Lenovo", "HP"
    model = Column(String, nullable=True)  # "MacBook Pro 16\"", "ThinkPad X1", "iPhone 13"
    serial_number = Column(String, nullable=True, index=True)
    asset_tag = Column(String, nullable=True, index=True)

    # Specifications
    specifications = Column(String, nullable=True)  # JSON or text description

    # Status and condition
    status = Column(String, default="Available")  # "Available", "Assigned", "In Repair", "Retired", "Lost", "Stolen"
    condition = Column(String, default="Good")  # "Excellent", "Good", "Fair", "Poor", "Broken"

    # Financial
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Float, nullable=True)
    warranty_expiration = Column(Date, nullable=True)

    # Location
    location = Column(String, nullable=True)  # Office location or "Remote"

    # Notes
    notes = Column(String, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class EquipmentAssignment(Base):
    __tablename__ = "equipment_assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assignment_id = Column(String, unique=True, index=True)  # "ASSIGN-2025-001"

    # Assignment details
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)

    # Dates
    assigned_date = Column(Date, nullable=False)
    expected_return_date = Column(Date, nullable=True)
    returned_date = Column(Date, nullable=True)

    # Status
    status = Column(String, default="Active")  # "Active", "Returned", "Overdue", "Lost"

    # Condition tracking
    condition_at_assignment = Column(String, nullable=True)  # "Excellent", "Good", "Fair"
    condition_at_return = Column(String, nullable=True)

    # Details
    assigned_by = Column(String, nullable=True)  # Employee ID of person who assigned
    return_notes = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    equipment = relationship("Equipment", backref="assignments")
    employee = relationship("Employee", backref="equipment_assignments")


class ExitInterview(Base):
    __tablename__ = "exit_interviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    interview_id = Column(String, unique=True, index=True)  # "EXIT-2025-001"

    # Employee details
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)

    # Interview details
    interview_date = Column(Date, nullable=True)
    interviewer = Column(String, nullable=True)  # Name or employee ID of HR person conducting interview
    termination_date = Column(Date, nullable=True)

    # Status
    status = Column(String, default="Pending")  # "Pending", "Scheduled", "Completed", "Declined"

    # Reason for leaving (multiple choice)
    primary_reason = Column(String, nullable=True)  # "Better Opportunity", "Compensation", "Work-Life Balance", "Management", "Career Growth", "Relocation", "Retirement", "Personal", "Other"
    secondary_reasons = Column(String, nullable=True)  # JSON array of additional reasons

    # Ratings (1-5 scale)
    overall_satisfaction = Column(Integer, nullable=True)
    job_satisfaction = Column(Integer, nullable=True)
    management_satisfaction = Column(Integer, nullable=True)
    work_environment_satisfaction = Column(Integer, nullable=True)
    compensation_satisfaction = Column(Integer, nullable=True)
    benefits_satisfaction = Column(Integer, nullable=True)
    work_life_balance_satisfaction = Column(Integer, nullable=True)
    career_development_satisfaction = Column(Integer, nullable=True)

    # Open-ended questions
    what_did_you_like = Column(String, nullable=True)
    what_could_improve = Column(String, nullable=True)
    why_leaving = Column(String, nullable=True)
    manager_feedback = Column(String, nullable=True)
    would_recommend = Column(Boolean, nullable=True)
    would_return = Column(Boolean, nullable=True)
    additional_comments = Column(String, nullable=True)

    # New role details
    new_company_name = Column(String, nullable=True)
    new_role_title = Column(String, nullable=True)
    new_compensation = Column(Float, nullable=True)  # Optional, for data analysis

    # Follow-up
    follow_up_required = Column(Boolean, default=False)
    follow_up_notes = Column(String, nullable=True)

    # Confidential notes (for HR only)
    confidential_notes = Column(String, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="exit_interview")


class ContributionLimit(Base):
    __tablename__ = "contribution_limits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Year and account type
    year = Column(Integer, nullable=False, index=True)  # 2025, 2026, etc.
    account_type = Column(String, nullable=False, index=True)  # "hsa_individual", "hsa_family", "fsa_healthcare", "fsa_dependent_care", "401k", "lfsa"

    # Contribution limits
    annual_limit = Column(Float, nullable=False)  # Base annual contribution limit
    catch_up_limit = Column(Float, nullable=True)  # Additional catch-up contribution amount
    catch_up_age = Column(Integer, nullable=True)  # Age when catch-up contributions are allowed (e.g., 50, 55)

    # Additional information
    description = Column(String, nullable=True)  # Description of the limit or special rules
    notes = Column(String, nullable=True)  # Any additional notes or restrictions

    # Status
    is_active = Column(Boolean, default=True)  # Whether this limit is currently active

    # Source
    source = Column(String, nullable=True)  # Where this limit came from (e.g., "IRS Notice 2024-80")
    effective_date = Column(Date, nullable=True)  # When this limit goes into effect

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by = Column(String, nullable=True)  # User who created/updated this limit


class PTORecord(Base):
    __tablename__ = "pto_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)
    cost_center = Column(String, nullable=False, index=True)
    pay_period_date = Column(Date, nullable=False, index=True)
    pto_hours = Column(Float, default=0)
    pto_cost = Column(Float, default=0)
    hourly_rate = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="pto_records")


class PTOImportHistory(Base):
    __tablename__ = "pto_import_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_name = Column(String, nullable=False)
    import_date = Column(DateTime, server_default=func.now())
    imported_by = Column(String, nullable=True)
    records_imported = Column(Integer, default=0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, default="success")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="employee")  # admin, manager, employee
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    last_login = Column(DateTime, nullable=True)

    # 2FA fields
    totp_secret = Column(String(32), nullable=True)  # Base32 encoded secret
    totp_enabled = Column(Boolean, default=False)
    backup_codes = Column(String, nullable=True)  # JSON array of hashed backup codes

    # Password management
    password_must_change = Column(Boolean, default=True)  # Force password change on first login

    # Relationships
    employee = relationship("Employee", backref="user")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")


# ============================================================================
# ACA (AFFORDABLE CARE ACT) COMPLIANCE MODELS
# ============================================================================

class ACAMeasurementPeriod(Base):
    """Defines ACA measurement periods for tracking employee eligibility"""
    __tablename__ = "aca_measurement_periods"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    period_id = Column(String, unique=True, index=True)  # "ACA-2025-STD"

    # Period details
    period_name = Column(String, nullable=False)  # "2025 Standard Measurement Period"
    period_type = Column(String, nullable=False)  # "Standard", "Initial", "Administrative"
    year = Column(Integer, nullable=False, index=True)

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Associated stability period (when coverage is offered)
    stability_start_date = Column(Date, nullable=True)
    stability_end_date = Column(Date, nullable=True)

    # Administrative period (between measurement and stability)
    admin_start_date = Column(Date, nullable=True)
    admin_end_date = Column(Date, nullable=True)

    # Status
    status = Column(String, default="Planned")  # "Planned", "Active", "Completed", "Locked"

    # Thresholds
    full_time_hours_threshold = Column(Float, default=130.0)  # Monthly hours for FT status

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ACAEmployeeStatus(Base):
    """Tracks ACA eligibility status for each employee by measurement period"""
    __tablename__ = "aca_employee_status"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Employee and period
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)
    measurement_period_id = Column(Integer, ForeignKey("aca_measurement_periods.id"), nullable=False, index=True)

    # Employment status
    employment_start_date = Column(Date, nullable=True)  # Start date during this period
    employment_end_date = Column(Date, nullable=True)  # End date during this period
    is_variable_hour = Column(Boolean, default=False)  # Variable hour employee
    is_seasonal = Column(Boolean, default=False)  # Seasonal employee

    # Hours tracking
    total_hours_worked = Column(Float, default=0.0)  # Total hours during measurement period
    months_employed = Column(Integer, default=0)  # Number of months employed during period
    average_monthly_hours = Column(Float, default=0.0)  # Average monthly hours

    # Eligibility determination
    is_full_time = Column(Boolean, default=False)  # Met FT threshold (130+ hours/month avg)
    eligibility_determined = Column(Boolean, default=False)  # Whether determination is complete
    determination_date = Column(Date, nullable=True)

    # Coverage offer
    coverage_offered = Column(Boolean, default=False)  # Was coverage offered
    coverage_offer_date = Column(Date, nullable=True)  # When was it offered
    coverage_accepted = Column(Boolean, default=False)  # Did employee accept
    coverage_start_date = Column(Date, nullable=True)  # When coverage starts
    coverage_end_date = Column(Date, nullable=True)  # When coverage ends

    # Safe harbor codes (Form 1095-C Line 14)
    safe_harbor_code = Column(String, nullable=True)  # "2A", "2B", "2C", "2D", "2E", "2F", etc.

    # Affordability
    employee_required_contribution = Column(Float, nullable=True)  # Monthly EE cost
    affordability_percentage = Column(Float, nullable=True)  # % of household income
    is_affordable = Column(Boolean, default=True)  # Meets affordability requirement

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="aca_status")
    measurement_period = relationship("ACAMeasurementPeriod", backref="employee_statuses")


class ACAMonthlyHours(Base):
    """Tracks monthly hours worked for ACA compliance"""
    __tablename__ = "aca_monthly_hours"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Employee and date
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)  # 1-12

    # Hours data
    hours_worked = Column(Float, default=0.0)  # Regular hours worked
    hours_of_service = Column(Float, default=0.0)  # Total hours of service (includes PTO, holiday, etc.)

    # Status
    is_full_time = Column(Boolean, default=False)  # 130+ hours = full-time for ACA
    employment_status = Column(String, nullable=True)  # "Active", "On Leave", "Terminated"

    # Data source
    data_source = Column(String, nullable=True)  # "Payroll Import", "Manual Entry", "Calculated"
    imported_date = Column(Date, nullable=True)

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="aca_monthly_hours")


class ACACoverageOffer(Base):
    """Tracks coverage offers made to employees for IRS Form 1095-C"""
    __tablename__ = "aca_coverage_offers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    offer_id = Column(String, unique=True, index=True)  # "ACA-OFFER-2025-001"

    # Employee
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)

    # Coverage period
    year = Column(Integer, nullable=False, index=True)
    coverage_start_date = Column(Date, nullable=False)
    coverage_end_date = Column(Date, nullable=True)

    # Offer details (Form 1095-C Line 14)
    offer_of_coverage_code = Column(String, nullable=True)  # "1A", "1B", "1C", "1D", "1E", "1F", etc.
    # 1A = Minimum essential coverage providing minimum value offered to EE, spouse, dependents
    # 1B = Minimum essential coverage providing minimum value offered to EE only
    # 1C = Coverage offered to EE and at least minimum essential coverage offered to dependents
    # 1E = Coverage offered to EE and spouse, not dependents
    # etc.

    # Employee required contribution (Line 15)
    employee_monthly_cost = Column(Float, nullable=True)  # Employee share of lowest-cost self-only coverage

    # Safe harbor codes (Line 16)
    safe_harbor_code = Column(String, nullable=True)  # "2A", "2B", "2C", "2D", "2E", "2F", "2G", "2H"
    # 2A = W-2 wages (Form W-2, Box 1) safe harbor
    # 2B = Rate of pay safe harbor
    # 2C = Federal poverty line safe harbor
    # 2D = Section 4980H affordability Form W-2 safe harbor for qualifying offer method
    # 2E = Qualifying offer method
    # etc.

    # Coverage acceptance
    coverage_accepted = Column(Boolean, default=False)
    acceptance_date = Column(Date, nullable=True)
    plan_name = Column(String, nullable=True)  # Which plan they selected

    # Affordability determination
    is_affordable = Column(Boolean, default=True)
    affordability_percentage = Column(Float, nullable=True)  # % of household income
    affordability_threshold = Column(Float, nullable=True)  # Federal threshold (e.g., 9.02%)

    # Communication tracking
    offer_communication_date = Column(Date, nullable=True)
    offer_method = Column(String, nullable=True)  # "Email", "Mail", "In Person", "Portal"
    response_due_date = Column(Date, nullable=True)

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="aca_coverage_offers")


class ACAForm1095C(Base):
    """Stores Form 1095-C data for IRS reporting"""
    __tablename__ = "aca_form_1095c"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    form_id = Column(String, unique=True, index=True)  # "1095C-2025-001"

    # Employee
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)
    tax_year = Column(Integer, nullable=False, index=True)

    # Employee information (as of year-end)
    employee_ssn = Column(String, nullable=True)  # Encrypted or masked
    employee_name = Column(String, nullable=False)
    employee_address = Column(String, nullable=True)
    employee_city = Column(String, nullable=True)
    employee_state = Column(String, nullable=True)
    employee_zip = Column(String, nullable=True)

    # Part II: Employee Offer of Coverage (monthly data)
    # Each month has 3 fields: Line 14 (offer code), Line 15 (cost), Line 16 (safe harbor)
    jan_line14 = Column(String, nullable=True)  # Offer of coverage code
    jan_line15 = Column(Float, nullable=True)   # Employee required contribution
    jan_line16 = Column(String, nullable=True)  # Safe harbor code

    feb_line14 = Column(String, nullable=True)
    feb_line15 = Column(Float, nullable=True)
    feb_line16 = Column(String, nullable=True)

    mar_line14 = Column(String, nullable=True)
    mar_line15 = Column(Float, nullable=True)
    mar_line16 = Column(String, nullable=True)

    apr_line14 = Column(String, nullable=True)
    apr_line15 = Column(Float, nullable=True)
    apr_line16 = Column(String, nullable=True)

    may_line14 = Column(String, nullable=True)
    may_line15 = Column(Float, nullable=True)
    may_line16 = Column(String, nullable=True)

    jun_line14 = Column(String, nullable=True)
    jun_line15 = Column(Float, nullable=True)
    jun_line16 = Column(String, nullable=True)

    jul_line14 = Column(String, nullable=True)
    jul_line15 = Column(Float, nullable=True)
    jul_line16 = Column(String, nullable=True)

    aug_line14 = Column(String, nullable=True)
    aug_line15 = Column(Float, nullable=True)
    aug_line16 = Column(String, nullable=True)

    sep_line14 = Column(String, nullable=True)
    sep_line15 = Column(Float, nullable=True)
    sep_line16 = Column(String, nullable=True)

    oct_line14 = Column(String, nullable=True)
    oct_line15 = Column(Float, nullable=True)
    oct_line16 = Column(String, nullable=True)

    nov_line14 = Column(String, nullable=True)
    nov_line15 = Column(Float, nullable=True)
    nov_line16 = Column(String, nullable=True)

    dec_line14 = Column(String, nullable=True)
    dec_line15 = Column(Float, nullable=True)
    dec_line16 = Column(String, nullable=True)

    # Part III: Covered Individuals (if employee enrolled in self-insured plan)
    covered_individuals = Column(String, nullable=True)  # JSON array of covered individuals

    # Form status
    status = Column(String, default="Draft")  # "Draft", "Ready for Filing", "Filed", "Corrected"
    filed_date = Column(Date, nullable=True)
    correction_of = Column(String, nullable=True)  # If this is a corrected form, reference to original

    # Electronic filing
    transmission_control_code = Column(String, nullable=True)  # TCC from IRS AIR system
    receipt_id = Column(String, nullable=True)  # Acknowledgment from IRS

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="aca_1095c_forms")


class ACAForm1094C(Base):
    """Stores Form 1094-C data (transmittal form for 1095-C)"""
    __tablename__ = "aca_form_1094c"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    form_id = Column(String, unique=True, index=True)  # "1094C-2025"

    # Tax year
    tax_year = Column(Integer, nullable=False, unique=True, index=True)

    # Employer information
    employer_ein = Column(String, nullable=False)
    employer_name = Column(String, nullable=False)
    employer_address = Column(String, nullable=True)
    employer_city = Column(String, nullable=True)
    employer_state = Column(String, nullable=True)
    employer_zip = Column(String, nullable=True)

    # Contact information
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)

    # Part II: ALE Member Information
    total_1095c_forms = Column(Integer, default=0)  # Total Forms 1095-C filed

    # Authoritative transmittal
    is_authoritative = Column(Boolean, default=True)

    # Certification of eligibility
    certifications = Column(String, nullable=True)  # JSON array of certification codes

    # Part III: ALE Member Information (monthly data)
    # Line 23: Minimum essential coverage offer
    jan_total_employees = Column(Integer, default=0)  # Total employees
    feb_total_employees = Column(Integer, default=0)
    mar_total_employees = Column(Integer, default=0)
    apr_total_employees = Column(Integer, default=0)
    may_total_employees = Column(Integer, default=0)
    jun_total_employees = Column(Integer, default=0)
    jul_total_employees = Column(Integer, default=0)
    aug_total_employees = Column(Integer, default=0)
    sep_total_employees = Column(Integer, default=0)
    oct_total_employees = Column(Integer, default=0)
    nov_total_employees = Column(Integer, default=0)
    dec_total_employees = Column(Integer, default=0)

    # Line 24: Total full-time employees
    jan_full_time_count = Column(Integer, default=0)
    feb_full_time_count = Column(Integer, default=0)
    mar_full_time_count = Column(Integer, default=0)
    apr_full_time_count = Column(Integer, default=0)
    may_full_time_count = Column(Integer, default=0)
    jun_full_time_count = Column(Integer, default=0)
    jul_full_time_count = Column(Integer, default=0)
    aug_full_time_count = Column(Integer, default=0)
    sep_full_time_count = Column(Integer, default=0)
    oct_full_time_count = Column(Integer, default=0)
    nov_full_time_count = Column(Integer, default=0)
    dec_full_time_count = Column(Integer, default=0)

    # Line 25: Total employees receiving coverage offer
    jan_offer_count = Column(Integer, default=0)
    feb_offer_count = Column(Integer, default=0)
    mar_offer_count = Column(Integer, default=0)
    apr_offer_count = Column(Integer, default=0)
    may_offer_count = Column(Integer, default=0)
    jun_offer_count = Column(Integer, default=0)
    jul_offer_count = Column(Integer, default=0)
    aug_offer_count = Column(Integer, default=0)
    sep_offer_count = Column(Integer, default=0)
    oct_offer_count = Column(Integer, default=0)
    nov_offer_count = Column(Integer, default=0)
    dec_offer_count = Column(Integer, default=0)

    # Form status
    status = Column(String, default="Draft")  # "Draft", "Ready for Filing", "Filed", "Corrected"
    filed_date = Column(Date, nullable=True)

    # Electronic filing
    transmission_control_code = Column(String, nullable=True)
    receipt_id = Column(String, nullable=True)

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ACAAlert(Base):
    """Tracks ACA compliance alerts and warnings"""
    __tablename__ = "aca_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(String, unique=True, index=True)  # "ACA-ALERT-2025-001"

    # Alert details
    alert_type = Column(String, nullable=False)  # "Missing Hours Data", "Approaching FT Status", "Eligibility Change", "Form Incomplete", "Deadline Approaching"
    severity = Column(String, default="Medium")  # "Low", "Medium", "High", "Critical"

    # Related entity
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True, index=True)
    measurement_period_id = Column(Integer, ForeignKey("aca_measurement_periods.id"), nullable=True)

    # Alert content
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    recommended_action = Column(String, nullable=True)

    # Status
    status = Column(String, default="Active")  # "Active", "Acknowledged", "Resolved", "Dismissed"
    acknowledged_by = Column(String, nullable=True)
    acknowledged_date = Column(Date, nullable=True)
    resolved_date = Column(Date, nullable=True)

    # Due date for action
    due_date = Column(Date, nullable=True)

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="aca_alerts")
