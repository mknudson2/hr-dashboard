"""
Test FMLA API Endpoints
Tests the complete API flow for FMLA notice generation

SECURITY NOTE: Never hardcode credentials in source code.
Set environment variables before running:
  export TEST_USERNAME=admin
  export TEST_PASSWORD=your_password
"""

import os
import requests
import json
from datetime import date, timedelta

# API base URL
BASE_URL = os.getenv("TEST_API_URL", "http://localhost:8000")

# Test credentials from environment variables (NEVER hardcode)
USERNAME = os.getenv("TEST_USERNAME")
PASSWORD = os.getenv("TEST_PASSWORD")

if not USERNAME or not PASSWORD:
    import pytest
    pytest.skip(
        "Test credentials not set. Set TEST_USERNAME and TEST_PASSWORD env vars.",
        allow_module_level=True,
    )


def test_fmla_api():
    """Test FMLA API endpoints"""

    print("=" * 80)
    print("TESTING FMLA API ENDPOINTS")
    print("=" * 80)

    # Step 1: Login to get auth token
    print("\n1. Authenticating...")
    try:
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": USERNAME, "password": PASSWORD}
        )

        if login_response.status_code != 200:
            print(f"✗ Login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            print("\n⚠️  Please update USERNAME and PASSWORD in test_fmla_api.py")
            return False

        auth_data = login_response.json()
        token = auth_data.get("access_token")
        print(f"✓ Authenticated successfully")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    except Exception as e:
        print(f"✗ Authentication error: {e}")
        print(f"\n⚠️  Make sure the backend server is running on {BASE_URL}")
        return False

    # Step 2: Check eligibility for a test employee
    print("\n2. Checking FMLA eligibility...")
    try:
        eligibility_request = {
            "employee_id": 1,
            "leave_start_date": (date.today() + timedelta(days=7)).isoformat()
        }

        response = requests.post(
            f"{BASE_URL}/fmla/check-eligibility",
            json=eligibility_request,
            headers=headers
        )

        if response.status_code == 200:
            eligibility = response.json()
            print(f"✓ Eligibility check successful")
            print(f"  Is Eligible: {eligibility['is_eligible']}")
            print(f"  Months Employed: {eligibility['months_employed']}")
            print(f"  Hours Worked: {eligibility['hours_worked_12months']}")
        else:
            print(f"✗ Eligibility check failed: {response.status_code}")
            print(f"   Response: {response.text}")
            if response.status_code == 404:
                print(f"\n⚠️  Employee ID 1 not found. Try a different employee_id.")
                return False

    except Exception as e:
        print(f"✗ Eligibility check error: {e}")
        return False

    # Step 3: Create FMLA notice
    print("\n3. Creating FMLA notice and generating WH-381 form...")
    try:
        today = date.today()
        leave_start = today + timedelta(days=7)
        leave_end = leave_start + timedelta(days=60)

        notice_request = {
            "employee_id": 1,
            "request_date": today.isoformat(),
            "leave_start_date": leave_start.isoformat(),
            "leave_end_date": leave_end.isoformat(),
            "leave_reason": "own_health",
            "family_relationship": None,
            "certification_required": True,
            "certification_type": "health_care_provider_employee",
            "certification_attached": False,
            "relationship_cert_required": False,
            "is_key_employee": False,
            "some_unpaid": True,
            "employer_requires_paid": True,
            "other_leave_arrangement": None,
            "internal_notes": "API test - created via automated test",
            "generate_notice": True
        }

        response = requests.post(
            f"{BASE_URL}/fmla/create-notice",
            json=notice_request,
            headers=headers
        )

        if response.status_code == 200:
            notice = response.json()
            notice_id = notice['id']
            print(f"✓ Notice created successfully")
            print(f"  Notice ID: {notice_id}")
            print(f"  Employee ID: {notice['employee_id']}")
            print(f"  Status: {notice['status']}")
            print(f"  Is Eligible: {notice['is_eligible']}")
            print(f"  Form Path: {notice.get('filled_form_path', 'N/A')}")
        else:
            print(f"✗ Notice creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"✗ Notice creation error: {e}")
        return False

    # Step 4: List all notices
    print("\n4. Listing all FMLA notices...")
    try:
        response = requests.get(
            f"{BASE_URL}/fmla/notices",
            headers=headers
        )

        if response.status_code == 200:
            notices = response.json()
            print(f"✓ Retrieved {len(notices)} notice(s)")
            for notice in notices[:3]:  # Show first 3
                print(f"  - Notice ID {notice['id']}: {notice['leave_reason']} (Status: {notice['status']})")
        else:
            print(f"✗ List notices failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"✗ List notices error: {e}")

    # Step 5: Get specific notice details
    print(f"\n5. Getting details for notice ID {notice_id}...")
    try:
        response = requests.get(
            f"{BASE_URL}/fmla/notices/{notice_id}",
            headers=headers
        )

        if response.status_code == 200:
            notice_detail = response.json()
            print(f"✓ Notice details retrieved")
            print(f"  Employee: {notice_detail.get('employee_name', 'N/A')}")
            print(f"  Leave Reason: {notice_detail['leave_reason']}")
            print(f"  Request Date: {notice_detail['request_date']}")
            print(f"  Leave Start: {notice_detail['leave_start_date']}")
            print(f"  Months Employed: {notice_detail.get('months_employed', 'N/A')}")
            print(f"  Hours Worked: {notice_detail.get('hours_worked_12months', 'N/A')}")
        else:
            print(f"✗ Get notice details failed: {response.status_code}")

    except Exception as e:
        print(f"✗ Get notice details error: {e}")

    # Step 6: Test download endpoint
    print(f"\n6. Testing download endpoint for notice ID {notice_id}...")
    try:
        response = requests.get(
            f"{BASE_URL}/fmla/notices/{notice_id}/download",
            headers=headers
        )

        if response.status_code == 200:
            print(f"✓ Download endpoint accessible")
            print(f"  Content-Type: {response.headers.get('content-type', 'N/A')}")
            print(f"  Content-Length: {len(response.content):,} bytes")
            print(f"  You can download the form at: {BASE_URL}/fmla/notices/{notice_id}/download")
        else:
            print(f"✗ Download failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"✗ Download test error: {e}")

    # Summary
    print("\n" + "=" * 80)
    print("✅ ALL API TESTS COMPLETED!")
    print("=" * 80)
    print(f"\nCreated FMLA Notice ID: {notice_id}")
    print(f"\nAPI Endpoints Available:")
    print(f"  - POST   {BASE_URL}/fmla/check-eligibility")
    print(f"  - POST   {BASE_URL}/fmla/create-notice")
    print(f"  - GET    {BASE_URL}/fmla/notices")
    print(f"  - GET    {BASE_URL}/fmla/notices/{{id}}")
    print(f"  - GET    {BASE_URL}/fmla/notices/{{id}}/download")

    return True


if __name__ == "__main__":
    import sys
    success = test_fmla_api()
    sys.exit(0 if success else 1)
