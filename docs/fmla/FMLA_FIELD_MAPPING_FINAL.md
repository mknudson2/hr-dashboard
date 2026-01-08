# FMLA WH-381 Field Mapping - Final Configuration
## National Benefit Services

**Date**: 2025-11-11
**Configured By**: Michael Knudson
**Status**: Ready for Implementation

---

## Configuration Summary

Based on the interactive mapping session, here are the finalized field mappings:

### Company Policy Settings

```python
FMLA_COMPANY_CONFIG = {
    'company_name': 'National Benefit Services',
    'hr_contact_name': 'Michael Knudson',
    'hr_contact_email': 'mknudson@nbsbenefits.com',
    'hr_contact_phone': None,  # Can be added if needed

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
    'benefits_contact_name': 'Michael Knudson',
    'benefits_contact_email': 'mknudson@nbsbenefits.com',
}
```

---

## Field Mappings by Section

### SECTION 1: Header & Basic Information

| Field Name | Data Source | Value/Logic |
|------------|-------------|-------------|
| `Date1` | System | `datetime.now().strftime("%m/%d/%Y")` |
| `Employer To` | Config + Database | `"National Benefit Services To: {employee.first_name} {employee.last_name}"` |
| `Employee` | Database | `f"{employee.first_name} {employee.last_name}"` |
| `mmddyyyy we learned that you need leave beginning on` | Manual Entry | `f"{request_date} / {leave_start_date}"` (both mm/dd/yyyy) |
| `mmddyyyy_2` | Manual Entry | `leave_start_date` (mm/dd/yyyy) |

**Notes:**
- Both request_date and leave_start_date will be entered by HR when creating the form
- Employee name is pulled from employees table

---

### SECTION 2: Reason for Leave

**Primary Reason** (Manual - HR selects):

| Field Name | Condition | Value |
|------------|-----------|-------|
| `The birth of a child or placement...` | `leave_reason == 'birth_adoption'` | `checkbox_value(True)` |
| `Your own serious health condition` | `leave_reason == 'own_health'` | `checkbox_value(True)` |
| `You are needed to care for your family member...` | `leave_reason == 'family_care'` | `checkbox_value(True)` |
| `A qualifying exigency...` | `leave_reason == 'military_exigency'` | `checkbox_value(True)` |
| `You are needed to care for...servicemember` | `leave_reason == 'military_caregiver'` | `checkbox_value(True)` |

**Family Member Relationship** (Manual - HR selects if applicable):

| Field Name | Condition | Value |
|------------|-----------|-------|
| `Spouse`, `Spouse_2`, `Spouse_3` | `family_relationship == 'spouse'` | `checkbox_value(True)` |
| `Parent`, `Parent_2`, `Parent_3` | `family_relationship == 'parent'` | `checkbox_value(True)` |
| `Child under age 18` | `family_relationship == 'child_under_18'` | `checkbox_value(True)` |
| `Child 18 years or older and incapable of self` | `family_relationship == 'child_over_18_disabled'` | `checkbox_value(True)` |
| `Child of any age` | `family_relationship == 'child_any_age'` | `checkbox_value(True)` |
| `Child` | `family_relationship == 'child'` | `checkbox_value(True)` |
| `Next of kin` | `family_relationship == 'next_of_kin'` | `checkbox_value(True)` |

**Leave Reason Options:**
- `birth_adoption` - Birth or adoption of child
- `own_health` - Employee's own serious health condition
- `family_care` - Care for family member
- `military_exigency` - Qualifying exigency (military family)
- `military_caregiver` - Care for covered servicemember

---

### SECTION 3: Eligibility Determination

**Auto-Calculate Eligibility** using:

```python
def calculate_fmla_eligibility(employee, leave_start_date, hours_worked_12months):
    """
    Auto-calculate FMLA eligibility

    Requirements:
    1. Employed for 12+ months
    2. Worked 1,250+ hours in last 12 months
    3. Work at location with 50+ employees within 75 miles
    """
    # 1. Check 12-month employment
    hire_date = employee.hire_date
    months_employed = (leave_start_date - hire_date).days / 30.44
    meets_12_months = months_employed >= 12

    # 2. Check 1,250 hours
    # Will use actual hours data from provided file
    meets_hours = hours_worked_12months >= 1250

    # 3. Check 50+ employees (from config or database)
    meets_location = True  # Assuming NBS meets this requirement

    is_eligible = meets_12_months and meets_hours and meets_location

    return {
        'is_eligible': is_eligible,
        'months_employed': round(months_employed, 1),
        'hours_worked': hours_worked_12months,
        'meets_12_months': meets_12_months,
        'meets_hours': meets_hours,
        'meets_location': meets_location,
        'ineligibility_reasons': []
    }
```

**Field Mappings:**

| Field Name | Data Source | Value/Logic |
|------------|-------------|-------------|
| `Eligible for FMLA leave...` | Auto-Calculate | `checkbox_value(is_eligible)` |
| `Not eligible for FMLA leave because...` | Auto-Calculate | `checkbox_value(not is_eligible)` |
| `You have not met the FMLAs 12month length...` | Auto-Calculate | `checkbox_value(not meets_12_months)` if not eligible |
| `towards this requirement` | Auto-Calculate | `str(round(months_employed, 1))` if not meets_12_months |
| `You have not met the FMLAs 1250 hours...` | Auto-Calculate | `checkbox_value(not meets_hours)` if not eligible |
| `towards this requirement_2` | Auto-Calculate | `str(int(hours_worked))` if not meets_hours |
| `Flight Crew` | Auto-Calculate | `checkbox_value(False)` (assuming no flight crew) |
| `50+` | Auto-Calculate | `checkbox_value(False)` (assuming meets requirement) |

**Note:** Only show ineligibility reasons if employee is actually ineligible (Q3.2: C)

---

### SECTION 4: HR Contact Information

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `Contact` | Config | `"Michael Knudson"` |
| `Contact info` | Config | `"mknudson@nbsbenefits.com"` |
| `If you have any questions please contact_2` | Config | `"Michael Knudson"` |
| `at_2` | Config | `"mknudson@nbsbenefits.com"` |

---

### SECTION 5: Additional Information / Certification

**Field Mappings:**

| Field Name | Data Source | Value/Logic |
|------------|-------------|-------------|
| `No additiona info` | Manual | `checkbox_value(not certification_required)` |
| `Certification requested` | Manual | `checkbox_value(certification_required)` |
| `Certification attached` | Manual | `checkbox_value(certification_attached)` |
| `Cert` | Manual | Checkbox for certification type (Healthcare Provider, etc.) |
| `Certify relationship` | Manual | `checkbox_value(relationship_cert_required)` |
| `If requested medical certification must be returned by` | System | `(datetime.now() + timedelta(days=30)).strftime("%m/%d/%Y")` |
| `must be returned to us by` | System | Same as above if relationship cert required |
| `The information requested must be returned to us by` | System | Same as above if other info required |

**Certification Due Date:** Current date + 30 days (Q5.2: B)

---

### SECTION 6: Rights and Responsibilities

**Part A: Leave Entitlement**

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `The calendar year January 1st December 31st` | Config | `checkbox_value(False)` |
| `A fixed leave year based on` | Config | `checkbox_value(False)` |
| `eg a fiscal year beginning on July 1...` | Config | `""` (not used) |
| `The 12month period measured forward...` | Config | `checkbox_value(True)` ✓ |
| `A rolling 12month period measured backward...` | Config | `checkbox_value(False)` |
| `If applicable the single 12month period for Military Caregiver Leave started on` | Manual | Leave blank unless military caregiver leave |

**Key Employee Status:**

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `are` | Database/Manual | `checkbox_value(is_key_employee)` |
| `are not considered a key employee...` | Database/Manual | `checkbox_value(not is_key_employee)` |
| `have` | Manual | Usually `checkbox_value(False)` |
| `have not determined that restoring you...` | Manual | Usually `checkbox_value(True)` |

**Note:** Key employee determination is complex - typically manual or based on salary threshold

---

**Part B: Substitution of Paid Leave**

Policy: Some/all will not be paid AND Employer requires use of paid leave (Q6.2: B)

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `Some or all of your FMLA leave will not be paid...` | Config | `checkbox_value(True)` ✓ |
| `You have requested to use some or all...` | Config | `checkbox_value(False)` |
| `We are requiring you to use some or all...` | Config | `checkbox_value(True)` ✓ |
| `Other eg shortor longterm disability...` | Manual | `checkbox_value(False)` or as needed |
| `Any time taken for this reason...` | Manual | Text if "Other" is checked |
| `The applicable conditions for use of paid leave include` | Config | Company policy text |
| `For more information about...1` | Config | Policy document name |
| `For more information about...2` | Config | Policy document name (cont'd) |
| `available at` | Config | URL or location of policy |

---

**Part C: Maintain Health Benefits**

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `on your health insurance while you are on any unpaid FMLA leave contact` | Config | `"Michael Knudson"` |
| `undefined_2` | Config | `"mknudson@nbsbenefits.com"` |
| `You have a minimum grace period of` | Config | `checkbox_value(True)` (30 days) |
| `30days or` | Config | `checkbox_value(True)` ✓ |
| `indicate longer period if applicable in which to` | Config | `""` (using 30 days) |

---

**Part D: Other Employee Benefits**

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `your employee benefits while you are on FMLA leave contact` | Config | `"Michael Knudson"` |
| `at_3` | Config | `"mknudson@nbsbenefits.com"` |

---

**Part F: Other Requirements While on FMLA Leave**

| Field Name | Data Source | Value |
|------------|-------------|-------|
| `While on leave you` | Config | `checkbox_value(True)` (periodic reports required) |
| `will be` | Config | `checkbox_value(True)` ✓ |
| `return to work every` | Config | `"every 4 weeks"` |
| `undefined` | Manual | Additional requirements if any |

---

## Database Schema

### FMLA Leave Request Table

```python
class FMLALeaveRequest(Base):
    """FMLA Leave Request and Notice Generation"""
    __tablename__ = "fmla_leave_requests"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Dates (Manual Entry)
    request_date = Column(Date, nullable=False)  # Date we learned of need
    leave_start_date = Column(Date, nullable=False)
    leave_end_date = Column(Date, nullable=True)

    # Leave Reason (Manual Selection)
    leave_reason = Column(String(50), nullable=False)
    # Options: birth_adoption, own_health, family_care, military_exigency, military_caregiver
    family_relationship = Column(String(50), nullable=True)
    # Options: spouse, parent, child_under_18, child_over_18_disabled, child_any_age, child, next_of_kin

    # Eligibility (Auto-Calculated)
    is_eligible = Column(Boolean, nullable=False)
    months_employed = Column(Float, nullable=True)
    hours_worked_12months = Column(Integer, nullable=True)  # From hours data file
    ineligibility_reasons = Column(JSON, nullable=True)

    # Certification (Manual Entry)
    certification_required = Column(Boolean, default=False)
    certification_type = Column(String(100), nullable=True)
    # Options: health_care_provider_employee, health_care_provider_family,
    #          qualifying_exigency, military_caregiver
    certification_due_date = Column(Date, nullable=True)
    certification_attached = Column(Boolean, default=False)
    relationship_cert_required = Column(Boolean, default=False)

    # Key Employee (Manual/Auto)
    is_key_employee = Column(Boolean, default=False)
    restoration_determined = Column(Boolean, default=False)

    # Paid Leave (From Config + Manual Override)
    some_unpaid = Column(Boolean, default=True)
    employer_requires_paid = Column(Boolean, default=True)
    other_leave_arrangement = Column(String(200), nullable=True)

    # Form Generation
    filled_form_id = Column(Integer, ForeignKey("filled_pdf_forms.id"), nullable=True)
    notice_sent_date = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.now)
    created_by = Column(String(100), nullable=False)  # User who created request
    status = Column(String(50), default="draft")
    # Options: draft, notice_generated, sent_to_employee, acknowledged, active, completed

    # Relationships
    employee = relationship("Employee", back_populates="fmla_requests")
    filled_form = relationship("FilledPdfForm")
```

---

## Checkbox Value Testing

Before implementation, we need to determine the correct checkbox format. Run this test:

```python
# Test which checkbox value format works
test_values = {
    "/Yes": "Eligible for FMLA leave...",
    "/Off": "Eligible for FMLA leave...",
}

# Will test and determine correct format
# Most PDFs use: /Yes for checked, /Off for unchecked
```

---

## Implementation Checklist

### Phase 1: Setup ✅
- [x] Field mapping complete
- [x] Configuration documented
- [ ] Install pypdf (already installed)
- [ ] Copy PDF template to templates directory

### Phase 2: Database
- [ ] Create FMLALeaveRequest model
- [ ] Create migration
- [ ] Run migration

### Phase 3: Hours Data Integration
- [ ] Receive hours data file from user
- [ ] Create hours import service
- [ ] Store hours data (new table or link to employees)

### Phase 4: FMLA Service
- [ ] Create FMLAFormService class
- [ ] Implement eligibility calculation
- [ ] Implement field mapping logic
- [ ] Test checkbox values
- [ ] Implement form filling

### Phase 5: API
- [ ] Create /api/fmla endpoints
- [ ] Create FMLA request endpoint
- [ ] Generate notice endpoint
- [ ] Download filled form endpoint
- [ ] List employee FMLA requests endpoint

### Phase 6: Testing
- [ ] Test with real employee data
- [ ] Test eligibility calculations
- [ ] Test all field mappings
- [ ] Verify PDF output

### Phase 7: Frontend (Optional)
- [ ] FMLA request form UI
- [ ] Employee selection
- [ ] Form preview
- [ ] Download/email functionality

---

## Next Steps

1. **Hours Data File**: Please provide the hours worked data file so I can:
   - Understand the format
   - Create import service
   - Integrate with eligibility calculation

2. **Test Checkbox Values**: I'll create a test script to determine correct checkbox format

3. **Begin Implementation**: Once hours data format is understood, I'll start building

---

## Sample API Request

```json
POST /api/fmla/create-request
{
  "employee_id": 123,
  "request_date": "2025-01-15",
  "leave_start_date": "2025-02-01",
  "leave_end_date": "2025-04-01",
  "leave_reason": "own_health",
  "certification_required": true,
  "certification_type": "health_care_provider_employee",
  "generate_notice": true
}

Response:
{
  "status": "success",
  "fmla_request_id": 456,
  "eligibility": {
    "is_eligible": true,
    "months_employed": 18.5,
    "hours_worked_12months": 2080
  },
  "filled_form_id": 789,
  "download_url": "/api/pdf-forms/download/789"
}
```

---

**Configuration Complete ✅**
**Ready for Implementation**

**Next Action**: Awaiting hours data file format to proceed with implementation.
