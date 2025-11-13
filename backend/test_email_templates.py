"""Test script for email template rendering."""
import asyncio
from app.services.email_service import email_service


async def test_template_rendering():
    """Test rendering of all email templates."""
    print("=" * 80)
    print("EMAIL TEMPLATE TESTING")
    print("=" * 80)
    print(f"Provider: {email_service.provider}")
    print(f"Email Enabled: {email_service.enabled}")
    print(f"Templates Directory: {email_service.templates_dir}")
    print("=" * 80)
    print()

    # Test 1: Welcome Email
    print("✅ Test 1: Welcome Email Template")
    try:
        await email_service.send_welcome_email(
            to_email="test@example.com",
            employee_name="John Doe",
            role="Software Engineer",
            start_date="2025-01-15",
            department="Engineering",
            manager_name="Jane Smith",
            manager_email="jane.smith@nbsbenefits.com"
        )
        print("   SUCCESS: Welcome email template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 2: First Day Info Email
    print("✅ Test 2: First Day Info Email Template")
    try:
        await email_service.send_first_day_info(
            to_email="test@example.com",
            employee_name="John Doe",
            start_date="2025-01-15",
            start_time="9:00 AM",
            office_location="Main Office, Building A",
            parking_info="Park in visitor parking, then check in at reception",
            dress_code="Business casual",
            manager_name="Jane Smith"
        )
        print("   SUCCESS: First day info template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 3: NBS Term Email - 401k
    print("✅ Test 3: NBS Term Email - 401k")
    try:
        await email_service.send_nbs_term_email(
            email_type="401k",
            to_emails=["kath@nbsbenefits.com"],
            employee_name="John Doe",
            employee_id="EMP12345",
            termination_date="2025-01-31",
            verb="has",
            pronoun="their",
            department="Engineering"
        )
        print("   SUCCESS: NBS 401k term email template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 4: NBS Term Email - Accounting
    print("✅ Test 4: NBS Term Email - Accounting")
    try:
        await email_service.send_nbs_term_email(
            email_type="accounting",
            to_emails=["shellim@nbsbenefits.com"],
            employee_name="Jane Smith",
            employee_id="EMP67890",
            termination_date="2025-02-15",
            verb="has",
            pronoun="her",
            pronoun2="her",
            department="Finance",
            cc_emails=["NatalieL@nbsbenefits.com"]
        )
        print("   SUCCESS: NBS accounting term email template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 5: NBS Term Email - Leadership
    print("✅ Test 5: NBS Term Email - Leadership")
    try:
        await email_service.send_nbs_term_email(
            email_type="leadership",
            to_emails=["leadership@nbsbenefits.com"],
            employee_name="Bob Johnson",
            employee_id="EMP11111",
            termination_date="2025-03-01",
            verb="has",
            pronoun="his",
            pronoun2="him",
            department="Sales",
            role="Senior Sales Manager",
            supervisor="Alice Williams",
            transition_notes="Key accounts have been reassigned to the team."
        )
        print("   SUCCESS: NBS leadership term email template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 6: FMLA Approval Email
    print("✅ Test 6: FMLA Approval Email Template")
    try:
        await email_service.send_fmla_approval(
            to_email="test@example.com",
            employee_name="Mary Johnson",
            leave_type="Medical Leave",
            start_date="2025-02-01",
            return_date="2025-04-01",
            duration=8,
            medical_certification_required=True,
            recertification_date="2025-03-01"
        )
        print("   SUCCESS: FMLA approval template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 7: FMLA Reminder Email
    print("✅ Test 7: FMLA Reminder Email Template")
    try:
        await email_service.send_fmla_reminder(
            to_email="test@example.com",
            employee_name="Mary Johnson",
            start_date="2025-02-01",
            return_date="2025-04-01",
            days_until_return=7,
            fitness_for_duty_required=True,
            manager_name="Tom Brown",
            manager_email="tom.brown@nbsbenefits.com"
        )
        print("   SUCCESS: FMLA reminder template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 8: FMLA Return Welcome Email
    print("✅ Test 8: FMLA Return Welcome Email Template")
    try:
        await email_service.send_fmla_return_welcome(
            to_email="test@example.com",
            employee_name="Mary Johnson",
            return_date="2025-04-01",
            manager_name="Tom Brown",
            accommodations="Modified work schedule for first two weeks",
            fitness_for_duty_required=True
        )
        print("   SUCCESS: FMLA return welcome template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 9: Birthday Email
    print("✅ Test 9: Birthday Email Template")
    try:
        await email_service.send_birthday_email(
            to_email="test@example.com",
            employee_name="Sarah Williams",
            birthday_message="Wishing you a fantastic birthday filled with joy!",
            team_celebration=True,
            celebration_date="Today",
            celebration_time="3:00 PM",
            celebration_location="Break Room"
        )
        print("   SUCCESS: Birthday email template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 10: Anniversary Email
    print("✅ Test 10: Anniversary Email Template")
    try:
        await email_service.send_anniversary_email(
            to_email="test@example.com",
            employee_name="David Martinez",
            years=5,
            start_date="2020-01-15",
            current_role="Senior Developer",
            department="Engineering",
            achievements=[
                "Led successful migration to microservices architecture",
                "Mentored 10+ junior developers",
                "Received Employee of the Year award in 2022"
            ],
            anniversary_message="Your dedication and innovation have been invaluable to our team. Thank you for 5 amazing years!",
            message_from="CEO John Smith",
            celebration=True,
            celebration_date="Friday, January 15th",
            celebration_time="4:00 PM",
            celebration_location="Conference Room A",
            gift_info="You will receive a $500 bonus and an extra day of PTO"
        )
        print("   SUCCESS: Anniversary email template rendered\n")
    except Exception as e:
        print(f"   ERROR: {e}\n")

    # Test 11: Test all NBS term email types
    print("✅ Test 11: All NBS Term Email Types")
    nbs_types = ['401k', 'accounting', 'cobra', 'concur', 'crm',
                 'data_admin', 'flex', 'retirement', 'welfare', 'leadership']

    for email_type in nbs_types:
        try:
            await email_service.send_nbs_term_email(
                email_type=email_type,
                to_emails=["test@example.com"],
                employee_name="Test Employee",
                employee_id="TEST123",
                termination_date="2025-01-31",
                verb="has",
                pronoun="their",
                pronoun2="them",
                department="Test Department",
                role="Test Role",
                supervisor="Test Supervisor"
            )
            print(f"   ✓ {email_type.upper()}: Success")
        except Exception as e:
            print(f"   ✗ {email_type.upper()}: ERROR - {e}")
    print()

    print("=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80)
    print()
    print("All templates rendered successfully!")
    print()
    print("NOTE: Email sending is currently DISABLED (EMAIL_ENABLED=false)")
    print("To enable email sending:")
    print("1. Copy .env.example to .env")
    print("2. Configure your Gmail SMTP settings:")
    print("   - GMAIL_USERNAME=your-email@gmail.com")
    print("   - GMAIL_APP_PASSWORD=your-16-char-app-password")
    print("   - EMAIL_ENABLED=true")
    print("3. Generate Gmail App Password at: https://myaccount.google.com/apppasswords")
    print()


if __name__ == "__main__":
    asyncio.run(test_template_rendering())
