"""
Test Deduction Listing Parser
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.file_parsers import DeductionListingParser


async def test_deduction_listing_parser():
    """Test parsing Deduction Listing PDF"""

    file_path = "/Users/michaelknudson/Downloads/Deduction Listing-2.PDF"

    print("=" * 80)
    print("TESTING DEDUCTION LISTING PARSER")
    print("=" * 80)
    print(f"\nFile: {file_path}\n")

    try:
        # Parse the file
        df, config, logs = await DeductionListingParser.parse(file_path)

        # Print logs
        print("\n--- Parsing Logs ---")
        for log in logs:
            level = log.get('level', 'info').upper()
            message = log.get('message', '')
            print(f"[{level}] {message}")

            if 'details' in log and log['details']:
                details = log['details']
                if 'total_records' in details:
                    print(f"  Total Records: {details['total_records']}")
                if 'unique_employees' in details:
                    print(f"  Unique Employees: {details['unique_employees']}")
                if 'unique_deduction_types' in details:
                    print(f"  Unique Deduction Types: {details['unique_deduction_types']}")
                if 'total_deductions' in details:
                    print(f"  Total Deductions: ${details['total_deductions']:,.2f}")

        # Print DataFrame info
        print(f"\n--- DataFrame Info ---")
        print(f"Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")

        # Print first few records
        print(f"\n--- First 5 Records ---")
        print(df.head().to_string())

        # Print deduction type summary
        print(f"\n--- Deduction Type Summary ---")
        deduction_summary = df.groupby('Deduction Type').agg({
            'Amount': ['sum', 'count'],
            'ID': 'nunique'
        }).round(2)
        deduction_summary.columns = ['Total Amount', 'Record Count', 'Unique Employees']
        print(deduction_summary.to_string())

        # Print overall statistics
        print(f"\n--- Overall Statistics ---")
        print(f"Total Records: {len(df)}")
        print(f"Unique Employees: {df['ID'].nunique()}")
        print(f"Unique Deduction Types: {df['Deduction Type'].nunique()}")
        print(f"Total Deductions: ${df['Amount'].sum():,.2f}")

        # Print data types
        print(f"\n--- Data Types ---")
        print(df.dtypes.to_string())

        print(f"\n{'='*80}")
        print("✓ TEST PASSED: Deduction Listing Parser")
        print(f"{'='*80}\n")

    except Exception as e:
        print(f"\n{'='*80}")
        print(f"✗ TEST FAILED: {str(e)}")
        print(f"{'='*80}\n")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(test_deduction_listing_parser())
