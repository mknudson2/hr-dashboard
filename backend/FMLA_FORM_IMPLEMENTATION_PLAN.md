# FMLA WH-381 Notice of Eligibility - Implementation Plan

## Form Analysis Summary

**Form**: FMLA Notice of Eligibility & Rights and Responsibilities (Form WH-381)
**Pages**: 4 pages
**Total Fields**: 72 fillable fields
- **Text Fields**: 28
- **Checkboxes**: 44

**Inspection Date**: 2025-11-11
**Form Location**: `/Users/michaelknudson/Downloads/WH-381_Notice of Eligibility.pdf`

---

## Field Mapping Strategy

### Data Source Categories

Fields will be populated from three sources:

1. **Employee Database** - Data from the `employees` table and FMLA records
2. **Manual Entry** - HR staff provides case-specific information
3. **System Generated** - Current date/time, calculated values

---

## Detailed Field Mappings

### Page 1: Header & Reason for Leave

| Field Name | Type | Data Source | Mapping |
|------------|------|-------------|---------|
| `Date1` | Text | System | Current date (mm/dd/yyyy) |
| `Employer To` | Text | Database | Company name (config) → Employee name |
| `Employee` | Text | Database | `first_name + " " + last_name` |
| `mmddyyyy we learned that you need leave beginning on` | Text | Manual/Database | Date learned + Leave start date |
| `mmddyyyy_2` | Text | Manual/Database | Leave start date |

**Leave Reason Checkboxes** (Select one):
| Field Name | Type | Data Source |
|------------|------|-------------|
| `The birth of a child or placement...` | Checkbox | Manual |
| `Your own serious health condition` | Checkbox | Manual |
| `You are needed to care for your family member...` | Checkbox | Manual |
| `A qualifying exigency...` | Checkbox | Manual |
| `You are needed to care for...servicemember` | Checkbox | Manual |

**Family Member Relationship** (If applicable):
| Field Name | Type | Data Source |
|------------|------|-------------|
| `Spouse`, `Spouse_2`, `Spouse_3` | Checkbox | Manual |
| `Parent`, `Parent_2`, `Parent_3` | Checkbox | Manual |
| `Child under age 18` | Checkbox | Manual |
| `Child 18 years or older and incapable of self` | Checkbox | Manual |
| `Child of any age` | Checkbox | Manual |
| `Child` | Checkbox | Manual |
| `Next of kin` | Checkbox | Manual |

---

### Section I: Notice of Eligibility

| Field Name | Type | Data Source | Logic |
|------------|------|-------------|-------|
| `Eligible for FMLA leave...` | Checkbox | Database | Check if employee meets eligibility |
| `Not eligible for FMLA leave because...` | Checkbox | Database | Check if employee doesn't meet requirements |
| `You have not met the FMLAs 12month length...` | Checkbox | Database | Calculate months employed |
| `towards this requirement` | Text | Database | Months worked (from hire_date) |
| `You have not met the FMLAs 1250 hours...` | Checkbox | Database | Check hours worked |
| `towards this requirement_2` | Text | Database | Hours worked in last 12 months |
| `Flight Crew` | Checkbox | Database | Check if employee is flight crew |
| `50+` | Checkbox | Database | Check employee count at location |
| `Contact` | Text | Database/Config | HR contact name |
| `Contact info` | Text | Database/Config | HR contact phone/email |

---

### Section II: Additional Information Needed

| Field Name | Type | Data Source |
|------------|------|-------------|
| `No additiona info` | Checkbox | Manual |
| `Certification requested` | Checkbox | Manual |
| `Cert` | Checkbox | Manual (Healthcare provider type) |
| `Certification attached` | Checkbox | Manual |
| `If requested medical certification must be returned by` | Text | System | Current date + 15 days |
| `Certify relationship` | Checkbox | Manual |
| `must be returned to us by` | Text | Manual |
| `Other information needed...` | Checkbox | Manual |
| `The information requested must be returned to us by` | Text | Manual |
| `If you have any questions please contact_2` | Text | Config | HR contact name |
| `at_2` | Text | Config | HR contact info |

---

### Section III: Rights and Responsibilities

**Part A: Leave Entitlement**

| Field Name | Type | Data Source | Logic |
|------------|------|-------------|-------|
| `The calendar year January 1st December 31st` | Checkbox | Config | Company FMLA year calculation method |
| `A fixed leave year based on` | Checkbox | Config | Company policy |
| `eg a fiscal year beginning on July 1...` | Text | Config | Fiscal year description |
| `The 12month period measured forward...` | Checkbox | Config | Company policy |
| `A rolling 12month period measured backward...` | Checkbox | Config | Company policy |
| `If applicable the single 12month period for Military Caregiver Leave started on` | Text | Manual/Database | Military leave start date |
| `are` | Checkbox | Database | Key employee status |
| `are not considered a key employee...` | Checkbox | Database | Key employee status |
| `have` | Checkbox | Manual | Restoration determination |
| `have not determined that restoring you...` | Checkbox | Manual | Restoration determination |

**Part B: Substitution of Paid Leave**

| Field Name | Type | Data Source |
|------------|------|-------------|
| `Some or all of your FMLA leave will not be paid...` | Checkbox | Manual |
| `You have requested to use some or all...` | Checkbox | Manual |
| `We are requiring you to use some or all...` | Checkbox | Manual |
| `Other eg shortor longterm disability...` | Checkbox | Manual |
| `Any time taken for this reason...` | Text | Manual |
| `The applicable conditions for use of paid leave include` | Text | Config |
| `For more information about...1` | Text | Config |
| `For more information about...2` | Text | Config |
| `available at` | Text | Config |

**Part C: Maintain Health Benefits**

| Field Name | Type | Data Source |
|------------|------|-------------|
| `on your health insurance while you are on any unpaid FMLA leave contact` | Text | Config |
| `undefined_2` | Text | Config |
| `You have a minimum grace period of` | Checkbox | Config |
| `30days or` | Checkbox | Config |
| `indicate longer period if applicable in which to` | Text | Config |

**Part D: Other Employee Benefits**

| Field Name | Type | Data Source |
|------------|------|-------------|
| `your employee benefits while you are on FMLA leave contact` | Text | Config |
| `at_3` | Text | Config |

**Part F: Other Requirements While on FMLA Leave**

| Field Name | Type | Data Source |
|------------|------|-------------|
| `While on leave you` | Checkbox | Config |
| `will be` | Checkbox | Config |
| `return to work every` | Text | Config |
| `undefined` | Text | Manual |

---

## Data Model

### Database Tables

```python
class FMLALeaveRequest(Base):
    """FMLA Leave Request records"""
    __tablename__ = "fmla_leave_requests"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Request details
    request_date = Column(Date, nullable=False)  # When we learned of need
    leave_start_date = Column(Date, nullable=False)
    leave_end_date = Column(Date, nullable=True)

    # Reason for leave
    leave_reason = Column(String(100), nullable=False)
    # Options: birth, own_health, family_care, military_exigency, military_caregiver
    family_member_relationship = Column(String(50), nullable=True)
    # Options: spouse, parent, child_under_18, child_over_18, child_any_age, next_of_kin

    # Eligibility
    is_eligible = Column(Boolean, nullable=False)
    ineligibility_reason = Column(String(200), nullable=True)
    months_employed = Column(Float, nullable=True)
    hours_worked_12months = Column(Float, nullable=True)

    # Certification requirements
    certification_required = Column(Boolean, default=False)
    certification_type = Column(String(100), nullable=True)
    certification_due_date = Column(Date, nullable=True)
    certification_attached = Column(Boolean, default=False)

    # Leave calculation method
    leave_year_method = Column(String(50), nullable=False)
    # Options: calendar, fixed, forward, rolling

    # Key employee status
    is_key_employee = Column(Boolean, default=False)
    restoration_determination = Column(String(50), nullable=True)

    # Paid leave substitution
    will_use_paid_leave = Column(Boolean, default=False)
    paid_leave_type = Column(String(100), nullable=True)
    paid_leave_required = Column(Boolean, default=False)

    # HR contact
    hr_contact_name = Column(String(100), nullable=True)
    hr_contact_info = Column(String(200), nullable=True)

    # Filled form
    filled_form_id = Column(Integer, ForeignKey("filled_pdf_forms.id"), nullable=True)

    # Relationships
    employee = relationship("Employee")
    filled_form = relationship("FilledPdfForm")

    # Metadata
    created_at = Column(DateTime, default=datetime.now)
    created_by = Column(String(100), nullable=False)
    status = Column(String(50), default="draft")
    # Options: draft, sent, acknowledged, completed
```

---

## Implementation Plan

### Phase 1: Database Setup (1-2 hours)

1. Create `FMLALeaveRequest` model
2. Create migration for new table
3. Run migration

### Phase 2: PDF Form Service Extension (2-3 hours)

1. Copy FMLA template to `app/templates/pdf_forms/`
2. Create FMLA-specific form filling service
3. Implement field mapping logic
4. Handle checkbox values (determine "/Yes" or "/Off" format)

### Phase 3: Field Mapping Logic (3-4 hours)

Create mapping functions for:

1. **Employee eligibility calculation**
   ```python
   def calculate_fmla_eligibility(employee, leave_start_date):
       # Check 12-month employment
       months_employed = (leave_start_date - employee.hire_date).days / 30.44
       meets_12_months = months_employed >= 12

       # Check 1,250 hours (from time tracking system or estimate)
       hours_worked = calculate_hours_worked_12_months(employee, leave_start_date)
       meets_hours = hours_worked >= 1250

       # Check 50 employees within 75 miles
       location_check = check_location_employee_count(employee.location)

       is_eligible = meets_12_months and meets_hours and location_check

       return {
           'is_eligible': is_eligible,
           'months_employed': months_employed,
           'hours_worked': hours_worked,
           'meets_location': location_check
       }
   ```

2. **Date formatting**
   ```python
   def format_date_for_form(date_obj):
       """Format date as mm/dd/yyyy"""
       return date_obj.strftime("%m/%d/%Y")
   ```

3. **Checkbox values**
   ```python
   def checkbox_value(checked: bool) -> str:
       """Convert boolean to checkbox value"""
       return "/Yes" if checked else "/Off"
   ```

### Phase 4: API Endpoints (2-3 hours)

```python
# app/api/fmla.py

@router.post("/fmla/create-notice")
async def create_fmla_notice(
    request: CreateFMLANoticeRequest,
    db: Session = Depends(get_db)
):
    """Create FMLA Notice of Eligibility form"""
    # Create FMLA leave request record
    # Calculate eligibility
    # Fill PDF form
    # Save filled form
    # Return form ID and download link
```

### Phase 5: Form Filling Logic (3-4 hours)

```python
class FMLAFormService:
    """Service for FMLA WH-381 form filling"""

    TEMPLATE_PATH = "app/templates/pdf_forms/WH-381_Notice_of_Eligibility.pdf"

    @staticmethod
    def fill_fmla_notice(
        fmla_request: FMLALeaveRequest,
        db: Session
    ) -> str:
        """Fill FMLA Notice of Eligibility form"""

        employee = fmla_request.employee

        # Build field data
        field_data = {
            # Header
            "Date1": format_date_for_form(datetime.now()),
            "Employer To": f"{COMPANY_NAME} To: {employee.first_name} {employee.last_name}",
            "Employee": f"{employee.first_name} {employee.last_name}",

            # Dates
            "mmddyyyy we learned that you need leave beginning on":
                f"{format_date_for_form(fmla_request.request_date)} / {format_date_for_form(fmla_request.leave_start_date)}",
            "mmddyyyy_2": format_date_for_form(fmla_request.leave_start_date),

            # Reason checkboxes
            "Your own serious health condition": checkbox_value(
                fmla_request.leave_reason == "own_health"
            ),
            # ... more reason mappings

            # Eligibility
            "Eligible for FMLA leave...": checkbox_value(fmla_request.is_eligible),
            "Not eligible for FMLA leave because...": checkbox_value(not fmla_request.is_eligible),

            # If not eligible, provide reason
            "towards this requirement": str(fmla_request.months_employed) if fmla_request.months_employed else "",
            "towards this requirement_2": str(fmla_request.hours_worked_12months) if fmla_request.hours_worked_12months else "",

            # HR Contact
            "Contact": fmla_request.hr_contact_name or HR_DEFAULT_CONTACT,
            "Contact info": fmla_request.hr_contact_info or HR_DEFAULT_CONTACT_INFO,

            # ... more field mappings
        }

        # Fill form
        output_path = f"app/storage/filled_forms/{employee.id}/fmla_notice_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        PdfFormService.fill_form(
            template_path=FMLAFormService.TEMPLATE_PATH,
            field_data=field_data,
            output_path=output_path,
            flatten=True
        )

        return output_path
```

### Phase 6: Frontend Integration (2-3 days)

1. Create FMLA request form UI
2. Employee selection
3. Leave reason selection
4. Date inputs
5. Eligibility auto-calculation
6. Form preview/download
7. Send to employee option

### Phase 7: Testing (2-3 hours)

1. Test with real employee data
2. Verify all checkboxes work
3. Test date formatting
4. Verify flattening works
5. Test download functionality

---

## Configuration Requirements

Create configuration file for company-specific values:

```python
# app/config/fmla_config.py

FMLA_CONFIG = {
    'company_name': 'National Benefit Services',
    'hr_contact_name': 'HR Department',
    'hr_contact_phone': '(xxx) xxx-xxxx',
    'hr_contact_email': 'hr@company.com',

    # Leave year calculation method
    'leave_year_method': 'calendar',  # calendar, fixed, forward, rolling
    'fiscal_year_description': 'July 1 - June 30',

    # Policy defaults
    'grace_period_days': 30,
    'periodic_report_interval': 'every 2 weeks',

    # Benefits contact
    'benefits_contact_name': 'Benefits Department',
    'benefits_contact_info': '(xxx) xxx-xxxx',

    # Policy documents
    'paid_leave_policy_name': 'Employee Handbook Section 5',
    'paid_leave_policy_url': 'https://intranet.company.com/policies',
}
```

---

## API Request/Response Examples

### Create FMLA Notice Request

```json
POST /api/fmla/create-notice
{
  "employee_id": 123,
  "request_date": "2025-01-15",
  "leave_start_date": "2025-02-01",
  "leave_end_date": "2025-04-01",
  "leave_reason": "own_health",
  "certification_required": true,
  "certification_type": "health_care_provider_employee",
  "hr_contact_name": "Jane Smith",
  "hr_contact_info": "(555) 123-4567"
}
```

### Response

```json
{
  "status": "success",
  "fmla_request_id": 456,
  "filled_form_id": 789,
  "file_path": "/storage/filled_forms/123/fmla_notice_20250115_143022.pdf",
  "eligibility": {
    "is_eligible": true,
    "months_employed": 18.5,
    "hours_worked_12months": 2080
  },
  "download_url": "/api/pdf-forms/download/789",
  "message": "FMLA Notice created successfully"
}
```

---

## Checkbox Value Testing

Before full implementation, we need to determine the correct checkbox values for this specific PDF. Run this test:

```python
# test_checkbox_values.py

from pypdf import PdfReader, PdfWriter

def test_checkbox_values():
    """Test which checkbox values work for this PDF"""

    reader = PdfReader("WH-381_Notice of Eligibility.pdf")
    writer = PdfWriter()
    writer.append(reader)

    # Test different checkbox value formats
    test_values = ["/Yes", "/On", "/1", "/True", "/Checked"]

    for value in test_values:
        writer.update_page_form_field_values(
            writer.pages[0],
            {"Eligible for FMLA leave...": value}
        )

        output_path = f"test_checkbox_{value.replace('/', '')}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        print(f"Created: {output_path}")
        print(f"Check if checkbox is checked with value: {value}")
```

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Database setup | 1-2 hours | Not Started |
| 2 | PDF service extension | 2-3 hours | Not Started |
| 3 | Field mapping logic | 3-4 hours | Not Started |
| 4 | API endpoints | 2-3 hours | Not Started |
| 5 | Form filling logic | 3-4 hours | Not Started |
| 6 | Testing | 2-3 hours | Not Started |
| 7 | Frontend (optional) | 2-3 days | Not Started |

**Total Backend**: 12-18 hours (1.5-2.5 days)
**Total with Frontend**: 4-5.5 days

---

## Next Steps

1. **Confirm requirements**: Review this plan and confirm field mappings
2. **Set priorities**: Which fields are most important for initial release?
3. **Checkbox testing**: Run checkbox value test to determine correct format
4. **Configuration**: Provide company-specific values for config
5. **Begin implementation**: Start with Phase 1 (Database setup)

---

**Status**: Planning Complete ✅
**Next**: Awaiting approval to begin implementation

**Key Decision Points**:
1. Do you want to implement all fields or start with essential fields only?
2. Will this be HR-staff-only or employee-facing?
3. Do you need email delivery of filled forms?
4. Should we track form history (versioning)?
