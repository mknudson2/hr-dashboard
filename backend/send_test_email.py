"""Send a test email to verify Gmail configuration."""
import asyncio
from dotenv import load_dotenv
load_dotenv()

from app.services.email_service import email_service


async def send_test_email():
    """Send a test welcome email."""
    print("=" * 80)
    print("SENDING TEST EMAIL")
    print("=" * 80)
    print(f"Provider: {email_service.provider}")
    print(f"Email Enabled: {email_service.enabled}")
    print(f"From: {email_service.fastmail.config.MAIL_FROM}")
    print(f"To: michaelknudsonphd@gmail.com")
    print("=" * 80)
    print()
    print("Sending welcome email template...")
    print()

    try:
        await email_service.send_welcome_email(
            to_email="michaelknudsonphd@gmail.com",
            employee_name="Michael Knudson",
            role="Test User",
            start_date="2025-01-15",
            department="Testing Department",
            manager_name="Test Manager",
            manager_email="manager@nbsbenefits.com"
        )

        print()
        print("=" * 80)
        print("✅ SUCCESS! Email sent successfully!")
        print("=" * 80)
        print()
        print("Check your inbox at: michaelknudsonphd@gmail.com")
        print()
        print("If you don't see it:")
        print("1. Check your Spam/Junk folder")
        print("2. Wait a minute and refresh")
        print("3. Make sure your App Password is correct")
        print()

    except Exception as e:
        print()
        print("=" * 80)
        print("❌ ERROR sending email!")
        print("=" * 80)
        print(f"Error: {str(e)}")
        print()
        print("Troubleshooting:")
        print("1. Verify your Gmail App Password is correct (16 characters, no spaces)")
        print("2. Make sure 2-Step Verification is enabled on your Google account")
        print("3. Generate a new App Password at: https://myaccount.google.com/apppasswords")
        print("4. Check that 'Less secure app access' is not blocking the connection")
        print()


if __name__ == "__main__":
    asyncio.run(send_test_email())
