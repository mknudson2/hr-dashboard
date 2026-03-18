"""
Column Mapping Service

Provides flexible column mapping for employee data imports.
Supports mapping from any source column names to database fields.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum


class FieldCategory(str, Enum):
    """Categories for organizing employee fields"""
    REQUIRED = "required"
    IDENTITY = "identity"
    EMPLOYMENT = "employment"
    COMPENSATION = "compensation"
    BENEFITS_HEALTH = "benefits_health"
    BENEFITS_RETIREMENT = "benefits_retirement"
    BENEFITS_OTHER = "benefits_other"
    PERSONAL = "personal"
    EEO = "eeo"
    BENEFIT_ENROLLMENT = "benefit_enrollment"


@dataclass
class FieldDefinition:
    """Definition of a database field that can be mapped"""
    db_field: str
    display_name: str
    description: str
    category: FieldCategory
    data_type: str  # string, number, date, boolean
    required: bool = False
    example: str = ""
    common_aliases: List[str] = field(default_factory=list)


# ============================================================================
# EMPLOYEE FIELD DEFINITIONS
# ============================================================================

EMPLOYEE_FIELDS: List[FieldDefinition] = [
    # Required fields
    FieldDefinition(
        db_field="employee_id",
        display_name="Employee ID",
        description="Unique identifier for the employee (required)",
        category=FieldCategory.REQUIRED,
        data_type="string",
        required=True,
        example="EMP001",
        common_aliases=["Employee Id", "Emp ID", "ID", "Employee Number", "EE ID", "Worker ID", "Badge Number"]
    ),

    # Identity fields
    FieldDefinition(
        db_field="first_name",
        display_name="First Name",
        description="Employee's first/preferred name",
        category=FieldCategory.IDENTITY,
        data_type="string",
        example="John",
        common_aliases=["First Name", "Preferred/First Name", "FirstName", "Given Name", "First", "Preferred Name"]
    ),
    FieldDefinition(
        db_field="last_name",
        display_name="Last Name",
        description="Employee's last/family name",
        category=FieldCategory.IDENTITY,
        data_type="string",
        example="Doe",
        common_aliases=["Last Name", "LastName", "Surname", "Family Name", "Last"]
    ),
    FieldDefinition(
        db_field="birth_date",
        display_name="Birth Date",
        description="Employee's date of birth",
        category=FieldCategory.IDENTITY,
        data_type="date",
        example="1985-03-15",
        common_aliases=["Birth Date", "DOB", "Date of Birth", "Birthday", "BirthDate"]
    ),

    # Employment fields
    FieldDefinition(
        db_field="status",
        display_name="Status",
        description="Employment status (Active, Terminated, etc.)",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Active",
        common_aliases=["Status", "Employee Status", "Employment Status", "Employee Status Description", "Work Status"]
    ),
    FieldDefinition(
        db_field="type",
        display_name="Employment Type",
        description="Type of employment (Full Time, Part Time, etc.)",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Full Time",
        common_aliases=["Type", "Employment Type", "Employment Type Description", "Worker Type", "Employee Type", "Emp Type"]
    ),
    FieldDefinition(
        db_field="hire_date",
        display_name="Hire Date",
        description="Date employee was hired",
        category=FieldCategory.EMPLOYMENT,
        data_type="date",
        example="2020-01-15",
        common_aliases=["Hire Date", "HireDate", "Start Date", "Date Hired", "Original Hire Date", "Employment Start Date"]
    ),
    FieldDefinition(
        db_field="termination_date",
        display_name="Termination Date",
        description="Date of termination (if applicable)",
        category=FieldCategory.EMPLOYMENT,
        data_type="date",
        example="2024-12-31",
        common_aliases=["Termination Date", "Term Date", "End Date", "Separation Date", "Last Day", "TerminationDate"]
    ),
    FieldDefinition(
        db_field="termination_type",
        display_name="Termination Type",
        description="Type of termination (Voluntary, Involuntary, etc.)",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Voluntary",
        common_aliases=["Termination Type", "Separation Type", "Term Type", "Reason for Leaving"]
    ),
    FieldDefinition(
        db_field="department",
        display_name="Department",
        description="Employee's department",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Engineering",
        common_aliases=["Department", "Dept", "Department Description", "Worked Department", "Home Department"]
    ),
    FieldDefinition(
        db_field="team",
        display_name="Team",
        description="Employee's team within department",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Backend Team",
        common_aliases=["Team", "Team Description", "Worked Team", "Work Group", "Group"]
    ),
    FieldDefinition(
        db_field="cost_center",
        display_name="Cost Center",
        description="Cost center for accounting",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="CC-001",
        common_aliases=["Cost Center", "CostCenter", "CostCenter Description", "Worked CostCenter", "CC", "Cost Code"]
    ),
    FieldDefinition(
        db_field="location",
        display_name="Location",
        description="Work location (auto-composed from state/zip/country if not directly mapped)",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Remote",
        common_aliases=["Location", "Work Location", "Office", "Site", "Branch"]
    ),
    FieldDefinition(
        db_field="position",
        display_name="Position",
        description="Job title/position",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Software Engineer",
        common_aliases=["Position", "Position Description", "Job Title", "Title", "Job Title (PIT)", "Role"]
    ),
    FieldDefinition(
        db_field="supervisor",
        display_name="Supervisor",
        description="Direct supervisor/manager name",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Jane Smith",
        common_aliases=["Supervisor", "Manager", "Reports To", "Direct Manager", "Supervisor Name", "Supervisor's Name", "Supervisor's Name (First Last)"]
    ),
    FieldDefinition(
        db_field="employment_type",
        display_name="Classification",
        description="Employment classification",
        category=FieldCategory.EMPLOYMENT,
        data_type="string",
        example="Full Time",
        common_aliases=["Employment Type", "Classification", "Worker Classification", "FT/PT"]
    ),

    # Compensation fields
    FieldDefinition(
        db_field="wage",
        display_name="Base Rate",
        description="Base pay rate (hourly rate)",
        category=FieldCategory.COMPENSATION,
        data_type="number",
        example="40.87",
        common_aliases=["Wage", "Rate", "Base Rate", "Pay Rate", "Hourly Rate"]
    ),
    FieldDefinition(
        db_field="wage_type",
        display_name="Wage Type",
        description="Type of wage (Hourly or Salary)",
        category=FieldCategory.COMPENSATION,
        data_type="string",
        example="Salary",
        common_aliases=["Wage Type", "Pay Type", "Pay Type Code", "Compensation Type", "Pay Frequency"]
    ),
    FieldDefinition(
        db_field="wage_effective_date",
        display_name="Pay Rate Start Date",
        description="Start date of current pay rate",
        category=FieldCategory.COMPENSATION,
        data_type="date",
        example="2024-01-15",
        common_aliases=["Pay Rate Start Date", "Rate Effective Date", "Wage Effective Date", "Rate Start Date"]
    ),
    FieldDefinition(
        db_field="annual_wage",
        display_name="Annual Salary",
        description="Annual salary amount",
        category=FieldCategory.COMPENSATION,
        data_type="number",
        example="85000",
        common_aliases=["Annual Salary", "Annual Wage", "Yearly Salary", "Base Salary", "Annual Pay"]
    ),
    FieldDefinition(
        db_field="hourly_wage",
        display_name="Hourly Rate",
        description="Hourly pay rate",
        category=FieldCategory.COMPENSATION,
        data_type="number",
        example="40.87",
        common_aliases=["Hourly Rate", "Hourly Wage", "Hourly Pay", "Rate Per Hour"]
    ),
    FieldDefinition(
        db_field="benefits_cost",
        display_name="Benefits Cost",
        description="Total annual benefits cost",
        category=FieldCategory.COMPENSATION,
        data_type="number",
        example="12000",
        common_aliases=["Benefits Cost", "Annual Benefits", "Benefits Cost Annual", "Total Benefits"]
    ),
    FieldDefinition(
        db_field="employer_taxes_annual",
        display_name="Employer Taxes",
        description="Annual employer tax burden (FICA, etc.)",
        category=FieldCategory.COMPENSATION,
        data_type="number",
        example="6500",
        common_aliases=["Employer Taxes", "Employer Tax Cost", "FICA", "Payroll Taxes"]
    ),
    FieldDefinition(
        db_field="total_compensation",
        display_name="Total Compensation",
        description="Total employer cost including benefits and taxes",
        category=FieldCategory.COMPENSATION,
        data_type="number",
        example="103500",
        common_aliases=["Total Compensation", "Total Cost", "Fully Burdened Cost", "Total Employer Cost"]
    ),

    # Health benefits
    FieldDefinition(
        db_field="medical_plan",
        display_name="Medical Plan",
        description="Medical insurance plan name",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="string",
        example="PPO Gold",
        common_aliases=["Medical Plan", "Health Plan", "Medical Insurance", "Health Insurance Plan"]
    ),
    FieldDefinition(
        db_field="medical_tier",
        display_name="Medical Tier",
        description="Coverage tier (Employee Only, Family, etc.)",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="string",
        example="Employee + Family",
        common_aliases=["Medical Tier", "Coverage Tier", "Medical Coverage Level", "Health Tier"]
    ),
    FieldDefinition(
        db_field="medical_ee_cost",
        display_name="Medical EE Cost",
        description="Employee monthly medical premium",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="number",
        example="250",
        common_aliases=["Medical EE Cost", "Medical Employee Cost", "EE Medical Premium", "Employee Medical"]
    ),
    FieldDefinition(
        db_field="medical_er_cost",
        display_name="Medical ER Cost",
        description="Employer monthly medical premium",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="number",
        example="750",
        common_aliases=["Medical ER Cost", "Medical Employer Cost", "ER Medical Premium", "Employer Medical"]
    ),
    FieldDefinition(
        db_field="dental_plan",
        display_name="Dental Plan",
        description="Dental insurance plan name",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="string",
        example="Basic Dental",
        common_aliases=["Dental Plan", "Dental Insurance", "Dental Coverage"]
    ),
    FieldDefinition(
        db_field="dental_tier",
        display_name="Dental Tier",
        description="Dental coverage tier",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="string",
        example="Employee Only",
        common_aliases=["Dental Tier", "Dental Coverage Level"]
    ),
    FieldDefinition(
        db_field="dental_ee_cost",
        display_name="Dental EE Cost",
        description="Employee monthly dental premium",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="number",
        example="15",
        common_aliases=["Dental EE Cost", "Dental Employee Cost", "EE Dental Premium"]
    ),
    FieldDefinition(
        db_field="dental_er_cost",
        display_name="Dental ER Cost",
        description="Employer monthly dental premium",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="number",
        example="45",
        common_aliases=["Dental ER Cost", "Dental Employer Cost", "ER Dental Premium"]
    ),
    FieldDefinition(
        db_field="vision_plan",
        display_name="Vision Plan",
        description="Vision insurance plan name",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="string",
        example="VSP",
        common_aliases=["Vision Plan", "Vision Insurance", "Vision Coverage"]
    ),
    FieldDefinition(
        db_field="vision_tier",
        display_name="Vision Tier",
        description="Vision coverage tier",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="string",
        example="Employee Only",
        common_aliases=["Vision Tier", "Vision Coverage Level"]
    ),
    FieldDefinition(
        db_field="vision_ee_cost",
        display_name="Vision EE Cost",
        description="Employee monthly vision premium",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="number",
        example="5",
        common_aliases=["Vision EE Cost", "Vision Employee Cost", "EE Vision Premium"]
    ),
    FieldDefinition(
        db_field="vision_er_cost",
        display_name="Vision ER Cost",
        description="Employer monthly vision premium",
        category=FieldCategory.BENEFITS_HEALTH,
        data_type="number",
        example="10",
        common_aliases=["Vision ER Cost", "Vision Employer Cost", "ER Vision Premium"]
    ),

    # Retirement benefits
    FieldDefinition(
        db_field="retirement_plan_type",
        display_name="Retirement Plan Type",
        description="Type of retirement plan (401k, Roth, etc.)",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="string",
        example="401k",
        common_aliases=["Retirement Plan", "401k Type", "Retirement Plan Type", "Retirement Account Type"]
    ),
    FieldDefinition(
        db_field="retirement_ee_contribution_pct",
        display_name="Retirement EE %",
        description="Employee contribution percentage",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="6",
        common_aliases=["Retirement EE %", "Employee Contribution %", "401k EE %", "Deferral Rate"]
    ),
    FieldDefinition(
        db_field="retirement_ee_contribution_amount",
        display_name="Retirement EE Amount",
        description="Employee contribution amount (monthly)",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="425",
        common_aliases=["Retirement EE Amount", "Employee Contribution Amount", "401k EE Contribution"]
    ),
    FieldDefinition(
        db_field="retirement_er_match_pct",
        display_name="Retirement ER Match %",
        description="Employer match percentage",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="4",
        common_aliases=["Retirement ER Match %", "Employer Match %", "Company Match %", "401k Match %"]
    ),
    FieldDefinition(
        db_field="retirement_er_match_amount",
        display_name="Retirement ER Amount",
        description="Employer match amount (monthly)",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="283",
        common_aliases=["Retirement ER Amount", "Employer Match Amount", "401k ER Contribution"]
    ),
    FieldDefinition(
        db_field="hsa_ee_contribution",
        display_name="HSA EE Contribution",
        description="Employee HSA contribution (monthly)",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="100",
        common_aliases=["HSA EE Contribution", "HSA Employee", "Employee HSA", "HSA Contribution"]
    ),
    FieldDefinition(
        db_field="hsa_er_contribution",
        display_name="HSA ER Contribution",
        description="Employer HSA contribution (monthly)",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="50",
        common_aliases=["HSA ER Contribution", "HSA Employer", "Employer HSA"]
    ),
    FieldDefinition(
        db_field="fsa_contribution",
        display_name="FSA Contribution",
        description="FSA contribution (monthly)",
        category=FieldCategory.BENEFITS_RETIREMENT,
        data_type="number",
        example="200",
        common_aliases=["FSA Contribution", "FSA", "Flexible Spending", "Healthcare FSA"]
    ),

    # Other benefits
    FieldDefinition(
        db_field="life_insurance_coverage",
        display_name="Life Insurance Coverage",
        description="Life insurance coverage amount",
        category=FieldCategory.BENEFITS_OTHER,
        data_type="number",
        example="100000",
        common_aliases=["Life Insurance Coverage", "Life Insurance Amount", "Life Coverage", "Basic Life"]
    ),
    FieldDefinition(
        db_field="life_insurance_ee_cost",
        display_name="Life Insurance EE Cost",
        description="Employee life insurance cost (monthly)",
        category=FieldCategory.BENEFITS_OTHER,
        data_type="number",
        example="10",
        common_aliases=["Life Insurance EE Cost", "Life EE Cost", "Employee Life Premium"]
    ),
    FieldDefinition(
        db_field="life_insurance_er_cost",
        display_name="Life Insurance ER Cost",
        description="Employer life insurance cost (monthly)",
        category=FieldCategory.BENEFITS_OTHER,
        data_type="number",
        example="5",
        common_aliases=["Life Insurance ER Cost", "Life ER Cost", "Employer Life Premium"]
    ),

    # Personal contact
    FieldDefinition(
        db_field="personal_email",
        display_name="Personal Email",
        description="Employee's personal email address",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="john.doe@personal.com",
        common_aliases=["Personal Email", "Home Email", "Private Email", "Non-Work Email"]
    ),
    FieldDefinition(
        db_field="personal_phone",
        display_name="Personal Phone",
        description="Employee's personal phone number",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="555-123-4567",
        common_aliases=["Personal Phone", "Home Phone", "Cell Phone", "Mobile", "Phone Number"]
    ),
    FieldDefinition(
        db_field="address_street",
        display_name="Street Address",
        description="Street address",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="123 Main St",
        common_aliases=["Street Address", "Address", "Address Line 1", "Street", "Home Address"]
    ),
    FieldDefinition(
        db_field="address_city",
        display_name="City",
        description="City",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="Austin",
        common_aliases=["City", "Home City", "Address City"]
    ),
    FieldDefinition(
        db_field="address_state",
        display_name="State",
        description="State/Province",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="TX",
        common_aliases=["State", "Home State", "Province", "Address State", "Current Home State"]
    ),
    FieldDefinition(
        db_field="address_zip",
        display_name="Zip Code",
        description="Postal/Zip code",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="78701",
        common_aliases=["Zip Code", "Zip", "Postal Code", "Address Zip"]
    ),
    FieldDefinition(
        db_field="address_country",
        display_name="Country",
        description="Country",
        category=FieldCategory.PERSONAL,
        data_type="string",
        example="US",
        common_aliases=["Country", "Home Country", "Current Home Country", "Address Country", "Country Code"]
    ),

    # EEO fields
    FieldDefinition(
        db_field="eeo_job_category",
        display_name="EEO Job Category",
        description="EEO-1 job category classification",
        category=FieldCategory.EEO,
        data_type="string",
        example="Professionals",
        common_aliases=["EEO Job Category", "Job Category", "EEO Category", "EEO-1 Category"]
    ),
    FieldDefinition(
        db_field="eeo_race_ethnicity",
        display_name="Race/Ethnicity",
        description="Self-identified race/ethnicity for EEO",
        category=FieldCategory.EEO,
        data_type="string",
        example="White (Not Hispanic or Latino)",
        common_aliases=["Race/Ethnicity", "Race", "Ethnicity", "Ethnicity Code", "EEO Race", "Race/Ethnic Group"]
    ),
    FieldDefinition(
        db_field="eeo_gender",
        display_name="Gender",
        description="Self-identified gender for EEO",
        category=FieldCategory.EEO,
        data_type="string",
        example="Male",
        common_aliases=["Gender", "Sex", "EEO Gender"]
    ),
    FieldDefinition(
        db_field="eeo_veteran_status",
        display_name="Veteran Status",
        description="Veteran status for EEO",
        category=FieldCategory.EEO,
        data_type="string",
        example="Not a Protected Veteran",
        common_aliases=["Veteran Status", "Veteran", "Protected Veteran Status", "Military Status"]
    ),
    FieldDefinition(
        db_field="eeo_disability_status",
        display_name="Disability Status",
        description="Disability status for EEO",
        category=FieldCategory.EEO,
        data_type="string",
        example="No I Don't Have A Disability",
        common_aliases=["Disability Status", "Disability", "ADA Status"]
    ),
]


# ============================================================================
# BENEFIT ENROLLMENT FIELD DEFINITIONS
# ============================================================================

BENEFIT_ENROLLMENT_FIELDS: List[FieldDefinition] = [
    FieldDefinition(
        db_field="employee_id",
        display_name="Employee ID",
        description="Unique identifier for the employee (required)",
        category=FieldCategory.REQUIRED,
        data_type="string",
        required=True,
        example="173",
        common_aliases=["Employee ID", "Employee Id", "Emp ID", "EE ID", "Worker ID"]
    ),
    FieldDefinition(
        db_field="benefit_type",
        display_name="Benefit Type",
        description="Type of benefit (Vision, Dental, Medical, Group Life, etc.)",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        required=True,
        example="Vision",
        common_aliases=["Benefit", "Benefit Type", "Benefit Name", "Coverage Type", "Plan Type"]
    ),
    FieldDefinition(
        db_field="plan_name",
        display_name="Plan Name",
        description="Full plan name from the carrier",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="2026 EMI Health: Vision Plan",
        common_aliases=["Plan", "Plan Name", "Plan Description", "Benefit Plan", "Coverage Plan"]
    ),
    FieldDefinition(
        db_field="enrollment_type",
        display_name="Enrollment Type",
        description="Enrollment status (Current, New, Termed, etc.)",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="Current",
        common_aliases=["Enrollment Type", "Enrollment Status", "Election Status"]
    ),
    FieldDefinition(
        db_field="relationship",
        display_name="Relationship",
        description="Relationship of the covered person (Employee, Spouse, Child)",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="Employee",
        common_aliases=["Relationship", "Relation", "Dependent Relationship", "Coverage Relationship"]
    ),
    FieldDefinition(
        db_field="ee_cost",
        display_name="Employee Cost (EE)",
        description="Employee cost per pay period",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="number",
        example="7.80",
        common_aliases=["EE Cost", "Employee Cost", "EE Premium", "Employee Premium", "Employee Deduction"]
    ),
    FieldDefinition(
        db_field="er_cost",
        display_name="Employer Cost (ER)",
        description="Employer cost per pay period",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="number",
        example="586.77",
        common_aliases=["ER Cost", "Employer Cost", "ER Premium", "Employer Premium", "Employer Contribution"]
    ),
    FieldDefinition(
        db_field="coverage_level",
        display_name="Coverage Level",
        description="Coverage tier (Employee, Employee + One, Employee + Family, etc.)",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="Employee + Family",
        common_aliases=["Coverage Level", "Coverage Tier", "Tier", "Coverage"]
    ),
    FieldDefinition(
        db_field="benefit_amount",
        display_name="Benefit Amount",
        description="Coverage or benefit amount (e.g., $50,000 life insurance)",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="number",
        example="50000",
        common_aliases=["Benefit Amount", "Coverage Amount", "Amount", "Approved Benefit Amount"]
    ),
    FieldDefinition(
        db_field="payroll_code",
        display_name="Employee Payroll Code",
        description="Payroll deduction code for the employee",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="VISCH",
        common_aliases=["Employee Payroll Code", "Payroll Code", "Deduction Code", "EE Payroll Code"]
    ),
    FieldDefinition(
        db_field="pre_tax_code",
        display_name="Pre-tax Code",
        description="Pre-tax payroll deduction code",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="VISCH",
        common_aliases=["Pre-tax Code", "Pre Tax Code", "Pretax Code"]
    ),
    FieldDefinition(
        db_field="post_tax_code",
        display_name="Post-tax Code",
        description="Post-tax payroll deduction code",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="",
        common_aliases=["Post-tax Code", "Post Tax Code", "Posttax Code"]
    ),
    FieldDefinition(
        db_field="employer_code",
        display_name="Employer Code",
        description="Employer payroll contribution code",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="",
        common_aliases=["Employer Code", "ER Code", "Employer Payroll Code"]
    ),
    FieldDefinition(
        db_field="effective_date",
        display_name="Coverage Start Date",
        description="Date coverage begins",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="date",
        example="1/1/26",
        common_aliases=["Coverage Start Date", "Effective Date", "Start Date", "Begin Date"]
    ),
    FieldDefinition(
        db_field="end_date",
        display_name="Coverage End Date",
        description="Date coverage ends",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="date",
        example="12/31/26",
        common_aliases=["Coverage End Date", "End Date", "Termination Date", "Expiration Date"]
    ),
    FieldDefinition(
        db_field="hsa_limit_level",
        display_name="HSA Limit Level",
        description="HSA contribution limit level (Individual, Family, Family Catch-up)",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="Family",
        common_aliases=["HSA Limit Level", "HSA Level", "HSA Tier", "HSA Limit"]
    ),
    FieldDefinition(
        db_field="carrier",
        display_name="Carrier",
        description="Insurance carrier name",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="Equitable",
        common_aliases=["Carrier", "Insurance Carrier", "Provider", "Vendor"]
    ),
    FieldDefinition(
        db_field="carrier_plan_code",
        display_name="Carrier Plan Code",
        description="Carrier's internal plan code",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="",
        common_aliases=["Carrier Plan Code", "Plan Code", "Carrier Code"]
    ),
    FieldDefinition(
        db_field="plan_policy_number",
        display_name="Plan Policy Number",
        description="Policy number for the plan",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="",
        common_aliases=["Plan Policy Number", "Policy Number", "Policy #", "Policy No"]
    ),
    FieldDefinition(
        db_field="is_cobra",
        display_name="Is COBRA",
        description="Whether this is a COBRA continuation enrollment",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="boolean",
        example="false",
        common_aliases=["Is Cobra", "COBRA", "Cobra Status", "Is COBRA"]
    ),
    FieldDefinition(
        db_field="declined_reason",
        display_name="Declined Reason",
        description="Reason for declining coverage",
        category=FieldCategory.BENEFIT_ENROLLMENT,
        data_type="string",
        example="",
        common_aliases=["Declined Reason", "Waiver Reason", "Decline Reason"]
    ),
]


class ColumnMappingService:
    """Service for managing column mappings"""

    def __init__(self):
        # Build lookup dictionaries
        self._fields_by_name = {f.db_field: f for f in EMPLOYEE_FIELDS}
        self._alias_to_field: Dict[str, str] = {}

        # Build alias lookup (lowercase for case-insensitive matching)
        for field_def in EMPLOYEE_FIELDS:
            for alias in field_def.common_aliases:
                self._alias_to_field[alias.lower()] = field_def.db_field

        # Benefit enrollment fields
        self._benefit_fields_by_name = {f.db_field: f for f in BENEFIT_ENROLLMENT_FIELDS}
        self._benefit_alias_to_field: Dict[str, str] = {}
        for field_def in BENEFIT_ENROLLMENT_FIELDS:
            for alias in field_def.common_aliases:
                self._benefit_alias_to_field[alias.lower()] = field_def.db_field

    def get_all_fields(self) -> List[Dict[str, Any]]:
        """Get all available field definitions grouped by category"""
        result = []
        for field_def in EMPLOYEE_FIELDS:
            result.append({
                "db_field": field_def.db_field,
                "display_name": field_def.display_name,
                "description": field_def.description,
                "category": field_def.category.value,
                "data_type": field_def.data_type,
                "required": field_def.required,
                "example": field_def.example,
                "common_aliases": field_def.common_aliases
            })
        return result

    def get_fields_by_category(self, file_category: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get fields organized by category"""
        fields = BENEFIT_ENROLLMENT_FIELDS if file_category == "benefits_data" else EMPLOYEE_FIELDS
        result: Dict[str, List[Dict[str, Any]]] = {}

        for field_def in fields:
            category = field_def.category.value
            if category not in result:
                result[category] = []

            result[category].append({
                "db_field": field_def.db_field,
                "display_name": field_def.display_name,
                "description": field_def.description,
                "data_type": field_def.data_type,
                "required": field_def.required,
                "example": field_def.example
            })

        return result

    def auto_detect_mappings(self, source_columns: List[str], file_category: Optional[str] = None) -> Dict[str, str]:
        """
        Auto-detect column mappings based on column names

        Args:
            source_columns: List of column names from the source file
            file_category: Optional file category to use category-specific fields

        Returns:
            Dict mapping source column names to database field names
        """
        if file_category == "benefits_data":
            alias_lookup = self._benefit_alias_to_field
            fields_lookup = self._benefit_fields_by_name
        else:
            alias_lookup = self._alias_to_field
            fields_lookup = self._fields_by_name

        mappings: Dict[str, str] = {}

        for col in source_columns:
            col_lower = col.strip().lower()

            # Check direct alias match
            if col_lower in alias_lookup:
                mappings[col] = alias_lookup[col_lower]
                continue

            # Check if column name matches db field directly
            col_normalized = col_lower.replace(" ", "_").replace("-", "_")
            if col_normalized in fields_lookup:
                mappings[col] = col_normalized
                continue

            # Fuzzy matching for common patterns (only for employee fields)
            if file_category != "benefits_data":
                detected = self._fuzzy_match(col)
                if detected:
                    mappings[col] = detected

        return mappings

    def _fuzzy_match(self, column_name: str) -> Optional[str]:
        """Attempt fuzzy matching for column names"""
        col_lower = column_name.lower()

        # Common word substitutions
        substitutions = [
            ("employee", "emp"),
            ("number", "num"),
            ("department", "dept"),
            ("identifier", "id"),
            ("identification", "id"),
        ]

        # Try substitutions
        for original, replacement in substitutions:
            if original in col_lower:
                test = col_lower.replace(original, replacement)
                if test in self._alias_to_field:
                    return self._alias_to_field[test]

        # Check for partial matches
        for alias, field in self._alias_to_field.items():
            # Check if column contains the alias
            if alias in col_lower or col_lower in alias:
                return field

        return None

    def validate_mappings(self, mappings: Dict[str, str]) -> Tuple[bool, List[str]]:
        """
        Validate column mappings

        Args:
            mappings: Dict mapping source columns to db fields

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []

        # Check required field is mapped
        required_fields = [f.db_field for f in EMPLOYEE_FIELDS if f.required]
        mapped_fields = set(mappings.values())

        for req_field in required_fields:
            if req_field not in mapped_fields:
                field_def = self._fields_by_name.get(req_field)
                if field_def:
                    errors.append(f"Required field '{field_def.display_name}' is not mapped")

        # Check all target fields are valid (accept both employee and benefit enrollment fields)
        valid_fields = set(self._fields_by_name.keys()) | set(self._benefit_fields_by_name.keys())
        for source, target in mappings.items():
            if target and target not in valid_fields:
                errors.append(f"Unknown target field '{target}' for source column '{source}'")

        return len(errors) == 0, errors

    def apply_mappings(self, row: Dict[str, Any], mappings: Dict[str, str]) -> Dict[str, Any]:
        """
        Apply column mappings to transform a row of data

        Args:
            row: Source data row (dict with source column names)
            mappings: Dict mapping source columns to db fields

        Returns:
            Transformed row with database field names
        """
        result = {}

        for source_col, db_field in mappings.items():
            if not db_field:  # Skip unmapped columns
                continue

            if source_col in row:
                value = row[source_col]
                # Convert to appropriate type
                result[db_field] = self._convert_value(value, db_field)

        return result

    def _convert_value(self, value: Any, db_field: str) -> Any:
        """Convert value to appropriate type for database field"""
        if value is None or value == "" or (isinstance(value, str) and value.strip() == ""):
            return None
        # Handle pandas NaT (Not a Time) — str(NaT) == "NaT"
        if str(value) == "NaT":
            return None

        field_def = self._fields_by_name.get(db_field)
        if not field_def:
            return value

        try:
            if field_def.data_type == "number":
                # Handle numeric values
                if isinstance(value, str):
                    # Remove currency symbols and commas
                    value = value.replace("$", "").replace(",", "").strip()
                    if value == "":
                        return None
                return float(value)

            elif field_def.data_type == "date":
                # Return as string - let the import service handle date parsing
                if isinstance(value, str):
                    return value.strip()
                return str(value)

            elif field_def.data_type == "boolean":
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.lower() in ("true", "yes", "1", "y")
                return bool(value)

            else:  # string
                return str(value).strip() if value else None

        except (ValueError, TypeError):
            return value  # Return as-is if conversion fails

    def get_unmapped_suggestions(
        self,
        source_columns: List[str],
        current_mappings: Dict[str, str]
    ) -> Dict[str, List[str]]:
        """
        Get suggestions for unmapped columns

        Args:
            source_columns: All source column names
            current_mappings: Current mappings (source -> db_field)

        Returns:
            Dict mapping unmapped source columns to list of suggested db fields
        """
        mapped_sources = set(current_mappings.keys())
        mapped_targets = set(current_mappings.values())

        suggestions = {}

        for col in source_columns:
            if col in mapped_sources:
                continue

            # Get suggested fields that aren't already mapped
            col_lower = col.lower()
            suggested = []

            # Check alias matches
            if col_lower in self._alias_to_field:
                target = self._alias_to_field[col_lower]
                if target not in mapped_targets:
                    suggested.append(target)

            # Add fuzzy matches
            fuzzy = self._fuzzy_match(col)
            if fuzzy and fuzzy not in mapped_targets and fuzzy not in suggested:
                suggested.append(fuzzy)

            if suggested:
                suggestions[col] = suggested

        return suggestions


# Singleton instance
column_mapping_service = ColumnMappingService()
