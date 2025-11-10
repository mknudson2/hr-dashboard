# Market Compensation Data Integration Guide

## Current State: Internal Comparison Only

Currently, your compensation analysis compares employees **within your organization only**. The "market position" is calculated as:

```
Position = (Employee Salary - Department Min) / (Department Max - Department Min)
```

This tells you where someone sits relative to **other employees in your company**, not the actual job market.

---

## Setting Up Real Market Data

To get actual market salary comparisons, you now have several options:

### ✅ What We Just Built

We've created:
1. **`market_benchmarks` database table** - Stores salary survey data
2. **Market Data API** - RESTful endpoints to access and compare market data
3. **Sample data** - 13 job positions with realistic market benchmarks
4. **Comparison endpoint** - `/market-data/compare/{employee_id}` to compare any employee to market

### 📊 Option 1: Manual Data Entry (Recommended to Start)

**Best for**: Small to mid-sized companies, getting started with compensation analysis

**How it works**:
1. Purchase salary surveys or use free sources
2. Manually enter data into the `market_benchmarks` table
3. Update quarterly or semi-annually

**Data Sources (Free/Low-Cost)**:
- **Bureau of Labor Statistics (BLS)** - https://www.bls.gov/oes/
  - Free, nationwide data by occupation
  - Updated annually
  - Geographic breakdowns available

- **Glassdoor Know Your Worth** - https://www.glassdoor.com/Salaries/
  - Free salary data from employee submissions
  - Filter by location, company size, experience

- **Payscale Research Center** - https://www.payscale.com/research/
  - Free salary ranges by job title and location
  - Good for spot checks

**Sample SQL to Add Data**:
```sql
INSERT INTO market_benchmarks (
    job_title, job_family, job_level, location,
    percentile_25, percentile_50, percentile_75,
    average_base_salary, data_source, survey_year, is_active
) VALUES (
    'Software Engineer', 'Engineering', 'Mid', 'San Francisco, CA',
    135000, 160000, 190000,
    162000, 'Glassdoor 2024', 2024, 1
);
```

---

### 💰 Option 2: Professional Salary Surveys (Best for Accuracy)

**Best for**: Mid to large companies, highly regulated industries, competitive hiring

**Top Providers**:

1. **Mercer Compensation Surveys**
   - Website: https://www.mercer.com/our-thinking/career/compensation-surveys.html
   - Cost: $5,000 - $25,000+ annually
   - Coverage: 3,000+ organizations, 2,500+ jobs
   - Features: Industry-specific surveys, geographic cuts, custom reports
   - Best for: Enterprise companies

2. **Radford Global Compensation Database**
   - Website: https://radford.aon.com/
   - Cost: $8,000 - $30,000+ annually
   - Coverage: Technology, life sciences, sales
   - Features: Equity compensation data, global coverage
   - Best for: Tech companies, startups with equity

3. **WorldatWork Salary Budget Surveys**
   - Website: https://www.worldatwork.org/
   - Cost: Member discounts, $3,000 - $15,000
   - Coverage: General industry, benefits data
   - Best for: HR professionals, compensation planning

4. **Robert Half Salary Guide**
   - Website: https://www.roberthalf.com/salary-guide
   - Cost: Free (basic) / Custom reports available
   - Coverage: Accounting, finance, admin, tech
   - Best for: Finance and accounting roles

**How to Use**:
1. Subscribe to relevant survey(s)
2. Download data (usually Excel/CSV format)
3. Import into `market_benchmarks` table using our provided scripts
4. Update when new survey data is released (typically annually)

---

### 🔌 Option 3: Market Data APIs (Best for Automation)

**Best for**: Large companies, frequent comparisons, real-time data needs

**API Providers**:

1. **Salary.com CompAnalyst API**
   - Website: https://www.salary.com/companalyst/
   - Cost: Custom pricing (enterprise)
   - Features: Real-time data, job matching, market pricing
   - Integration: REST API

   Example usage:
   ```python
   import requests

   response = requests.get(
       'https://api.salary.com/v1/positions/match',
       headers={'Authorization': 'Bearer YOUR_API_KEY'},
       params={'title': 'Software Engineer', 'location': '94102'}
   )
   market_data = response.json()
   ```

2. **Payscale Insight Lab API**
   - Website: https://www.payscale.com/products/data/
   - Cost: Contact for pricing
   - Features: Real-time market pricing, pay equity analysis
   - Integration: REST API, webhooks

3. **LinkedIn Salary Insights API** (Limited Access)
   - Features: Salary data from LinkedIn profiles
   - Access: Partner program only
   - Best for: Companies already using LinkedIn Talent Solutions

**Integration Steps**:
1. Sign up for API access
2. Create a scheduled task to fetch/update market data
3. Store in `market_benchmarks` table
4. Run weekly or monthly updates

Example integration script:
```python
# backend/app/services/market_data_sync.py
import requests
from app.db.database import SessionLocal
from app.db.models import MarketBenchmark

def sync_market_data():
    db = SessionLocal()

    # Fetch from API
    response = requests.get(
        'https://api.yourprovider.com/benchmarks',
        headers={'Authorization': f'Bearer {API_KEY}'}
    )

    benchmarks = response.json()

    for benchmark in benchmarks:
        # Update or insert
        existing = db.query(MarketBenchmark).filter_by(
            job_title=benchmark['title'],
            location=benchmark['location']
        ).first()

        if existing:
            existing.percentile_50 = benchmark['median']
            existing.survey_year = 2024
        else:
            db.add(MarketBenchmark(**benchmark))

    db.commit()
    db.close()
```

---

### 🏢 Option 4: Custom Compensation Survey

**Best for**: Industry-specific roles, regional markets, unique positions

**Steps**:
1. Partner with industry associations or HR networks
2. Design survey questions
3. Collect data from peer companies
4. Analyze and publish results
5. Import into `market_benchmarks` table

**Tools**:
- SurveyMonkey
- Qualtrics
- Google Forms (basic)

---

## Using the Market Data API

### Available Endpoints

```bash
# Get all benchmarks
GET /market-data/benchmarks

# Filter benchmarks
GET /market-data/benchmarks?job_family=Engineering&location=California

# Get specific benchmark
GET /market-data/benchmarks/1

# Compare employee to market
GET /market-data/compare/1001

# Get unique job families
GET /market-data/job-families

# Get unique locations
GET /market-data/locations
```

### Example: Compare Employee to Market

```bash
curl http://localhost:8000/market-data/compare/1001
```

Response:
```json
{
  "employee": {
    "employee_id": "1001",
    "name": "John Smith",
    "position": "Software Engineer",
    "location": "San Francisco",
    "current_salary": 125000
  },
  "market_data": {
    "job_title": "Software Engineer",
    "location": "United States - National",
    "percentile_10": 75000,
    "percentile_25": 95000,
    "percentile_50": 120000,
    "percentile_75": 150000,
    "percentile_90": 180000,
    "data_source": "Glassdoor/BLS Composite 2024"
  },
  "comparison": {
    "market_percentile": "50-75th percentile (At Market)",
    "variance_from_median": 5000,
    "variance_percentage": 4.17,
    "recommendation": "Salary is competitive"
  }
}
```

---

## Updating the Frontend to Use Market Data

To show actual market comparisons in the compensation analysis:

1. **Create a new service** (`frontend/src/services/marketDataService.ts`):
```typescript
export const getEmployeeMarketComparison = async (employeeId: string) => {
  const response = await fetch(
    `http://localhost:8000/market-data/compare/${employeeId}`
  );
  return response.json();
};
```

2. **Update CompensationAnalysis component** to fetch market data
3. **Add market positioning badges** showing percentile vs. external market
4. **Create market comparison charts** (internal vs. external)

---

## Best Practices

### 📅 Update Frequency
- **Salary surveys**: Update annually or when new data is published
- **APIs**: Update monthly or quarterly
- **Manual entry**: Update at least twice per year

### 🎯 Data Quality
- Always note the data source and survey year
- Track sample sizes for statistical validity
- Consider geographic cost-of-living adjustments
- Account for company size and industry differences

### 🔒 Data Security
- Store API keys in environment variables
- Limit access to market data to HR/Compensation team
- Log all market data comparisons for audit trails

### 💡 Using the Data
1. **Pay equity analysis**: Compare similar roles
2. **Compensation planning**: Set salary ranges
3. **Retention**: Identify underpaid employees
4. **Recruiting**: Competitive offer creation
5. **Budgeting**: Forecast salary increases

---

## Recommended Approach

**For most companies, we recommend this progression**:

1. **Month 1-2**: Start with free data (BLS, Glassdoor)
   - Enter 10-20 key job titles
   - Test the API and comparisons
   - Get comfortable with the process

2. **Month 3-6**: Purchase 1-2 targeted surveys
   - Focus on your core job families
   - Import data quarterly
   - Train HR team on using the tool

3. **Month 6+**: Consider API integration
   - If you have >500 employees
   - If compensation planning is frequent
   - If you need real-time data

---

## Next Steps

1. ✅ **Database is ready** - `market_benchmarks` table created
2. ✅ **API is live** - Endpoints available at `/market-data/*`
3. ✅ **Sample data loaded** - 13 benchmark positions

**To get started**:
1. Choose your data source (see options above)
2. Collect market data for your key positions
3. Run the import script or use the API
4. Test comparisons: `curl http://localhost:8000/market-data/compare/{employee_id}`
5. Update frontend to display market comparisons

**Need help?** The sample script at `backend/app/db/populate_market_benchmarks.py` shows exactly how to format and insert data.

---

## Cost Comparison

| Source | Annual Cost | Best For | Data Freshness |
|--------|-------------|----------|----------------|
| BLS / Glassdoor | Free | Getting started | Annual |
| Robert Half Guide | Free - $5K | Finance/Accounting | Annual |
| Mercer Surveys | $5K - $25K | Enterprise | Annual |
| Radford | $8K - $30K | Tech/Startups | Annual |
| Salary.com API | $15K - $50K+ | Large companies | Real-time |
| Payscale API | Contact | Automation | Real-time |

---

## Questions?

Common questions answered:

**Q: Do I need an API subscription?**
A: No! Start with free data from BLS or Glassdoor. Manual entry works great for most companies.

**Q: How often should I update market data?**
A: At minimum, annually. Quarterly is better if you're in a competitive market.

**Q: Can I use data from multiple sources?**
A: Yes! Store each source separately and choose the most relevant for each comparison.

**Q: What if I can't find exact job title matches?**
A: The API does fuzzy matching. You can also create custom mappings in the database.

**Q: Is this data legally compliant?**
A: Yes, using published salary surveys and market data is standard practice. Just ensure you're not sharing individual employee data externally.
