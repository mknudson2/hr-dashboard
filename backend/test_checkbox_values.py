"""
Test FMLA Form Checkbox Values
Determines the correct format for checkbox values in the WH-381 form
"""

from pypdf import PdfReader, PdfWriter
import os

def test_checkbox_formats():
    """Test different checkbox value formats to see which works"""

    template_path = "app/templates/pdf_forms/WH-381_Notice of Eligibility.pdf"
    output_dir = "app/storage/filled_forms"

    print("=" * 80)
    print("TESTING FMLA FORM CHECKBOX VALUES")
    print("=" * 80)
    print(f"\nTemplate: {template_path}\n")

    # Read the template
    reader = PdfReader(template_path)
    fields = reader.get_fields()

    # Find a checkbox field to test
    checkbox_fields = [
        name for name, data in fields.items()
        if data.get('/FT') == '/Btn'
    ]

    print(f"Found {len(checkbox_fields)} checkbox fields\n")
    print("Sample checkbox fields:")
    for field in checkbox_fields[:5]:
        print(f"  - {field}")

    # Test different checkbox value formats
    test_field = "Eligible for FMLA leave see Rights  Responsibilities notice below"

    test_values = {
        "/Yes": "Standard checked value",
        "/Off": "Standard unchecked value",
        "Yes": "String 'Yes'",
        "1": "Number as string",
        True: "Boolean True",
        False: "Boolean False",
        "/1": "PDF notation /1",
        "/0": "PDF notation /0",
    }

    print(f"\n\nTesting checkbox: '{test_field}'\n")
    print("-" * 80)

    for value, description in test_values.items():
        try:
            # Create a new PDF writer and append the entire template
            writer = PdfWriter()
            writer.append(template_path)

            # Try to set the checkbox value
            writer.update_page_form_field_values(
                writer.pages[0],
                {test_field: value}
            )

            # Save the test PDF
            output_filename = f"test_checkbox_{str(value).replace('/', '_')}.pdf"
            output_path = os.path.join(output_dir, output_filename)

            with open(output_path, 'wb') as output_file:
                writer.write(output_file)

            print(f"✓ {description:30} (value: {value!r:12}) -> {output_filename}")

        except Exception as e:
            print(f"✗ {description:30} (value: {value!r:12}) -> ERROR: {e}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    print(f"\nTest files saved to: {output_dir}")
    print("\nNext steps:")
    print("1. Open the generated PDFs")
    print("2. Check which checkbox value format correctly checks the box")
    print("3. Use that format in the FMLAFormService")
    print("\nMost likely working values: /Yes (checked) and /Off (unchecked)")


if __name__ == "__main__":
    test_checkbox_formats()
