"""
Unified Exit Document Service
Handles generation of all exit-related documents:
- Important Information for Terminating Employee
- Equitable Portability Form
- Equitable Conversion Form (Notice of Conversion)

All forms share common employee data and can be generated from a single unified form.
"""

from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional, List
from pypdf import PdfWriter, PdfReader
import os
from pathlib import Path
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch


class UnifiedExitDocumentService:
    """Service for generating all exit-related documents from unified data"""

    def __init__(self):
        self.template_dir = "app/templates/pdf_forms"
        self.output_dir = "app/storage/filled_forms"

        # Template paths
        self.templates = {
            "important_info": os.path.join(self.template_dir, "Important Information for Terminating Employees - Fillable.pdf"),
            "conversion": os.path.join(self.template_dir, "Equitable Conversion Form - Template.pdf"),
            "portability": os.path.join(self.template_dir, "Equitable Portability Form - Template.pdf"),
        }

    def get_unified_form_structure(self) -> Dict[str, Any]:
        """
        Returns the structure of the unified exit documents form.
        This defines all fields needed across all exit documents.
        """
        return {
            "sections": [
                {
                    "id": "employee_info",
                    "title": "Employee Information",
                    "description": "Basic employee identification",
                    "fields": [
                        {"id": "employee_name", "label": "Employee Name", "type": "text", "readonly": True, "documents": ["important_info", "conversion", "portability"]},
                        {"id": "employee_first_name", "label": "First Name", "type": "text", "readonly": True, "documents": ["important_info", "conversion", "portability"]},
                        {"id": "employee_last_name", "label": "Last Name", "type": "text", "readonly": True, "documents": ["important_info", "conversion", "portability"]},
                        {"id": "date_of_birth", "label": "Date of Birth", "type": "date", "documents": ["conversion", "portability"]},
                        {"id": "ssn_last_four", "label": "SSN (Last 4)", "type": "text", "documents": ["conversion", "portability"], "sensitive": True},
                        {"id": "employee_class", "label": "Employee Class", "type": "select", "options": ["Regular", "Executive"], "default": "Regular", "documents": ["conversion", "portability"]},
                    ]
                },
                {
                    "id": "contact_info",
                    "title": "Personal Contact Information",
                    "description": "Contact details for after employment ends",
                    "fields": [
                        {"id": "personal_email", "label": "Personal Email", "type": "email", "documents": ["important_info", "conversion", "portability"]},
                        {"id": "personal_phone", "label": "Personal Phone", "type": "tel", "documents": ["important_info", "conversion", "portability"]},
                    ]
                },
                {
                    "id": "address",
                    "title": "Mailing Address",
                    "description": "Address for final documents and correspondence",
                    "fields": [
                        {"id": "address_street", "label": "Street Address", "type": "text", "documents": ["important_info", "portability"]},
                        {"id": "address_city", "label": "City", "type": "text", "documents": ["important_info", "portability"]},
                        {"id": "address_state", "label": "State", "type": "text", "documents": ["important_info", "portability"]},
                        {"id": "address_zip", "label": "ZIP Code", "type": "text", "documents": ["important_info", "portability"]},
                    ]
                },
                {
                    "id": "termination_details",
                    "title": "Termination Details",
                    "description": "Key dates and amounts",
                    "fields": [
                        {"id": "termination_date", "label": "Termination Date", "type": "date", "readonly": True, "documents": ["important_info", "conversion", "portability"]},
                        {"id": "last_pay_date", "label": "Last Pay Date", "type": "date", "documents": ["important_info"]},
                        {"id": "last_coverage_date", "label": "Last Coverage Date", "type": "date", "documents": ["important_info"]},
                        {"id": "pto_hours", "label": "PTO Hours to Pay Out", "type": "number", "documents": ["important_info"]},
                    ]
                },
                {
                    "id": "supervisor_info",
                    "title": "Supervisor Information",
                    "description": "For forwarding communications",
                    "fields": [
                        {"id": "supervisor_name", "label": "Supervisor Name", "type": "text", "documents": ["important_info"]},
                        {"id": "supervisor_email", "label": "Supervisor Email", "type": "email", "documents": ["important_info"]},
                    ]
                },
                {
                    "id": "compensation_info",
                    "title": "Compensation Information",
                    "description": "Required for Conversion and Portability forms",
                    "fields": [
                        {"id": "annual_salary", "label": "Basic Annual Salary", "type": "currency", "documents": ["conversion", "portability"]},
                        {"id": "date_last_salary_increase", "label": "Date of Last Salary Increase", "type": "date", "documents": ["conversion"]},
                    ]
                },
                {
                    "id": "insurance_info",
                    "title": "Insurance Information",
                    "description": "Group life insurance coverage details",
                    "fields": [
                        {"id": "insurance_effective_date", "label": "Insurance Effective Date", "type": "date", "documents": ["conversion", "portability"]},
                        {"id": "date_insurance_terminated", "label": "Date Insurance Terminated", "type": "date", "documents": ["conversion", "portability"]},
                        {"id": "date_optional_terminated", "label": "Date Optional Life Coverage Terminated", "type": "date", "documents": ["conversion"]},
                        {"id": "benefits_status", "label": "Benefits Status", "type": "select", "options": ["Terminated", "Reduced"], "default": "Terminated", "documents": ["conversion", "portability"]},
                    ]
                },
                {
                    "id": "termination_circumstances",
                    "title": "Termination Circumstances",
                    "description": "Reason for leaving (Conversion/Portability forms)",
                    "fields": [
                        {"id": "stopped_due_to_injury", "label": "Stopped due to injury/sickness?", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "stopped_due_to_retirement", "label": "Stopped due to retirement?", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "waiver_of_premium_filed", "label": "Waiver of Premium filed?", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "waiver_determination", "label": "Waiver Determination", "type": "select", "options": ["Approved", "Denied", "Pending", "N/A"], "default": "N/A", "documents": ["conversion", "portability"]},
                        {"id": "premiums_paid_by_employer", "label": "Premiums still paid by employer?", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                    ]
                },
                {
                    "id": "coverage_amounts",
                    "title": "Coverage Information",
                    "description": "Life insurance coverage amounts",
                    "fields": [
                        # Basic Life
                        {"id": "has_employee_basic_life", "label": "Employee Basic Life", "type": "boolean", "default": True, "documents": ["conversion", "portability"]},
                        {"id": "employee_basic_life_amount", "label": "Employee Basic Life Amount", "type": "currency", "default": 50000, "documents": ["conversion", "portability"]},
                        {"id": "has_spouse_basic_life", "label": "Spouse Basic Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "spouse_basic_life_amount", "label": "Spouse Basic Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        {"id": "has_child_basic_life", "label": "Child Basic Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "child_basic_life_amount", "label": "Child Basic Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        # Voluntary/Opt'l Life (for Conversion form)
                        {"id": "has_employee_voluntary_life", "label": "Employee Voluntary Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "employee_voluntary_life_amount", "label": "Employee Voluntary Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        {"id": "has_spouse_voluntary_life", "label": "Spouse Voluntary Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "spouse_voluntary_life_amount", "label": "Spouse Voluntary Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        {"id": "has_child_voluntary_life", "label": "Child Voluntary Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "child_voluntary_life_amount", "label": "Child Voluntary Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        # Supplemental Coverage (for Portability form)
                        {"id": "supplemental_employee_amount", "label": "Supplemental Employee Amount", "type": "currency", "documents": ["portability"]},
                        {"id": "supplemental_spouse_amount", "label": "Supplemental Spouse Amount", "type": "currency", "documents": ["portability"]},
                        {"id": "supplemental_child_amount", "label": "Supplemental Child Amount", "type": "currency", "documents": ["portability"]},
                    ]
                }
            ],
            "documents": {
                "important_info": {
                    "name": "Important Information for Terminating Employee",
                    "required_fields": ["employee_name", "personal_email", "personal_phone", "address_street", "address_city", "address_state", "address_zip", "pto_hours", "last_pay_date", "last_coverage_date", "supervisor_name"],
                    "optional_fields": ["supervisor_email"]
                },
                "conversion": {
                    "name": "Equitable Life Insurance Conversion Form",
                    "required_fields": ["employee_name", "date_of_birth", "personal_email", "personal_phone", "ssn_full", "annual_salary", "termination_date", "insurance_effective_date", "date_last_salary_increase", "date_insurance_terminated"],
                    "optional_fields": ["employee_voluntary_life_amount", "spouse_voluntary_life_amount", "child_voluntary_life_amount", "date_optional_terminated"]
                },
                "portability": {
                    "name": "Equitable Life Insurance Portability Form",
                    "required_fields": ["employee_name", "termination_date"],
                    "optional_fields": ["supplemental_employee_amount", "supplemental_spouse_amount", "supplemental_child_amount"]
                }
            }
        }

    def build_important_info_fields(
        self,
        form_data: Dict[str, Any],
        employee: Any
    ) -> Dict[str, str]:
        """Build field mappings for Important Information form"""
        fields = {}

        # Employee Information
        fields['Employee Name First Name Last Name'] = form_data.get('employee_name', f"{employee.first_name} {employee.last_name}")
        fields['Street Address'] = form_data.get('address_street', '') or employee.address_street or ""
        fields['City'] = form_data.get('address_city', '') or employee.address_city or ""
        fields['State'] = form_data.get('address_state', '') or employee.address_state or ""
        fields['Zip'] = form_data.get('address_zip', '') or employee.address_zip or ""
        fields['Phone Number'] = form_data.get('personal_phone', '') or employee.personal_phone or ""
        fields['Email Address'] = form_data.get('personal_email', '') or employee.personal_email or ""

        # Dates and PTO
        fields['undefined'] = form_data.get('last_pay_date', '')
        fields['undefined_2'] = form_data.get('last_coverage_date', '')

        pto_hours = form_data.get('pto_hours')
        if pto_hours is not None:
            fields['undefined_3'] = str(pto_hours)
        else:
            pto_allotted = employee.pto_allotted or 0
            pto_used = employee.pto_used or 0
            fields['undefined_3'] = str(max(0, pto_allotted - pto_used))

        # Supervisor
        supervisor_name = form_data.get('supervisor_name', '') or employee.supervisor or ""
        supervisor_email = form_data.get('supervisor_email', '')
        if supervisor_name and supervisor_email:
            fields['clients and receive email or phone calls intended for NBS please immediately forward them to'] = f"{supervisor_name}, {supervisor_email}"
        elif supervisor_name:
            fields['clients and receive email or phone calls intended for NBS please immediately forward them to'] = supervisor_name
        else:
            fields['clients and receive email or phone calls intended for NBS please immediately forward them to'] = ""

        return fields

    def generate_important_info_form(
        self,
        form_data: Dict[str, Any],
        employee: Any
    ) -> io.BytesIO:
        """Generate Important Information form"""
        field_mappings = self.build_important_info_fields(form_data, employee)

        writer = PdfWriter()
        writer.append(self.templates["important_info"])

        for page in writer.pages:
            writer.update_page_form_field_values(page, field_mappings)

        buffer = io.BytesIO()
        writer.write(buffer)
        buffer.seek(0)
        return buffer

    def _format_date(self, date_str: str) -> str:
        """
        Ensure date is in MM/DD/YYYY format.
        Handles various input formats.
        """
        if not date_str:
            return ""

        # If already formatted with slashes, return as-is
        if '/' in date_str and len(date_str) == 10:
            return date_str

        # If YYYY-MM-DD format (from date inputs)
        if '-' in date_str and len(date_str) == 10:
            try:
                parts = date_str.split('-')
                if len(parts) == 3:
                    return f"{parts[1]}/{parts[2]}/{parts[0]}"
            except:
                pass

        # If compact format MMDDYYYY or YYYYMMDD
        if len(date_str) == 8 and date_str.isdigit():
            # Try MMDDYYYY
            if int(date_str[:2]) <= 12:
                return f"{date_str[:2]}/{date_str[2:4]}/{date_str[4:]}"
            # Try YYYYMMDD
            return f"{date_str[4:6]}/{date_str[6:]}/{date_str[:4]}"

        return date_str

    def generate_conversion_form(
        self,
        form_data: Dict[str, Any],
        employee: Any
    ) -> io.BytesIO:
        """
        Generate Conversion Form by overlaying text on the template PDF.
        Uses the new Equitable Conversion Form template (E15730).

        Template layout (Page 2 - index 1):
        - Section 1: Employer Information (pre-filled)
        - Section 2: Employee Information (fields to fill)
        - Section 3: Coverage information (checkboxes pre-checked, amounts to fill)
        - Section 4: Signature (name/phone pre-filled, needs date)

        Fields to fill:
        - Name of employee, Date of birth
        - Email Address, Phone Number
        - SSN, Basic annual salary, Date last worked, Insurance effective
        - Date of last salary increase, Date of reduction/termination
        - Employee/Spouse/Child Opt'l Terminated amounts (optional)
        - Signature Date
        """
        # Read the template
        template_reader = PdfReader(self.templates["conversion"])
        template_page = template_reader.pages[1]  # Page 2 has the form (0-indexed)

        # Get page dimensions
        page_width = float(template_page.mediabox.width)
        page_height = float(template_page.mediabox.height)

        # Create overlay with text
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=(page_width, page_height))

        # Set font for form fields
        c.setFont("Helvetica", 9)

        # Employee Information - Section 2
        # Coordinates adjusted: moved down ~33 points from initial estimates
        employee_name = form_data.get('employee_name', f"{employee.first_name} {employee.last_name}")
        dob = self._format_date(form_data.get('date_of_birth', ''))

        # Row 1: Name of employee | Date of birth | Class (Class is pre-filled as "Regular")
        c.drawString(38, page_height - 295, employee_name)
        if dob:
            c.drawString(385, page_height - 295, dob)

        # Row 2: Email Address | Phone Number
        email = form_data.get('personal_email', '') or employee.personal_email or ""
        phone = form_data.get('personal_phone', '') or employee.personal_phone or ""
        c.drawString(38, page_height - 323, email)
        c.drawString(340, page_height - 323, phone)

        # Row 3: SSN | Basic annual salary | Date last worked | Date of disability | Insurance effective
        ssn_full = form_data.get('ssn_full', '')
        ssn_last_four = form_data.get('ssn_last_four', '')

        if ssn_full:
            ssn_digits = ssn_full.replace('-', '')
            if len(ssn_digits) == 9:
                formatted_ssn = f"{ssn_digits[:3]}-{ssn_digits[3:5]}-{ssn_digits[5:]}"
                c.drawString(38, page_height - 351, formatted_ssn)
        elif ssn_last_four:
            c.drawString(38, page_height - 351, f"XXX-XX-{ssn_last_four}")

        # Basic annual salary
        salary = form_data.get('annual_salary', '')
        if salary:
            salary_str = f"${salary:,.2f}" if isinstance(salary, (int, float)) else str(salary)
            c.drawString(145, page_height - 351, salary_str)

        # Date last worked (termination date)
        term_date = self._format_date(form_data.get('termination_date', ''))
        if term_date:
            c.drawString(250, page_height - 351, term_date)

        # Insurance effective date
        ins_effective = self._format_date(form_data.get('insurance_effective_date', ''))
        if ins_effective:
            c.drawString(480, page_height - 351, ins_effective)

        # Row 4: Date of last salary increase | Date of reduction/termination | Date Optional terminated
        last_raise = self._format_date(form_data.get('date_last_salary_increase', ''))
        if last_raise:
            c.drawString(38, page_height - 379, last_raise)

        # Date of reduction/termination of group life insurance
        ins_term = self._format_date(form_data.get('date_insurance_terminated', '')) or term_date
        if ins_term:
            c.drawString(225, page_height - 379, ins_term)

        # Date Optional life coverage terminated (if different)
        opt_term = self._format_date(form_data.get('date_optional_terminated', ''))
        if opt_term:
            c.drawString(445, page_height - 379, opt_term)

        # Section 3: Coverage amounts - Optional/Voluntary Life terminated amounts
        # These go in the "Terminated amount" columns for Opt'l/Voluntary Life
        coverage_y_base = page_height - 523

        # Employee Opt'l / Voluntary Life terminated amount
        emp_opt_amount = form_data.get('employee_voluntary_life_amount', 0)
        if emp_opt_amount:
            c.drawString(408, coverage_y_base, f"${emp_opt_amount:,.2f}" if isinstance(emp_opt_amount, (int, float)) else str(emp_opt_amount))

        # Spouse Opt'l / Voluntary Life terminated amount
        spouse_opt_amount = form_data.get('spouse_voluntary_life_amount', 0)
        if spouse_opt_amount:
            c.drawString(408, coverage_y_base - 18, f"${spouse_opt_amount:,.2f}" if isinstance(spouse_opt_amount, (int, float)) else str(spouse_opt_amount))

        # Child Opt'l / Voluntary Life terminated amount
        child_opt_amount = form_data.get('child_voluntary_life_amount', 0)
        if child_opt_amount:
            c.drawString(408, coverage_y_base - 36, f"${child_opt_amount:,.2f}" if isinstance(child_opt_amount, (int, float)) else str(child_opt_amount))

        # Section 4: Signature - Date field (name and phone are pre-filled)
        today = datetime.now().strftime("%m/%d/%Y")
        c.drawString(500, page_height - 660, today)

        c.save()

        # Move to beginning of StringIO buffer
        packet.seek(0)

        # Read the overlay
        overlay_reader = PdfReader(packet)
        overlay_page = overlay_reader.pages[0]

        # Merge overlay with template
        writer = PdfWriter()

        # Add page 1 (informational page) unchanged
        writer.add_page(template_reader.pages[0])

        # Merge overlay with page 2 (the form)
        template_page.merge_page(overlay_page)
        writer.add_page(template_page)

        # Write to buffer
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)

        return output_buffer

    def generate_portability_form(
        self,
        form_data: Dict[str, Any],
        employee: Any
    ) -> io.BytesIO:
        """
        Generate Portability Form by overlaying text on the template PDF.
        Uses the Equitable Portability Form template (E15763).

        Template layout (Page 1 - index 0):
        - Employer Use Section (some fields pre-filled, some to fill)
        - Employee Information section (not filled by employer)

        Fields to fill:
        - Name of Employee
        - Supplemental/Voluntary Coverage amounts (Employee, Spouse, Child) - optional
        - Employment Termination Date
        - Date Notice Provided
        - Date next to Employer Signature

        Pre-filled fields:
        - Employer name: National Benefit Services, LLC
        - Policy #: 017428
        - Class: Regular
        - Basic coverage: $50,000
        - Reason: Termination of Employment (checked)
        - Employer signature (signed)
        """
        # Read the template
        template_reader = PdfReader(self.templates["portability"])

        # Get page dimensions from first page
        page_width = float(template_reader.pages[0].mediabox.width)
        page_height = float(template_reader.pages[0].mediabox.height)

        # Create overlay for page 1
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=(page_width, page_height))

        # Set font for form fields
        c.setFont("Helvetica", 10)

        # Employee name in employer section
        employee_name = form_data.get('employee_name', f"{employee.first_name} {employee.last_name}")
        c.drawString(135, page_height - 156, employee_name)

        # Supplemental/Voluntary Coverage amounts (optional)
        # These appear on the "Supplemental/Voluntary Coverage Amount Eligible to Port" line
        supp_emp_amount = form_data.get('supplemental_employee_amount', 0)
        supp_spouse_amount = form_data.get('supplemental_spouse_amount', 0)
        supp_child_amount = form_data.get('supplemental_child_amount', 0)

        if supp_emp_amount:
            c.drawString(365, page_height - 192, f"${supp_emp_amount:,.2f}" if isinstance(supp_emp_amount, (int, float)) else str(supp_emp_amount))
        if supp_spouse_amount:
            c.drawString(458, page_height - 192, f"${supp_spouse_amount:,.2f}" if isinstance(supp_spouse_amount, (int, float)) else str(supp_spouse_amount))
        if supp_child_amount:
            c.drawString(528, page_height - 192, f"${supp_child_amount:,.2f}" if isinstance(supp_child_amount, (int, float)) else str(supp_child_amount))

        # Employment Termination Date - use current date
        today = datetime.now().strftime("%m/%d/%Y")
        term_date = self._format_date(form_data.get('termination_date', '')) or today
        c.drawString(430, page_height - 210, term_date)

        # Date Notice Provided - current date
        c.drawString(175, page_height - 260, today)

        # Date next to Employer Signature
        c.drawString(480, page_height - 282, today)

        c.save()

        # Move to beginning of buffer
        packet.seek(0)

        # Read the overlay
        overlay_reader = PdfReader(packet)
        overlay_page = overlay_reader.pages[0]

        # Create writer and merge pages
        writer = PdfWriter()

        # Merge overlay with page 1 (employer section)
        page1 = template_reader.pages[0]
        page1.merge_page(overlay_page)
        writer.add_page(page1)

        # Add remaining pages unchanged
        for i in range(1, len(template_reader.pages)):
            writer.add_page(template_reader.pages[i])

        # Write to buffer
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)

        return output_buffer

    def generate_and_save_form(
        self,
        form_type: str,
        form_data: Dict[str, Any],
        employee: Any,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Generate and save a specific form type to disk.

        Args:
            form_type: One of "important_info", "conversion", "portability"
            form_data: Unified form data dictionary
            employee: Employee model instance
            output_filename: Optional custom filename

        Returns:
            Path to the saved PDF file
        """
        os.makedirs(self.output_dir, exist_ok=True)

        # Generate based on form type
        employee_full_name = f"{employee.first_name} {employee.last_name}"

        if form_type == "important_info":
            buffer = self.generate_important_info_form(form_data, employee)
            base_filename = f"Exit_Info_{employee.first_name}_{employee.last_name}"
        elif form_type == "conversion":
            buffer = self.generate_conversion_form(form_data, employee)
            base_filename = f"Equitable Conversion Form - {employee_full_name}"
        elif form_type == "portability":
            buffer = self.generate_portability_form(form_data, employee)
            base_filename = f"Equitable Portability Form - {employee_full_name}"
        else:
            raise ValueError(f"Unknown form type: {form_type}")

        # Generate filename with timestamp for uniqueness
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{base_filename}_{timestamp}.pdf"

        output_path = os.path.join(self.output_dir, output_filename)

        # Write to file
        with open(output_path, 'wb') as f:
            f.write(buffer.read())

        return output_path

    def generate_all_documents(
        self,
        form_data: Dict[str, Any],
        employee: Any,
        documents_to_generate: Optional[List[str]] = None
    ) -> Dict[str, str]:
        """
        Generate all requested exit documents from unified form data.

        Args:
            form_data: Unified form data dictionary
            employee: Employee model instance
            documents_to_generate: List of document types to generate, or None for all

        Returns:
            Dictionary mapping form_type to output file path
        """
        if documents_to_generate is None:
            documents_to_generate = ["important_info", "conversion", "portability"]  # Default documents

        results = {}
        for form_type in documents_to_generate:
            try:
                output_path = self.generate_and_save_form(form_type, form_data, employee)
                results[form_type] = output_path
            except NotImplementedError:
                # Skip unimplemented form types
                continue
            except Exception as e:
                print(f"Error generating {form_type}: {e}")
                continue

        return results


# Create singleton instance
unified_exit_document_service = UnifiedExitDocumentService()
