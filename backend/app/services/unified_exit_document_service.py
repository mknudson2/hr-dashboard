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
        # Build form field values from data
        # Template field names are from the Equitable E15730 PDF form
        def fmt_amount(val):
            """Format amount as comma-separated number (no $ sign, matching template style)"""
            if val and isinstance(val, (int, float)):
                return f"{val:,.0f}"
            return str(val) if val else ""

        employee_name = form_data.get('employee_name', f"{employee.first_name} {employee.last_name}")
        dob = self._format_date(form_data.get('date_of_birth', ''))
        email = form_data.get('personal_email', '') or employee.personal_email or ""
        phone = form_data.get('personal_phone', '') or employee.personal_phone or ""
        term_date = self._format_date(form_data.get('termination_date', ''))
        ins_term = self._format_date(form_data.get('date_insurance_terminated', '')) or term_date

        # Format SSN
        ssn_display = ""
        ssn_full = form_data.get('ssn_full', '')
        ssn_last_four = form_data.get('ssn_last_four', '')
        if ssn_full:
            ssn_digits = ssn_full.replace('-', '')
            if len(ssn_digits) == 9:
                ssn_display = f"{ssn_digits[:3]}-{ssn_digits[3:5]}-{ssn_digits[5:]}"
        elif ssn_last_four:
            ssn_display = f"XXX-XX-{ssn_last_four}"

        # Format salary
        salary = form_data.get('annual_salary', '')
        salary_str = ""
        if salary:
            salary_str = f"${salary:,.2f}" if isinstance(salary, (int, float)) else str(salary)

        today = datetime.now().strftime("%m/%d/%Y")

        # Map form data to template PDF field names
        field_values = {
            # Section 2: Employee Information
            # Row 1: Name | DOB | Class
            "Name of person completing this form Employer administrative contact1": employee_name,
            "Nicole.Sultze": employee_name,  # Overlapping name field
            "Title2": dob,
            # Row 2: Email | Phone
            "Email Address": email,
            "Phone Number": phone,
            # Row 3: SSN | Salary | Date worked | Disability | Insurance effective
            "Social Security Number": ssn_display,
            "Basic annual salary": salary_str,
            "Date last worked": term_date,
            "Insurance effective": self._format_date(form_data.get('insurance_effective_date', '')),
            # Row 4: Dates
            "Date of last salary increase": self._format_date(form_data.get('date_last_salary_increase', '')),
            "Date Optional life coverage terminated if different": ins_term,
            "Date Optional life coverage terminated if different1": self._format_date(form_data.get('date_optional_terminated', '')),
            # Section 3: Coverage amounts (fill_23 through fill_34)
            # Row 1 - Employee: Basic terminated | Basic reduced | Opt'l terminated | Opt'l reduced
            "fill_23": fmt_amount(form_data.get('employee_basic_life_amount')) if form_data.get('has_employee_basic_life') else "",
            "fill_24": "",  # Employee Basic Life reduced
            "fill_25": fmt_amount(form_data.get('employee_voluntary_life_amount')) if form_data.get('has_employee_voluntary_life') else "",
            "fill_26": "",  # Employee Opt'l reduced
            # Row 2 - Spouse
            "fill_27": fmt_amount(form_data.get('spouse_basic_life_amount')) if form_data.get('has_spouse_basic_life') else "",
            "fill_28": "",  # Spouse Basic Life reduced
            "fill_29": fmt_amount(form_data.get('spouse_voluntary_life_amount')) if form_data.get('has_spouse_voluntary_life') else "",
            "fill_30": "",  # Spouse Opt'l reduced
            # Row 3 - Child
            "fill_31": fmt_amount(form_data.get('child_basic_life_amount')) if form_data.get('has_child_basic_life') else "",
            "fill_32": "",  # Child Basic Life reduced
            "fill_33": fmt_amount(form_data.get('child_voluntary_life_amount')) if form_data.get('has_child_voluntary_life') else "",
            "fill_34": "",  # Child Opt'l reduced
            # Section 4: Signature date
            "Date": today,
        }

        # Build PDF using form field updates (no canvas overlay needed)
        # Use append() to preserve AcroForm dictionary (required for form field updates)
        writer = PdfWriter()
        writer.append(self.templates["conversion"])

        # Update form field values on all pages
        for page in writer.pages:
            writer.update_page_form_field_values(page, field_values)

        # Fix font size consistency across form fields:
        # - "Title" field is narrow (75pt); replace long title with "HR Manager"
        # - "Email Address" and "Phone Number" are 12pt while everything else is 10pt.
        from pypdf.generic import (
            NameObject, TextStringObject, IndirectObject,
        )
        da_10pt = "/Helvetica 10 Tf 0 g"
        page1 = writer.pages[1] if len(writer.pages) > 1 else None
        if page1:
            annots_raw = page1.get("/Annots")
            if isinstance(annots_raw, IndirectObject):
                annots_raw = annots_raw.get_object()
            if annots_raw:
                for annot in annots_raw:
                    obj = annot.get_object()
                    field_name = str(obj.get("/T", ""))
                    if field_name == "Title":
                        # Short title that fits the narrow 75pt field at 10pt
                        obj[NameObject("/V")] = TextStringObject("HR Manager")
                    # Normalize Email/Phone from 12pt to 10pt
                    elif field_name in ("Email Address", "Phone Number"):
                        obj[NameObject("/DA")] = TextStringObject(da_10pt)

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
        Generate Portability Form using form field updates + canvas overlay.

        Employer Use Section fields filled:
        - Name of Employee, Employee Termination Date, Date Notice Provided
        - Supplemental/Voluntary coverage amounts (Employee, Spouse, Child)
        - Termination of Employment checkbox
        - Date next to Employer Signature (canvas overlay — signature is pre-baked in template)

        Pre-filled in template:
        - Name of Employer, Policy #, Class, Basic coverage $50,000, Employer Signature
        """
        from pypdf.generic import (
            NameObject, TextStringObject, IndirectObject,
        )

        employee_name = form_data.get(
            'employee_name', f"{employee.first_name} {employee.last_name}"
        )
        term_date = self._format_date(
            form_data.get('termination_date', '')
        ) or datetime.now().strftime("%m/%d/%Y")

        def fmt_amount(val):
            if val and isinstance(val, (int, float)):
                return f"${val:,.0f}"
            return str(val) if val else ""

        # --- Step 1: Update form field values ---
        # Note: "Employment Termination Date" field is actually the "Other:" reason
        # text input (at same y as checkboxes), NOT a date field — do not set it.
        field_values = {
            "Name of Employee": employee_name,
            "Employee Termination Date": term_date,
            "Date Notice Provided": term_date,
            # Supplemental/Voluntary coverage amounts
            "Basic coverage Amount to Port _2": fmt_amount(form_data.get('employee_voluntary_life_amount')) if form_data.get('has_employee_voluntary_life') else "",
            "Spouse_2": fmt_amount(form_data.get('spouse_voluntary_life_amount')) if form_data.get('has_spouse_voluntary_life') else "",
            "Child_2": fmt_amount(form_data.get('child_voluntary_life_amount')) if form_data.get('has_child_voluntary_life') else "",
        }

        writer = PdfWriter()
        writer.append(self.templates["portability"])

        for page in writer.pages:
            writer.update_page_form_field_values(page, field_values)

        # --- Step 2: Check "Termination of Employment" checkbox ---
        page0 = writer.pages[0]
        annots_raw = page0.get("/Annots")
        if isinstance(annots_raw, IndirectObject):
            annots_raw = annots_raw.get_object()
        if annots_raw:
            for annot in annots_raw:
                obj = annot.get_object()
                rect = obj.get("/Rect")
                if rect:
                    x = float(rect[0])
                    y = float(rect[1])
                    # Checkbox at (37, 541) = "Termination of Employment", checked state '/1'
                    if abs(x - 37) < 2 and abs(y - 541) < 2:
                        obj[NameObject("/V")] = NameObject("/1")
                        obj[NameObject("/AS")] = NameObject("/1")
                        break

        # --- Step 3: Overlay date next to Employer Signature via canvas ---
        # Signature image is already baked into the template; only the date is missing.
        page_width = 612.0
        page_height = 792.0

        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=(page_width, page_height))
        c.setFont("Helvetica", 10)
        c.drawString(445, 478, term_date)

        c.save()
        packet.seek(0)

        # Merge overlay onto page 0
        overlay_reader = PdfReader(packet)
        page0.merge_page(overlay_reader.pages[0])

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
