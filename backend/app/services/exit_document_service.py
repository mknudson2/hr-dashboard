"""
Exit Document Service
Handles generation of the "Important Information for Terminating Employee" form
"""

from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional
from pypdf import PdfWriter
import os
from pathlib import Path
import io


class ExitDocumentService:
    """Service for generating exit document forms"""

    def __init__(self):
        self.template_path = "app/templates/pdf_forms/Important Information for Terminating Employees - Fillable.pdf"
        self.output_dir = "app/storage/filled_forms"

    def build_field_mappings(
        self,
        employee: Any,
        termination_data: Dict[str, Any],
        supervisor_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Build complete field mappings for the Important Information form

        Field names from the PDF:
        - 'Employee Name First Name Last Name'
        - 'Street Address'
        - 'City'
        - 'State'
        - 'Zip'
        - 'Phone Number'
        - 'Email Address'
        - 'undefined' (Date of Last Paycheck)
        - 'undefined_2' (Last Date of Coverage)
        - 'undefined_3' (PTO Hours to Pay Out)
        - 'clients and receive email or phone calls...' (Supervisor name and email)

        Args:
            employee: Employee model instance
            termination_data: Dict with termination info (pto_hours, last_pay_date, last_coverage_date)
            supervisor_data: Dict with supervisor info (name, email)
        """
        fields = {}

        # Section 1: Employee Information
        fields['Employee Name First Name Last Name'] = f"{employee.first_name} {employee.last_name}"
        fields['Street Address'] = employee.address_street or ""
        fields['City'] = employee.address_city or ""
        fields['State'] = employee.address_state or ""
        fields['Zip'] = employee.address_zip or ""
        fields['Phone Number'] = employee.personal_phone or ""
        fields['Email Address'] = employee.personal_email or ""

        # Section 2: Important Dates and Info
        # Date of Last Paycheck (2 days from termination date, or provided)
        last_pay_date = termination_data.get('last_pay_date')
        if last_pay_date:
            if isinstance(last_pay_date, str):
                fields['undefined'] = last_pay_date
            else:
                fields['undefined'] = last_pay_date.strftime("%m/%d/%Y")
        else:
            # Default to 2 days after termination
            term_date = employee.termination_date
            if term_date:
                pay_date = term_date + timedelta(days=2)
                fields['undefined'] = pay_date.strftime("%m/%d/%Y")
            else:
                fields['undefined'] = ""

        # Last Date of Coverage (typically end of month of termination)
        last_coverage_date = termination_data.get('last_coverage_date')
        if last_coverage_date:
            if isinstance(last_coverage_date, str):
                fields['undefined_2'] = last_coverage_date
            else:
                fields['undefined_2'] = last_coverage_date.strftime("%m/%d/%Y")
        else:
            # Default to end of termination month
            term_date = employee.termination_date
            if term_date:
                # Get last day of termination month
                if term_date.month == 12:
                    next_month = term_date.replace(year=term_date.year + 1, month=1, day=1)
                else:
                    next_month = term_date.replace(month=term_date.month + 1, day=1)
                end_of_month = next_month - timedelta(days=1)
                fields['undefined_2'] = end_of_month.strftime("%m/%d/%Y")
            else:
                fields['undefined_2'] = ""

        # PTO Hours to Pay Out
        pto_hours = termination_data.get('pto_hours')
        if pto_hours is not None:
            fields['undefined_3'] = f"{pto_hours}"
        else:
            # Calculate from employee's PTO balance
            pto_allotted = employee.pto_allotted or 0
            pto_used = employee.pto_used or 0
            remaining_pto = max(0, pto_allotted - pto_used)
            fields['undefined_3'] = f"{remaining_pto}"

        # Section 3: Supervisor Information for forwarding communications
        supervisor_name = supervisor_data.get('name') or employee.supervisor or ""
        supervisor_email = supervisor_data.get('email', "")

        # Combined supervisor name and email
        if supervisor_name and supervisor_email:
            fields['clients and receive email or phone calls intended for NBS please immediately forward them to'] = f"{supervisor_name}, {supervisor_email}"
        elif supervisor_name:
            fields['clients and receive email or phone calls intended for NBS please immediately forward them to'] = supervisor_name
        else:
            fields['clients and receive email or phone calls intended for NBS please immediately forward them to'] = ""

        return fields

    def generate_form(
        self,
        employee: Any,
        termination_data: Dict[str, Any] = None,
        supervisor_data: Dict[str, Any] = None,
        output_filename: Optional[str] = None
    ) -> io.BytesIO:
        """
        Generate a filled Important Information form

        Args:
            employee: Employee model instance
            termination_data: Dict with termination info
            supervisor_data: Dict with supervisor info
            output_filename: Optional custom output filename

        Returns:
            BytesIO buffer containing the filled PDF
        """
        if termination_data is None:
            termination_data = {}
        if supervisor_data is None:
            supervisor_data = {}

        # Build field mappings
        field_mappings = self.build_field_mappings(employee, termination_data, supervisor_data)

        # Fill the PDF form
        writer = PdfWriter()
        writer.append(self.template_path)

        # Update form fields on all pages
        for page_num, page in enumerate(writer.pages):
            writer.update_page_form_field_values(page, field_mappings)

        # Write to BytesIO buffer
        buffer = io.BytesIO()
        writer.write(buffer)
        buffer.seek(0)

        return buffer

    def generate_and_save_form(
        self,
        employee: Any,
        termination_data: Dict[str, Any] = None,
        supervisor_data: Dict[str, Any] = None,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Generate and save a filled Important Information form to disk

        Args:
            employee: Employee model instance
            termination_data: Dict with termination info
            supervisor_data: Dict with supervisor info
            output_filename: Optional custom output filename

        Returns:
            Path to the generated PDF file
        """
        if termination_data is None:
            termination_data = {}
        if supervisor_data is None:
            supervisor_data = {}

        # Build field mappings
        field_mappings = self.build_field_mappings(employee, termination_data, supervisor_data)

        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)

        # Generate output filename
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            employee_id = employee.employee_id or employee.id
            output_filename = f"Exit_Info_{employee.first_name}_{employee.last_name}_{timestamp}.pdf"

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

        return output_path


# Create a singleton instance
exit_document_service = ExitDocumentService()
