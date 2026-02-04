"""
FMLA Form Service
Handles FMLA WH-381 Notice of Eligibility and Rights & Responsibilities form generation
"""

from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional
from pypdf import PdfWriter
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Company-specific FMLA configuration
FMLA_COMPANY_CONFIG = {
    'company_name': 'National Benefit Services',
    'hr_contact_name': os.getenv('HR_CONTACT_NAME', ''),
    'hr_contact_email': os.getenv('HR_CONTACT_EMAIL', ''),
    'hr_contact_phone': None,

    # Leave year calculation
    'leave_year_method': 'forward',  # Forward from first FMLA leave date

    # Paid leave policy
    'paid_leave_default': ['unpaid', 'required'],  # Some/all unpaid + employer requires use of paid leave

    # Health benefits
    'grace_period_days': 30,

    # Periodic reporting
    'periodic_reporting_required': True,
    'periodic_reporting_interval': 'every 4 weeks',

    # Benefits contact (same as HR)
    'benefits_contact_name': os.getenv('HR_CONTACT_NAME', ''),
    'benefits_contact_email': os.getenv('HR_CONTACT_EMAIL', ''),
}


class FMLAFormService:
    """Service for generating FMLA WH-381 forms"""

    def __init__(self):
        self.template_path = "app/templates/pdf_forms/WH-381_Notice of Eligibility.pdf"
        self.output_dir = "app/storage/filled_forms"
        self.config = FMLA_COMPANY_CONFIG

    def checkbox_value(self, checked: bool) -> str:
        """Return the correct PDF checkbox value"""
        return "/Yes" if checked else "/Off"

    def calculate_eligibility(
        self,
        employee: Any,
        leave_start_date: date,
        employment_type: str = "Full Time"
    ) -> Dict[str, Any]:
        """
        Calculate FMLA eligibility based on:
        1. 12+ months employment
        2. 1,250+ hours worked in last 12 months
        3. 50+ employees at location (assumed True for NBS)

        Args:
            employee: Employee model instance
            leave_start_date: Date when FMLA leave will begin
            employment_type: "Full Time" or "Part Time"
        """
        # 1. Check 12-month employment
        hire_date = employee.hire_date
        months_employed = (leave_start_date - hire_date).days / 30.44  # Average days per month
        meets_12_months = months_employed >= 12

        # 2. Calculate hours worked in last 12 months
        # Full-time: 2080 hours/year, Part-time: 1040 hours/year
        if employment_type == "Full Time":
            annual_hours = 2080
        elif employment_type == "Part Time":
            annual_hours = 1040
        else:
            annual_hours = 2080  # Default to full-time

        # Calculate pro-rated hours if employed less than 12 months
        if months_employed < 12:
            hours_worked_12months = int((months_employed / 12) * annual_hours)
        else:
            hours_worked_12months = annual_hours

        meets_hours = hours_worked_12months >= 1250

        # 3. Check 50+ employees at location
        # Assuming NBS meets this requirement
        meets_location = True

        # Determine overall eligibility
        is_eligible = meets_12_months and meets_hours and meets_location

        # Build ineligibility reasons if not eligible
        ineligibility_reasons = []
        if not meets_12_months:
            ineligibility_reasons.append(
                f"Not employed for 12 months (only {round(months_employed, 1)} months)"
            )
        if not meets_hours:
            ineligibility_reasons.append(
                f"Did not work 1,250 hours (only {hours_worked_12months} hours)"
            )
        if not meets_location:
            ineligibility_reasons.append(
                "Work location does not have 50+ employees within 75 miles"
            )

        return {
            'is_eligible': is_eligible,
            'months_employed': round(months_employed, 1),
            'hours_worked_12months': hours_worked_12months,
            'meets_12_months': meets_12_months,
            'meets_hours': meets_hours,
            'meets_location': meets_location,
            'ineligibility_reasons': ineligibility_reasons
        }

    def build_field_mappings(
        self,
        employee: Any,
        request_data: Dict[str, Any],
        eligibility: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Build complete field mappings for the WH-381 form

        Args:
            employee: Employee model instance
            request_data: FMLA request data (dates, reason, certification, etc.)
            eligibility: Eligibility calculation results
        """
        # Get dates
        today = datetime.now().strftime("%m/%d/%Y")
        request_date = request_data.get('request_date')
        leave_start_date = request_data.get('leave_start_date')

        # Format dates
        request_date_str = request_date.strftime("%m/%d/%Y") if request_date else ""
        leave_start_str = leave_start_date.strftime("%m/%d/%Y") if leave_start_date else ""

        # Get leave reason and family relationship
        leave_reason = request_data.get('leave_reason')
        family_relationship = request_data.get('family_relationship')

        # Get certification requirements
        certification_required = request_data.get('certification_required', False)
        certification_attached = request_data.get('certification_attached', False)
        relationship_cert_required = request_data.get('relationship_cert_required', False)

        # Calculate certification due date (30 days from today)
        cert_due_date = (datetime.now() + timedelta(days=30)).strftime("%m/%d/%Y")

        # Get key employee status
        is_key_employee = request_data.get('is_key_employee', False)

        # Get paid leave settings
        some_unpaid = request_data.get('some_unpaid', True)
        employer_requires_paid = request_data.get('employer_requires_paid', True)
        other_leave_arrangement = request_data.get('other_leave_arrangement', '')

        # Build the field mappings
        fields = {}

        # --- SECTION 1: Header & Basic Information ---
        fields['Date1'] = today
        fields['Employer To'] = f"{self.config['company_name']} To: {employee.first_name} {employee.last_name}"
        fields['Employee'] = f"{employee.first_name} {employee.last_name}"
        fields['mmddyyyy we learned that you need leave beginning on'] = f"{request_date_str} / {leave_start_str}"
        fields['mmddyyyy_2'] = leave_start_str

        # --- SECTION 2: Reason for Leave ---
        # Primary reason
        fields['The birth of a child or placement of a child with you for adoption or foster care and to bond with the newborn or'] = \
            self.checkbox_value(leave_reason == 'birth_adoption')
        fields['Your own serious health condition'] = \
            self.checkbox_value(leave_reason == 'own_health')
        fields['You are needed to care for your family member due to a serious health condition Your family member is your'] = \
            self.checkbox_value(leave_reason == 'family_care')
        fields['A qualifying exigency arising out of the fact that your family member is on covered active duty or has been notified of'] = \
            self.checkbox_value(leave_reason == 'military_exigency')
        fields['You are needed to care for your family member who is a covered servicemember with a serious injury or illness You'] = \
            self.checkbox_value(leave_reason == 'military_caregiver')

        # Family relationship (if applicable)
        if family_relationship:
            fields['Spouse'] = self.checkbox_value(family_relationship == 'spouse')
            fields['Spouse_2'] = self.checkbox_value(family_relationship == 'spouse')
            fields['Spouse_3'] = self.checkbox_value(family_relationship == 'spouse')
            fields['Parent'] = self.checkbox_value(family_relationship == 'parent')
            fields['Parent_2'] = self.checkbox_value(family_relationship == 'parent')
            fields['Parent_3'] = self.checkbox_value(family_relationship == 'parent')
            fields['Child under age 18'] = self.checkbox_value(family_relationship == 'child_under_18')
            fields['Child 18 years or older and incapable of self'] = self.checkbox_value(family_relationship == 'child_over_18_disabled')
            fields['Child of any age'] = self.checkbox_value(family_relationship == 'child_any_age')
            fields['Child'] = self.checkbox_value(family_relationship == 'child')
            fields['Next of kin'] = self.checkbox_value(family_relationship == 'next_of_kin')

        # --- SECTION 3: Eligibility Determination ---
        fields['Eligible for FMLA leave see Rights  Responsibilities notice below'] = \
            self.checkbox_value(eligibility['is_eligible'])
        fields['Not eligible for FMLA leave because'] = \
            self.checkbox_value(not eligibility['is_eligible'])

        # Only show ineligibility details if not eligible
        if not eligibility['is_eligible']:
            fields['You have not met the FMLAs 12month length'] = \
                self.checkbox_value(not eligibility['meets_12_months'])
            if not eligibility['meets_12_months']:
                fields['towards this requirement'] = str(eligibility['months_employed'])

            fields['You have not met the FMLAs 1250 hours'] = \
                self.checkbox_value(not eligibility['meets_hours'])
            if not eligibility['meets_hours']:
                fields['towards this requirement_2'] = str(int(eligibility['hours_worked_12months']))

            fields['Flight Crew'] = self.checkbox_value(False)
            fields['50+'] = self.checkbox_value(not eligibility['meets_location'])

        # --- SECTION 4: HR Contact Information ---
        fields['Contact'] = self.config['hr_contact_name']
        fields['Contact info'] = self.config['hr_contact_email']
        fields['If you have any questions please contact_2'] = self.config['hr_contact_name']
        fields['at_2'] = self.config['hr_contact_email']

        # --- SECTION 5: Additional Information / Certification ---
        fields['No additiona info'] = self.checkbox_value(not certification_required)
        fields['Certification requested'] = self.checkbox_value(certification_required)
        fields['Certification attached'] = self.checkbox_value(certification_attached)
        fields['Certify relationship'] = self.checkbox_value(relationship_cert_required)

        if certification_required:
            fields['If requested medical certification must be returned by'] = cert_due_date
        if relationship_cert_required:
            fields['must be returned to us by'] = cert_due_date

        # --- SECTION 6: Rights and Responsibilities ---
        # Part A: Leave Entitlement
        fields['The calendar year January 1st December 31st'] = self.checkbox_value(False)
        fields['A fixed leave year based on'] = self.checkbox_value(False)
        fields['eg a fiscal year beginning on July 1'] = ""
        fields['The 12month period measured forward'] = self.checkbox_value(True)  # Using forward method
        fields['A rolling 12month period measured backward'] = self.checkbox_value(False)

        # Key Employee Status
        fields['are'] = self.checkbox_value(is_key_employee)
        fields['are not considered a key employee'] = self.checkbox_value(not is_key_employee)
        fields['have'] = self.checkbox_value(False)
        fields['have not determined that restoring you'] = self.checkbox_value(True)

        # Part B: Substitution of Paid Leave
        fields['Some or all of your FMLA leave will not be paid'] = self.checkbox_value(some_unpaid)
        fields['You have requested to use some or all'] = self.checkbox_value(False)
        fields['We are requiring you to use some or all'] = self.checkbox_value(employer_requires_paid)
        fields['Other eg shortor longterm disability'] = self.checkbox_value(bool(other_leave_arrangement))
        if other_leave_arrangement:
            fields['Any time taken for this reason'] = other_leave_arrangement

        # Part C: Maintain Health Benefits
        fields['on your health insurance while you are on any unpaid FMLA leave contact'] = \
            self.config['benefits_contact_name']
        fields['undefined_2'] = self.config['benefits_contact_email']
        fields['You have a minimum grace period of'] = self.checkbox_value(True)
        fields['30days or'] = self.checkbox_value(True)  # Using 30 days
        fields['indicate longer period if applicable in which to'] = ""

        # Part D: Other Employee Benefits
        fields['your employee benefits while you are on FMLA leave contact'] = \
            self.config['benefits_contact_name']
        fields['at_3'] = self.config['benefits_contact_email']

        # Part F: Other Requirements While on FMLA Leave
        fields['While on leave you'] = self.checkbox_value(self.config['periodic_reporting_required'])
        fields['will be'] = self.checkbox_value(self.config['periodic_reporting_required'])
        fields['return to work every'] = self.config['periodic_reporting_interval']

        return fields

    def generate_form(
        self,
        employee: Any,
        request_data: Dict[str, Any],
        output_filename: Optional[str] = None,
        flatten: bool = True
    ) -> str:
        """
        Generate a filled FMLA WH-381 form

        Args:
            employee: Employee model instance
            request_data: FMLA request data
            output_filename: Optional custom output filename
            flatten: If True, flatten the PDF to prevent editing (default: True)

        Returns:
            Path to the generated PDF file
        """
        # Calculate eligibility
        employment_type = employee.employment_type or "Full Time"
        eligibility = self.calculate_eligibility(
            employee,
            request_data['leave_start_date'],
            employment_type
        )

        # Build field mappings
        field_mappings = self.build_field_mappings(employee, request_data, eligibility)

        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)

        # Generate output filename
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            employee_id = employee.employee_id or employee.id
            output_filename = f"FMLA_WH381_{employee_id}_{timestamp}.pdf"

        output_path = os.path.join(self.output_dir, output_filename)

        # Fill the PDF form
        writer = PdfWriter()
        writer.append(self.template_path)

        # Update form fields on all pages
        for page_num, page in enumerate(writer.pages):
            writer.update_page_form_field_values(page, field_mappings)

        # Write the filled PDF
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)

        # TODO: Implement proper flattening for pypdf 6.x
        # The flatten_form_fields() method doesn't exist in pypdf 6.x
        # For now, we'll leave forms fillable

        return output_path
