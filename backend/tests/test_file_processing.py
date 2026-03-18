"""
Test File Processing System
Tests the new Employment List and OT Earnings file processing
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.file_parsers import EmploymentListParser, OTEarningsParser, AutoDetectParser
from app.services.file_type_configs import get_file_config, FileCategory, detect_file_category
import pandas as pd
import pytest

_EMPLOYMENT_LIST = "/Users/michaelknudson/Downloads/Employment List Complete_Example.xlsx"
_OT_EARNINGS = "/Users/michaelknudson/Downloads/OT Earnings_Example.xlsx"


async def test_employment_list():
    """Test Employment List parser"""
    if not Path(_EMPLOYMENT_LIST).exists():
        pytest.skip(f"Test file not found: {_EMPLOYMENT_LIST}")

    print("\n" + "=" * 80)
    print("TEST 1: Employment List Complete")
    print("=" * 80)

    file_path = _EMPLOYMENT_LIST

    try:
        # Parse the file
        df, config, logs = await EmploymentListParser.parse(file_path)

        print(f"\n✓ File parsed successfully!")
        print(f"  Category: {config.category.value}")
        print(f"  Name: {config.name}")
        print(f"  Rows: {len(df)}")
        print(f"  Columns: {len(df.columns)}")

        print(f"\nParsing Logs:")
        for log in logs:
            level_symbol = {
                'info': 'ℹ',
                'warning': '⚠',
                'error': '✗',
                'success': '✓'
            }.get(log['level'], '•')
            print(f"  {level_symbol} [{log['level'].upper()}] {log['message']}")

        print(f"\nColumns detected:")
        for i, col in enumerate(df.columns, 1):
            print(f"  {i}. {col}")

        print(f"\nFirst 3 employees:")
        preview_df = df[['Employee Id', 'Preferred/First Name', 'Last Name', 'Department Description', 'Position Description']].head(3)
        print(preview_df.to_string(index=False))

        print(f"\nData summary:")
        print(f"  Total employees: {len(df)}")
        print(f"  Active: {len(df[df['Employee Status Description'] == 'Active'])}")
        print(f"  Unique departments: {df['Department Description'].nunique()}")

        if 'Annual Salary' in df.columns:
            avg_salary = df['Annual Salary'].mean()
            print(f"  Average salary: ${avg_salary:,.2f}")

        return True

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_ot_earnings():
    """Test OT Earnings parser"""
    print("\n" + "=" * 80)
    print("TEST 2: OT Earnings Report")
    print("=" * 80)

    if not Path(_OT_EARNINGS).exists():
        pytest.skip(f"Test file not found: {_OT_EARNINGS}")

    file_path = _OT_EARNINGS

    try:
        # Parse the file
        df, config, logs = await OTEarningsParser.parse(file_path)

        print(f"\n✓ File parsed successfully!")
        print(f"  Category: {config.category.value}")
        print(f"  Name: {config.name}")
        print(f"  Rows: {len(df)}")
        print(f"  Columns: {len(df.columns)}")

        print(f"\nParsing Logs:")
        for log in logs:
            level_symbol = {
                'info': 'ℹ',
                'warning': '⚠',
                'error': '✗',
                'success': '✓'
            }.get(log['level'], '•')
            print(f"  {level_symbol} [{log['level'].upper()}] {log['message']}")

        print(f"\nColumns detected:")
        for i, col in enumerate(df.columns, 1):
            print(f"  {i}. {col}")

        print(f"\nFirst 5 OT records:")
        preview_df = df[['Employee', 'ID', 'Chk Date', 'Hours', 'Amount']].head(5)
        print(preview_df.to_string(index=False))

        print(f"\nData summary:")
        print(f"  Total OT records: {len(df)}")
        print(f"  Unique employees: {df['ID'].nunique()}")
        print(f"  Total hours: {df['Hours'].sum():.2f}")
        print(f"  Total amount: ${df['Amount'].sum():,.2f}")

        return True

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_auto_detect():
    """Test auto-detection using full AutoDetectParser"""
    print("\n" + "=" * 80)
    print("TEST 3: Auto-Detection")
    print("=" * 80)

    files = [
        (_EMPLOYMENT_LIST, "Employment List"),
        (_OT_EARNINGS, "Overtime"),
    ]

    for fp, _ in files:
        if not Path(fp).exists():
            pytest.skip(f"Test file not found: {fp}")

    all_passed = True

    for file_path, expected_name in files:
        print(f"\nTesting: {Path(file_path).name}")

        try:
            # Use the full AutoDetectParser which handles multi-row headers
            df, config, logs = await AutoDetectParser.parse(file_path)

            print(f"  ✓ Detected as: {config.name}")
            if expected_name.lower() in config.name.lower():
                print(f"    ✓ Correct detection!")
                print(f"    Parsed {len(df)} rows")
            else:
                print(f"    ✗ Expected '{expected_name}' but got '{config.name}'")
                all_passed = False

        except Exception as e:
            print(f"  ✗ Error: {e}")
            all_passed = False

    return all_passed


async def test_full_pipeline():
    """Test complete parsing pipeline"""
    print("\n" + "=" * 80)
    print("TEST 4: Full Auto-Detect Pipeline")
    print("=" * 80)

    file_path = _EMPLOYMENT_LIST
    if not Path(file_path).exists():
        pytest.skip(f"Test file not found: {file_path}")
    print(f"\nProcessing: {Path(file_path).name}")

    try:
        # Use auto-detect parser
        df, config, logs = await AutoDetectParser.parse(file_path)

        print(f"\n✓ Auto-detection successful!")
        print(f"  Detected category: {config.category.value}")
        print(f"  Category name: {config.name}")
        print(f"  Rows processed: {len(df)}")

        # Verify data integrity
        assert len(df) > 0, "No data rows found"
        assert config.category == FileCategory.EMPLOYMENT_LIST, "Wrong category detected"

        print(f"\n✓ All assertions passed!")
        return True

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("FILE PROCESSING SYSTEM TEST SUITE")
    print("=" * 80)

    tests = [
        ("Employment List Parser", test_employment_list),
        ("OT Earnings Parser", test_ot_earnings),
        ("Auto-Detection", test_auto_detect),
        ("Full Pipeline", test_full_pipeline),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"  {status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
