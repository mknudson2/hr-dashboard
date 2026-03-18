# Employee Data Upload Templates

This folder contains CSV templates for uploading employee data into the HR Dashboard system.

## Quick Start

1. **Choose the right template** based on what data you have available
2. **Copy the template** and fill in your employee data
3. **Save as CSV** (UTF-8 encoding recommended)
4. **Place in upload folder**: `/backend/data/paylocity_uploads/`
5. **Run the import**: The system will automatically process files in the upload folder

---

## Template Options

### 1️⃣ **employee_upload_basic.csv** (Minimum Required)

**Use this when:** You only have basic employee information

**Required Fields:**
- `Employee Id` - Unique identifier (required)
- `Preferred/First Name` - First name
- `Last Name` - Last name
- `Status` - Active, Terminated, etc.
- `Hire Date` - Format: YYYY-MM-DD

**Optional Fields:**
- Type, Department, Cost Center, Team
- Location, Rate (wage)
- Term Date, Termination Type

**Example:**
```csv
Employee Id,Preferred/First Name,Last Name,Status,Hire Date,Rate
1000,John,Doe,Active,2020-01-15,75000
```

---

### 2️⃣ **employee_upload_with_contributions.csv** (Recommended)

**Use this when:** You have benefits enrollment data from your payroll/benefits system

**Includes basic fields PLUS:**
- Medical Plan & Tier
- HSA Employee & Employer monthly contributions
- FSA monthly contribution
- Dependent Care FSA monthly contribution
- 401(k) monthly contribution
- Dental & Vision plan selections

**Example:**
```csv
Employee Id,First Name,Last Name,Medical Tier,HSA EE Monthly,FSA Monthly,401k Monthly
1000,John,Doe,Employee Only,150.00,0,500.00
```

**Important:** All contribution amounts should be **monthly** values.

---

### 3️⃣ **employee_upload_full.csv** (Complete)

**Use this when:** You're doing a full data migration with all benefits details

**Includes EVERYTHING:**
- All basic employee information
- Complete benefits enrollment details
- All contribution amounts (EE and ER)
- Insurance coverages and costs
- Vesting schedules and percentages
- PTO balances
- Birth dates (for age-based calculations)

**Note:** This is the most comprehensive template but requires the most data collection.

---

## Field Definitions

### Core Employee Fields

| Field | Description | Format | Required | Example |
|-------|-------------|--------|----------|---------|
| Employee Id | Unique employee identifier | Text/Number | ✅ Yes | 1000 |
| Preferred/First Name | First name | Text | ✅ Yes | John |
| Last Name | Last name | Text | ✅ Yes | Doe |
| Status | Employment status | Active/Terminated | ✅ Yes | Active |
| Type | Employment type | FT/PT/Contract | No | FT |
| Hire Date | Date of hire | YYYY-MM-DD | ✅ Yes | 2020-01-15 |
| Term Date | Termination date | YYYY-MM-DD | No | 2024-12-31 |
| Termination Type | Reason for termination | Voluntary/Involuntary | No | Voluntary |
| Location | Work location | Text | No | New York |
| Position | Job title | Text | No | HR Manager |
| Supervisor | Manager name | Text | No | Jane Smith |
| Rate | Annual salary | Number | No | 75000 |
| Wage Type | Salary or Hourly | Salary/Hourly | No | Salary |

### Organization Fields

| Field | Description | Example |
|-------|-------------|---------|
| Worked Department | Department name | Human Resources |
| Worked CostCenter | Cost center code | 01-Admin |
| Worked Team | Team name | HR Operations |

### Medical Insurance Fields

| Field | Description | Format | Example |
|-------|-------------|--------|---------|
| Medical Plan | Plan name | Text | PPO Gold |
| Medical Tier | Coverage level | See options below | Employee Only |
| Medical EE Cost | Employee monthly cost | Number | 150.00 |
| Medical ER Cost | Employer monthly cost | Number | 500.00 |

**Medical Tier Options:**
- `Employee Only`
- `Employee + Spouse`
- `Employee + Children`
- `Family`

### Dental Insurance Fields

| Field | Description | Example |
|-------|-------------|---------|
| Dental Plan | Plan name | Dental PPO |
| Dental Tier | Coverage level | Employee Only |
| Dental EE Cost | Employee monthly cost | 15.00 |
| Dental ER Cost | Employer monthly cost | 40.00 |

### Vision Insurance Fields

| Field | Description | Example |
|-------|-------------|---------|
| Vision Plan | Plan name | Vision Standard |
| Vision Tier | Coverage level | Employee Only |
| Vision EE Cost | Employee monthly cost | 8.00 |
| Vision ER Cost | Employer monthly cost | 15.00 |

### Health Savings Account (HSA)

| Field | Description | Format | 2025 Limits |
|-------|-------------|--------|-------------|
| HSA EE Contribution | Employee monthly contribution | Number | Individual: $358/mo, Family: $712/mo |
| HSA ER Contribution | Employer monthly contribution | Number | No IRS limit |

**Important:**
- HSA is only available with HDHP (High Deductible Health Plan)
- Cannot have both HSA and Healthcare FSA
- Age 55+ can contribute extra $1,000/year ($83/month)

### Flexible Spending Accounts (FSA)

| Field | Description | Format | 2025 Limits |
|-------|-------------|--------|-------------|
| FSA Contribution | Healthcare FSA monthly | Number | $266/month ($3,200/year) |
| Dependent Care FSA | Childcare FSA monthly | Number | $416/month ($5,000/year) |

**Important:**
- Cannot have both HSA and Healthcare FSA
- Dependent Care FSA can be combined with either HSA or Healthcare FSA

### Retirement (401k)

| Field | Description | Format | Example |
|-------|-------------|--------|---------|
| Retirement Plan Type | Plan type | 401k, 401k Roth, or Both | 401k |
| Retirement EE Contribution % | Employee contribution percent | Number | 8.0 |
| Retirement EE Contribution Amount | Monthly dollar amount | Number | 500.00 |
| Retirement ER Match % | Employer match percent | Number | 4.0 |
| Retirement ER Match Amount | Monthly match dollar amount | Number | 250.00 |
| Retirement Vesting Schedule | Vesting type | See options below | 5 Year Graded |
| Retirement Vested % | Current vested percentage | Number 0-100 | 80.0 |

**Vesting Schedule Options:**
- `Immediate` - 100% vested immediately
- `3 Year Cliff` - 0% until 3 years, then 100%
- `5 Year Graded` - 20% per year over 5 years

### Life & Disability Insurance

| Field | Description | Example |
|-------|-------------|---------|
| Life Insurance Coverage | Coverage amount | 75000 |
| Life Insurance EE Cost | Employee monthly cost | 10.00 |
| Life Insurance ER Cost | Employer monthly cost | 37.50 |
| Disability STD | Has short-term disability | 1 (yes) or 0 (no) |
| Disability STD Cost | Monthly STD cost | 20.00 |
| Disability LTD | Has long-term disability | 1 (yes) or 0 (no) |
| Disability LTD Cost | Monthly LTD cost | 25.00 |

### Other Benefits

| Field | Description | Example |
|-------|-------------|---------|
| Commuter Benefits | Monthly commuter benefit | 50.00 |
| Wellness Stipend | Monthly wellness allowance | 25.00 |

### Time Off

| Field | Description | Example |
|-------|-------------|---------|
| PTO Allotted | Annual PTO hours | 120 |
| PTO Used | PTO hours used YTD | 32 |

### Personal Information

| Field | Description | Format | Example |
|-------|-------------|--------|---------|
| Birth Date | Date of birth | YYYY-MM-DD | 1985-03-20 |

---

## Import Rules

### Updating Existing Employees

If an employee with the same `Employee Id` already exists:
- ✅ **Existing fields are updated** with new values
- ✅ **New fields are added** if they weren't present before
- ✅ **Empty fields are ignored** (existing data is preserved)

### Creating New Employees

If the `Employee Id` is new:
- ✅ **New employee record is created**
- ✅ **All provided fields are populated**
- ✅ **Missing optional fields default to NULL**

---

## Best Practices

### 1. **Start Small**
- Begin with the basic template
- Import 5-10 test employees first
- Verify data appears correctly in the system
- Then proceed with full import

### 2. **Data Validation**
Before uploading, verify:
- ✅ All Employee IDs are unique
- ✅ Dates are in YYYY-MM-DD format
- ✅ Contribution amounts don't exceed IRS limits
- ✅ HSA and Healthcare FSA aren't both populated
- ✅ Numbers don't have currency symbols ($)
- ✅ File is saved as CSV (not Excel format)

### 3. **Incremental Updates**
You can upload multiple times:
- First upload: Basic employee info
- Second upload: Add contribution data
- Third upload: Add PTO balances
- Etc.

Each upload updates existing records with new information.

### 4. **Backup First**
Before a major import:
```bash
# Backup your database
cp backend/data/hr_dashboard.db backend/data/hr_dashboard.db.backup
```

---

## Common Scenarios

### Scenario 1: New Company Setup
**Step 1:** Use `employee_upload_basic.csv`
- Export employee roster from current system
- Map columns to template
- Import all employees

**Step 2:** Add contributions gradually
- Use Contributions page UI to add elections as employees enroll
- OR export benefits data and use `employee_upload_with_contributions.csv`

### Scenario 2: Migrating from Another System
**Option A - Full Migration:**
1. Export all data from current system
2. Use `employee_upload_full.csv` template
3. One-time bulk import with everything

**Option B - Phased Migration:**
1. Start with `employee_upload_basic.csv`
2. Verify accuracy
3. Add benefits using `employee_upload_with_contributions.csv`
4. Fine-tune details using UI

### Scenario 3: Ongoing Maintenance
- New hires: Add single row to basic template and upload
- Benefits changes: Use Contributions page Edit button
- Terminations: Update with Term Date and Status = "Terminated"

---

## File Placement

### Upload Location
```
/backend/data/paylocity_uploads/
```
Place your CSV files here for processing.

### After Processing
Processed files are automatically moved to:
```
/backend/data/processed/
```
This prevents re-processing the same file.

---

## Troubleshooting

### Problem: File not processing
**Solutions:**
- Check file is in `/backend/data/paylocity_uploads/`
- Verify file extension is `.csv` or `.xlsx`
- Check file isn't open in Excel
- Ensure Employee Id column exists

### Problem: Some employees skipped
**Cause:** Missing or invalid Employee Id
**Solution:** Check console output for specific row numbers

### Problem: Dates not importing
**Cause:** Wrong date format
**Solution:** Use YYYY-MM-DD format (e.g., 2020-01-15)

### Problem: Contribution limits exceeded
**Note:** The UI validates limits, but CSV import does not
**Solution:** Manually verify amounts before upload

---

## Need Help?

Check the application logs for detailed import results:
```bash
python app/services/paylocity_ingest.py
```

Output will show:
- ✓ Files processed successfully
- → Number of employees imported/updated
- → Rows skipped (with reasons)
- ❌ Errors (with details)

---

## 2025 IRS Contribution Limits Reference

| Account Type | Annual Limit | Monthly Limit | Notes |
|-------------|--------------|---------------|-------|
| HSA Individual | $4,300 | $358.33 | Age 55+ add $1,000/year |
| HSA Family | $8,550 | $712.50 | Age 55+ add $1,000/year |
| Healthcare FSA | $3,200 | $266.67 | Cannot combine with HSA |
| Dependent Care FSA | $5,000 | $416.67 | Can combine with HSA or Healthcare FSA |
| 401(k) | $23,500 | $1,958.33 | Age 50+ add $7,500/year |

**Important:** These limits are for 2025. Update annually!

---

## Questions?

- Template issues? Check field definitions above
- Import errors? Review troubleshooting section
- Need custom fields? Contact support to extend the data model
