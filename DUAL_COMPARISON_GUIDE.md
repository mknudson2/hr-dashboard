# Dual Compensation Comparison - User Guide

## Overview

Your compensation analysis now shows **TWO types of comparisons side-by-side**:

### 🏢 Internal Position (Within Company)
Compares employees to **each other** within your organization
- Shows pay equity and fairness internally
- Identifies who's in the top/bottom quartile of your company
- Highlights internal pay disparities

### 🌍 External Market (Industry Benchmarks)
Compares employees to **external market data** from salary surveys
- Shows if you're paying competitively vs. the market
- Based on real salary survey data
- Helps with retention and recruiting

---

## What You'll See

### In the Compensation Analytics Tab

**1. Info Banner (Blue)**
- Explains the difference between internal and external comparisons
- Shows how many market benchmarks are loaded
- Indicates the data source (e.g., "Glassdoor/BLS Composite 2024")

**2. Employee Table with Dual Columns**

Each employee row now shows:
- **Salary** - Their current annual wage
- **Internal Position** - Where they rank within the company:
  - 🔴 Bottom Quartile (lowest 25%)
  - 🔵 Below Average (25-50%)
  - 🔵 Above Average (50-75%)
  - 🟢 Top Quartile (top 25%)

- **External Market** - How they compare to market data:
  - 🔴 Below Market (<25th percentile)
  - 🟡 At Market (Low) (25-50th percentile)
  - 🟢 At Market (50-75th percentile)
  - 🔵 Above Market (>75th percentile)
  - ⚪ No market data (if no matching benchmark found)

- **vs Median** - Percentage above/below company median

---

## How to Interpret the Results

### Example 1: Internal Equity Issue
```
Employee: Jane Smith
Salary: $95,000
Internal Position: Bottom Quartile 🔴
External Market: At Market 🟢 (50-75th percentile)
```
**Interpretation:** Jane is paid fairly compared to the market, but is in the lowest 25% within your company. This could indicate:
- Other employees are overpaid relative to market
- Jane is a newer hire in a department with long-tenured employees
- Potential internal equity concern

**Action:** Review if adjustment needed for internal fairness

---

### Example 2: Market Competitiveness Issue
```
Employee: John Doe
Salary: $85,000
Internal Position: Above Average 🔵
External Market: Below Market 🔴 (<25th percentile)
```
**Interpretation:** John is paid well relative to peers internally, but below market rates externally.

**Risk:** High flight risk - competitor could easily poach him with market-rate offer

**Action:** Consider market adjustment to retain talent

---

### Example 3: Well-Balanced Compensation
```
Employee: Sarah Johnson
Salary: $120,000
Internal Position: Above Average 🔵
External Market: At Market 🟢 (50-75th percentile)
```
**Interpretation:** Sarah is paid fairly both internally and externally.

**Action:** No immediate action needed

---

### Example 4: Overpaid Relative to Market
```
Employee: Mike Brown
Salary: $145,000
Internal Position: Top Quartile 🟢
External Market: Above Market 🔵 (>75th percentile)
```
**Interpretation:** Mike is in the top 25% internally and above the 75th percentile externally.

**Considerations:**
- May be a high performer deserving premium pay
- Could indicate salary compression at lower levels
- May want to slow future increases to let market catch up

---

## Use Cases

### 1. Annual Compensation Planning
Review both columns to:
- Fix internal equity gaps (people doing same job, different pay)
- Ensure competitive market positioning
- Prioritize raises for below-market employees

### 2. Retention Analysis
Employees who are **"Below Market"** externally are highest flight risk, even if they're paid well internally.

### 3. Offer Negotiation
Use external market data to:
- Set competitive offer ranges for new hires
- Justify offers to candidates
- Ensure new hires don't create internal equity issues

### 4. Pay Equity Audits
Internal position shows:
- If certain groups are systematically in bottom quartiles
- Pay compression issues
- Outliers that need investigation

---

## Current Market Data

### What's Loaded
We've loaded **13 benchmark positions** with data from:
- Glassdoor Economic Research
- Bureau of Labor Statistics (BLS)
- Robert Half Salary Guide
- Payscale Salary Reports

### Positions Covered
- **Engineering:** Software Engineer, Senior SWE, Engineering Manager
- **Finance:** Financial Analyst, Senior FA, Finance Manager
- **Sales:** Sales Rep, Senior Sales Rep, Sales Manager
- **HR:** HR Generalist, HR Manager
- **Marketing:** Marketing Specialist, Marketing Manager

### Matching Logic
The system automatically matches employees to benchmarks by:
1. **Job title similarity** - Finds best matching job title
2. **Location** (coming soon) - Can filter by geography
3. **Experience level** (coming soon) - Can match by years of experience

If no match is found, the external market column shows **"No market data"**

---

## Adding More Market Data

### Free Sources (Start Here)

**1. Bureau of Labor Statistics**
- Visit: https://www.bls.gov/oes/
- Search by occupation code (SOC)
- Download median and percentile data
- Add to database using SQL or import script

**2. Glassdoor**
- Visit: https://www.glassdoor.com/Salaries/
- Search job title + location
- Record 25th, 50th, 75th percentiles
- Manually add to database

**3. Payscale**
- Visit: https://www.payscale.com/research/
- Search position
- Note salary ranges by percentile
- Add to database

### Adding Data Manually

Use the market data API or SQL:

```sql
INSERT INTO market_benchmarks (
    job_title, job_family, job_level, location,
    percentile_25, percentile_50, percentile_75,
    average_base_salary, data_source, survey_year, is_active
) VALUES (
    'Product Manager',
    'Product',
    'Mid',
    'United States - National',
    105000,
    125000,
    150000,
    127000,
    'Glassdoor 2024',
    2024,
    true
);
```

### Professional Sources (for larger scale)

See `MARKET_DATA_GUIDE.md` for details on:
- Mercer Compensation Surveys ($5K-$25K/year)
- Radford Global Database ($8K-$30K/year)
- Salary.com CompAnalyst API (enterprise pricing)
- Custom industry surveys

---

## Best Practices

### ✅ Do
- Review both comparisons together
- Prioritize below-market employees for raises
- Use internal position to ensure equity
- Update market data at least annually
- Document reasons for outliers

### ❌ Don't
- Focus only on one comparison type
- Ignore "No market data" employees
- Use outdated benchmark data (>2 years old)
- Automatically match all salaries to 50th percentile
- Ignore internal equity when chasing market rates

---

## FAQ

**Q: What if someone is "Above Average" internally but "Below Market" externally?**
A: This is common and indicates your company may be paying below market overall. Consider:
1. Market adjustment for the individual
2. Company-wide compensation review
3. Risk of losing talent to competitors

**Q: Should I match everyone to the market median?**
A: No. The 50th percentile is just the middle. Consider:
- Performance level (top performers should be >50th percentile)
- Years of experience
- Geographic location
- Budget constraints

**Q: What if there's no external market data for a role?**
A: Options:
1. Add benchmark data from free sources
2. Use a similar role as proxy
3. Focus on internal equity comparison
4. Request custom benchmark from HR survey provider

**Q: How often should I update market data?**
A: Best practice:
- **Annually:** Minimum, when planning comp cycles
- **Quarterly:** For competitive markets or high-turnover roles
- **Real-time:** Using APIs (enterprise option)

**Q: Can I filter or customize the comparisons?**
A: Yes! Use the department filter to:
- Compare within specific departments
- Analyze pay equity by team
- Focus on high-priority groups

---

## Technical Details

### Data Flow
1. Frontend fetches employees from `/employees` endpoint
2. Frontend fetches market benchmarks from `/market-data/benchmarks`
3. For each employee:
   - Calculates internal position based on department salary range
   - Finds matching market benchmark by job title
   - Compares salary to benchmark percentiles
4. Displays both comparisons in table

### Performance
- Market data cached on page load
- Matching done client-side for speed
- Only top 20 employees shown by default

### Customization
See the code at:
- Frontend: `frontend/src/components/compensation/CompensationAnalysis.tsx`
- Backend: `backend/app/api/market_data.py`
- Database: `backend/app/db/models.py` (MarketBenchmark model)

---

## Getting Started Checklist

- [x] Market benchmark database table created
- [x] Market data API endpoints deployed
- [x] Sample benchmark data loaded (13 positions)
- [x] Dual comparison UI implemented
- [ ] Add benchmarks for your specific job titles
- [ ] Review and validate salary matching logic
- [ ] Train HR team on interpreting both comparisons
- [ ] Set up quarterly market data refresh process

---

## Support

For questions about:
- **Adding market data:** See `MARKET_DATA_GUIDE.md`
- **API endpoints:** Check `/market-data/` routes
- **Custom matching logic:** Review `getExternalMarketPosition()` function

