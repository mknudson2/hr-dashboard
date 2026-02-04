"""
Populate market_benchmarks table with sample salary data

This data is based on publicly available salary surveys and reports from:
- Bureau of Labor Statistics (BLS)
- Glassdoor Economic Research
- Payscale Salary Reports
- Robert Half Salary Guide

NOTE: This is sample data for demonstration. For production use, you should:
1. Subscribe to professional salary surveys (Mercer, Radford, WorldatWork)
2. Use market data APIs (Salary.com, Payscale API)
3. Conduct your own compensation surveys
"""

import sqlite3
import os

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

print(f"Populating market benchmarks at: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Sample market benchmark data based on 2025 US market data
market_benchmarks = [
    # Engineering roles
    {
        "job_title": "Software Engineer",
        "job_family": "Engineering",
        "job_level": "Mid",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 75000,
        "p25": 95000,
        "p50": 120000,
        "p75": 150000,
        "p90": 180000,
        "avg_base": 122000,
        "avg_total": 145000,
        "data_source": "Glassdoor/BLS Composite 2025",
        "survey_year": 2025,
        "sample_size": 12500,
        "years_exp_min": 2,
        "years_exp_max": 5,
        "education": "Bachelor's Degree",
        "industry": "Technology",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Senior Software Engineer",
        "job_family": "Engineering",
        "job_level": "Senior",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 110000,
        "p25": 140000,
        "p50": 165000,
        "p75": 195000,
        "p90": 225000,
        "avg_base": 168000,
        "avg_total": 205000,
        "data_source": "Glassdoor/BLS Composite 2025",
        "survey_year": 2025,
        "sample_size": 8200,
        "years_exp_min": 5,
        "years_exp_max": 10,
        "education": "Bachelor's Degree",
        "industry": "Technology",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Engineering Manager",
        "job_family": "Engineering",
        "job_level": "Manager",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 130000,
        "p25": 155000,
        "p50": 180000,
        "p75": 210000,
        "p90": 245000,
        "avg_base": 182000,
        "avg_total": 225000,
        "data_source": "Glassdoor/BLS Composite 2025",
        "survey_year": 2025,
        "sample_size": 3500,
        "years_exp_min": 7,
        "years_exp_max": 15,
        "education": "Bachelor's Degree",
        "industry": "Technology",
        "company_size": "All Sizes"
    },
    # Finance roles
    {
        "job_title": "Financial Analyst",
        "job_family": "Finance",
        "job_level": "Mid",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 55000,
        "p25": 65000,
        "p50": 75000,
        "p75": 88000,
        "p90": 105000,
        "avg_base": 77000,
        "avg_total": 85000,
        "data_source": "Robert Half Salary Guide 2025",
        "survey_year": 2025,
        "sample_size": 5200,
        "years_exp_min": 2,
        "years_exp_max": 5,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Senior Financial Analyst",
        "job_family": "Finance",
        "job_level": "Senior",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 75000,
        "p25": 88000,
        "p50": 100000,
        "p75": 118000,
        "p90": 135000,
        "avg_base": 102000,
        "avg_total": 115000,
        "data_source": "Robert Half Salary Guide 2025",
        "survey_year": 2025,
        "sample_size": 3800,
        "years_exp_min": 5,
        "years_exp_max": 10,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Finance Manager",
        "job_family": "Finance",
        "job_level": "Manager",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 95000,
        "p25": 110000,
        "p50": 128000,
        "p75": 150000,
        "p90": 175000,
        "avg_base": 130000,
        "avg_total": 152000,
        "data_source": "Robert Half Salary Guide 2025",
        "survey_year": 2025,
        "sample_size": 2100,
        "years_exp_min": 7,
        "years_exp_max": 15,
        "education": "Bachelor's/MBA",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    # Sales roles
    {
        "job_title": "Sales Representative",
        "job_family": "Sales",
        "job_level": "Mid",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 45000,
        "p25": 55000,
        "p50": 68000,
        "p75": 85000,
        "p90": 105000,
        "avg_base": 70000,
        "avg_total": 95000,  # Includes commission
        "data_source": "Payscale 2025",
        "survey_year": 2025,
        "sample_size": 8900,
        "years_exp_min": 2,
        "years_exp_max": 5,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Senior Sales Representative",
        "job_family": "Sales",
        "job_level": "Senior",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 65000,
        "p25": 80000,
        "p50": 95000,
        "p75": 115000,
        "p90": 140000,
        "avg_base": 98000,
        "avg_total": 135000,  # Includes commission
        "data_source": "Payscale 2025",
        "survey_year": 2025,
        "sample_size": 5400,
        "years_exp_min": 5,
        "years_exp_max": 10,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Sales Manager",
        "job_family": "Sales",
        "job_level": "Manager",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 85000,
        "p25": 100000,
        "p50": 118000,
        "p75": 140000,
        "p90": 165000,
        "avg_base": 120000,
        "avg_total": 160000,  # Includes bonuses
        "data_source": "Payscale 2025",
        "survey_year": 2025,
        "sample_size": 3200,
        "years_exp_min": 7,
        "years_exp_max": 15,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    # HR roles
    {
        "job_title": "HR Generalist",
        "job_family": "Human Resources",
        "job_level": "Mid",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 48000,
        "p25": 55000,
        "p50": 63000,
        "p75": 72000,
        "p90": 82000,
        "avg_base": 64000,
        "avg_total": 68000,
        "data_source": "BLS & SHRM 2025",
        "survey_year": 2025,
        "sample_size": 4100,
        "years_exp_min": 2,
        "years_exp_max": 5,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    {
        "job_title": "HR Manager",
        "job_family": "Human Resources",
        "job_level": "Manager",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 72000,
        "p25": 85000,
        "p50": 98000,
        "p75": 115000,
        "p90": 132000,
        "avg_base": 100000,
        "avg_total": 110000,
        "data_source": "BLS & SHRM 2025",
        "survey_year": 2025,
        "sample_size": 2900,
        "years_exp_min": 5,
        "years_exp_max": 12,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    # Marketing roles
    {
        "job_title": "Marketing Specialist",
        "job_family": "Marketing",
        "job_level": "Mid",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 45000,
        "p25": 54000,
        "p50": 63000,
        "p75": 74000,
        "p90": 87000,
        "avg_base": 65000,
        "avg_total": 70000,
        "data_source": "Glassdoor 2025",
        "survey_year": 2025,
        "sample_size": 6200,
        "years_exp_min": 2,
        "years_exp_max": 5,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
    {
        "job_title": "Marketing Manager",
        "job_family": "Marketing",
        "job_level": "Manager",
        "location": "United States - National",
        "metro_area": None,
        "region": "National",
        "p10": 70000,
        "p25": 85000,
        "p50": 98000,
        "p75": 115000,
        "p90": 135000,
        "avg_base": 100000,
        "avg_total": 112000,
        "data_source": "Glassdoor 2025",
        "survey_year": 2025,
        "sample_size": 4300,
        "years_exp_min": 5,
        "years_exp_max": 12,
        "education": "Bachelor's Degree",
        "industry": "All Industries",
        "company_size": "All Sizes"
    },
]

try:
    # Insert market benchmarks
    print(f"\nInserting {len(market_benchmarks)} market benchmarks...")

    for idx, benchmark in enumerate(market_benchmarks, 1):
        cursor.execute("""
            INSERT INTO market_benchmarks (
                job_title, job_family, job_level, location, metro_area, region,
                percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
                average_base_salary, average_total_comp,
                data_source, survey_year, survey_sample_size,
                years_experience_min, years_experience_max,
                education_level, industry, company_size, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            benchmark["job_title"],
            benchmark["job_family"],
            benchmark["job_level"],
            benchmark["location"],
            benchmark["metro_area"],
            benchmark["region"],
            benchmark["p10"],
            benchmark["p25"],
            benchmark["p50"],
            benchmark["p75"],
            benchmark["p90"],
            benchmark["avg_base"],
            benchmark["avg_total"],
            benchmark["data_source"],
            benchmark["survey_year"],
            benchmark["sample_size"],
            benchmark["years_exp_min"],
            benchmark["years_exp_max"],
            benchmark["education"],
            benchmark["industry"],
            benchmark["company_size"],
            True
        ))
        print(f"  {idx}. {benchmark['job_title']} ({benchmark['job_level']}) - Median: ${benchmark['p50']:,}")

    # Commit changes
    conn.commit()
    print(f"\n✅ Successfully inserted {len(market_benchmarks)} market benchmarks!")

    # Show summary
    cursor.execute("SELECT COUNT(*) FROM market_benchmarks WHERE is_active = 1")
    total = cursor.fetchone()[0]
    print(f"\nTotal active benchmarks in database: {total}")

except Exception as e:
    conn.rollback()
    print(f"\n❌ Error inserting market benchmarks: {e}")
    raise

finally:
    conn.close()

print("\n" + "="*60)
print("NEXT STEPS:")
print("="*60)
print("\n1. API Endpoints available:")
print("   - GET  /market-data/benchmarks")
print("   - GET  /market-data/benchmarks/{id}")
print("   - GET  /market-data/compare/{employee_id}")
print("   - GET  /market-data/job-families")
print("   - GET  /market-data/locations")
print("   - GET  /market-data/job-levels")
print("\n2. Test the API:")
print("   curl http://localhost:8000/market-data/benchmarks")
print("\n3. Compare employee to market:")
print("   curl http://localhost:8000/market-data/compare/1001")
print("\n4. For production, consider:")
print("   - Subscribing to professional salary surveys (Mercer, Radford)")
print("   - Using market data APIs (Salary.com, Payscale, CompAnalyst)")
print("   - Conducting your own compensation surveys")
print("   - Updating benchmarks quarterly or semi-annually")
print("="*60)
