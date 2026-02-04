"""
End-to-End Test for FMLA WH-381 Form Generation
Tests the complete flow from eligibility check to form generation
"""

import sys
from datetime import date, timedelta
from app.db.database import SessionLocal
from app.db.models import Employee
from app.services.fmla_form_service import FMLAFormService


def test_fmla_form_generation():
    """Test complete FMLA form generation flow"""

    print("=" * 80)
    print("FMLA WH-381 FORM GENERATION - END TO END TEST")
    print("=" * 80)

    # Create database session
    db = SessionLocal()

    try:
        # Step 1: Get a test employee
        print("\n1. Fetching test employee...")
        employee = db.query(Employee).first()

        if not employee:
            print("✗ No employees found in database")
            print("Please import employee data first")
            return False

        print(f"✓ Found employee: {employee.first_name} {employee.last_name}")
        print(f"  Employee ID: {employee.employee_id or employee.id}")
        print(f"  Hire Date: {employee.hire_date}")
        print(f"  Employment Type: {employee.employment_type or 'Full Time'}")

        # Step 2: Initialize FMLA service
        print("\n2. Initializing FMLA Form Service...")
        fmla_service = FMLAFormService()
        print(f"✓ Service initialized")
        print(f"  Template: {fmla_service.template_path}")
        print(f"  Output Directory: {fmla_service.output_dir}")

        # Step 3: Test eligibility calculation
        print("\n3. Testing eligibility calculation...")
        leave_start_date = date.today() + timedelta(days=7)
        employment_type = employee.employment_type or "Full Time"

        eligibility = fmla_service.calculate_eligibility(
            employee,
            leave_start_date,
            employment_type
        )

        print(f"✓ Eligibility calculated")
        print(f"  Is Eligible: {eligibility['is_eligible']}")
        print(f"  Months Employed: {eligibility['months_employed']}")
        print(f"  Hours Worked (12 months): {eligibility['hours_worked_12months']}")
        print(f"  Meets 12 months: {eligibility['meets_12_months']}")
        print(f"  Meets 1,250 hours: {eligibility['meets_hours']}")
        print(f"  Meets location requirement: {eligibility['meets_location']}")

        if not eligibility['is_eligible']:
            print(f"  Ineligibility reasons: {eligibility['ineligibility_reasons']}")

        # Step 4: Prepare request data
        print("\n4. Preparing FMLA request data...")
        request_data = {
            'request_date': date.today(),
            'leave_start_date': leave_start_date,
            'leave_end_date': leave_start_date + timedelta(days=60),
            'leave_reason': 'own_health',
            'family_relationship': None,
            'certification_required': True,
            'certification_type': 'health_care_provider_employee',
            'certification_attached': False,
            'relationship_cert_required': False,
            'is_key_employee': False,
            'some_unpaid': True,
            'employer_requires_paid': True,
            'other_leave_arrangement': None,
        }

        print(f"✓ Request data prepared")
        print(f"  Request Date: {request_data['request_date']}")
        print(f"  Leave Start: {request_data['leave_start_date']}")
        print(f"  Leave Reason: {request_data['leave_reason']}")
        print(f"  Certification Required: {request_data['certification_required']}")

        # Step 5: Generate the form
        print("\n5. Generating FMLA WH-381 form...")
        filled_form_path = fmla_service.generate_form(
            employee,
            request_data
        )

        print(f"✓ Form generated successfully!")
        print(f"  Output Path: {filled_form_path}")

        # Step 6: Verify the file exists
        print("\n6. Verifying generated file...")
        import os
        if os.path.exists(filled_form_path):
            file_size = os.path.getsize(filled_form_path)
            print(f"✓ File exists")
            print(f"  File Size: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
        else:
            print(f"✗ File not found at {filled_form_path}")
            return False

        # Step 7: Test field mapping
        print("\n7. Testing field mappings...")
        field_mappings = fmla_service.build_field_mappings(
            employee,
            request_data,
            eligibility
        )

        print(f"✓ {len(field_mappings)} fields mapped")
        print(f"\nSample field mappings:")
        sample_fields = [
            'Date1',
            'Employer To',
            'Employee',
            'Eligible for FMLA leave see Rights  Responsibilities notice below',
            'Contact',
        ]

        for field in sample_fields:
            if field in field_mappings:
                value = field_mappings[field]
                # Truncate long values
                if len(str(value)) > 60:
                    value = str(value)[:57] + "..."
                print(f"  {field}: {value}")

        # Final summary
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80)
        print(f"\nGenerated form can be found at:")
        print(f"{filled_form_path}")
        print(f"\nYou can now:")
        print(f"1. Open the PDF to verify the form is filled correctly")
        print(f"2. Use the API endpoints to create FMLA requests")
        print(f"3. Test the /fmla/create-notice endpoint")
        print(f"4. Test the /fmla/check-eligibility endpoint")

        return True

    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        db.close()


if __name__ == "__main__":
    success = test_fmla_form_generation()
    sys.exit(0 if success else 1)
