# FMLA WH-381 Form System - Quick Start Guide

## 🚀 Getting Started (5 Minutes)

### Step 1: Verify Installation ✅

All components are already installed and configured:
- ✅ Database tables created
- ✅ PDF template in place
- ✅ API endpoints ready
- ✅ Backend server running on port 8000

### Step 2: Generate Your First FMLA Notice

You have two options:

#### Option A: Using the Test Script (Recommended First Time)

```bash
cd /Users/michaelknudson/Desktop/hr-dashboard/backend
./venv/bin/python test_fmla_form_generation.py
```

This will:
- Check eligibility for a test employee
- Generate a sample WH-381 form
- Save it to `app/storage/filled_forms/`
- Display all the details

#### Option B: Using the API

**1. Check Employee Eligibility:**

```bash
curl -X POST http://localhost:8000/fmla/check-eligibility \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "leave_start_date": "2025-12-01"
  }'
```

**2. Create FMLA Notice:**

```bash
curl -X POST http://localhost:8000/fmla/create-notice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "request_date": "2025-11-11",
    "leave_start_date": "2025-12-01",
    "leave_reason": "own_health",
    "certification_required": true,
    "generate_notice": true
  }'
```

---

## 📋 Leave Reason Options

| Value | Description |
|-------|-------------|
| `birth_adoption` | Birth or adoption of child |
| `own_health` | Employee's own serious health condition |
| `family_care` | Care for family member with serious health condition |
| `military_exigency` | Qualifying exigency (military family) |
| `military_caregiver` | Care for covered servicemember |

## 👨‍👩‍👧‍👦 Family Relationship Options

| Value | Description |
|-------|-------------|
| `spouse` | Spouse |
| `parent` | Parent |
| `child` | Child (general) |
| `child_under_18` | Child under 18 years old |
| `child_over_18_disabled` | Child 18+ and incapable of self-care |
| `child_any_age` | Child of any age (military caregiver) |
| `next_of_kin` | Next of kin (military caregiver) |

---

## 🎯 Common Scenarios

### Scenario 1: Employee's Own Medical Leave

```json
{
  "employee_id": 1,
  "request_date": "2025-11-11",
  "leave_start_date": "2025-12-01",
  "leave_end_date": "2026-01-30",
  "leave_reason": "own_health",
  "certification_required": true,
  "certification_type": "health_care_provider_employee",
  "generate_notice": true
}
```

### Scenario 2: Care for Sick Parent

```json
{
  "employee_id": 1,
  "request_date": "2025-11-11",
  "leave_start_date": "2025-12-01",
  "leave_reason": "family_care",
  "family_relationship": "parent",
  "certification_required": true,
  "certification_type": "health_care_provider_family",
  "generate_notice": true
}
```

### Scenario 3: Birth of Child

```json
{
  "employee_id": 1,
  "request_date": "2025-11-11",
  "leave_start_date": "2025-12-15",
  "leave_end_date": "2026-02-15",
  "leave_reason": "birth_adoption",
  "family_relationship": "child",
  "certification_required": false,
  "generate_notice": true
}
```

---

## 📥 Download Generated Forms

### From API:

```bash
curl -X GET http://localhost:8000/fmla/notices/1/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output FMLA_Notice.pdf
```

### From File System:

All generated forms are saved in:
```
/Users/michaelknudson/Desktop/hr-dashboard/backend/app/storage/filled_forms/
```

Format: `FMLA_WH381_{employee_id}_{timestamp}.pdf`

---

## 🔍 View All Notices

```bash
curl -X GET http://localhost:8000/fmla/notices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Filter by employee:**
```bash
curl -X GET "http://localhost:8000/fmla/notices?employee_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Filter by status:**
```bash
curl -X GET "http://localhost:8000/fmla/notices?status=notice_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ Configuration

### Update Company Information

Edit `app/services/fmla_form_service.py`:

```python
FMLA_COMPANY_CONFIG = {
    'company_name': 'National Benefit Services',
    'hr_contact_name': 'Michael Knudson',
    'hr_contact_email': 'mknudson@nbsbenefits.com',
    # ... other settings
}
```

After changes, restart the backend server.

### Update Company Policies

Same file, modify these settings:

```python
'leave_year_method': 'forward',  # forward, rolling, calendar, fixed
'paid_leave_default': ['unpaid', 'required'],
'grace_period_days': 30,
'periodic_reporting_required': True,
'periodic_reporting_interval': 'every 4 weeks',
```

---

## 🐛 Troubleshooting

### "Employee not found"
- Check that the employee_id exists in your database
- Use `GET /analytics/employees` to list all employees

### "No form has been generated"
- Set `"generate_notice": true` in the request
- Check that the template PDF exists at `app/templates/pdf_forms/WH-381_Notice of Eligibility.pdf`

### Form fields are blank
- Verify employee has a hire_date in the database
- Check employment_type is set ("Full Time" or "Part Time")
- Review the test output for field mapping details

### Authentication errors
- Ensure you have a valid access token
- Use `POST /auth/login` to get a token
- Include token in header: `Authorization: Bearer YOUR_TOKEN`

---

## 📊 Eligibility Rules

An employee is FMLA eligible if they meet ALL three criteria:

1. **Employed 12+ months** with the company
2. **Worked 1,250+ hours** in the last 12 months
   - Full-time employees: Assumed 2,080 hours/year
   - Part-time employees: Assumed 1,040 hours/year
3. **Work at location** with 50+ employees within 75 miles
   - Currently assumed TRUE for National Benefit Services

The system automatically calculates eligibility and shows reasons if ineligible.

---

## 📞 Need Help?

**Documentation:**
- `FMLA_IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `FMLA_FIELD_MAPPING_FINAL.md` - Complete field mappings
- `PDF_FORM_FILLING_RESEARCH.md` - Technical background

**Test Scripts:**
- `test_fmla_form_generation.py` - Test form generation
- `test_checkbox_values.py` - Test checkbox formats
- `test_fmla_api.py` - Test API endpoints

**Database:**
- Tables: `fmla_leave_requests`, `filled_pdf_forms`
- Migration: `app/db/create_fmla_notice_tables.py`

---

## ✅ Pre-Flight Checklist

Before generating forms in production:

- [ ] Verify company information in config
- [ ] Test with a sample employee
- [ ] Review generated PDF for accuracy
- [ ] Confirm all field mappings are correct
- [ ] Set up form storage backup
- [ ] Configure email delivery (if needed)
- [ ] Train HR staff on API usage

---

**Ready to generate FMLA notices!** 🎉

Run the test script to see it in action:
```bash
./venv/bin/python test_fmla_form_generation.py
```
