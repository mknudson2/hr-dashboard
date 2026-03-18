#!/usr/bin/env python3
"""
Quick FMLA Notice Generator
Interactive script to create and send FMLA notices
"""

import sys
import requests
from datetime import date, timedelta
from getpass import getpass


def login():
    """Login to get authentication token"""
    print("=" * 80)
    print("FMLA NOTICE GENERATOR - LOGIN")
    print("=" * 80)

    username = input("\nUsername: ")
    password = getpass("Password: ")

    try:
        response = requests.post(
            "http://localhost:8000/auth/login",
            json={"username": username, "password": password}
        )

        if response.status_code == 200:
            data = response.json()
            print("✓ Login successful!")
            return data["access_token"]
        else:
            print(f"✗ Login failed: {response.json().get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"✗ Error connecting to server: {e}")
        print("\nMake sure the backend is running on http://localhost:8000")
        return None


def get_employees(token):
    """Fetch list of employees"""
    try:
        response = requests.get(
            "http://localhost:8000/analytics/employees",
            headers={"Authorization": f"Bearer {token}"}
        )

        if response.status_code == 200:
            return response.json()
        else:
            print(f"✗ Failed to fetch employees: {response.status_code}")
            return []
    except Exception as e:
        print(f"✗ Error fetching employees: {e}")
        return []


def create_notice(token):
    """Interactive notice creation"""
    print("\n" + "=" * 80)
    print("CREATE FMLA NOTICE")
    print("=" * 80)

    # Get employees
    print("\nFetching employees...")
    employees = get_employees(token)

    if not employees:
        print("No employees found!")
        return None

    # Display employees
    print(f"\nFound {len(employees)} employees:")
    for i, emp in enumerate(employees[:10], 1):
        print(f"  {emp['id']:3d}. {emp['first_name']} {emp['last_name']} ({emp['employee_id']})")

    if len(employees) > 10:
        print(f"  ... and {len(employees) - 10} more")

    # Get employee selection
    while True:
        try:
            emp_id = int(input("\nEnter Employee ID: "))
            employee = next((e for e in employees if e['id'] == emp_id), None)
            if employee:
                print(f"✓ Selected: {employee['first_name']} {employee['last_name']}")
                break
            else:
                print("✗ Invalid employee ID. Please try again.")
        except ValueError:
            print("✗ Please enter a valid number.")

    # Get leave reason
    print("\nLeave Reason:")
    print("  1. Own Health (Employee's serious health condition)")
    print("  2. Family Care (Care for family member)")
    print("  3. Birth/Adoption (Birth or adoption of child)")
    print("  4. Military Exigency")
    print("  5. Military Caregiver")

    reason_map = {
        '1': 'own_health',
        '2': 'family_care',
        '3': 'birth_adoption',
        '4': 'military_exigency',
        '5': 'military_caregiver'
    }

    while True:
        choice = input("\nSelect reason (1-5): ")
        if choice in reason_map:
            leave_reason = reason_map[choice]
            break
        print("✗ Invalid choice. Please select 1-5.")

    # Get leave dates
    print("\nLeave Dates:")
    today = date.today()

    request_date_str = input(f"Request date ({today}): ").strip() or str(today)

    default_start = today + timedelta(days=7)
    leave_start_str = input(f"Leave start date ({default_start}): ").strip() or str(default_start)

    default_end = date.fromisoformat(leave_start_str) + timedelta(days=60)
    leave_end_str = input(f"Leave end date ({default_end}): ").strip() or str(default_end)

    # Certification
    cert_required = input("\nCertification required? (Y/n): ").strip().lower() != 'n'

    # Build request
    request_data = {
        "employee_id": emp_id,
        "request_date": request_date_str,
        "leave_start_date": leave_start_str,
        "leave_end_date": leave_end_str,
        "leave_reason": leave_reason,
        "certification_required": cert_required,
        "generate_notice": True
    }

    # Create the notice
    print("\n" + "=" * 80)
    print("CREATING NOTICE...")
    print("=" * 80)

    try:
        response = requests.post(
            "http://localhost:8000/fmla/create-notice",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=request_data
        )

        if response.status_code == 200:
            data = response.json()
            notice_id = data['id']

            print(f"\n✓ NOTICE CREATED SUCCESSFULLY!")
            print(f"  Notice ID: {notice_id}")
            print(f"  Employee: {employee['first_name']} {employee['last_name']}")
            print(f"  Eligible: {'Yes ✓' if data['is_eligible'] else 'No ✗'}")
            print(f"  Status: {data['status']}")
            print(f"  Form: {data.get('filled_form_path', 'Not generated')}")

            return notice_id
        else:
            print(f"\n✗ Failed to create notice: {response.status_code}")
            print(f"  Error: {response.json().get('detail', 'Unknown error')}")
            return None

    except Exception as e:
        print(f"\n✗ Error creating notice: {e}")
        return None


def send_notice(token, notice_id):
    """Send notice via email"""
    print("\n" + "=" * 80)
    print("SEND NOTICE VIA EMAIL")
    print("=" * 80)

    send = input("\nSend this notice to employee via email? (Y/n): ").strip().lower() != 'n'

    if not send:
        print("Notice not sent. You can send it later using:")
        print(f"  POST /fmla/notices/{notice_id}/send-email")
        return

    try:
        response = requests.post(
            f"http://localhost:8000/fmla/notices/{notice_id}/send-email",
            headers={"Authorization": f"Bearer {token}"}
        )

        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ EMAIL SENT SUCCESSFULLY!")
            print(f"  Sent to: {data['sent_to']}")
            print(f"  Sent at: {data['sent_at']}")
        else:
            error = response.json().get('detail', 'Unknown error')
            print(f"\n✗ Failed to send email: {error}")

            if "email address" in error.lower():
                print("\n⚠️  Employee doesn't have an email address in the system.")
                print("   You can download the PDF manually instead.")

    except Exception as e:
        print(f"\n✗ Error sending email: {e}")


def main():
    """Main program flow"""
    print("""
    ╔════════════════════════════════════════════════════════════════╗
    ║                FMLA NOTICE GENERATOR                          ║
    ║                                                                ║
    ║  This tool will help you:                                     ║
    ║  1. Create an FMLA leave request                             ║
    ║  2. Generate the WH-381 form automatically                   ║
    ║  3. Send the notice to the employee via email                ║
    ╚════════════════════════════════════════════════════════════════╝
    """)

    # Login
    token = login()
    if not token:
        sys.exit(1)

    # Create notice
    notice_id = create_notice(token)
    if not notice_id:
        sys.exit(1)

    # Send notice
    send_notice(token, notice_id)

    print("\n" + "=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)
    print(f"\nNotice ID: {notice_id}")
    print(f"\nYou can view details using:")
    print(f"  ./venv/bin/python manage_fmla_notices.py view {notice_id}")
    print(f"\nYou can download the PDF at:")
    print(f"  http://localhost:8000/fmla/notices/{notice_id}/download")
    print()


if __name__ == "__main__":
    main()
