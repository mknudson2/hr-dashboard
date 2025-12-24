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
            # "portability": os.path.join(self.template_dir, "Equitable Portability Form - Template.pdf"),  # TODO: Add when available
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
                        # Voluntary Life
                        {"id": "has_employee_voluntary_life", "label": "Employee Voluntary Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "employee_voluntary_life_amount", "label": "Employee Voluntary Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        {"id": "has_spouse_voluntary_life", "label": "Spouse Voluntary Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "spouse_voluntary_life_amount", "label": "Spouse Voluntary Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
                        {"id": "has_child_voluntary_life", "label": "Child Voluntary Life", "type": "boolean", "default": False, "documents": ["conversion", "portability"]},
                        {"id": "child_voluntary_life_amount", "label": "Child Voluntary Life Amount", "type": "currency", "documents": ["conversion", "portability"]},
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
                    "required_fields": ["employee_name", "date_of_birth", "personal_email", "personal_phone", "termination_date", "annual_salary"],
                    "optional_fields": ["date_last_salary_increase", "insurance_effective_date", "date_insurance_terminated", "employee_basic_life_amount"]
                },
                "portability": {
                    "name": "Equitable Life Insurance Portability Form",
                    "required_fields": ["employee_name", "date_of_birth", "personal_email", "personal_phone", "address_street", "address_city", "address_state", "address_zip", "termination_date", "annual_salary"],
                    "optional_fields": ["insurance_effective_date", "employee_basic_life_amount"]
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

    def generate_conversion_form(
        self,
        form_data: Dict[str, Any],
        employee: Any
    ) -> io.BytesIO:
        """
        Generate Conversion Form by overlaying text on the template PDF.
        Since the PDF doesn't have fillable fields, we use reportlab to create
        text overlays at specific coordinates.
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

        # Set font
        c.setFont("Helvetica", 10)

        # Employee Information fields - coordinates based on PDF layout
        # Section 2: Employee Information
        employee_name = form_data.get('employee_name', f"{employee.first_name} {employee.last_name}")
        dob = form_data.get('date_of_birth', '')
        emp_class = form_data.get('employee_class', 'Regular')

        # Name of employee - approximately at line 2 of section 2
        c.drawString(72, page_height - 265, employee_name)

        # Date of birth - right side of name field
        if dob:
            c.drawString(400, page_height - 265, dob)

        # Class
        c.drawString(520, page_height - 265, emp_class)

        # Email address
        email = form_data.get('personal_email', '') or employee.personal_email or ""
        c.drawString(72, page_height - 290, email)

        # Phone number
        phone = form_data.get('personal_phone', '') or employee.personal_phone or ""
        c.drawString(350, page_height - 290, phone)

        # SSN - use full SSN if available, otherwise show masked version
        ssn_full = form_data.get('ssn_full', '')
        ssn_last_four = form_data.get('ssn_last_four', '')
        if ssn_full:
            # Clean the SSN (remove dashes if present, then format)
            ssn_digits = ssn_full.replace('-', '')
            if len(ssn_digits) == 9:
                formatted_ssn = f"{ssn_digits[:3]}-{ssn_digits[3:5]}-{ssn_digits[5:]}"
                c.drawString(72, page_height - 315, formatted_ssn)
        elif ssn_last_four:
            c.drawString(72, page_height - 315, f"XXX-XX-{ssn_last_four}")

        # Annual salary
        salary = form_data.get('annual_salary', '')
        if salary:
            c.drawString(165, page_height - 315, f"${salary:,.2f}" if isinstance(salary, (int, float)) else salary)

        # Date last worked (termination date)
        term_date = form_data.get('termination_date', '')
        if term_date:
            c.drawString(280, page_height - 315, term_date)

        # Insurance effective date
        ins_effective = form_data.get('insurance_effective_date', '')
        if ins_effective:
            c.drawString(475, page_height - 315, ins_effective)

        # Date of last salary increase
        last_raise = form_data.get('date_last_salary_increase', '')
        if last_raise:
            c.drawString(72, page_height - 340, last_raise)

        # Date insurance terminated
        ins_term = form_data.get('date_insurance_terminated', '') or term_date
        if ins_term:
            c.drawString(265, page_height - 340, ins_term)

        # Checkboxes for status questions - draw "X" if checked
        c.setFont("Helvetica-Bold", 10)

        # Benefits status (Terminated checkbox)
        benefits_status = form_data.get('benefits_status', 'Terminated')
        if benefits_status == 'Terminated':
            c.drawString(518, page_height - 371, "X")  # Terminated checkbox
        else:
            c.drawString(467, page_height - 371, "X")  # Reduced checkbox

        # Stopped due to injury/sickness
        if form_data.get('stopped_due_to_injury', False):
            c.drawString(467, page_height - 386, "X")  # Yes
        else:
            c.drawString(493, page_height - 386, "X")  # No

        # Stopped due to retirement
        if form_data.get('stopped_due_to_retirement', False):
            c.drawString(467, page_height - 401, "X")  # Yes
        else:
            c.drawString(493, page_height - 401, "X")  # No

        # Waiver of Premium filed
        if form_data.get('waiver_of_premium_filed', False):
            c.drawString(467, page_height - 416, "X")  # Yes
        else:
            c.drawString(493, page_height - 416, "X")  # No

        # Premiums paid by employer
        if form_data.get('premiums_paid_by_employer', False):
            c.drawString(467, page_height - 446, "X")  # Yes
        else:
            c.drawString(493, page_height - 446, "X")  # No

        # Section 3: Coverage amounts
        c.setFont("Helvetica", 10)

        # Employee Basic Life
        if form_data.get('has_employee_basic_life', True):
            c.drawString(74, page_height - 527, "X")
            amount = form_data.get('employee_basic_life_amount', 50000)
            c.drawString(178, page_height - 527, f"${amount:,.2f}" if isinstance(amount, (int, float)) else str(amount))

        # Spouse Basic Life
        if form_data.get('has_spouse_basic_life', False):
            c.drawString(74, page_height - 547, "X")
            amount = form_data.get('spouse_basic_life_amount', 0)
            if amount:
                c.drawString(178, page_height - 547, f"${amount:,.2f}" if isinstance(amount, (int, float)) else str(amount))

        # Child Basic Life
        if form_data.get('has_child_basic_life', False):
            c.drawString(74, page_height - 567, "X")
            amount = form_data.get('child_basic_life_amount', 0)
            if amount:
                c.drawString(178, page_height - 567, f"${amount:,.2f}" if isinstance(amount, (int, float)) else str(amount))

        # Employee Voluntary Life
        if form_data.get('has_employee_voluntary_life', False):
            c.drawString(336, page_height - 527, "X")
            amount = form_data.get('employee_voluntary_life_amount', 0)
            if amount:
                c.drawString(440, page_height - 527, f"${amount:,.2f}" if isinstance(amount, (int, float)) else str(amount))

        # Spouse Voluntary Life
        if form_data.get('has_spouse_voluntary_life', False):
            c.drawString(336, page_height - 547, "X")
            amount = form_data.get('spouse_voluntary_life_amount', 0)
            if amount:
                c.drawString(440, page_height - 547, f"${amount:,.2f}" if isinstance(amount, (int, float)) else str(amount))

        # Child Voluntary Life
        if form_data.get('has_child_voluntary_life', False):
            c.drawString(336, page_height - 567, "X")
            amount = form_data.get('child_voluntary_life_amount', 0)
            if amount:
                c.drawString(440, page_height - 567, f"${amount:,.2f}" if isinstance(amount, (int, float)) else str(amount))

        # Section 4: Signature area - auto-fill with current date
        today = datetime.now().strftime("%m/%d/%Y")
        c.drawString(500, page_height - 620, today)

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
        if form_type == "important_info":
            buffer = self.generate_important_info_form(form_data, employee)
            prefix = "Exit_Info"
        elif form_type == "conversion":
            buffer = self.generate_conversion_form(form_data, employee)
            prefix = "Conversion_Form"
        elif form_type == "portability":
            # TODO: Implement portability form
            raise NotImplementedError("Portability form generation not yet implemented")
        else:
            raise ValueError(f"Unknown form type: {form_type}")

        # Generate filename
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{prefix}_{employee.first_name}_{employee.last_name}_{timestamp}.pdf"

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
            documents_to_generate = ["important_info", "conversion"]  # Default documents

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
