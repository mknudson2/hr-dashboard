"""
Inspect FMLA WH-381 Form Fields
Extracts all form field names and properties from the PDF
"""

import sys
from pypdf import PdfReader
import json

def inspect_pdf_form(pdf_path):
    """Inspect PDF form fields and print detailed information"""

    print("=" * 80)
    print("INSPECTING FMLA WH-381 FORM FIELDS")
    print("=" * 80)
    print(f"\nFile: {pdf_path}\n")

    try:
        reader = PdfReader(pdf_path)

        # Get form fields
        fields = reader.get_fields()

        if not fields:
            print("⚠️  WARNING: No form fields found in this PDF!")
            print("This PDF may not have fillable form fields (AcroForm).")
            print("\nThe PDF appears to be a static document without interactive fields.")
            print("You have two options:")
            print("1. Recreate the form with fillable fields using Adobe Acrobat")
            print("2. Generate the PDF from scratch using reportlab or similar library")
            return None

        print(f"✓ Found {len(fields)} form fields\n")

        # Organize fields by type
        field_info = {}
        field_types = {}

        for field_name, field_data in fields.items():
            field_type = field_data.get('/FT', 'Unknown')

            # Map field type codes to readable names
            type_map = {
                '/Tx': 'Text',
                '/Btn': 'Button/Checkbox',
                '/Ch': 'Choice/Dropdown',
                '/Sig': 'Signature'
            }

            readable_type = type_map.get(field_type, str(field_type))

            field_info[field_name] = {
                'type': readable_type,
                'type_code': str(field_type),
                'value': str(field_data.get('/V', '')),
                'default': str(field_data.get('/DV', '')),
                'flags': field_data.get('/Ff', 0),
                'max_length': field_data.get('/MaxLen', None),
                'options': field_data.get('/Opt', [])
            }

            # Group by type
            if readable_type not in field_types:
                field_types[readable_type] = []
            field_types[readable_type].append(field_name)

        # Print summary by type
        print("--- Field Summary by Type ---")
        for ftype, fnames in field_types.items():
            print(f"{ftype}: {len(fnames)} fields")

        # Print detailed field information
        print("\n--- Detailed Field Information ---\n")

        for field_name, info in sorted(field_info.items()):
            print(f"Field Name: {field_name}")
            print(f"  Type: {info['type']}")
            print(f"  Type Code: {info['type_code']}")

            if info['value']:
                print(f"  Current Value: {info['value']}")

            if info['default']:
                print(f"  Default Value: {info['default']}")

            if info['max_length']:
                print(f"  Max Length: {info['max_length']}")

            if info['options']:
                print(f"  Options: {info['options']}")

            # Decode checkbox values if button type
            if info['type'] == 'Button/Checkbox':
                print(f"  Flags: {info['flags']}")

            print()

        # Save to JSON for reference
        output_file = "fmla_form_fields.json"
        with open(output_file, 'w') as f:
            json.dump(field_info, f, indent=2)

        print(f"✓ Field information saved to: {output_file}")

        return field_info

    except Exception as e:
        print(f"✗ Error inspecting PDF: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    pdf_path = "/Users/michaelknudson/Downloads/WH-381_Notice of Eligibility.pdf"
    inspect_pdf_form(pdf_path)
