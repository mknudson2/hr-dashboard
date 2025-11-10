# Pre-Upload Data Validation Checklist

Use this checklist before uploading your employee data to catch common issues.

## 📋 File Format Checks

- [ ] File is saved as `.csv` format (not `.xlsx` or `.xls`)
- [ ] File encoding is UTF-8
- [ ] File is not currently open in Excel or other programs
- [ ] File is placed in `/backend/data/paylocity_uploads/`
- [ ] No special characters in filename (use letters, numbers, underscore only)

---

## 📋 Required Field Checks

- [ ] Every row has an `Employee Id`
- [ ] All Employee IDs are unique (no duplicates)
- [ ] Every row has `First Name`
- [ ] Every row has `Last Name`
- [ ] Every row has `Status` (Active, Terminated, etc.)
- [ ] Every row has `Hire Date`

---

## 📋 Date Format Checks

All dates should be: **YYYY-MM-DD**

Example: `2020-01-15` ✅

- [ ] Hire Date format is correct
- [ ] Term Date format is correct (if present)
- [ ] Birth Date format is correct (if present)
- [ ] No dates like `1/15/2020` or `01-15-2020` ❌

---

## 📋 Number Format Checks

- [ ] No currency symbols (no `$` or commas)
- [ ] Contribution amounts are **monthly** (not annual)
- [ ] Numbers use decimal point `.` not comma `,`
- [ ] Example: `150.00` ✅ not `$150` or `150,00` ❌

---

## 📋 Contribution Validation

### HSA Checks
- [ ] HSA amounts don't exceed monthly limits:
  - Individual: $358/month maximum
  - Family: $712/month maximum
  - Age 55+: Add $83/month allowed
- [ ] Employees with HSA do NOT have Healthcare FSA
- [ ] Employees with HSA have Medical Tier populated

### FSA Checks
- [ ] Healthcare FSA doesn't exceed $266/month
- [ ] Dependent Care FSA doesn't exceed $416/month
- [ ] No employee has both HSA and Healthcare FSA

### 401(k) Checks
- [ ] Employee contributions don't exceed $1,958/month
- [ ] Contribution percentages make sense (typically 3-15%)
- [ ] Employer match is reasonable (typically 3-6%)

---

## 📋 Medical Tier Values

If using Medical Tier field, ensure values are exactly:

- [ ] `Employee Only` ✅
- [ ] `Employee + Spouse` ✅
- [ ] `Employee + Children` ✅
- [ ] `Family` ✅
- [ ] Not: "Individual", "Self Only", "EE Only", etc. ❌

---

## 📋 Status Values

Recommended status values:

- [ ] `Active` - Current employees
- [ ] `Terminated` - Past employees
- [ ] `Leave of Absence` - Temporarily away
- [ ] Consistent capitalization across all rows

---

## 📋 Employment Type Values

If using Type field, recommended values:

- [ ] `FT` or `Full Time`
- [ ] `PT` or `Part Time`
- [ ] `Contract` or `Contractor`
- [ ] `Temp` or `Temporary`
- [ ] Consistent format across all rows

---

## 📋 Data Consistency Checks

### Terminated Employees
- [ ] Terminated employees have `Term Date` filled in
- [ ] Terminated employees have `Termination Type` filled in
- [ ] Term Date is after Hire Date

### Wages
- [ ] Annual wages are reasonable (e.g., 30,000 - 200,000)
- [ ] Hourly wages are reasonable (e.g., 15 - 100)
- [ ] FT employees typically have higher wages than PT

### Contributions Make Sense
- [ ] Contribution amounts are proportional to wages
- [ ] Higher earners typically have higher 401k contributions
- [ ] Part-time employees may have lower benefits

---

## 📋 Column Header Checks

### Basic Template Headers:
```csv
Employee Id,Preferred/First Name,Last Name,Type,Worked CostCenter,Worked Department,Worked Team,Hire Date,Term Date,Termination Type,Status,Location,Rate
```

### With Contributions Headers (add these):
```csv
...,Position,Supervisor,Medical Tier,HSA EE Monthly,HSA ER Monthly,FSA Monthly,DCFSA Monthly,401k Monthly,Medical Plan,Dental Plan,Vision Plan
```

- [ ] Header row is present (first row)
- [ ] No extra spaces in header names
- [ ] Headers match template exactly (case-sensitive)

---

## 📋 Sample Data Test

Before full upload:

- [ ] Created test file with 5-10 employees
- [ ] Test import completed successfully
- [ ] Verified data appears correctly in UI
- [ ] Checked Employees page
- [ ] Checked Contributions page
- [ ] Test data can be edited via UI

---

## 📋 Backup Safety

Before large import:

- [ ] Created backup of current database
- [ ] Know how to restore from backup if needed
- [ ] Have copy of original source data

**Backup command:**
```bash
cp backend/data/hr_dashboard.db backend/data/hr_dashboard.db.backup-$(date +%Y%m%d)
```

---

## 📋 Ready to Upload?

### Final Checks:
- [ ] ✅ All checklist items above are complete
- [ ] ✅ File is in `/backend/data/paylocity_uploads/`
- [ ] ✅ Backup created
- [ ] ✅ Test import successful

### Run Import:
```bash
cd /Users/michaelknudson/Desktop/hr-dashboard/backend
python app/services/paylocity_ingest.py
```

### Watch for:
- ✓ Files processed successfully
- → X employees imported/updated
- ❌ Any errors or skipped rows

---

## 🚨 If Something Goes Wrong

### Import failed completely:
1. Check error message in console
2. Review your CSV file
3. Fix the issue
4. Try again (it's safe to re-run)

### Some rows skipped:
1. Console will tell you which rows and why
2. Common reasons:
   - Missing Employee Id
   - Invalid date format
   - File encoding issue
3. Fix those specific rows
4. Re-upload

### Need to undo:
```bash
# Restore from backup
cp backend/data/hr_dashboard.db.backup backend/data/hr_dashboard.db
```

---

## 📊 Expected Results

### After Successful Upload:

**Employees Page:**
- All employees appear in the list
- Names, departments, and dates are correct
- Can view each employee's detail page

**Contributions Page:**
- Employees with benefits show in table
- Summary cards show correct participant counts
- Can click Edit to modify any employee

**Dashboard:**
- Headcount reflects total employees
- Analytics show correct distributions

---

## 💡 Pro Tips

1. **Excel Caution**: Excel sometimes auto-formats dates and numbers. Save as CSV carefully.

2. **UTF-8 Encoding**: If you have special characters (é, ñ, etc.), ensure UTF-8 encoding.

3. **Empty Fields**: Leave empty fields blank, don't use "N/A", "None", or 0.

4. **Consistent Formats**: Use the same format for similar fields (all dates, all departments, etc.)

5. **Test First**: Always test with a small file before importing hundreds of employees.

---

## ✅ You're Ready!

If you've checked all these items, your import should go smoothly.

**Happy importing!** 🎉

For questions or issues, see **README.md** for detailed troubleshooting.
