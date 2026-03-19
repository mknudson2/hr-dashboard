from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, DateTime, JSON, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from .encrypted_types import EncryptedString


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

    # Exit documents tracking
    exit_docs_sent = Column(Boolean, default=False, nullable=True)  # Whether exit docs email was sent
    exit_docs_sent_at = Column(DateTime, nullable=True)  # When exit docs email was sent
    exit_docs_sent_to = Column(String, nullable=True)  # Email address it was sent to
    exit_docs_attachment_count = Column(Integer, nullable=True)  # Number of documents attached

    # Rehire/Reactivation tracking
    rehire_date = Column(Date, nullable=True)  # Date of rehire if previously terminated
    original_hire_date = Column(Date, nullable=True)  # Original hire date before rehire
    reactivation_reason = Column(String, nullable=True)  # 'mistakenly_terminated', 'rehired', 'termination_cancelled'
    reactivation_notes = Column(Text, nullable=True)  # Additional notes about reactivation
    status_change_history = Column(JSON, nullable=True)  # History of status changes with timestamps

    # Position information
    position = Column(String, nullable=True)
    supervisor = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # "Full Time", "Part Time", "Contract", "Intern"

    # Compensation information
    wage = Column(Float, nullable=True)  # Base rate (hourly)
    wage_type = Column(String, nullable=True)  # "Hourly" or "Salary"
    wage_effective_date = Column(Date, nullable=True)  # Start date of current pay rate
    annual_wage = Column(Float, nullable=True)  # Annual equivalent
    hourly_wage = Column(Float, nullable=True)  # Hourly rate (same as wage/base rate)
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

    # Personal contact information (for offboarding documents, etc.)
    personal_email = Column(String, nullable=True)
    personal_phone = Column(String, nullable=True)
    address_street = Column(String, nullable=True)
    address_city = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_zip = Column(String, nullable=True)
    address_country = Column(String, nullable=True)

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

    # Custom tags for role-based features (e.g., ["hiring_manager", "interviewer"])
    custom_tags = Column(JSON, nullable=True)

    # Relationships
    fmla_leave_requests = relationship("FMLALeaveRequest", back_populates="employee")
    filled_pdf_forms = relationship("FilledPdfForm", back_populates="employee")


class WageHistory(Base):
    __tablename__ = "wage_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    effective_date = Column(Date)
    pay_rate_start_date = Column(Date, nullable=True)
    pay_rate_end_date = Column(Date, nullable=True)
    wage = Column(Float)
    wage_unit = Column(String, nullable=True)  # "Hour", "Year", etc.
    annual_salary = Column(Float, nullable=True)
    change_reason = Column(String, nullable=True)  # e.g., "Merit Increase", "Promotion", "New Hire"
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
    template_id = Column(Integer, ForeignKey("review_templates.id"), nullable=True)
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

    # Template-driven review support
    template_id = Column(Integer, ForeignKey("review_templates.id"), nullable=True)
    dynamic_ratings = Column(String, nullable=True)  # JSON: {"competency_key": rating_value}
    dynamic_responses = Column(String, nullable=True)  # JSON: {"field_key": "text value"}
    rating_notes = Column(String, nullable=True)  # JSON: {"rating_key": "note text"}

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="performance_reviews")
    template = relationship("ReviewTemplate", backref="reviews")


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

    # Enhanced Tracking Type System
    tracking_type = Column(String(50), default="percentage")  # percentage, target_percentage, counter, average, milestone

    # Counter type fields
    counter_current = Column(Integer, default=0, nullable=True)
    counter_target = Column(Integer, nullable=True)

    # Average type fields
    average_values = Column(JSON, nullable=True)  # [{value, date, notes}]
    average_target = Column(Float, nullable=True)

    # Milestone type fields
    milestones_total = Column(Integer, default=0, nullable=True)
    milestones_completed = Column(Integer, default=0, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="goals")
    progress_entries = relationship("GoalProgressEntry", back_populates="goal", cascade="all, delete-orphan")
    milestones = relationship("GoalMilestone", back_populates="goal", cascade="all, delete-orphan")


class GoalProgressEntry(Base):
    """Tracks individual progress updates for a goal with optional file attachments"""
    __tablename__ = "goal_progress_entries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("performance_goals.id", ondelete="CASCADE"), nullable=False, index=True)

    # Entry details
    entry_date = Column(DateTime, server_default=func.now())
    updated_by = Column(String, nullable=True)

    # Progress values
    progress_percentage = Column(Float, nullable=True)
    value = Column(Float, nullable=True)  # For counter/average types
    notes = Column(Text, nullable=True)

    # Change tracking
    previous_progress = Column(Float, nullable=True)
    new_progress = Column(Float, nullable=True)

    # Relationships
    goal = relationship("PerformanceGoal", back_populates="progress_entries")
    attachments = relationship("GoalProgressAttachment", back_populates="progress_entry", cascade="all, delete-orphan")


class GoalProgressAttachment(Base):
    """Links file uploads to goal progress entries"""
    __tablename__ = "goal_progress_attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    progress_entry_id = Column(Integer, ForeignKey("goal_progress_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)

    # Attachment metadata
    attachment_type = Column(String(50), nullable=True)  # document, image, spreadsheet
    file_name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())

    # Relationships
    progress_entry = relationship("GoalProgressEntry", back_populates="attachments")


class GoalMilestone(Base):
    """Individual milestones for milestone-type goals"""
    __tablename__ = "goal_milestones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("performance_goals.id", ondelete="CASCADE"), nullable=False, index=True)

    # Milestone details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sequence_order = Column(Integer, default=0)

    # Dates
    due_date = Column(Date, nullable=True)
    completed_date = Column(Date, nullable=True)

    # Status
    status = Column(String(50), default="pending")  # pending, in_progress, completed, skipped

    # Completion details
    completed_by = Column(String, nullable=True)
    completion_notes = Column(Text, nullable=True)

    # Weight for progress calculation
    weight = Column(Float, default=1.0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    goal = relationship("PerformanceGoal", back_populates="milestones")


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

    # Text field definitions (JSON)
    text_fields = Column(String, nullable=True)  # JSON list of text field definitions

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
    fmla_leave_requests = Column(Boolean, default=True)  # New FMLA leave request notifications


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


class GarnishmentCalculationDownload(Base):
    """Track downloaded calculations for audit purposes."""
    __tablename__ = "garnishment_calculation_downloads"

    id = Column(Integer, primary_key=True, index=True)
    garnishment_id = Column(Integer, ForeignKey("garnishments.id"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("garnishment_payments.id"), nullable=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)

    download_type = Column(String, nullable=False)  # "single_payment", "all_payments", "summary"
    downloaded_at = Column(DateTime, server_default=func.now())

    # Relationships
    garnishment = relationship("Garnishment", backref="calculation_downloads")
    payment = relationship("GarnishmentPayment", backref="downloads")
    employee = relationship("Employee", backref="garnishment_downloads")


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

    # Termination Return Tracking
    return_requested = Column(Boolean, default=False)
    return_requested_date = Column(Date, nullable=True)
    return_requested_by = Column(String, nullable=True)  # Name of person who requested return
    shipping_label_requested = Column(Boolean, default=False)
    shipping_label_sent = Column(Boolean, default=False)
    shipping_label_sent_date = Column(Date, nullable=True)
    shipping_label_tracking = Column(String, nullable=True)  # Tracking number
    equipment_received = Column(Boolean, default=False)
    equipment_received_date = Column(Date, nullable=True)
    received_by = Column(String, nullable=True)  # Name of person who received
    equipment_condition_checklist = Column(String, nullable=True)  # JSON with checklist items

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

    # Account lockout fields (security)
    failed_login_attempts = Column(Integer, default=0)  # Count of consecutive failed login attempts
    locked_until = Column(DateTime, nullable=True)  # Account locked until this timestamp

    # Portal access control
    allowed_portals = Column(String, default='["employee-portal"]')  # JSON array: "hr", "employee-portal"

    @property
    def allowed_portals_list(self) -> list:
        """Parse allowed_portals JSON string into a Python list."""
        import json
        if not self.allowed_portals:
            return ["employee-portal"]
        try:
            return json.loads(self.allowed_portals)
        except (json.JSONDecodeError, TypeError):
            return ["employee-portal"]

    # Relationships
    employee = relationship("Employee", backref="user")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    assigned_roles = relationship(
        "Role",
        secondary="user_roles",
        primaryjoin="User.id == UserRole.user_id",
        secondaryjoin="Role.id == UserRole.role_id",
        back_populates="users"
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    last_activity = Column(DateTime, server_default=func.now())  # For idle timeout tracking
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")


class TokenBlacklist(Base):
    """Blacklisted JWT tokens (revoked on logout)."""
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)  # When token would have expired
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reason = Column(String(100), default="logout")  # logout, password_change, admin_revoke


class PasswordHistory(Base):
    """Password history for preventing password reuse (security compliance)."""
    __tablename__ = "password_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    user = relationship("User", backref="password_history")


class UserPreference(Base):
    """User preferences for UI customization and settings."""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key = Column(String(100), nullable=False)  # preference key, e.g., "team_dashboard_cards"
    value = Column(Text, nullable=True)  # JSON string or simple value
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Unique constraint on user_id + key
    __table_args__ = (
        Index('ix_user_preferences_user_key', 'user_id', 'key', unique=True),
    )

    # Relationship
    user = relationship("User", backref="preferences")


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
    employee_ssn = Column(EncryptedString(255), nullable=True)  # Encrypted at rest
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


# ============================================================================
# FILE UPLOAD & PROCESSING MODELS
# ============================================================================

class FileUpload(Base):
    """Tracks uploaded files and their processing status"""
    __tablename__ = "file_uploads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # File identification
    file_name = Column(String(255), nullable=False)  # UUID-based secure filename
    original_filename = Column(String(255), nullable=False)  # User's original filename
    file_type = Column(String(50), nullable=False)  # 'csv', 'xlsx', 'docx', 'pdf'
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_path = Column(String(500), nullable=False)  # Secure storage path
    mime_type = Column(String(100), nullable=True)  # Detected MIME type

    # Upload metadata
    upload_source = Column(String(50), default='manual')  # 'manual', 'sftp', 'api'
    uploaded_by = Column(String(100), nullable=False)  # user_id
    uploaded_at = Column(DateTime, server_default=func.now())

    # Processing status
    status = Column(String(50), default='pending')  # 'pending', 'processing', 'completed', 'failed', 'quarantined'
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)

    # Processing results
    records_processed = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    error_message = Column(String(1000), nullable=True)

    # Metadata and configuration
    file_metadata = Column(JSON, nullable=True)  # File-specific metadata, column mappings, etc.
    target_table = Column(String(100), nullable=True)  # Which table to import into
    file_category = Column(String(100), nullable=True)  # Category: employment_list, ot_earnings, etc.
    detected_columns = Column(JSON, nullable=True)  # List of detected column names
    row_count = Column(Integer, nullable=True)  # Number of rows in file
    processing_logs = Column(JSON, nullable=True)  # Parsing and processing logs

    # Soft delete
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    logs = relationship("FileProcessingLog", back_populates="file_upload", cascade="all, delete-orphan")
    import_history = relationship("DataImportHistory", back_populates="file_upload", cascade="all, delete-orphan")


class FileProcessingLog(Base):
    """Audit trail for file processing events"""
    __tablename__ = "file_processing_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False, index=True)

    # Log details
    log_level = Column(String(20), nullable=False)  # 'info', 'warning', 'error', 'debug'
    log_message = Column(String(1000), nullable=False)
    log_details = Column(JSON, nullable=True)  # Structured error/warning data

    # Context
    row_number = Column(Integer, nullable=True)  # Which row caused the log entry
    column_name = Column(String(100), nullable=True)  # Which column had the issue

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    file_upload = relationship("FileUpload", back_populates="logs")


class DataImportHistory(Base):
    """Tracks which database records were created/updated from which file"""
    __tablename__ = "data_import_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False, index=True)

    # Import details
    table_name = Column(String(100), nullable=False)  # Which table was modified
    record_id = Column(String(100), nullable=False)  # Primary key of the record
    action = Column(String(20), nullable=False)  # 'insert', 'update', 'skip', 'error'

    # Record snapshot (for auditing)
    old_values = Column(JSON, nullable=True)  # Previous values (for updates)
    new_values = Column(JSON, nullable=True)  # New values

    # Error tracking
    error_message = Column(String(1000), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    file_upload = relationship("FileUpload", back_populates="import_history")


class FileValidationRule(Base):
    """Configurable validation rules for different file types"""
    __tablename__ = "file_validation_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Rule identification
    rule_name = Column(String(100), nullable=False)
    file_type = Column(String(50), nullable=False)  # 'csv', 'xlsx', 'employee_csv', etc.
    target_table = Column(String(100), nullable=False)  # 'employees', 'benefits', etc.

    # Rule configuration
    rule_type = Column(String(50), nullable=False)  # 'required_columns', 'data_type', 'format', 'range', 'unique'
    rule_config = Column(JSON, nullable=False)  # Column mappings, validation rules

    # Settings
    is_active = Column(Boolean, default=True)
    severity = Column(String(20), default='error')  # 'error', 'warning', 'info'
    error_message = Column(String(500), nullable=True)  # Custom error message

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class SFTPConfiguration(Base):
    """Configuration for SFTP connections (future use)"""
    __tablename__ = "sftp_configurations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Connection details
    name = Column(String(100), nullable=False)  # 'Paylocity Production'
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=22)
    username = Column(String(100), nullable=False)

    # Authentication
    auth_type = Column(String(20), default='key')  # 'key', 'password'
    private_key_path = Column(String(500), nullable=True)  # Path to private key file

    # Remote settings
    remote_directory = Column(String(500), default='/')
    file_pattern = Column(String(100), default='*.csv')  # Glob pattern for files to download

    # Polling configuration
    poll_frequency = Column(Integer, default=60)  # Minutes between polls
    is_active = Column(Boolean, default=False)

    # Status
    last_poll_at = Column(DateTime, nullable=True)
    last_poll_status = Column(String(50), nullable=True)  # 'success', 'failed'
    last_error = Column(String(1000), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class FMLALeaveRequest(Base):
    """
    FMLA Notice of Eligibility and Rights & Responsibilities (WH-381)
    Tracks FMLA leave requests and generates DOL Form WH-381 notices
    """
    __tablename__ = "fmla_leave_requests"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Dates (Manual Entry by HR)
    request_date = Column(Date, nullable=False, comment="Date we learned employee needs leave")
    leave_start_date = Column(Date, nullable=False, comment="Date leave begins")
    leave_end_date = Column(Date, nullable=True, comment="Expected end date (if known)")

    # Leave Reason (Manual Selection by HR)
    leave_reason = Column(
        String(50),
        nullable=False,
        comment="birth_adoption, own_health, family_care, military_exigency, military_caregiver"
    )
    family_relationship = Column(
        String(50),
        nullable=True,
        comment="spouse, parent, child_under_18, child_over_18_disabled, child_any_age, child, next_of_kin"
    )

    # Eligibility (Auto-Calculated)
    is_eligible = Column(Boolean, nullable=False, comment="FMLA eligibility determination")
    months_employed = Column(Float, nullable=True, comment="Months employed at leave start date")
    hours_worked_12months = Column(Integer, nullable=True, comment="Hours worked in last 12 months")
    ineligibility_reasons = Column(JSON, nullable=True, comment="Array of reasons if not eligible")

    # Certification Requirements (Manual Entry by HR)
    certification_required = Column(Boolean, default=False, comment="Does employee need to provide certification")
    certification_type = Column(
        String(100),
        nullable=True,
        comment="health_care_provider_employee, health_care_provider_family, qualifying_exigency, military_caregiver"
    )
    certification_due_date = Column(Date, nullable=True, comment="Date certification must be returned (usually request_date + 30 days)")
    certification_attached = Column(Boolean, default=False, comment="Was certification form attached to notice")
    relationship_cert_required = Column(Boolean, default=False, comment="Does relationship need certification")

    # Key Employee Determination (Manual/Auto)
    is_key_employee = Column(Boolean, default=False, comment="Is employee a key employee per FMLA definition")
    restoration_determined = Column(Boolean, default=False, comment="Has restoration decision been made")

    # Paid Leave Policy (From Config + Manual Override)
    some_unpaid = Column(Boolean, default=True, comment="Some/all leave will be unpaid")
    employer_requires_paid = Column(Boolean, default=True, comment="Employer requires use of paid leave")
    other_leave_arrangement = Column(String(200), nullable=True, comment="Other leave arrangements (e.g., disability)")

    # Form Generation and Delivery
    filled_form_path = Column(String(500), nullable=True, comment="Path to filled PDF form")
    notice_sent_date = Column(DateTime, nullable=True, comment="When notice was sent to employee")
    notice_sent_method = Column(String(50), nullable=True, comment="email, print, mail")

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(100), nullable=False, comment="User who created the request")
    updated_at = Column(DateTime, onupdate=func.now())
    status = Column(
        String(50),
        default="draft",
        comment="draft, notice_generated, sent_to_employee, acknowledged, active, completed, cancelled"
    )

    # Notes
    internal_notes = Column(Text, nullable=True, comment="Internal HR notes about this request")

    # Relationships
    employee = relationship("Employee", back_populates="fmla_leave_requests")


class FilledPdfForm(Base):
    """
    Tracks all filled PDF forms generated by the system
    Generic table for any PDF form filling (FMLA, benefits, etc.)
    """
    __tablename__ = "filled_pdf_forms"

    id = Column(Integer, primary_key=True)

    # Form Type and Template
    form_type = Column(String(100), nullable=False, comment="fmla_wh381, benefits_enrollment, etc.")
    template_name = Column(String(200), nullable=False, comment="Original template filename")
    template_version = Column(String(50), nullable=True, comment="Version of template used")

    # Employee Reference
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # File Storage
    file_path = Column(String(500), nullable=False, comment="Path to filled PDF file")
    file_size = Column(Integer, nullable=True, comment="File size in bytes")
    is_flattened = Column(Boolean, default=True, comment="Is form flattened (non-editable)")

    # Form Data
    form_data = Column(JSON, nullable=True, comment="JSON snapshot of data used to fill form")
    field_mappings = Column(JSON, nullable=True, comment="Field name to value mappings")

    # Generation Metadata
    generated_at = Column(DateTime, server_default=func.now())
    generated_by = Column(String(100), nullable=False, comment="User who generated the form")

    # Delivery Tracking
    delivered_at = Column(DateTime, nullable=True)
    delivery_method = Column(String(50), nullable=True, comment="email, print, download, mail")
    delivered_to = Column(String(200), nullable=True, comment="Email address or recipient name")

    # Status
    status = Column(String(50), default="generated", comment="generated, delivered, archived, voided")

    # Relationships
    employee = relationship("Employee", back_populates="filled_pdf_forms")


# ============================================================================
# PAYROLL MANAGEMENT
# ============================================================================

class PayrollPeriod(Base):
    """
    Payroll Period - Biweekly pay periods with associated tasks and notes
    26 pay periods per year, Monday-Sunday with payday on Friday following period end
    """
    __tablename__ = "payroll_periods"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, index=True, comment="Year of the payroll period")
    period_number = Column(Integer, nullable=False, comment="Period number (1-26)")
    start_date = Column(Date, nullable=False, comment="Monday start of pay period")
    end_date = Column(Date, nullable=False, comment="Sunday end of pay period")
    payday = Column(Date, nullable=False, comment="Friday following period end")
    
    # Status
    status = Column(String(50), default="upcoming", comment="upcoming, in_progress, completed")
    employer_funding = Column(Boolean, default=True, comment="Fund employer portion of medical insurance")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True, comment="When payroll was submitted")
    processed_by = Column(String(100), nullable=True, comment="Username who processed")
    
    # Notes
    notes = Column(Text, nullable=True, comment="General notes for this payroll period")
    notes_history = Column(JSON, nullable=True, comment="History of note changes")
    
    # Relationships
    tasks = relationship("PayrollTask", back_populates="payroll_period", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PayrollPeriod {self.year}-P{self.period_number}: {self.start_date} to {self.end_date}>"


class PayrollTask(Base):
    """
    Payroll Task Checklist - Hierarchical tasks for payroll processing
    """
    __tablename__ = "payroll_tasks"

    id = Column(Integer, primary_key=True, index=True)
    payroll_period_id = Column(Integer, ForeignKey("payroll_periods.id"), nullable=False)
    
    # Task details
    title = Column(String(200), nullable=False, comment="Task title")
    description = Column(Text, nullable=True, comment="Task description/notes")
    task_type = Column(String(50), nullable=False, comment="main, sub")
    order_index = Column(Integer, nullable=False, comment="Display order")
    parent_task_id = Column(Integer, ForeignKey("payroll_tasks.id"), nullable=True, comment="Parent task for subtasks")
    
    # Instructions
    instructions = Column(Text, nullable=True, comment="Detailed instructions for the task")
    path_reference = Column(String(500), nullable=True, comment="Path in Paylocity (e.g., HR & Payroll > Approvals)")
    
    # Status
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String(100), nullable=True)
    
    # Toggles/Special fields
    has_toggle = Column(Boolean, default=False, comment="Task has a yes/no toggle")
    toggle_value = Column(Boolean, nullable=True, comment="Value of the toggle")
    toggle_label = Column(String(100), nullable=True, comment="Label for the toggle")
    
    # Email button
    has_email_button = Column(Boolean, default=False, comment="Task has send email button")
    email_template_name = Column(String(100), nullable=True, comment="Email template to use")
    
    # History
    uncheck_history = Column(JSON, nullable=True, comment="History of unchecking")
    notes_history = Column(JSON, nullable=True, comment="History of note changes")
    notes = Column(Text, nullable=True, comment="Task-specific notes")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    payroll_period = relationship("PayrollPeriod", back_populates="tasks")
    subtasks = relationship("PayrollTask", back_populates="parent_task", cascade="all, delete-orphan")
    parent_task = relationship("PayrollTask", remote_side=[id], back_populates="subtasks")
    
    def __repr__(self):
        return f"<PayrollTask {self.id}: {self.title}>"


# ==================== CAPITALIZED LABOR TRACKING MODELS ====================

class Project(Base):
    """Project for capitalized labor tracking."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(50), unique=True, nullable=False, index=True, comment="Unique project code (e.g., PROJ-2024-001)")
    project_name = Column(String(200), nullable=False, comment="Human-readable project name")
    description = Column(Text, nullable=True, comment="Detailed project description")

    # Capitalization settings
    is_capitalizable = Column(Boolean, default=False, nullable=False, comment="Whether labor on this project can be capitalized")
    capitalization_type = Column(String(50), nullable=True, comment="Type: 'software_development', 'asset_construction', 'other'")
    capitalization_start_date = Column(Date, nullable=True, comment="Date when capitalization begins (project feasibility complete)")
    capitalization_end_date = Column(Date, nullable=True, comment="Date when capitalization ends (asset placed in service)")

    # Project classification
    department = Column(String(100), nullable=True, comment="Department responsible for project")
    cost_center = Column(String(50), nullable=True, comment="Cost center for project expenses")
    project_manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True, comment="Employee ID of project manager")

    # Financial tracking
    total_budget = Column(Float, nullable=True, comment="Total project budget")
    labor_budget = Column(Float, nullable=True, comment="Labor budget for project")
    total_labor_cost = Column(Float, default=0.0, comment="Total labor cost accumulated")
    total_capitalized_cost = Column(Float, default=0.0, comment="Total capitalized labor cost")

    # Status and dates
    status = Column(String(50), default="active", nullable=False, comment="Status: 'active', 'completed', 'on_hold', 'cancelled'")
    start_date = Column(Date, nullable=True, comment="Project start date")
    end_date = Column(Date, nullable=True, comment="Actual or planned end date")

    # Asset tracking (for capitalized projects)
    asset_id = Column(String(100), nullable=True, comment="Asset ID if capitalized as fixed asset")
    amortization_period_months = Column(Integer, nullable=True, comment="Amortization period in months (e.g., 36 for 3 years)")
    amortization_start_date = Column(Date, nullable=True, comment="Date when amortization begins")

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    project_manager = relationship("Employee", foreign_keys=[project_manager_id])
    time_entries = relationship("TimeEntry", back_populates="project")
    capitalization_calculations = relationship("CapitalizationCalculation", back_populates="project")

    def __repr__(self):
        return f"<Project {self.project_code}: {self.project_name}>"


class PayPeriod(Base):
    """Pay period for time tracking."""
    __tablename__ = "pay_periods"

    id = Column(Integer, primary_key=True, index=True)
    period_number = Column(Integer, nullable=False, comment="Pay period number in year (1-26 for bi-weekly)")
    year = Column(Integer, nullable=False, comment="Calendar year")

    # Period dates
    start_date = Column(Date, nullable=False, index=True, comment="First day of pay period")
    end_date = Column(Date, nullable=False, index=True, comment="Last day of pay period")
    pay_date = Column(Date, nullable=True, comment="Date when employees are paid")

    # Status
    status = Column(String(50), default="open", nullable=False, comment="Status: 'open', 'locked', 'processed', 'finalized'")
    locked_at = Column(DateTime(timezone=True), nullable=True, comment="When period was locked for processing")
    locked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    timesheets = relationship("Timesheet", back_populates="pay_period")

    def __repr__(self):
        return f"<PayPeriod {self.year}-{self.period_number}: {self.start_date} to {self.end_date}>"


class Timesheet(Base):
    """Weekly timesheet for employee time tracking."""
    __tablename__ = "timesheets"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    pay_period_id = Column(Integer, ForeignKey("pay_periods.id"), nullable=False, index=True)

    # Totals
    total_hours = Column(Float, default=0.0, comment="Total hours for timesheet")
    regular_hours = Column(Float, default=0.0, comment="Regular hours (up to 40/week)")
    overtime_hours = Column(Float, default=0.0, comment="Overtime hours (over 40/week)")

    # Workflow status
    status = Column(String(50), default="draft", nullable=False, comment="Status: 'draft', 'submitted', 'approved', 'rejected', 'needs_revision'")
    submitted_at = Column(DateTime(timezone=True), nullable=True, comment="When employee submitted timesheet")
    approved_at = Column(DateTime(timezone=True), nullable=True, comment="When manager approved timesheet")
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="Manager who approved")

    # Rejection/revision tracking
    rejection_reason = Column(Text, nullable=True, comment="Reason for rejection or revision request")
    revision_count = Column(Integer, default=0, comment="Number of times revised")

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    pay_period = relationship("PayPeriod", back_populates="timesheets")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    time_entries = relationship("TimeEntry", back_populates="timesheet", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Timesheet {self.id}: Employee {self.employee_id}, Period {self.pay_period_id}>"


class TimeEntry(Base):
    """Individual time entry for a specific project/task."""
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    # Time details
    work_date = Column(Date, nullable=False, index=True, comment="Date work was performed")
    clock_in = Column(DateTime(timezone=True), nullable=True, comment="Clock in timestamp")
    clock_out = Column(DateTime(timezone=True), nullable=True, comment="Clock out timestamp")
    hours = Column(Float, nullable=False, comment="Total hours worked")

    # Labor classification
    labor_type = Column(String(50), default="direct", nullable=False, comment="Type: 'direct', 'indirect', 'overhead'")
    is_overtime = Column(Boolean, default=False, comment="Whether this is overtime hours")

    # Task details
    task_description = Column(Text, nullable=True, comment="Description of work performed")
    task_code = Column(String(50), nullable=True, comment="Task/WBS code if applicable")

    # Capitalization
    is_capitalizable = Column(Boolean, default=False, comment="Whether these hours are capitalizable")
    capitalization_category = Column(String(100), nullable=True, comment="Category for capitalization reporting")

    # Cost calculation (for admin view)
    labor_rate_at_entry = Column(Float, nullable=True, comment="Fully burdened rate at time of entry (audit snapshot)")
    fully_burdened_cost = Column(Float, nullable=True, comment="Calculated fully burdened cost for this entry")
    import_source_id = Column(Integer, ForeignKey("labor_data_imports.id"), nullable=True, comment="Source import if from file upload")

    # Approval and editing
    is_approved = Column(Boolean, default=False, comment="Whether this entry has been approved")
    is_edited = Column(Boolean, default=False, comment="Whether entry was edited after initial creation")
    edited_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="User who edited the entry")
    edited_at = Column(DateTime(timezone=True), nullable=True, comment="When entry was last edited")
    edit_reason = Column(Text, nullable=True, comment="Reason for edit")

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    timesheet = relationship("Timesheet", back_populates="time_entries")
    employee = relationship("Employee", foreign_keys=[employee_id])
    project = relationship("Project", back_populates="time_entries")
    edited_by = relationship("User", foreign_keys=[edited_by_id])
    audit_logs = relationship("TimeEntryAudit", back_populates="time_entry", cascade="all, delete-orphan")
    import_source = relationship("LaborDataImport", foreign_keys=[import_source_id])

    def __repr__(self):
        return f"<TimeEntry {self.id}: {self.employee_id} - {self.work_date} - {self.hours}h>"


class TimeEntryAudit(Base):
    """Immutable audit log for time entry changes."""
    __tablename__ = "time_entry_audit"

    id = Column(Integer, primary_key=True, index=True)
    time_entry_id = Column(Integer, ForeignKey("time_entries.id"), nullable=False, index=True)

    # Audit details
    action = Column(String(50), nullable=False, comment="Action: 'created', 'updated', 'deleted', 'approved', 'rejected'")
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Changed data (store as JSON for flexibility)
    old_values = Column(JSON, nullable=True, comment="Previous values before change")
    new_values = Column(JSON, nullable=True, comment="New values after change")
    changed_fields = Column(JSON, nullable=True, comment="List of fields that changed")

    # Context
    change_reason = Column(Text, nullable=True, comment="Reason for change")
    ip_address = Column(String(45), nullable=True, comment="IP address of user making change")
    user_agent = Column(String(500), nullable=True, comment="Browser/client user agent")

    # Relationships
    time_entry = relationship("TimeEntry", back_populates="audit_logs")
    changed_by = relationship("User", foreign_keys=[changed_by_id])

    def __repr__(self):
        return f"<TimeEntryAudit {self.id}: {self.action} on Entry {self.time_entry_id}>"


class PayrollBatch(Base):
    """Payroll batch for integrating with payroll processing."""
    __tablename__ = "payroll_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(50), unique=True, nullable=False, index=True)
    pay_period_id = Column(Integer, ForeignKey("pay_periods.id"), nullable=False)

    # Batch details
    batch_date = Column(Date, nullable=False, comment="Date batch was created")
    process_date = Column(Date, nullable=True, comment="Date batch was processed")
    status = Column(String(50), default="pending", nullable=False, comment="Status: 'pending', 'processing', 'completed', 'error'")

    # Totals
    total_employees = Column(Integer, default=0, comment="Number of employees in batch")
    total_hours = Column(Float, default=0.0, comment="Total hours in batch")
    total_regular_hours = Column(Float, default=0.0)
    total_overtime_hours = Column(Float, default=0.0)
    total_gross_pay = Column(Float, default=0.0, comment="Total gross pay amount")

    # Integration
    export_file_path = Column(String(500), nullable=True, comment="Path to exported payroll file")
    exported_at = Column(DateTime(timezone=True), nullable=True)
    exported_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Error tracking
    error_message = Column(Text, nullable=True)
    error_count = Column(Integer, default=0)

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    pay_period = relationship("PayPeriod")
    line_items = relationship("PayrollBatchLineItem", back_populates="batch", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PayrollBatch {self.batch_number}: {self.status}>"


class PayrollBatchLineItem(Base):
    """Individual line item in payroll batch."""
    __tablename__ = "payroll_batch_line_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("payroll_batches.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"), nullable=False)

    # Hours breakdown
    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    total_hours = Column(Float, default=0.0)

    # Pay breakdown
    regular_pay = Column(Float, default=0.0)
    overtime_pay = Column(Float, default=0.0)
    gross_pay = Column(Float, default=0.0)

    # Labor cost breakdown
    direct_labor_hours = Column(Float, default=0.0, comment="Hours on direct labor projects")
    indirect_labor_hours = Column(Float, default=0.0, comment="Hours on indirect labor")
    capitalizable_hours = Column(Float, default=0.0, comment="Hours eligible for capitalization")
    capitalizable_cost = Column(Float, default=0.0, comment="Cost eligible for capitalization")

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    batch = relationship("PayrollBatch", back_populates="line_items")
    employee = relationship("Employee")
    timesheet = relationship("Timesheet")

    def __repr__(self):
        return f"<PayrollBatchLineItem {self.id}: Employee {self.employee_id}>"


class CapitalizationCalculation(Base):
    """Monthly capitalization calculation for projects."""
    __tablename__ = "capitalization_calculations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    # Period
    calculation_month = Column(Integer, nullable=False, comment="Month (1-12)")
    calculation_year = Column(Integer, nullable=False, comment="Year")
    calculation_date = Column(Date, nullable=False, index=True, comment="Date calculation was performed")

    # Labor totals
    total_hours = Column(Float, default=0.0, comment="Total labor hours for period")
    direct_labor_hours = Column(Float, default=0.0)
    indirect_labor_hours = Column(Float, default=0.0)

    # Cost totals
    total_labor_cost = Column(Float, default=0.0, comment="Total labor cost for period")
    direct_labor_cost = Column(Float, default=0.0)
    indirect_labor_cost = Column(Float, default=0.0)
    overhead_allocation = Column(Float, default=0.0, comment="Allocated overhead costs")

    # Capitalization amounts
    capitalizable_labor_cost = Column(Float, default=0.0, comment="Labor cost eligible for capitalization")
    capitalized_amount = Column(Float, default=0.0, comment="Actual amount capitalized (may differ due to limits)")
    non_capitalized_amount = Column(Float, default=0.0, comment="Amount expensed instead of capitalized")

    # Accounting entries
    journal_entry_number = Column(String(50), nullable=True, comment="GL journal entry number")
    posted_to_gl = Column(Boolean, default=False, comment="Whether posted to general ledger")
    posted_at = Column(DateTime(timezone=True), nullable=True)

    # Compliance and documentation
    calculation_notes = Column(Text, nullable=True, comment="Notes about calculation methodology or exceptions")
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="User who reviewed calculation")
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    approval_status = Column(String(50), default="pending", comment="Status: 'pending', 'approved', 'rejected'")

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="capitalization_calculations")

    def __repr__(self):
        return f"<CapitalizationCalculation {self.id}: Project {self.project_id} - {self.calculation_year}-{self.calculation_month:02d}>"


class CapitalizationAuditLog(Base):
    """Immutable audit log for capitalization-related actions."""
    __tablename__ = "capitalization_audit_log"

    id = Column(Integer, primary_key=True, index=True)

    # Entity tracking
    entity_type = Column(String(100), nullable=False, comment="Type: 'project', 'calculation', 'timesheet', 'time_entry'")
    entity_id = Column(Integer, nullable=False, index=True, comment="ID of the entity")

    # Action details
    action = Column(String(100), nullable=False, comment="Action performed")
    action_category = Column(String(50), nullable=False, comment="Category: 'create', 'update', 'delete', 'approve', 'post', 'export'")

    # User and context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_role = Column(String(50), nullable=True, comment="User's role at time of action")
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Change details
    old_values = Column(JSON, nullable=True, comment="Previous state")
    new_values = Column(JSON, nullable=True, comment="New state")
    changed_fields = Column(JSON, nullable=True, comment="Fields that changed")

    # Context and compliance
    change_reason = Column(Text, nullable=True, comment="Reason for change")
    ip_address = Column(String(45), nullable=True)
    session_id = Column(String(100), nullable=True)

    # SOX compliance fields
    is_financial_impact = Column(Boolean, default=False, comment="Whether change impacts financial statements")
    requires_approval = Column(Boolean, default=False, comment="Whether change requires additional approval")
    approval_status = Column(String(50), nullable=True, comment="Approval status if required")

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<CapitalizationAuditLog {self.id}: {self.action} on {self.entity_type} {self.entity_id}>"


# ==================== CAPITALIZED LABOR ADMIN MODELS ====================


class EmployeeLaborRate(Base):
    """Point-in-time fully burdened labor rates for cost calculations.

    Stores historical labor rates to ensure accurate cost calculations
    even when rates change. Each rate record has an effective date range.
    """
    __tablename__ = "employee_labor_rates"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)

    # Effective dates (for historical rate preservation)
    effective_date = Column(Date, nullable=False, index=True, comment="Date this rate becomes effective")
    end_date = Column(Date, nullable=True, comment="Date this rate ends (NULL = currently active)")

    # Base compensation
    hourly_rate = Column(Float, nullable=False, comment="Base hourly rate")
    overtime_multiplier = Column(Float, default=1.5, comment="Overtime rate multiplier (default 1.5x)")

    # Benefits burden
    benefits_hourly = Column(Float, default=0.0, comment="Hourly benefits cost")
    benefits_percentage = Column(Float, nullable=True, comment="Alternative: benefits as % of base wage")

    # Employer taxes burden
    employer_taxes_hourly = Column(Float, default=0.0, comment="Hourly employer tax cost")
    employer_taxes_percentage = Column(Float, nullable=True, comment="Employer tax rate (FICA, FUTA, SUTA)")

    # Overhead allocation
    overhead_rate_hourly = Column(Float, default=0.0, comment="Hourly overhead allocation")
    overhead_rate_percentage = Column(Float, nullable=True, comment="Overhead as % of base wage")

    # Fully burdened rate (calculated)
    fully_burdened_rate = Column(Float, nullable=False, comment="Total fully burdened hourly cost")

    # Source and audit trail
    rate_source = Column(String(50), default="manual", comment="Source: 'payroll_import', 'manual', 'calculated'")
    calculation_methodology = Column(Text, nullable=True, comment="Documentation of how rate was derived")

    # Locking (after period close)
    is_locked = Column(Boolean, default=False, comment="Locked after period close - prevents changes")
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    locked_by = relationship("User", foreign_keys=[locked_by_id])

    __table_args__ = (
        Index('ix_employee_labor_rates_employee_effective', 'employee_id', 'effective_date'),
    )

    def __repr__(self):
        return f"<EmployeeLaborRate {self.id}: Employee {self.employee_id} @ ${self.fully_burdened_rate:.2f}/hr from {self.effective_date}>"


class LaborDataImport(Base):
    """Tracks imported time and payroll data files for audit and reconciliation."""
    __tablename__ = "labor_data_imports"

    id = Column(Integer, primary_key=True, index=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True, index=True)

    # Import identification
    import_type = Column(String(50), nullable=False, comment="Type: 'time_data', 'payroll_data', 'rate_data'")
    import_name = Column(String(255), nullable=True, comment="User-friendly name for this import")
    file_name = Column(String(255), nullable=True, comment="Original filename")

    # Period association
    pay_period_id = Column(Integer, ForeignKey("pay_periods.id"), nullable=True, index=True)
    capitalization_period_id = Column(Integer, ForeignKey("capitalization_periods.id"), nullable=True, index=True)

    # Date range of imported data
    start_date = Column(Date, nullable=False, comment="Start date of data in import")
    end_date = Column(Date, nullable=False, comment="End date of data in import")

    # Import metadata
    import_date = Column(DateTime(timezone=True), server_default=func.now())
    imported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Column mapping used (store for reproducibility)
    column_mapping = Column(JSON, nullable=True, comment="Column mapping configuration used")

    # Statistics
    total_records = Column(Integer, default=0, comment="Total records in file")
    successful_records = Column(Integer, default=0, comment="Records successfully imported")
    failed_records = Column(Integer, default=0, comment="Records that failed validation/import")
    warning_records = Column(Integer, default=0, comment="Records imported with warnings")
    skipped_records = Column(Integer, default=0, comment="Records skipped (duplicates, etc.)")

    # Validation
    validation_status = Column(String(50), default="pending", comment="Status: 'pending', 'validated', 'errors', 'warnings'")
    validation_errors = Column(JSON, nullable=True, comment="Detailed validation error messages")
    validation_warnings = Column(JSON, nullable=True, comment="Validation warnings")

    # Reconciliation (for payroll imports)
    source_total_hours = Column(Float, nullable=True, comment="Total hours from import file")
    calculated_total_hours = Column(Float, nullable=True, comment="Total hours calculated from system")
    hours_variance = Column(Float, nullable=True, comment="Difference between source and calculated")
    source_total_cost = Column(Float, nullable=True, comment="Total cost from import file")
    calculated_total_cost = Column(Float, nullable=True, comment="Total cost calculated from system")
    cost_variance = Column(Float, nullable=True, comment="Difference between source and calculated cost")
    reconciliation_status = Column(String(50), nullable=True, comment="Status: 'matched', 'variance', 'unreconciled'")
    reconciliation_notes = Column(Text, nullable=True, comment="Notes about reconciliation")

    # Status workflow
    status = Column(String(50), default="pending", nullable=False,
                   comment="Status: 'pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'rolled_back'")
    error_message = Column(Text, nullable=True, comment="Error message if failed")
    processed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Rollback support
    is_rolled_back = Column(Boolean, default=False)
    rolled_back_at = Column(DateTime(timezone=True), nullable=True)
    rolled_back_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rollback_reason = Column(Text, nullable=True)

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    file_upload = relationship("FileUpload", foreign_keys=[file_upload_id])
    pay_period = relationship("PayPeriod", foreign_keys=[pay_period_id])
    imported_by = relationship("User", foreign_keys=[imported_by_id])
    rolled_back_by = relationship("User", foreign_keys=[rolled_back_by_id])

    def __repr__(self):
        return f"<LaborDataImport {self.id}: {self.import_type} - {self.status}>"


class CapitalizationPeriod(Base):
    """Reporting periods for capitalization calculations with locking and approval workflow.

    Supports monthly, quarterly, and annual periods with hierarchical relationships.
    """
    __tablename__ = "capitalization_periods"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(String(50), unique=True, nullable=False, index=True, comment="Unique ID like 'CAP-2025-01'")

    # Period definition
    period_type = Column(String(20), nullable=False, comment="Type: 'monthly', 'quarterly', 'annual'")
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=True, comment="Month 1-12 for monthly periods")
    quarter = Column(Integer, nullable=True, comment="Quarter 1-4 for quarterly periods")

    # Date range
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)

    # Parent period (for hierarchy: monthly -> quarterly -> annual)
    parent_period_id = Column(Integer, ForeignKey("capitalization_periods.id"), nullable=True)

    # Status workflow
    status = Column(String(50), default="open", nullable=False,
                   comment="Status: 'open', 'calculating', 'in_review', 'approved', 'locked', 'closed'")

    # Calculation tracking
    last_calculated_at = Column(DateTime(timezone=True), nullable=True)
    calculated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    calculation_version = Column(Integer, default=0, comment="Version number of calculations")

    # Submission for approval
    submitted_for_approval_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submission_notes = Column(Text, nullable=True)

    # Approval
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_notes = Column(Text, nullable=True)

    # Rejection (if not approved)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Locking (final close)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    lock_reason = Column(Text, nullable=True)

    # Cached totals (updated on calculation)
    total_hours = Column(Float, default=0.0, comment="Total approved hours in period")
    total_regular_hours = Column(Float, default=0.0)
    total_overtime_hours = Column(Float, default=0.0)
    total_capitalizable_hours = Column(Float, default=0.0, comment="Hours on capitalizable projects")
    total_non_capitalizable_hours = Column(Float, default=0.0)
    total_direct_hours = Column(Float, default=0.0)
    total_indirect_hours = Column(Float, default=0.0)
    total_overhead_hours = Column(Float, default=0.0)

    # Cached cost totals
    total_labor_cost = Column(Float, default=0.0, comment="Total fully burdened labor cost")
    total_capitalized_cost = Column(Float, default=0.0, comment="Total cost capitalized")
    total_expensed_cost = Column(Float, default=0.0, comment="Total cost expensed")

    # Metrics
    capitalization_rate = Column(Float, default=0.0, comment="Capitalized hours / total hours %")
    employee_count = Column(Integer, default=0, comment="Number of employees with time in period")
    project_count = Column(Integer, default=0, comment="Number of projects with time in period")

    # Notes
    notes = Column(Text, nullable=True, comment="General notes about the period")

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    parent_period = relationship("CapitalizationPeriod", remote_side=[id], backref="child_periods")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    rejected_by = relationship("User", foreign_keys=[rejected_by_id])
    locked_by = relationship("User", foreign_keys=[locked_by_id])
    calculated_by = relationship("User", foreign_keys=[calculated_by_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    employee_summaries = relationship("EmployeeCapitalizationSummary", back_populates="period", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_cap_periods_year_type', 'year', 'period_type'),
        Index('ix_cap_periods_dates', 'start_date', 'end_date'),
    )

    def __repr__(self):
        return f"<CapitalizationPeriod {self.period_id}: {self.status}>"


class EmployeeCapitalizationSummary(Base):
    """Pre-aggregated employee-level capitalization data per period.

    This table caches calculated data for efficient reporting and reduces
    the need to recalculate from raw time entries.
    """
    __tablename__ = "employee_capitalization_summaries"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    period_id = Column(Integer, ForeignKey("capitalization_periods.id"), nullable=False, index=True)

    # Hours breakdown
    total_hours = Column(Float, default=0.0, comment="Total hours in period")
    regular_hours = Column(Float, default=0.0, comment="Non-overtime hours")
    overtime_hours = Column(Float, default=0.0, comment="Overtime hours")
    direct_hours = Column(Float, default=0.0, comment="Direct labor hours")
    indirect_hours = Column(Float, default=0.0, comment="Indirect labor hours")
    overhead_hours = Column(Float, default=0.0, comment="Overhead labor hours")
    capitalizable_hours = Column(Float, default=0.0, comment="Hours on capitalizable projects")
    non_capitalizable_hours = Column(Float, default=0.0, comment="Hours on non-capitalizable projects")

    # Cost breakdown (using fully burdened rates)
    base_labor_cost = Column(Float, default=0.0, comment="Base wage cost (hours * hourly rate)")
    overtime_premium_cost = Column(Float, default=0.0, comment="OT premium (OT hours * base * 0.5)")
    benefits_cost = Column(Float, default=0.0, comment="Benefits cost allocation")
    employer_taxes_cost = Column(Float, default=0.0, comment="Employer tax cost allocation")
    overhead_cost = Column(Float, default=0.0, comment="Overhead cost allocation")
    fully_burdened_cost = Column(Float, default=0.0, comment="Total fully burdened cost")

    # Capitalization amounts
    capitalizable_cost = Column(Float, default=0.0, comment="Cost eligible for capitalization")
    non_capitalizable_cost = Column(Float, default=0.0, comment="Cost to be expensed")

    # Rate tracking (for audit trail - which rate was used)
    labor_rate_id = Column(Integer, ForeignKey("employee_labor_rates.id"), nullable=True)
    hourly_rate_used = Column(Float, nullable=True, comment="Base hourly rate used in calculation")
    fully_burdened_rate_used = Column(Float, nullable=True, comment="Fully burdened rate used")

    # Metrics
    capitalization_rate = Column(Float, default=0.0, comment="Capitalizable hours / total hours %")
    project_count = Column(Integer, default=0, comment="Number of unique projects worked on")

    # Breakdown by project (JSON for flexibility)
    project_breakdown = Column(JSON, nullable=True, comment="Hours/cost by project")

    # Calculation metadata
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    calculation_version = Column(Integer, default=1)

    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    period = relationship("CapitalizationPeriod", back_populates="employee_summaries")
    labor_rate = relationship("EmployeeLaborRate", foreign_keys=[labor_rate_id])

    __table_args__ = (
        Index('ix_emp_cap_summary_emp_period', 'employee_id', 'period_id', unique=True),
    )

    def __repr__(self):
        return f"<EmployeeCapitalizationSummary {self.id}: Employee {self.employee_id}, Period {self.period_id}>"


# PIP Related Models
class PIPNote(Base):
    __tablename__ = "pip_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pip_id = Column(Integer, ForeignKey("performance_improvement_plans.id"), nullable=False, index=True)
    note_text = Column(Text, nullable=False)
    note_type = Column(String, default="General")  # "General", "Progress Update", "Check-in Meeting", "Concern", "Improvement", "Action Item"
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    pip = relationship("PerformanceImprovementPlan", backref="pip_notes")


class PIPMilestone(Base):
    __tablename__ = "pip_milestones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pip_id = Column(Integer, ForeignKey("performance_improvement_plans.id"), nullable=False, index=True)
    milestone_title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="Pending")  # "Pending", "In Progress", "Completed", "Overdue"
    completed_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationship
    pip = relationship("PerformanceImprovementPlan", backref="pip_milestones")


class PIPAudit(Base):
    __tablename__ = "pip_audit_trail"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pip_id = Column(Integer, ForeignKey("performance_improvement_plans.id"), nullable=False, index=True)
    action = Column(String, nullable=False)  # "Created", "Status Changed", "Updated", "Note Added", "Milestone Added", "Document Uploaded"
    field_changed = Column(String, nullable=True)  # Which field was changed
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    pip = relationship("PerformanceImprovementPlan", backref="pip_audit_entries")


class PIPDocument(Base):
    __tablename__ = "pip_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pip_id = Column(Integer, ForeignKey("performance_improvement_plans.id"), nullable=False, index=True)
    document_name = Column(String, nullable=False)
    document_type = Column(String, default="Supporting Document")  # "Supporting Document", "Meeting Notes", "Performance Report", "Training Certificate"
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())

    # Relationship
    pip = relationship("PerformanceImprovementPlan", backref="pip_documents")


# ============================================================================
# SECURITY AUDIT LOG
# ============================================================================

class SecurityAuditLog(Base):
    """
    Comprehensive security audit log for tracking all security-relevant events.
    Used for compliance, security monitoring, and incident investigation.
    """
    __tablename__ = "security_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Event identification
    event_type = Column(String(50), nullable=False, index=True)  # LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_CHANGE, etc.
    event_category = Column(String(30), nullable=False, index=True)  # AUTH, USER_MGMT, DATA_ACCESS, DATA_MODIFY, ADMIN
    severity = Column(String(10), default="INFO")  # INFO, WARNING, CRITICAL

    # Actor information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # User who performed the action
    username = Column(String(100), nullable=True, index=True)  # Username (for failed logins where user_id might not exist)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)  # Browser/client info

    # Event details
    resource_type = Column(String(50), nullable=True)  # employee, user, fmla, garnishment, etc.
    resource_id = Column(String(50), nullable=True)  # ID of the affected resource
    action = Column(String(100), nullable=False)  # Specific action taken
    description = Column(Text, nullable=True)  # Human-readable description

    # Change tracking (for data modifications)
    old_value = Column(JSON, nullable=True)  # Previous state (for updates)
    new_value = Column(JSON, nullable=True)  # New state (for creates/updates)

    # Request context
    request_path = Column(String(500), nullable=True)  # API endpoint
    request_method = Column(String(10), nullable=True)  # GET, POST, PUT, DELETE

    # Status
    success = Column(Boolean, default=True)  # Whether the action succeeded
    error_message = Column(Text, nullable=True)  # Error details if failed

    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # Indexes for common queries
    __table_args__ = (
        Index('ix_audit_user_time', 'user_id', 'created_at'),
        Index('ix_audit_event_time', 'event_type', 'created_at'),
        Index('ix_audit_resource', 'resource_type', 'resource_id'),
    )


# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC)
# ============================================================================

class Permission(Base):
    """
    Defines granular permissions in the system.
    Permissions follow the format: resource:action or resource:action:scope
    Examples: users:read, employees:write:team, fmla:read
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "fmla:read"
    display_name = Column(String(200), nullable=False)  # e.g., "Read FMLA Cases"
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)  # e.g., "FMLA", "Users", "Employees"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")


class Role(Base):
    """
    Defines roles that group permissions together.
    Users can have multiple roles, and roles can have multiple permissions.
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "admin", "hr", "payroll"
    display_name = Column(String(100), nullable=False)  # e.g., "Administrator", "HR Manager"
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=False)  # System roles cannot be deleted
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
    users = relationship(
        "User",
        secondary="user_roles",
        primaryjoin="Role.id == UserRole.role_id",
        secondaryjoin="User.id == UserRole.user_id",
        back_populates="assigned_roles"
    )


class RolePermission(Base):
    """
    Junction table linking roles to permissions.
    """
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    # Ensure unique role-permission combinations
    __table_args__ = (
        Index('ix_role_permission_unique', 'role_id', 'permission_id', unique=True),
    )


class UserRole(Base):
    """
    Junction table linking users to roles.
    Users can have multiple roles.
    """
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who assigned this role
    assigned_at = Column(DateTime, server_default=func.now())

    # Ensure unique user-role combinations
    __table_args__ = (
        Index('ix_user_role_unique', 'user_id', 'role_id', unique=True),
    )


# =============================================================================
# CUSTOM EMAIL TEMPLATES
# =============================================================================

class CustomEmailTemplate(Base):
    """
    Custom email templates with placeholder support.
    Supports both predefined placeholders (from Employee data) and
    fillable placeholders (custom fields defined by the user).
    """
    __tablename__ = "custom_email_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(String, unique=True, index=True)  # Auto-generated "CET-001"

    # Template details
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    subject_line = Column(String, nullable=False)  # Can contain placeholders
    category = Column(String, nullable=True, index=True)  # "Onboarding", "Offboarding", "General", etc.

    # Template content
    html_content = Column(Text, nullable=False)
    plain_text_content = Column(Text, nullable=True)

    # Placeholder definitions (JSON)
    # predefined_placeholders: ["employee.first_name", "employee.department"]
    predefined_placeholders = Column(JSON, nullable=True)
    # fillable_placeholders: [{key, label, type, required, default_value, description, options}]
    fillable_placeholders = Column(JSON, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default template for a category

    # Metadata
    created_by = Column(String, nullable=True)
    last_modified_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# =============================================================================
# FMLA SELF-SERVICE PORTAL
# =============================================================================

class FMLATimeSubmission(Base):
    """
    Employee-submitted time entries pending supervisor approval.
    Part of the FMLA Self-Service Portal for employees to submit
    their FMLA time usage for supervisor review and approval.
    """
    __tablename__ = "fmla_time_submissions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("fmla_cases.id"), nullable=False, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)

    # Submission details
    leave_date = Column(Date, nullable=False)
    hours_requested = Column(Float, nullable=False)
    entry_type = Column(String)  # "Full Day", "Partial Day", "Intermittent"
    employee_notes = Column(Text, nullable=True)

    # Approval workflow
    status = Column(String, default="pending", index=True)  # pending, approved, rejected, revised
    submitted_at = Column(DateTime, server_default=func.now())
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(Text, nullable=True)

    # If supervisor modifies hours
    approved_hours = Column(Float, nullable=True)

    # Relationships
    fmla_case = relationship("FMLACase", backref="time_submissions")
    employee = relationship("Employee", backref="fmla_time_submissions")
    reviewer = relationship("User", backref="reviewed_fmla_submissions", foreign_keys=[reviewed_by])

    # Indexes for common queries
    __table_args__ = (
        Index('ix_fmla_time_submissions_status_employee', 'status', 'employee_id'),
        Index('ix_fmla_time_submissions_case_status', 'case_id', 'status'),
    )


class FMLACaseRequest(Base):
    """
    Employee-initiated FMLA leave requests.
    Allows employees to submit new FMLA leave requests through the
    self-service portal, which are then reviewed by HR.
    """
    __tablename__ = "fmla_case_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)

    # Request details
    leave_type = Column(String, nullable=False)  # "Employee Medical", "Family Care", "Military Family", "Bonding"
    reason = Column(Text, nullable=True)
    requested_start_date = Column(Date, nullable=False)
    requested_end_date = Column(Date, nullable=True)
    intermittent = Column(Boolean, default=False)
    reduced_schedule = Column(Boolean, default=False)
    estimated_hours_per_week = Column(Float, nullable=True)

    # Workflow
    status = Column(String, default="submitted", index=True)  # submitted, under_review, approved, denied
    submitted_at = Column(DateTime, server_default=func.now())
    hr_notes = Column(Text, nullable=True)
    linked_case_id = Column(Integer, ForeignKey("fmla_cases.id"), nullable=True)

    # Relationships
    employee = relationship("Employee", backref="fmla_case_requests")
    linked_case = relationship("FMLACase", backref="source_request")

    # Indexes
    __table_args__ = (
        Index('ix_fmla_case_requests_status_employee', 'status', 'employee_id'),
    )


class FMLASupervisorAuditLog(Base):
    """
    Audit trail for all supervisor actions in the FMLA portal.
    Required for compliance - tracks all approvals, rejections,
    modifications with before/after values and mandatory reasons.
    """
    __tablename__ = "fmla_supervisor_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)

    # Action details
    action_type = Column(String, nullable=False, index=True)  # approved, rejected, modified, viewed
    target_type = Column(String, nullable=False)  # time_submission, case_request
    target_id = Column(Integer, nullable=False)

    # Change tracking
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    reason_for_change = Column(Text, nullable=False)  # Required for all modifications

    created_at = Column(DateTime, server_default=func.now())
    ip_address = Column(String, nullable=True)

    # Relationships
    supervisor = relationship("User", backref="fmla_audit_actions", foreign_keys=[supervisor_id])
    employee = relationship("Employee", backref="fmla_audit_log")

    # Indexes for reporting
    __table_args__ = (
        Index('ix_fmla_audit_supervisor_date', 'supervisor_id', 'created_at'),
        Index('ix_fmla_audit_employee_date', 'employee_id', 'created_at'),
        Index('ix_fmla_audit_action_type', 'action_type', 'created_at'),
    )


# ============================================================================
# EMPLOYEE PORTAL - PTO REQUESTS
# ============================================================================

class PTORequest(Base):
    """
    PTO (Paid Time Off) request tracking.
    Supports vacation, sick, and personal time requests.
    """
    __tablename__ = "pto_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)

    # Request details
    request_date = Column(DateTime, server_default=func.now())
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    pto_type = Column(String, nullable=False)  # vacation, sick, personal
    hours_requested = Column(Float, nullable=False)
    employee_notes = Column(Text, nullable=True)

    # Workflow
    status = Column(String, default="pending", index=True)  # pending, approved, denied, cancelled
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", backref="pto_requests")
    reviewer = relationship("User", backref="pto_reviews", foreign_keys=[reviewer_id])

    # Indexes
    __table_args__ = (
        Index('ix_pto_requests_status_employee', 'status', 'employee_id'),
        Index('ix_pto_requests_dates', 'start_date', 'end_date'),
    )


# ============================================================================
# EMPLOYEE PORTAL - PERSONNEL ACTION REQUESTS (PARs)
# ============================================================================

class PersonnelActionRequest(Base):
    """
    Personnel Action Request (PAR) for supervisor-initiated HR changes.
    Tracks salary changes, promotions, title changes, transfers, etc.
    """
    __tablename__ = "personnel_action_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False, index=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Request details
    action_type = Column(String, nullable=False)  # salary_change, title_change, promotion, transfer, demotion, termination
    effective_date = Column(Date, nullable=False)
    current_value = Column(String, nullable=False)
    proposed_value = Column(String, nullable=False)
    justification = Column(Text, nullable=False)

    # Workflow
    status = Column(String, default="pending", index=True)  # pending, approved, denied, processing, completed
    submitted_at = Column(DateTime, server_default=func.now())
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(Text, nullable=True)

    # Relationships
    employee = relationship("Employee", backref="personnel_action_requests")
    submitter = relationship("User", backref="submitted_pars", foreign_keys=[submitted_by])
    reviewer = relationship("User", backref="reviewed_pars", foreign_keys=[reviewed_by])

    # Indexes
    __table_args__ = (
        Index('ix_pars_status_employee', 'status', 'employee_id'),
        Index('ix_pars_submitted_by', 'submitted_by', 'status'),
    )


# ============================================================================
# EMPLOYEE PORTAL - HR RESOURCES
# ============================================================================

class HRResource(Base):
    """
    HR Resources such as employee handbook, FAQs, policies, and forms.
    Supports versioning, markdown content, and hierarchical structure.
    """
    __tablename__ = "hr_resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, nullable=False, index=True)  # handbook_chapter, handbook_section, benefits_category, benefits_plan, benefits_config, faq, form
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)  # HTML/Markdown content
    description = Column(Text, nullable=True)  # Short description
    file_path = Column(String, nullable=True)  # For downloadable files
    category = Column(String, nullable=True, index=True)
    sort_order = Column(Integer, default=0)
    parent_id = Column(Integer, ForeignKey("hr_resources.id"), nullable=True, index=True)
    metadata_json = Column(Text, nullable=True)  # JSON for type-specific fields

    # Metadata
    version = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    creator = relationship("User", backref="created_resources")
    parent = relationship("HRResource", remote_side=[id], backref="children")


# ============================================================================
# EMPLOYEE DOCUMENTS (managed via Content Management)
# ============================================================================

class EmployeeDocument(Base):
    """
    Per-employee documents such as pay stubs, W-2s, offer letters, etc.
    Managed by HR through the Content Management page.
    """
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    document_type = Column(String, nullable=False)  # pay_stub, w2, offer_letter, benefits_summary, tax_form, other
    category = Column(String, nullable=False)  # Pay Stubs, Tax Forms, Benefits, Offer Letters, Other
    document_date = Column(Date, nullable=False)
    file_size = Column(String, nullable=True)
    file_path = Column(String, nullable=True)  # Path to uploaded file on disk
    download_url = Column(String, nullable=True)  # External URL (alternative to file upload)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    employee = relationship("Employee", backref="documents")
    creator = relationship("User", backref="created_employee_documents", foreign_keys=[created_by])


# ============================================================================
# EMPLOYEE PORTAL - UNIFIED AUDIT LOG
# ============================================================================

class PortalAuditLog(Base):
    """
    Unified audit log for all employee portal actions.
    Tracks views, submissions, approvals, and downloads across all portal modules.
    """
    __tablename__ = "portal_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Action details
    action = Column(String, nullable=False, index=True)  # view, submit, approve, deny, download, update
    resource_type = Column(String, nullable=False, index=True)  # pto, fmla, garnishment, performance, par, profile, document
    resource_id = Column(Integer, nullable=True)
    employee_id = Column(String, nullable=True, index=True)  # Target employee if supervisor action

    # Additional context
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", backref="portal_audit_logs")

    # Indexes for reporting
    __table_args__ = (
        Index('ix_portal_audit_user_date', 'user_id', 'timestamp'),
        Index('ix_portal_audit_resource', 'resource_type', 'resource_id'),
        Index('ix_portal_audit_employee', 'employee_id', 'timestamp'),
    )


class InAppNotification(Base):
    """
    In-app notifications for HR Dashboard users.
    Shows pending approvals, requests, and other actionable items.
    """
    __tablename__ = "in_app_notifications"

    id = Column(Integer, primary_key=True, index=True)

    # Target user (who should see this notification)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null = all HR admins

    # Notification content
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    notification_type = Column(String, nullable=False, index=True)  # hr_request, pto_request, fmla_request, etc.
    priority = Column(String, default="normal")  # low, normal, high, urgent

    # Link to related resource
    resource_type = Column(String, nullable=True)  # par, pto, fmla, etc.
    resource_id = Column(Integer, nullable=True)
    action_url = Column(String, nullable=True)  # Frontend route to navigate to

    # Status tracking
    is_read = Column(Boolean, default=False, index=True)
    is_dismissed = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), index=True)
    read_at = Column(DateTime, nullable=True)

    # Source info
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    employee_id = Column(String, nullable=True)  # Related employee if applicable

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    created_by = relationship("User", foreign_keys=[created_by_user_id])


# ============================================================================
# RECRUITING & APPLICANT TRACKING MODELS
# ============================================================================

class PipelineTemplate(Base):
    """Configurable hiring pipeline template with ordered stages."""
    __tablename__ = "pipeline_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    stages = relationship("PipelineStage", back_populates="template", order_by="PipelineStage.order_index")
    requisitions = relationship("JobRequisition", back_populates="pipeline_template")


class PipelineStage(Base):
    """Individual stage within a pipeline template."""
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("pipeline_templates.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    stage_type = Column(String, nullable=False)  # "application_review", "phone_screen", "interview", "assessment", "reference_check", "offer", "custom"
    order_index = Column(Integer, nullable=False)
    is_required = Column(Boolean, default=True)
    auto_advance = Column(Boolean, default=False)
    scorecard_template = Column(JSON, nullable=True)  # {"criteria": [{"name": "...", "weight": 1.0}], "recommendation_options": [...]}
    days_sla = Column(Integer, nullable=True)  # Expected days to complete this stage

    # Relationships
    template = relationship("PipelineTemplate", back_populates="stages")

    __table_args__ = (
        Index('ix_pipeline_stage_template_order', 'template_id', 'order_index'),
    )


class JobRequisition(Base):
    """Internal headcount request — the business case for a hire."""
    __tablename__ = "job_requisitions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requisition_id = Column(String, unique=True, index=True)  # "REQ-2026-001"
    title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    team = Column(String, nullable=True)
    cost_center = Column(String, nullable=True)
    location = Column(String, nullable=True)
    remote_type = Column(String, default="On-site")  # "On-site", "Remote", "Hybrid"
    employment_type = Column(String, nullable=True)  # "Full Time", "Part Time", "Contract", "Intern"
    position_type = Column(String, default="New")  # "New", "Replacement", "Expansion"

    # Compensation
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    wage_type = Column(String, nullable=True)  # "Salary", "Hourly"
    show_salary_on_posting = Column(Boolean, default=False)

    # Headcount
    openings = Column(Integer, default=1)
    filled_count = Column(Integer, default=0)

    # Workflow
    status = Column(String, default="Draft")  # "Draft", "Pending Approval", "Approved", "Open", "On Hold", "Filled", "Cancelled"
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    hiring_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Internal posting settings
    is_internal_only = Column(Boolean, default=False)
    internal_visibility = Column(String, default="All")  # "All", "Department Only", "Specific Teams"
    internal_visibility_teams = Column(JSON, nullable=True)

    # Replacement tracking
    replacing_employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)
    pipeline_template_id = Column(Integer, ForeignKey("pipeline_templates.id"), nullable=True)

    # Job description library link
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=True)

    # Job description
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    preferred_qualifications = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    benefits_summary = Column(Text, nullable=True)

    # Additional info
    eeo_job_category = Column(String, nullable=True)
    target_start_date = Column(Date, nullable=True)
    target_fill_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Posting channels (multi-select: "internal", "external", "bloom")
    posting_channels = Column(JSON, nullable=True)
    # Skills/requirements tags
    skills_tags = Column(JSON, nullable=True)
    # Urgency & timeline
    urgency = Column(String, nullable=True)  # "Low", "Normal", "High", "Critical"
    target_salary = Column(Float, nullable=True)
    # Supervisor for the position
    position_supervisor = Column(String, nullable=True)
    # Stakeholder visibility — user IDs who should follow the recruiting process
    visibility_user_ids = Column(JSON, nullable=True)
    # Source of request
    request_source = Column(String, default="manual")  # "manual", "employee_portal"
    # Early tech screen flag (for Bloom staffing agency)
    requires_early_tech_screen = Column(Boolean, default=False)
    # Close/cancel tracking
    closed_at = Column(DateTime, nullable=True)
    close_reason = Column(String, nullable=True)  # "filled", "rescinded", "cancelled", "budget_cut", "position_eliminated", "other"
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    pipeline_template = relationship("PipelineTemplate", back_populates="requisitions")
    job_description = relationship("JobDescription", back_populates="requisitions")
    postings = relationship("JobPosting", back_populates="requisition")
    applications = relationship("Application", back_populates="requisition")
    requested_by_user = relationship("User", foreign_keys=[requested_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    hiring_manager = relationship("User", foreign_keys=[hiring_manager_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    replacing_employee = relationship("Employee", foreign_keys=[replacing_employee_id])
    lifecycle_stages = relationship("RequisitionLifecycleStage", back_populates="requisition", order_by="RequisitionLifecycleStage.order_index")

    __table_args__ = (
        Index('ix_requisition_status', 'status'),
        Index('ix_requisition_department', 'department'),
    )


class JobPosting(Base):
    """Public-facing job listing. One requisition can have multiple postings on different channels."""
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    posting_id = Column(String, unique=True, index=True)  # "POST-2026-001"
    requisition_id = Column(Integer, ForeignKey("job_requisitions.id"), nullable=False, index=True)

    # Content
    title = Column(String, nullable=False)
    description_html = Column(Text, nullable=True)  # Rich text description
    short_description = Column(Text, nullable=True)

    # Status
    status = Column(String, default="Draft")  # "Draft", "Published", "Paused", "Closed", "Archived"
    published_at = Column(DateTime, nullable=True)
    closes_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Channel
    channel = Column(String, default="portal")  # "portal", "indeed", "linkedin", "careers_page", "internal"
    is_internal = Column(Boolean, default=False)

    # External integration fields
    external_posting_id = Column(String, nullable=True)
    external_posting_url = Column(String, nullable=True)
    external_synced_at = Column(DateTime, nullable=True)
    external_status = Column(String, nullable=True)

    # Application settings
    allow_easy_apply = Column(Boolean, default=True)
    requires_resume = Column(Boolean, default=True)
    requires_cover_letter = Column(Boolean, default=False)
    custom_questions = Column(JSON, nullable=True)  # [{"question": "...", "type": "text|select|boolean", "required": true, "options": [...]}]

    # SEO / discovery
    slug = Column(String, unique=True, index=True)  # URL-friendly slug
    tags = Column(JSON, nullable=True)  # ["engineering", "senior", "python"]

    # Metrics
    view_count = Column(Integer, default=0)
    application_count = Column(Integer, default=0)

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    requisition = relationship("JobRequisition", back_populates="postings")
    applications = relationship("Application", back_populates="posting")
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index('ix_posting_status_channel', 'status', 'channel'),
    )


class Applicant(Base):
    """Person who applies for jobs. Separate from User table."""
    __tablename__ = "applicants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    applicant_id = Column(String, unique=True, index=True)  # "APP-2026-00001"

    # Personal info
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    address_street = Column(String, nullable=True)
    address_city = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_zip = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)

    # Professional info
    current_employer = Column(String, nullable=True)
    current_title = Column(String, nullable=True)
    years_of_experience = Column(Integer, nullable=True)

    # Internal applicant link
    is_internal = Column(Boolean, default=False)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)

    # Account (optional applicant login)
    has_account = Column(Boolean, default=False)
    password_hash = Column(String, nullable=True)
    account_created_at = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)

    # Magic link auth
    magic_link_token = Column(String, nullable=True, index=True)
    magic_link_expires_at = Column(DateTime, nullable=True)

    # Source tracking
    source = Column(String, default="portal")  # "portal", "indeed", "linkedin", "referral", "internal", "agency", "other"
    source_detail = Column(String, nullable=True)
    referred_by_employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)

    # Status
    global_status = Column(String, default="Active")  # "Active", "Do Not Contact", "Blacklisted"
    tags = Column(JSON, nullable=True)
    internal_notes = Column(Text, nullable=True)

    # Resume
    resume_file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    referred_by = relationship("Employee", foreign_keys=[referred_by_employee_id])
    resume_file = relationship("FileUpload", foreign_keys=[resume_file_id])
    applications = relationship("Application", back_populates="applicant")
    eeo_data = relationship("ApplicantEEO", back_populates="applicant", uselist=False)
    documents = relationship("ApplicantDocument", back_populates="applicant")

    __table_args__ = (
        Index('ix_applicant_email', 'email'),
        Index('ix_applicant_source', 'source'),
    )


class Application(Base):
    """Specific application from an applicant to a specific job requisition."""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(String, unique=True, index=True)  # "APPLICATION-2026-00001"

    # References
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False, index=True)
    requisition_id = Column(Integer, ForeignKey("job_requisitions.id"), nullable=False, index=True)
    posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True, index=True)
    current_stage_id = Column(Integer, ForeignKey("pipeline_stages.id"), nullable=True)

    # Status
    status = Column(String, default="New")  # "New", "Screening", "Interview", "Offer", "Hired", "Rejected", "Withdrawn"
    status_changed_at = Column(DateTime, nullable=True)
    status_changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Content
    cover_letter = Column(Text, nullable=True)
    custom_answers = Column(JSON, nullable=True)  # Answers to custom questions from posting
    resume_file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)

    # Source
    source = Column(String, nullable=True)  # Copied from posting channel or applicant source
    source_detail = Column(String, nullable=True)

    # External integration
    external_application_id = Column(String, nullable=True)
    external_source = Column(String, nullable=True)
    external_synced_at = Column(DateTime, nullable=True)
    disposition_synced_at = Column(DateTime, nullable=True)

    # Rejection
    rejection_reason = Column(String, nullable=True)
    rejection_notes = Column(Text, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejected_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Offer tracking
    offer_extended_at = Column(DateTime, nullable=True)
    offer_accepted_at = Column(DateTime, nullable=True)
    offer_declined_at = Column(DateTime, nullable=True)

    # Hiring
    hired_at = Column(DateTime, nullable=True)
    hired_employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)

    # Evaluation
    overall_rating = Column(Float, nullable=True)  # 1-5
    is_favorite = Column(Boolean, default=False)
    is_internal_transfer = Column(Boolean, default=False)

    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    applicant = relationship("Applicant", back_populates="applications")
    requisition = relationship("JobRequisition", back_populates="applications")
    posting = relationship("JobPosting", back_populates="applications")
    current_stage = relationship("PipelineStage", foreign_keys=[current_stage_id])
    resume_file = relationship("FileUpload", foreign_keys=[resume_file_id])
    status_changed_by_user = relationship("User", foreign_keys=[status_changed_by])
    rejected_by_user = relationship("User", foreign_keys=[rejected_by])
    hired_employee = relationship("Employee", foreign_keys=[hired_employee_id])
    activities = relationship("ApplicationActivity", back_populates="application", order_by="ApplicationActivity.created_at.desc()")
    stage_history = relationship("ApplicationStageHistory", back_populates="application", order_by="ApplicationStageHistory.entered_at")
    documents = relationship("ApplicantDocument", back_populates="application")
    scorecards = relationship("InterviewScorecard", back_populates="application")
    interviews = relationship("Interview", back_populates="application")
    resume_analysis = relationship("ResumeAnalysis", back_populates="application", uselist=False)

    __table_args__ = (
        Index('ix_application_status', 'status'),
        Index('ix_application_applicant_req', 'applicant_id', 'requisition_id'),
    )


class ApplicantEEO(Base):
    """Voluntary EEO self-identification data. Stored separately and never shown to hiring managers."""
    __tablename__ = "applicant_eeo"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), unique=True, nullable=False)
    race_ethnicity = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    veteran_status = Column(String, nullable=True)
    disability_status = Column(String, nullable=True)
    self_identified_at = Column(DateTime, nullable=True)
    declined_to_identify = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    applicant = relationship("Applicant", back_populates="eeo_data")


class ApplicantDocument(Base):
    """Documents linked to applicants and their applications."""
    __tablename__ = "applicant_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True, index=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)

    document_type = Column(String, nullable=False)  # "resume", "cover_letter", "portfolio", "certification", "transcript", "other"
    label = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())

    # Relationships
    applicant = relationship("Applicant", back_populates="documents")
    application = relationship("Application", back_populates="documents")
    file_upload = relationship("FileUpload", foreign_keys=[file_upload_id])


class ApplicationActivity(Base):
    """Timeline/audit log per application."""
    __tablename__ = "application_activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    activity_type = Column(String, nullable=False)  # "status_change", "stage_change", "note_added", "email_sent", "interview_scheduled", "scorecard_submitted", "document_uploaded", "offer_extended"
    description = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)  # Structured data about the activity
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_internal = Column(Boolean, default=True)  # If false, visible to applicant
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="activities")
    performed_by_user = relationship("User", foreign_keys=[performed_by])

    __table_args__ = (
        Index('ix_activity_application_type', 'application_id', 'activity_type'),
    )


class ApplicationStageHistory(Base):
    """Tracks movement of an application through pipeline stages."""
    __tablename__ = "application_stage_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("pipeline_stages.id"), nullable=False)
    entered_at = Column(DateTime, server_default=func.now())
    exited_at = Column(DateTime, nullable=True)
    outcome = Column(String, nullable=True)  # "passed", "rejected", "skipped", "withdrawn"
    moved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="stage_history")
    stage = relationship("PipelineStage", foreign_keys=[stage_id])
    moved_by_user = relationship("User", foreign_keys=[moved_by])


class InterviewScorecard(Base):
    """Structured feedback from an interviewer for a candidate at a specific pipeline stage."""
    __tablename__ = "interview_scorecards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("pipeline_stages.id"), nullable=True, index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Ratings
    overall_rating = Column(Float, nullable=True)  # 1-5
    recommendation = Column(String, nullable=True)  # "Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"
    criteria_ratings = Column(JSON, nullable=True)  # [{"criteria": "...", "rating": 1-5, "notes": "..."}]

    # Feedback
    strengths = Column(Text, nullable=True)
    concerns = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)

    # Workflow
    status = Column(String, default="Pending")  # "Pending", "In Progress", "Submitted"
    submitted_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="scorecards")
    stage = relationship("PipelineStage", foreign_keys=[stage_id])
    interviewer = relationship("User", foreign_keys=[interviewer_id])

    __table_args__ = (
        Index('ix_scorecard_app_stage', 'application_id', 'stage_id'),
    )


class Interview(Base):
    """Scheduled interview event for a candidate."""
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    interview_id = Column(String, unique=True, index=True)  # "INT-2026-001"
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("pipeline_stages.id"), nullable=True)

    # Scheduling
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    time_zone = Column(String, nullable=True)
    format = Column(String, default="Video")  # "In-Person", "Phone", "Video"
    location = Column(String, nullable=True)
    video_link = Column(String, nullable=True)

    # Participants
    interviewers = Column(JSON, nullable=True)  # [{"user_id": 1, "name": "...", "role": "interviewer|lead"}]
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Status
    status = Column(String, default="Scheduled")  # "Scheduled", "Confirmed", "Completed", "Cancelled", "No Show"
    cancelled_reason = Column(String, nullable=True)

    # Notifications
    applicant_notified = Column(Boolean, default=False)
    applicant_confirmed = Column(Boolean, default=False)
    reminder_sent = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="interviews")
    stage = relationship("PipelineStage", foreign_keys=[stage_id])
    organizer = relationship("User", foreign_keys=[organizer_id])

    __table_args__ = (
        Index('ix_interview_app_stage', 'application_id', 'stage_id'),
        Index('ix_interview_scheduled', 'scheduled_at'),
    )


class OfferLetter(Base):
    """Offer letter details and approval/acceptance workflow."""
    __tablename__ = "offer_letters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    offer_id = Column(String, unique=True, index=True)  # "OFFER-2026-001"
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)

    # Position details
    position_title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # "Full Time", "Part Time", etc.
    start_date = Column(Date, nullable=True)
    reports_to = Column(String, nullable=True)

    # Compensation
    salary = Column(Float, nullable=True)
    wage_type = Column(String, nullable=True)  # "Salary", "Hourly"
    signing_bonus = Column(Float, nullable=True)
    equity_details = Column(Text, nullable=True)
    benefits_summary = Column(Text, nullable=True)

    # Workflow
    status = Column(String, default="Draft")
    # Statuses: "Draft", "Pending Approval", "Approved", "Sent", "Accepted", "Declined", "Expired", "Rescinded"
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    response = Column(String, nullable=True)  # "accepted" or "declined"
    decline_reason = Column(String, nullable=True)

    # Files
    offer_letter_file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)
    signed_file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)

    # Counter-offer tracking
    is_counter_offer = Column(Boolean, default=False)
    original_offer_id = Column(Integer, ForeignKey("offer_letters.id"), nullable=True)
    negotiation_notes = Column(Text, nullable=True)

    # Contingencies
    contingencies = Column(JSON, nullable=True)  # {"background_check": true, "drug_test": false, ...}

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    application = relationship("Application", backref="offers")
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    offer_letter_file = relationship("FileUpload", foreign_keys=[offer_letter_file_id])
    signed_file = relationship("FileUpload", foreign_keys=[signed_file_id])
    original_offer = relationship("OfferLetter", remote_side="OfferLetter.id", foreign_keys=[original_offer_id])

    __table_args__ = (
        Index('ix_offer_application', 'application_id'),
        Index('ix_offer_status', 'status'),
    )


class DocumentRequest(Base):
    """HR requests specific documents from applicants."""
    __tablename__ = "document_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False, index=True)

    # Request details
    document_type = Column(String, nullable=False)  # "id_verification", "transcript", "certification", "background_consent", "reference_list", "other"
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=True)
    due_date = Column(Date, nullable=True)

    # Status
    status = Column(String, default="Requested")
    # Statuses: "Requested", "Submitted", "Accepted", "Rejected", "Expired"
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)
    rejection_reason = Column(String, nullable=True)
    reminder_count = Column(Integer, default=0)
    last_reminded_at = Column(DateTime, nullable=True)

    # Metadata
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    application = relationship("Application", backref="document_requests")
    applicant = relationship("Applicant", backref="document_requests")
    file_upload = relationship("FileUpload", foreign_keys=[file_upload_id])
    requested_by_user = relationship("User", foreign_keys=[requested_by])
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        Index('ix_docreq_application', 'application_id'),
        Index('ix_docreq_status', 'status'),
    )


# ============================================================================
# HIRE CONVERSION MODEL (Phase 4)
# ============================================================================

class HireConversion(Base):
    """Tracks the multi-step conversion from applicant to employee."""
    __tablename__ = "hire_conversions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Source references
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True, index=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False, index=True)
    offer_id = Column(Integer, ForeignKey("offer_letters.id"), nullable=False)

    # Created records (populated as conversion progresses)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    onboarding_template_id = Column(Integer, ForeignKey("onboarding_templates.id"), nullable=True)

    # Status tracking
    status = Column(String, default="Pending")
    # Statuses: "Pending", "Employee Created", "User Created", "Onboarding Started", "Completed", "Failed"

    # Hire details
    hire_date = Column(Date, nullable=True)
    department = Column(String, nullable=True)
    position = Column(String, nullable=True)
    location = Column(String, nullable=True)
    salary = Column(Float, nullable=True)
    wage_type = Column(String, nullable=True)

    # Conversion tracking
    converted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    eeo_transferred = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)

    # Internal transfer flag
    is_internal_transfer = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    employee_created_at = Column(DateTime, nullable=True)
    user_created_at = Column(DateTime, nullable=True)
    onboarding_started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    application = relationship("Application", backref="hire_conversion")
    applicant = relationship("Applicant", backref="hire_conversions")
    offer = relationship("OfferLetter", backref="hire_conversion")
    employee = relationship("Employee", foreign_keys=[employee_id])
    user = relationship("User", foreign_keys=[user_id])
    converted_by_user = relationship("User", foreign_keys=[converted_by])
    onboarding_template = relationship("OnboardingTemplate", foreign_keys=[onboarding_template_id])


class RequisitionLifecycleStage(Base):
    """Tracks progress through the recruiting lifecycle for a requisition (Dominos-style tracker)."""
    __tablename__ = "requisition_lifecycle_stages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requisition_id = Column(Integer, ForeignKey("job_requisitions.id"), nullable=False, index=True)

    stage_key = Column(String, nullable=False)  # "request_submitted", "position_posted", etc.
    stage_label = Column(String, nullable=False)  # Display name
    order_index = Column(Integer, nullable=False)
    status = Column(String, default="pending")  # "pending", "active", "completed", "skipped", "blocked"

    entered_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_status = Column(String, nullable=True)  # "approved", "rejected", "pending_approval"
    approval_notes = Column(Text, nullable=True)

    # For decision stages (tech screen pass/fail, offer response)
    outcome = Column(String, nullable=True)  # "passed", "failed", "negotiating", "accepted", "rejected"
    outcome_notes = Column(Text, nullable=True)

    # HR presence toggle (for hiring manager interview)
    hr_representative_present = Column(Boolean, nullable=True)
    hr_representative_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    requisition = relationship("JobRequisition", back_populates="lifecycle_stages")
    completed_by_user = relationship("User", foreign_keys=[completed_by])
    hr_representative = relationship("User", foreign_keys=[hr_representative_id])
    notes = relationship("LifecycleStageNote", back_populates="lifecycle_stage", order_by="LifecycleStageNote.created_at")
    documents = relationship("LifecycleStageDocument", back_populates="lifecycle_stage", order_by="LifecycleStageDocument.created_at")

    __table_args__ = (
        Index('ix_lifecycle_stage_requisition_order', 'requisition_id', 'order_index'),
    )


class LifecycleStageNote(Base):
    """Notes from stakeholders at each lifecycle stage. Supports highlights/badges and recommendations."""
    __tablename__ = "lifecycle_stage_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lifecycle_stage_id = Column(Integer, ForeignKey("requisition_lifecycle_stages.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=False)
    highlights = Column(JSON, nullable=True)  # ["Strong Communicator", "Culture Fit", "Technical Expert"]
    recommendation = Column(String, nullable=True)  # "approved", "not_approved"
    recommendation_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    lifecycle_stage = relationship("RequisitionLifecycleStage", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id])


class LifecycleStageDocument(Base):
    """Documents uploaded at each lifecycle stage."""
    __tablename__ = "lifecycle_stage_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lifecycle_stage_id = Column(Integer, ForeignKey("requisition_lifecycle_stages.id"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)

    filename = Column(String, nullable=False)
    description = Column(String, nullable=True)
    file_path = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    lifecycle_stage = relationship("RequisitionLifecycleStage", back_populates="documents")
    uploaded_by_user = relationship("User", foreign_keys=[uploaded_by])


class UserStageView(Base):
    """Tracks when a user last viewed a lifecycle stage, for unread badge calculation."""
    __tablename__ = "user_stage_views"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lifecycle_stage_id = Column(Integer, ForeignKey("requisition_lifecycle_stages.id"), nullable=False)
    last_viewed_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (
        Index('ix_user_stage_view_unique', 'user_id', 'lifecycle_stage_id', unique=True),
    )


class BenefitEnrollment(Base):
    """Individual benefit enrollment record from carrier data files."""
    __tablename__ = "benefit_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True, index=True)

    carrier = Column(String, nullable=True)  # e.g., "Equitable", "EMI Health"
    benefit_type = Column(String, nullable=False)  # e.g., "Group Life", "Dental", "Vision"
    plan_name = Column(String, nullable=True)  # Plan description
    carrier_plan_code = Column(String, nullable=True)
    plan_policy_number = Column(String, nullable=True)

    coverage_level = Column(String, nullable=True)  # "Employee", "Employee + Spouse", "Family"
    approved_benefit_amount = Column(Float, nullable=True)
    requested_benefit_amount = Column(Float, nullable=True)
    benefit_amount = Column(Float, nullable=True)  # Coverage/benefit amount (e.g., $50,000 life)
    relationship = Column(String, nullable=True)  # "Employee", "Spouse", etc.

    # Cost per pay period
    ee_cost = Column(Float, nullable=True)  # Employee cost per pay period
    er_cost = Column(Float, nullable=True)  # Employer cost per pay period

    # Payroll codes
    payroll_code = Column(String, nullable=True)  # Employee Payroll Code
    pre_tax_code = Column(String, nullable=True)
    post_tax_code = Column(String, nullable=True)
    employer_code = Column(String, nullable=True)

    effective_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    enrollment_type = Column(String, nullable=True)  # "Current", "New", etc.
    sign_date = Column(Date, nullable=True)
    is_cobra = Column(Boolean, default=False)
    declined_reason = Column(String, nullable=True)
    hsa_limit_level = Column(String, nullable=True)  # "Family", "Family Catch-up", etc.

    created_at = Column(DateTime, server_default=func.now())


class InterviewComplianceTip(Base):
    """Knowledge base of interview compliance tips and best practices."""
    __tablename__ = "interview_compliance_tips"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String, nullable=False)  # "legal", "behavioral", "bias", "documentation", "general"
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    severity = Column(String, default="info")  # "info", "warning", "critical"
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class JobDescription(Base):
    """Reusable job description library — positions that can be linked to requisitions."""
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    position_title = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    preferred_qualifications = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    skills_tags = Column(JSON, nullable=True)
    company_position = Column(String, nullable=True)

    # Optional uploaded JD document
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=True)

    # Workflow
    status = Column(String, default="Active")  # "Active", "Pending Approval", "Archived"
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    file_upload = relationship("FileUpload", foreign_keys=[file_upload_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    requisitions = relationship("JobRequisition", back_populates="job_description")


class ResumeAnalysis(Base):
    """AI-generated resume analysis scored against a job description."""
    __tablename__ = "resume_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False, index=True)

    # Scores (0-100)
    overall_score = Column(Float, nullable=True)
    skills_match_score = Column(Float, nullable=True)
    experience_match_score = Column(Float, nullable=True)
    education_match_score = Column(Float, nullable=True)

    # Analysis details (JSON arrays)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    red_flags = Column(JSON, nullable=True)
    suggested_questions = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)

    # Threshold
    threshold_score = Column(Float, default=70.0)
    threshold_label = Column(String, nullable=True)  # "Promising" | "Below Threshold"

    # Processing status
    status = Column(String, default="Pending")  # "Pending", "Processing", "Completed", "Failed", "No Resume"
    error_message = Column(Text, nullable=True)
    resume_text_length = Column(Integer, nullable=True)
    job_description_length = Column(Integer, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="resume_analysis")
