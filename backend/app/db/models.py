from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
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
    wage = Column(Float, nullable=True)
    wage_type = Column(String, nullable=True)  # "Hourly" or "Salary"
    benefits_cost = Column(Float, nullable=True)
    tenure_years = Column(Float, nullable=True)
    pto_allotted = Column(Float, nullable=True)
    pto_used = Column(Float, nullable=True)
    attendance_days = Column(Float, nullable=True)
    expected_days = Column(Float, nullable=True)


class WageHistory(Base):
    __tablename__ = "wage_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), index=True)
    effective_date = Column(Date)
    wage = Column(Float)
    change_reason = Column(String, nullable=True)  # e.g., "Merit Increase", "Promotion", "Annual Review"
    change_amount = Column(Float, nullable=True)
    change_percentage = Column(Float, nullable=True)


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
