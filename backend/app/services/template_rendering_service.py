"""Template Rendering Service for custom email templates.

Handles parsing and rendering of placeholders in email templates.
Supports two types of placeholders:
- Predefined: {{employee.field}} - Pulls data from Employee model
- Custom: {{custom.field}} - User-provided values at send time
"""
import re
from typing import Dict, Any, List, Tuple, Optional
from datetime import date, datetime


class TemplateRenderingService:
    """Service for rendering custom email templates with placeholders."""

    # Regex pattern to match placeholders: {{employee.field}} or {{custom.field}}
    PLACEHOLDER_PATTERN = re.compile(r'\{\{(employee|custom|company)\.([a-zA-Z_]+)\}\}')

    # Mapping from placeholder field names to Employee model attributes
    EMPLOYEE_FIELD_MAP = {
        # Personal info
        "first_name": "first_name",
        "last_name": "last_name",
        "email": "personal_email",
        "personal_email": "personal_email",
        "personal_phone": "personal_phone",

        # Employment info
        "employee_id": "employee_id",
        "department": "department",
        "position": "position",
        "supervisor": "supervisor",
        "team": "team",
        "location": "location",
        "cost_center": "cost_center",
        "employment_type": "employment_type",
        "type": "type",
        "status": "status",

        # Dates
        "hire_date": "hire_date",
        "termination_date": "termination_date",
        "birth_date": "birth_date",
        "original_hire_date": "original_hire_date",

        # Compensation
        "wage": "wage",
        "annual_wage": "annual_wage",
        "hourly_wage": "hourly_wage",
        "wage_type": "wage_type",
        "total_compensation": "total_compensation",

        # Benefits
        "medical_plan": "medical_plan",
        "medical_tier": "medical_tier",
        "dental_plan": "dental_plan",
        "vision_plan": "vision_plan",

        # Other
        "tenure_years": "tenure_years",
        "pto_allotted": "pto_allotted",
        "pto_used": "pto_used",
    }

    # Company/sender info placeholders
    COMPANY_FIELDS = {
        "name": "NBS",
        "current_date": lambda: datetime.now().strftime("%B %d, %Y"),
        "current_year": lambda: str(datetime.now().year),
    }

    def render(
        self,
        template_content: str,
        employee: Optional[Any] = None,
        custom_values: Dict[str, Any] = None
    ) -> Tuple[str, List[str]]:
        """
        Render template with placeholder values.

        Args:
            template_content: The HTML/text content with placeholders
            employee: Optional Employee model instance for predefined placeholders
            custom_values: Dictionary of custom placeholder values

        Returns:
            Tuple of (rendered_content, list_of_missing_placeholders)
        """
        if custom_values is None:
            custom_values = {}

        missing = []

        def replace_placeholder(match: re.Match) -> str:
            placeholder_type = match.group(1)
            field_name = match.group(2)
            full_placeholder = f"{placeholder_type}.{field_name}"

            if placeholder_type == "employee":
                return self._get_employee_value(employee, field_name, missing)
            elif placeholder_type == "custom":
                return self._get_custom_value(custom_values, field_name, missing)
            elif placeholder_type == "company":
                return self._get_company_value(field_name, missing)

            return match.group(0)

        rendered = self.PLACEHOLDER_PATTERN.sub(replace_placeholder, template_content)
        return rendered, missing

    def _get_employee_value(
        self,
        employee: Optional[Any],
        field_name: str,
        missing: List[str]
    ) -> str:
        """Get value from Employee model."""
        if employee is None:
            missing.append(f"employee.{field_name}")
            return f"[{field_name}]"

        # Handle computed fields
        if field_name == "full_name":
            first = getattr(employee, "first_name", "") or ""
            last = getattr(employee, "last_name", "") or ""
            return f"{first} {last}".strip()

        # Get the actual DB field name
        db_field = self.EMPLOYEE_FIELD_MAP.get(field_name, field_name)
        value = getattr(employee, db_field, None)

        if value is None:
            missing.append(f"employee.{field_name}")
            return f"[{field_name}]"

        return self._format_value(value, field_name)

    def _get_custom_value(
        self,
        custom_values: Dict[str, Any],
        field_name: str,
        missing: List[str]
    ) -> str:
        """Get custom placeholder value."""
        if field_name in custom_values and custom_values[field_name] is not None:
            return self._format_value(custom_values[field_name], field_name)

        missing.append(f"custom.{field_name}")
        return f"[{field_name}]"

    def _get_company_value(
        self,
        field_name: str,
        missing: List[str]
    ) -> str:
        """Get company/sender placeholder value."""
        if field_name in self.COMPANY_FIELDS:
            value = self.COMPANY_FIELDS[field_name]
            if callable(value):
                return value()
            return str(value)

        missing.append(f"company.{field_name}")
        return f"[{field_name}]"

    def _format_value(self, value: Any, field_name: str = "") -> str:
        """Format value for display in email."""
        if value is None:
            return ""

        if isinstance(value, date) and not isinstance(value, datetime):
            return value.strftime("%B %d, %Y")
        elif isinstance(value, datetime):
            return value.strftime("%B %d, %Y at %I:%M %p")
        elif isinstance(value, float):
            # Check if it's likely a currency field
            currency_fields = ["wage", "annual_wage", "hourly_wage", "total_compensation"]
            if any(cf in field_name.lower() for cf in currency_fields):
                return f"${value:,.2f}"
            return f"{value:,.2f}"
        elif isinstance(value, bool):
            return "Yes" if value else "No"

        return str(value)

    def extract_placeholders(self, content: str) -> Dict[str, List[str]]:
        """
        Extract all placeholders from template content.

        Args:
            content: Template content with placeholders

        Returns:
            Dictionary with 'employee', 'custom', and 'company' keys,
            each containing a list of field names used
        """
        matches = self.PLACEHOLDER_PATTERN.findall(content)
        result = {"employee": [], "custom": [], "company": []}

        for placeholder_type, field_name in matches:
            if field_name not in result.get(placeholder_type, []):
                if placeholder_type in result:
                    result[placeholder_type].append(field_name)

        return result

    def validate_template(
        self,
        content: str,
        fillable_definitions: List[Dict]
    ) -> List[str]:
        """
        Validate that all custom placeholders in the template are defined.

        Args:
            content: Template content with placeholders
            fillable_definitions: List of fillable placeholder definitions

        Returns:
            List of validation error messages
        """
        extracted = self.extract_placeholders(content)
        defined_keys = {p.get("key") for p in fillable_definitions if p.get("key")}
        errors = []

        for custom_key in extracted.get("custom", []):
            if custom_key not in defined_keys:
                errors.append(
                    f"Custom placeholder '{{{{custom.{custom_key}}}}}' is used but not defined"
                )

        return errors

    def get_available_employee_placeholders(self) -> List[Dict[str, str]]:
        """Get list of all available employee placeholders with descriptions."""
        return [
            # Personal
            {"key": "employee.first_name", "label": "First Name", "category": "Personal"},
            {"key": "employee.last_name", "label": "Last Name", "category": "Personal"},
            {"key": "employee.full_name", "label": "Full Name", "category": "Personal"},
            {"key": "employee.email", "label": "Personal Email", "category": "Personal"},
            {"key": "employee.personal_phone", "label": "Personal Phone", "category": "Personal"},

            # Employment
            {"key": "employee.employee_id", "label": "Employee ID", "category": "Employment"},
            {"key": "employee.department", "label": "Department", "category": "Employment"},
            {"key": "employee.position", "label": "Position/Title", "category": "Employment"},
            {"key": "employee.supervisor", "label": "Supervisor", "category": "Employment"},
            {"key": "employee.team", "label": "Team", "category": "Employment"},
            {"key": "employee.location", "label": "Location", "category": "Employment"},
            {"key": "employee.employment_type", "label": "Employment Type", "category": "Employment"},
            {"key": "employee.status", "label": "Status", "category": "Employment"},

            # Dates
            {"key": "employee.hire_date", "label": "Hire Date", "category": "Dates"},
            {"key": "employee.termination_date", "label": "Termination Date", "category": "Dates"},
            {"key": "employee.birth_date", "label": "Birth Date", "category": "Dates"},
            {"key": "employee.tenure_years", "label": "Tenure (Years)", "category": "Dates"},

            # Compensation
            {"key": "employee.annual_wage", "label": "Annual Salary", "category": "Compensation"},
            {"key": "employee.hourly_wage", "label": "Hourly Rate", "category": "Compensation"},
            {"key": "employee.wage_type", "label": "Wage Type", "category": "Compensation"},
            {"key": "employee.total_compensation", "label": "Total Compensation", "category": "Compensation"},

            # Benefits
            {"key": "employee.medical_plan", "label": "Medical Plan", "category": "Benefits"},
            {"key": "employee.medical_tier", "label": "Medical Tier", "category": "Benefits"},
            {"key": "employee.dental_plan", "label": "Dental Plan", "category": "Benefits"},
            {"key": "employee.vision_plan", "label": "Vision Plan", "category": "Benefits"},

            # PTO
            {"key": "employee.pto_allotted", "label": "PTO Allotted", "category": "PTO"},
            {"key": "employee.pto_used", "label": "PTO Used", "category": "PTO"},

            # Company
            {"key": "company.name", "label": "Company Name", "category": "Company"},
            {"key": "company.current_date", "label": "Current Date", "category": "Company"},
            {"key": "company.current_year", "label": "Current Year", "category": "Company"},
        ]


# Singleton instance
template_rendering_service = TemplateRenderingService()
