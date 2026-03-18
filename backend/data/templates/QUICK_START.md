# Quick Start Guide - Employee Data Upload

## 🚀 In 3 Steps

### Step 1: Choose Your Template
```
📄 employee_upload_basic.csv          → Just getting started
📄 employee_upload_with_contributions.csv  → Have benefits data
📄 employee_upload_full.csv           → Complete migration
```

### Step 2: Fill In Your Data
- Open template in Excel or Google Sheets
- Replace sample data with your employees
- Save as CSV

### Step 3: Upload
```bash
# Place file here:
/backend/data/paylocity_uploads/your_file.csv

# Then run:
python app/services/paylocity_ingest.py
```

---

## ✅ Minimum Required Fields

**You MUST have these:**
- Employee Id
- First Name
- Last Name
- Status (Active/Terminated)
- Hire Date (YYYY-MM-DD)

**Everything else is optional!**

---

## 💡 Pro Tips

### Tip 1: Start Small
Upload 5 test employees first, then do the full import.

### Tip 2: Dates Must Be
```
✅ 2020-01-15
❌ 1/15/2020
❌ 01-15-2020
```

### Tip 3: Contributions = Monthly Amounts
```
If employee contributes $6,000/year to 401k:
Enter: 500  (not 6000)
```

### Tip 4: Medical Tier Options
```
Employee Only
Employee + Spouse
Employee + Children
Family
```

### Tip 5: Can't Have Both
❌ HSA + Healthcare FSA together
✅ HSA + Dependent Care FSA
✅ Healthcare FSA + Dependent Care FSA

---

## 🔢 2025 Monthly Contribution Limits

| Account | Monthly Max | Annual Max |
|---------|-------------|------------|
| HSA (Individual) | $358 | $4,300 |
| HSA (Family) | $712 | $8,550 |
| Healthcare FSA | $266 | $3,200 |
| Dependent Care | $416 | $5,000 |

---

## 🆘 Common Problems

### "Employee already exists"
→ That's OK! It will update the existing record.

### "File not found"
→ Check it's in `/backend/data/paylocity_uploads/`

### "Invalid date format"
→ Use YYYY-MM-DD (e.g., 2020-01-15)

### "Missing Employee Id"
→ Every row needs a unique Employee Id

---

## 📝 Example: Minimal Upload

```csv
Employee Id,Preferred/First Name,Last Name,Status,Hire Date
1000,John,Doe,Active,2020-01-15
1001,Jane,Smith,Active,2019-06-01
```

That's it! Upload this and both employees will appear in the system.

---

## 📝 Example: With Contributions

```csv
Employee Id,First Name,Last Name,Status,Hire Date,Medical Tier,HSA EE Monthly,401k Monthly
1000,John,Doe,Active,2020-01-15,Employee Only,150,500
1001,Jane,Smith,Active,2019-06-01,Family,300,600
```

Now they have HSA and 401k elections too!

---

## ✨ After Upload

### Check the system:
1. **Employees Page** → See all imported employees
2. **Contributions Page** → See who has benefits enrolled
3. **Click "Edit"** → Add/update any missing info

---

## Need More Details?

See **README.md** for:
- Complete field definitions
- All template options
- Troubleshooting guide
- Advanced scenarios

---

## 🎯 Your First Import Checklist

- [ ] Picked the right template
- [ ] Filled in employee data
- [ ] Dates in YYYY-MM-DD format
- [ ] No $ symbols in numbers
- [ ] Saved as CSV (not .xlsx)
- [ ] File in upload folder
- [ ] Ready to import!

```bash
python app/services/paylocity_ingest.py
```

**You've got this!** 🚀
