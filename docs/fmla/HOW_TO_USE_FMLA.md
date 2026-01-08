# How to Generate and Send FMLA Forms

## 🎯 Three Ways to Generate FMLA Forms

---

## ⭐ Method 1: Interactive Script (EASIEST!)

### Quick Start:
```bash
cd /Users/michaelknudson/Desktop/hr-dashboard/backend
./venv/bin/python create_fmla_notice.py
```

### What it does:
- ✅ Guides you through the entire process
- ✅ Shows you a list of employees to choose from
- ✅ Asks for leave reason and dates
- ✅ Generates the WH-381 form automatically
- ✅ Sends it to the employee via email
- ✅ No need to remember API endpoints!

### Example Session:
```
FMLA NOTICE GENERATOR - LOGIN
Username: mknudson
Password: ********
✓ Login successful!

CREATE FMLA NOTICE
Fetching employees...
Found 25 employees:
    1. Anthony Sanchez (1000)
    2. Jane Smith (1001)
    3. Bob Johnson (1002)
    ...

Enter Employee ID: 1

✓ Selected: Anthony Sanchez

Leave Reason:
  1. Own Health (Employee's serious health condition)
  2. Family Care (Care for family member)
  3. Birth/Adoption (Birth or adoption of child)
  4. Military Exigency
  5. Military Caregiver

Select reason (1-5): 1

Leave Dates:
Request date (2025-11-11):
Leave start date (2025-11-18):
Leave end date (2026-01-17):

Certification required? (Y/n): y

CREATING NOTICE...
✓ NOTICE CREATED SUCCESSFULLY!
  Notice ID: 1
  Employee: Anthony Sanchez
  Eligible: Yes ✓
  Status: notice_generated
  Form: app/storage/filled_forms/FMLA_WH381_1000_20251111_220000.pdf

SEND NOTICE VIA EMAIL
Send this notice to employee via email? (Y/n): y

✓ EMAIL SENT SUCCESSFULLY!
  Sent to: asanchez@example.com
  Sent at: 2025-11-11T22:30:00

✅ COMPLETE!
```

---

## 🔧 Method 2: Using the API Directly

### Step 1: Get your authentication token

Login first to get a token:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "mknudson", "password": "YOUR_PASSWORD"}'
```

Save the `access_token` from the response.

### Step 2: Create the FMLA notice

```bash
curl -X POST http://localhost:8000/fmla/create-notice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "request_date": "2025-11-11",
    "leave_start_date": "2025-12-01",
    "leave_end_date": "2026-01-30",
    "leave_reason": "own_health",
    "certification_required": true,
    "generate_notice": true
  }'
```

**Response:**
```json
{
  "id": 1,
  "employee_id": 1,
  "request_date": "2025-11-11",
  "leave_start_date": "2025-12-01",
  "is_eligible": true,
  "status": "notice_generated",
  "filled_form_path": "app/storage/filled_forms/FMLA_WH381_1_20251111.pdf"
}
```

### Step 3: Send via email (optional)

```bash
curl -X POST http://localhost:8000/fmla/notices/1/send-email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4: Or download the PDF

```bash
curl -X GET http://localhost:8000/fmla/notices/1/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output FMLA_Notice.pdf
```

Or open in browser:
```
http://localhost:8000/fmla/notices/1/download
```

---

## 🧪 Method 3: Test Script (For Testing)

### Generate a test form:
```bash
cd /Users/michaelknudson/Desktop/hr-dashboard/backend
./venv/bin/python test_fmla_form_generation.py
```

This creates a sample form for the first employee in your database.

---

## 📋 Leave Reason Options

When creating a notice, use these values for `leave_reason`:

| Code | Description |
|------|-------------|
| `own_health` | Employee's own serious health condition |
| `family_care` | Care for family member with serious health condition |
| `birth_adoption` | Birth or adoption of a child |
| `military_exigency` | Qualifying military exigency |
| `military_caregiver` | Care for covered servicemember |

---

## 🛠️ Managing FMLA Notices

### List all notices:
```bash
./venv/bin/python manage_fmla_notices.py list
```

### View a specific notice:
```bash
./venv/bin/python manage_fmla_notices.py view 1
```

### Check pending certifications:
```bash
./venv/bin/python manage_fmla_notices.py pending
```

### See statistics:
```bash
./venv/bin/python manage_fmla_notices.py stats
```

### Open the PDF:
```bash
./venv/bin/python manage_fmla_notices.py open 1
```

---

## 📧 Email Configuration (Optional)

If you want to send emails, configure these in your `.env` file:

```env
# Enable email sending
EMAIL_ENABLED=true

# Gmail configuration
EMAIL_PROVIDER=gmail
GMAIL_USERNAME=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
GMAIL_FROM_EMAIL=noreply@nbsbenefits.com
GMAIL_FROM_NAME=NBS HR Department
```

**Without email config:** Forms are generated but not sent. You can download them manually.

---

## 🎯 Complete Workflow Example

### Scenario: Employee John Doe needs FMLA for surgery

**Option A - Interactive (Recommended):**
```bash
./venv/bin/python create_fmla_notice.py
# Follow the prompts
```

**Option B - API:**
```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "mknudson", "password": "PASSWORD"}' \
  | jq -r '.access_token')

# 2. Create notice
NOTICE_ID=$(curl -X POST http://localhost:8000/fmla/create-notice \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 5,
    "request_date": "2025-11-11",
    "leave_start_date": "2025-12-15",
    "leave_end_date": "2026-02-15",
    "leave_reason": "own_health",
    "certification_required": true,
    "generate_notice": true
  }' | jq -r '.id')

# 3. Send via email
curl -X POST "http://localhost:8000/fmla/notices/$NOTICE_ID/send-email" \
  -H "Authorization: Bearer $TOKEN"

# 4. View details
./venv/bin/python manage_fmla_notices.py view $NOTICE_ID
```

---

## 📍 Where to Find Generated Forms

All generated PDFs are saved in:
```
/Users/michaelknudson/Desktop/hr-dashboard/backend/app/storage/filled_forms/
```

Filename format: `FMLA_WH381_{employee_id}_{timestamp}.pdf`

---

## ❓ Troubleshooting

### "Employee not found"
- Check that the employee_id exists in your database
- List employees: `GET /analytics/employees`

### "No form has been generated"
- Make sure `generate_notice: true` in your request
- Check the API response for errors

### "Employee does not have an email address"
- Employee record needs an email field
- You can still download the PDF manually

### "Backend not running"
- Start backend: `./venv/bin/python -m uvicorn app.main:app --reload --port 8000`
- Check it's running: `curl http://localhost:8000/docs`

---

## 🎓 Quick Reference

**Generate & Send (Interactive):**
```bash
./venv/bin/python create_fmla_notice.py
```

**View Notice Details:**
```bash
./venv/bin/python manage_fmla_notices.py view 1
```

**List All Notices:**
```bash
./venv/bin/python manage_fmla_notices.py list
```

**Download PDF (Browser):**
```
http://localhost:8000/fmla/notices/1/download
```

**Check Pending Certifications:**
```bash
./venv/bin/python manage_fmla_notices.py pending
```

---

## 📚 More Documentation

- **FMLA_IMPLEMENTATION_COMPLETE.md** - Full technical details
- **FMLA_ENHANCEMENTS.md** - New features
- **FMLA_QUICK_START.md** - Quick start guide
- **FMLA_FIELD_MAPPING_FINAL.md** - Field reference

---

**Need help?** The interactive script (`create_fmla_notice.py`) is the easiest way to get started! 🚀
