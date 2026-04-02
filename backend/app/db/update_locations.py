"""Update employee locations to include state/country information for mapping."""
import sqlite3
import os
import random
import logging

logger = logging.getLogger(__name__)

# Get the database path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
db_path = os.path.join(backend_dir, "data", "hr_dashboard.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# US States with major cities (for remote employees)
US_STATES = {
    "California": ["San Francisco", "Los Angeles", "San Diego", "Sacramento"],
    "Texas": ["Austin", "Houston", "Dallas", "San Antonio"],
    "New York": ["New York City", "Buffalo", "Rochester", "Albany"],
    "Florida": ["Miami", "Tampa", "Orlando", "Jacksonville"],
    "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver"],
    "Colorado": ["Denver", "Boulder", "Colorado Springs", "Fort Collins"],
    "Arizona": ["Phoenix", "Tucson", "Scottsdale", "Mesa"],
    "Oregon": ["Portland", "Eugene", "Salem", "Bend"],
    "Massachusetts": ["Boston", "Cambridge", "Worcester", "Springfield"],
    "Illinois": ["Chicago", "Aurora", "Naperville", "Peoria"],
    "Georgia": ["Atlanta", "Savannah", "Augusta", "Columbus"],
    "North Carolina": ["Charlotte", "Raleigh", "Durham", "Greensboro"],
    "Utah": ["Salt Lake City", "Provo", "Park City", "Ogden"],
    "Nevada": ["Las Vegas", "Reno", "Henderson", "Carson City"],
    "Pennsylvania": ["Philadelphia", "Pittsburgh", "Harrisburg", "Allentown"],
}

# International countries with cities
INTERNATIONAL = {
    "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary"],
    "United Kingdom": ["London", "Manchester", "Edinburgh", "Birmingham"],
    "Germany": ["Berlin", "Munich", "Hamburg", "Frankfurt"],
    "France": ["Paris", "Lyon", "Marseille", "Toulouse"],
    "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth"],
    "India": ["Bangalore", "Mumbai", "Delhi", "Hyderabad"],
    "Mexico": ["Mexico City", "Guadalajara", "Monterrey", "Cancun"],
    "Spain": ["Madrid", "Barcelona", "Valencia", "Seville"],
    "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
    "Brazil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
}

# Get all employees
cursor.execute("SELECT employee_id, location FROM employees")
employees = cursor.fetchall()

logger.info(f"Updating locations for {len(employees)} employees...")

# Distribute employees across US states and international locations
# 70% US, 30% International for a remote company
us_count = int(len(employees) * 0.70)
international_count = len(employees) - us_count

us_states = list(US_STATES.keys())
countries = list(INTERNATIONAL.keys())

updated_count = 0

for i, (emp_id, old_location) in enumerate(employees):
    if i < us_count:
        # US employee
        state = random.choice(us_states)
        city = random.choice(US_STATES[state])
        new_location = f"{city}, {state}"
    else:
        # International employee
        country = random.choice(countries)
        city = random.choice(INTERNATIONAL[country])
        new_location = f"{city}, {country}"

    cursor.execute(
        "UPDATE employees SET location = ? WHERE employee_id = ?",
        (new_location, emp_id)
    )
    updated_count += 1

    if updated_count % 50 == 0:
        logger.info(f"Updated {updated_count} employees...")

# Commit changes
conn.commit()

# Show distribution
logger.info(f"\n Updated {updated_count} employee locations")
logger.info("Distribution:")

# US States
cursor.execute("""
    SELECT
        SUBSTR(location, INSTR(location, ', ') + 2) as state,
        COUNT(*) as count
    FROM employees
    WHERE location LIKE '%,%' AND location NOT LIKE '%United Kingdom%'
        AND location NOT LIKE '%Canada%' AND location NOT LIKE '%Germany%'
        AND location NOT LIKE '%France%' AND location NOT LIKE '%Australia%'
        AND location NOT LIKE '%India%' AND location NOT LIKE '%Mexico%'
        AND location NOT LIKE '%Spain%' AND location NOT LIKE '%Netherlands%'
        AND location NOT LIKE '%Brazil%'
    GROUP BY state
    ORDER BY count DESC
""")
us_results = cursor.fetchall()

logger.info("US States:")
for state, count in us_results:
    logger.info(f"{state}: {count} employees")

# International
cursor.execute("""
    SELECT
        SUBSTR(location, INSTR(location, ', ') + 2) as country,
        COUNT(*) as count
    FROM employees
    WHERE location LIKE '%United Kingdom%' OR location LIKE '%Canada%'
        OR location LIKE '%Germany%' OR location LIKE '%France%'
        OR location LIKE '%Australia%' OR location LIKE '%India%'
        OR location LIKE '%Mexico%' OR location LIKE '%Spain%'
        OR location LIKE '%Netherlands%' OR location LIKE '%Brazil%'
    GROUP BY country
    ORDER BY count DESC
""")
intl_results = cursor.fetchall()

logger.info("International:")
for country, count in intl_results:
    logger.info(f"{country}: {count} employees")

total_us = sum([count for _, count in us_results])
total_intl = sum([count for _, count in intl_results])
logger.info(f"\n Total US: {total_us} ({total_us/len(employees)*100:.1f}%)")
logger.info(f"Total International: {total_intl} ({total_intl/len(employees)*100:.1f}%)")

conn.close()
