"""
File Type Configurations
Defines expected file structures, column mappings, and validation rules
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


class FileCategory(str, Enum):
    """Categories of file uploads"""
    EMPLOYMENT_LIST = "employment_list"
    OT_EARNINGS = "ot_earnings"
    HSA_REPORT = "hsa_report"
    DEDUCTION_LISTING = "deduction_listing"
    COMPENSATION_HISTORY = "compensation_history"
    PAYROLL_DATA = "payroll_data"
    BENEFITS_DATA = "benefits_data"
    TIME_OFF_DATA = "time_off_data"
    PERFORMANCE_DATA = "performance_data"
    GENERAL = "general"


@dataclass
class ColumnMapping:
    """Maps file columns to database fields"""
    file_column: str  # Column name in the uploaded file
    db_field: str     # Corresponding database field name
    required: bool = True
    data_type: str = "string"  # string, integer, float, date, datetime, boolean
    transform: Optional[str] = None  # Optional transformation function name


@dataclass
class FileTypeConfig:
    """Configuration for a specific file type"""
    category: FileCategory
    name: str
    description: str
    expected_extensions: List[str]

    # Column definitions
    required_columns: List[str]
    optional_columns: List[str]
    column_mappings: List[ColumnMapping]

    # Parsing options
    header_row: int = 0  # Which row contains headers (0-indexed)
    skip_rows: Optional[List[int]] = None  # Rows to skip
    sheet_name: Optional[str] = None  # For Excel files

    # Validation rules
    min_rows: int = 1
    max_rows: Optional[int] = None
    allow_duplicates: bool = True
    unique_columns: List[str] = None  # Columns that should have unique values

    # Import behavior
    import_mode: str = "upsert"  # insert, update, upsert, append
    conflict_resolution: str = "skip"  # skip, overwrite, error


# ============================================================================
# EMPLOYMENT LIST CONFIGURATION
# ============================================================================

EMPLOYMENT_LIST_CONFIG = FileTypeConfig(
    category=FileCategory.EMPLOYMENT_LIST,
    name="Employment List Complete",
    description="Complete employee roster with demographics, position, and compensation data",
    expected_extensions=["xlsx", "csv"],

    required_columns=[
        "Employee Id",
        "Last Name",
        "Preferred/First Name",
        "Employee Status Description",
        "Hire Date"
    ],

    optional_columns=[
        "Company Code",
        "CostCenter Description",
        "Department Description",
        "Team Description",
        "Rehire Date",
        "Termination Date",
        "Employment Type Description",
        "Position Description",
        "Job Title (PIT)",
        "Override Job Title (PIT)",
        "Pay Frequency Code",
        "Pay Type Code",
        "Base Rate",
        "Per Check Salary",
        "Annual Salary",
        "Current Home State",
        "Current Home Country"
    ],

    column_mappings=[
        ColumnMapping("Company Code", "company_code", required=False, data_type="string"),
        ColumnMapping("Employee Id", "employee_id", required=True, data_type="string"),
        ColumnMapping("Last Name", "last_name", required=True, data_type="string"),
        ColumnMapping("Preferred/First Name", "first_name", required=True, data_type="string"),
        ColumnMapping("CostCenter Description", "cost_center", required=False, data_type="string"),
        ColumnMapping("Department Description", "department", required=False, data_type="string"),
        ColumnMapping("Team Description", "team", required=False, data_type="string"),
        ColumnMapping("Employee Status Description", "status", required=True, data_type="string"),
        ColumnMapping("Hire Date", "hire_date", required=True, data_type="datetime"),
        ColumnMapping("Rehire Date", "rehire_date", required=False, data_type="datetime"),
        ColumnMapping("Termination Date", "termination_date", required=False, data_type="datetime"),
        ColumnMapping("Employment Type Description", "employment_type", required=False, data_type="string"),
        ColumnMapping("Position Description", "position", required=False, data_type="string"),
        ColumnMapping("Job Title (PIT)", "job_title", required=False, data_type="string"),
        ColumnMapping("Override Job Title (PIT)", "override_job_title", required=False, data_type="string"),
        ColumnMapping("Pay Frequency Code", "pay_frequency", required=False, data_type="string"),
        ColumnMapping("Pay Type Code", "pay_type", required=False, data_type="string"),
        ColumnMapping("Base Rate", "base_rate", required=False, data_type="float"),
        ColumnMapping("Per Check Salary", "per_check_salary", required=False, data_type="float"),
        ColumnMapping("Annual Salary", "annual_salary", required=False, data_type="float"),
        ColumnMapping("Current Home State", "state", required=False, data_type="string"),
        ColumnMapping("Current Home Country", "country", required=False, data_type="string"),
    ],

    header_row=0,
    skip_rows=None,
    sheet_name=None,  # Use first sheet

    min_rows=1,
    max_rows=10000,
    allow_duplicates=True,  # Allow duplicates since file may have blank rows
    unique_columns=[],  # Don't enforce unique constraint during parsing

    import_mode="upsert",
    conflict_resolution="overwrite"
)


# ============================================================================
# OT EARNINGS CONFIGURATION
# ============================================================================

OT_EARNINGS_CONFIG = FileTypeConfig(
    category=FileCategory.OT_EARNINGS,
    name="Overtime Earnings Report",
    description="Overtime hours and earnings by employee",
    expected_extensions=["xlsx", "csv"],

    required_columns=[
        "ID",
        "Chk Date",
        "Hours",
        "Amount"
    ],

    optional_columns=[
        "Employee",
        "SSN",
        "Location",
        "Rate"
    ],

    column_mappings=[
        ColumnMapping("Employee", "employee_name", required=False, data_type="string"),
        ColumnMapping("ID", "employee_id", required=True, data_type="string"),
        ColumnMapping("SSN", "ssn", required=False, data_type="string"),
        ColumnMapping("Location", "location", required=False, data_type="string"),
        ColumnMapping("Chk Date", "check_date", required=True, data_type="date"),
        ColumnMapping("Rate", "rate", required=False, data_type="float"),
        ColumnMapping("Hours", "hours", required=True, data_type="float"),
        ColumnMapping("Amount", "amount", required=True, data_type="float"),
    ],

    # OT Earnings has a multi-row header (row 0-2 are headers, row 3 has column names)
    header_row=3,
    skip_rows=None,
    sheet_name=None,

    min_rows=1,
    max_rows=50000,
    allow_duplicates=True,  # Same employee can have multiple OT entries
    unique_columns=[],

    import_mode="append",  # Always append new OT records
    conflict_resolution="skip"
)


# ============================================================================
# HSA REPORT CONFIGURATION
# ============================================================================

HSA_REPORT_CONFIG = FileTypeConfig(
    category=FileCategory.HSA_REPORT,
    name="HSA Contribution Report",
    description="Health Savings Account contributions by employee with pre-tax, post-tax, and employer contributions",
    expected_extensions=["pdf"],

    required_columns=[
        "Employee",
        "Emp Id",
        "Gross Pay",
        "Pre Tax",
        "Total"
    ],

    optional_columns=[
        "SSN",
        "Deferral Rate",
        "Hours",
        "Post",
        "ER"
    ],

    column_mappings=[
        ColumnMapping("Employee", "employee_name", required=True, data_type="string"),
        ColumnMapping("Emp Id", "employee_id", required=True, data_type="string"),
        ColumnMapping("SSN", "ssn", required=False, data_type="string"),
        ColumnMapping("Deferral Rate", "deferral_rate", required=False, data_type="string"),
        ColumnMapping("Hours", "hours", required=False, data_type="float"),
        ColumnMapping("Gross Pay", "gross_pay", required=True, data_type="float"),
        ColumnMapping("Pre Tax", "pre_tax", required=True, data_type="float"),
        ColumnMapping("Post", "post_tax", required=False, data_type="float"),
        ColumnMapping("ER", "employer_contribution", required=False, data_type="float"),
        ColumnMapping("Total", "total", required=True, data_type="float"),
    ],

    # PDF reports don't have a traditional header row
    header_row=0,
    skip_rows=None,
    sheet_name=None,

    min_rows=1,
    max_rows=50000,
    allow_duplicates=True,  # Same employee can have multiple HSA contributions
    unique_columns=[],

    import_mode="append",  # Always append new HSA records
    conflict_resolution="skip"
)


# ============================================================================
# DEDUCTION LISTING CONFIGURATION
# ============================================================================

DEDUCTION_LISTING_CONFIG = FileTypeConfig(
    category=FileCategory.DEDUCTION_LISTING,
    name="Deduction Listing Report",
    description="Payroll deductions by employee organized by deduction type (401K, insurance, medical, dental, HSA, garnishments, etc.)",
    expected_extensions=["pdf"],

    required_columns=[
        "Employee",
        "ID",
        "Amount"
    ],

    optional_columns=[
        "SSN",
        "Location",
        "Deduction Type",
        "Deduction Description"
    ],

    column_mappings=[
        ColumnMapping("Employee", "employee_name", required=True, data_type="string"),
        ColumnMapping("ID", "employee_id", required=True, data_type="string"),
        ColumnMapping("SSN", "ssn", required=False, data_type="string"),
        ColumnMapping("Location", "location", required=False, data_type="string"),
        ColumnMapping("Amount", "amount", required=True, data_type="float"),
        ColumnMapping("Deduction Type", "deduction_type", required=False, data_type="string"),
        ColumnMapping("Deduction Description", "deduction_description", required=False, data_type="string"),
    ],

    # PDF reports don't have a traditional header row
    header_row=0,
    skip_rows=None,
    sheet_name=None,

    min_rows=1,
    max_rows=100000,
    allow_duplicates=True,  # Same employee can have multiple deductions
    unique_columns=[],

    import_mode="append",  # Always append new deduction records
    conflict_resolution="skip"
)


# ============================================================================
# COMPENSATION HISTORY CONFIGURATION
# ============================================================================

COMPENSATION_HISTORY_CONFIG = FileTypeConfig(
    category=FileCategory.COMPENSATION_HISTORY,
    name="Compensation History",
    description="Pay rate change history by employee with effective dates, base rates, and change reasons",
    expected_extensions=["xlsx", "csv"],

    required_columns=[
        "Employee Id",
        "Base Rate",
    ],

    optional_columns=[
        "Pay Rate Effective Date",
        "Pay Rate Start Date",
        "Pay Rate End Date",
        "Pay Rate Change Reason",
        "Base Rate Per Unit",
        "Per Check Salary",
        "Default Hours",
        "Annual Salary",
    ],

    column_mappings=[
        ColumnMapping("Employee Id", "employee_id", required=True, data_type="string"),
        ColumnMapping("Pay Rate Effective Date", "effective_date", required=False, data_type="date"),
        ColumnMapping("Pay Rate Start Date", "pay_rate_start_date", required=False, data_type="date"),
        ColumnMapping("Pay Rate End Date", "pay_rate_end_date", required=False, data_type="date"),
        ColumnMapping("Pay Rate Change Reason", "change_reason", required=False, data_type="string"),
        ColumnMapping("Base Rate", "wage", required=True, data_type="float"),
        ColumnMapping("Base Rate Per Unit", "wage_unit", required=False, data_type="string"),
        ColumnMapping("Annual Salary", "annual_salary", required=False, data_type="float"),
    ],

    header_row=0,
    skip_rows=None,
    sheet_name=None,

    min_rows=1,
    max_rows=100000,
    allow_duplicates=True,  # Multiple rate changes per employee
    unique_columns=[],

    import_mode="append",
    conflict_resolution="skip"
)


# ============================================================================
# BENEFITS DATA CONFIGURATION
# ============================================================================

BENEFITS_DATA_CONFIG = FileTypeConfig(
    category=FileCategory.BENEFITS_DATA,
    name="Benefits Enrollment Data",
    description="Per-benefit enrollment records from insurance carriers (Equitable, EMI Health, etc.)",
    expected_extensions=["csv", "xlsx", "xls", "tsv"],

    required_columns=[
        "Employee ID",
        "Benefit",
    ],

    optional_columns=[
        "Carrier",
        "Plan",
        "Coverage Level",
        "Approved Benefit Amount",
        "Requested Benefit Amount",
        "Benefit Amount",
        "Relationship",
        "EE Cost",
        "ER Cost",
        "Employee Payroll Code",
        "Pre-tax Code",
        "Post-tax Code",
        "Employer Code",
        "Effective Date",
        "End Date",
        "Coverage Start Date",
        "Coverage End Date",
        "Enrollment Type",
        "Plan Policy Number",
        "Carrier Plan Code",
        "Sign Date",
        "Is Cobra",
        "Declined Reason",
        "HSA Limit Level",
        "First Name",
        "Last Name",
        "Annual Compensation",
        "Hourly Rate",
        "Job Title",
        "Hire Date",
        "City",
        "State Territory",
        "Zip Code",
        "Country",
    ],

    column_mappings=[
        ColumnMapping("Employee ID", "employee_id", required=True, data_type="string"),
        ColumnMapping("Benefit", "benefit_type", required=True, data_type="string"),
        ColumnMapping("Carrier", "carrier", required=False, data_type="string"),
        ColumnMapping("Plan", "plan_name", required=False, data_type="string"),
        ColumnMapping("Coverage Level", "coverage_level", required=False, data_type="string"),
        ColumnMapping("Approved Benefit Amount", "approved_benefit_amount", required=False, data_type="float"),
        ColumnMapping("Requested Benefit Amount", "requested_benefit_amount", required=False, data_type="float"),
        ColumnMapping("Benefit Amount", "benefit_amount", required=False, data_type="float"),
        ColumnMapping("Relationship", "relationship", required=False, data_type="string"),
        ColumnMapping("EE Cost", "ee_cost", required=False, data_type="float"),
        ColumnMapping("ER Cost", "er_cost", required=False, data_type="float"),
        ColumnMapping("Employee Payroll Code", "payroll_code", required=False, data_type="string"),
        ColumnMapping("Pre-tax Code", "pre_tax_code", required=False, data_type="string"),
        ColumnMapping("Post-tax Code", "post_tax_code", required=False, data_type="string"),
        ColumnMapping("Employer Code", "employer_code", required=False, data_type="string"),
        ColumnMapping("Effective Date", "effective_date", required=False, data_type="date"),
        ColumnMapping("End Date", "end_date", required=False, data_type="date"),
        ColumnMapping("Coverage Start Date", "effective_date", required=False, data_type="date"),
        ColumnMapping("Coverage End Date", "end_date", required=False, data_type="date"),
        ColumnMapping("Enrollment Type", "enrollment_type", required=False, data_type="string"),
        ColumnMapping("Plan Policy Number", "plan_policy_number", required=False, data_type="string"),
        ColumnMapping("Carrier Plan Code", "carrier_plan_code", required=False, data_type="string"),
        ColumnMapping("Sign Date", "sign_date", required=False, data_type="date"),
        ColumnMapping("Is Cobra", "is_cobra", required=False, data_type="boolean"),
        ColumnMapping("Declined Reason", "declined_reason", required=False, data_type="string"),
        ColumnMapping("HSA Limit Level", "hsa_limit_level", required=False, data_type="string"),
        ColumnMapping("First Name", "first_name", required=False, data_type="string"),
        ColumnMapping("Last Name", "last_name", required=False, data_type="string"),
    ],

    header_row=0,
    skip_rows=None,
    sheet_name=None,

    min_rows=1,
    max_rows=50000,
    allow_duplicates=True,  # Multiple benefits per employee
    unique_columns=[],

    import_mode="upsert",
    conflict_resolution="overwrite"
)


# ============================================================================
# FILE TYPE REGISTRY
# ============================================================================

FILE_TYPE_CONFIGS: Dict[FileCategory, FileTypeConfig] = {
    FileCategory.EMPLOYMENT_LIST: EMPLOYMENT_LIST_CONFIG,
    FileCategory.OT_EARNINGS: OT_EARNINGS_CONFIG,
    FileCategory.HSA_REPORT: HSA_REPORT_CONFIG,
    FileCategory.DEDUCTION_LISTING: DEDUCTION_LISTING_CONFIG,
    FileCategory.COMPENSATION_HISTORY: COMPENSATION_HISTORY_CONFIG,
    FileCategory.BENEFITS_DATA: BENEFITS_DATA_CONFIG,
}


def get_file_config(category: FileCategory) -> Optional[FileTypeConfig]:
    """Get configuration for a file category"""
    return FILE_TYPE_CONFIGS.get(category)


def detect_file_category(columns: List[str]) -> Optional[FileCategory]:
    """
    Auto-detect file category based on column names
    Returns the best matching category or None
    """
    columns_set = set(col.strip() for col in columns)

    best_match = None
    best_score = 0

    for category, config in FILE_TYPE_CONFIGS.items():
        # Calculate how many required columns match
        required_matches = sum(1 for col in config.required_columns if col in columns_set)
        required_total = len(config.required_columns)

        if required_total == 0:
            continue

        # Calculate match score (percentage of required columns found)
        score = required_matches / required_total

        # Must match at least 70% of required columns
        if score >= 0.7 and score > best_score:
            best_score = score
            best_match = category

    return best_match


def validate_file_structure(df_columns: List[str], config: FileTypeConfig) -> tuple[bool, List[str]]:
    """
    Validate that a dataframe has the required columns for a file type
    Returns: (is_valid, list_of_errors)
    """
    errors = []
    columns_set = set(col.strip() for col in df_columns)

    # Check required columns
    missing_required = []
    for req_col in config.required_columns:
        if req_col not in columns_set:
            missing_required.append(req_col)

    if missing_required:
        errors.append(f"Missing required columns: {', '.join(missing_required)}")

    is_valid = len(errors) == 0
    return is_valid, errors


def get_parsing_options(config: FileTypeConfig) -> Dict[str, Any]:
    """
    Get pandas parsing options for a file type configuration
    """
    options = {
        'header': config.header_row,
    }

    if config.skip_rows:
        options['skiprows'] = config.skip_rows

    if config.sheet_name:
        options['sheet_name'] = config.sheet_name

    return options
