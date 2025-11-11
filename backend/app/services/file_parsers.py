"""
Specialized File Parsers
Parse and validate specific HR data file types
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
from fastapi import HTTPException
import logging

from app.services.file_type_configs import (
    FileTypeConfig,
    FileCategory,
    get_file_config,
    detect_file_category,
    validate_file_structure,
    get_parsing_options
)
import pdfplumber
import re

logger = logging.getLogger(__name__)


class HRFileParser:
    """Base class for HR file parsing"""

    @staticmethod
    def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean common issues in dataframes:
        - Remove completely empty rows
        - Strip whitespace from string columns
        - Standardize NaN values
        """
        # Remove rows where ALL values are NaN
        df = df.dropna(how='all')

        # Strip whitespace from object (string) columns
        df = df.copy()  # Create a copy to avoid SettingWithCopyWarning
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)

        # Reset index
        df = df.reset_index(drop=True)

        return df

    @staticmethod
    def convert_data_types(df: pd.DataFrame, config: FileTypeConfig) -> pd.DataFrame:
        """
        Convert columns to appropriate data types based on configuration
        """
        for mapping in config.column_mappings:
            col_name = mapping.file_column

            if col_name not in df.columns:
                continue

            try:
                if mapping.data_type == "integer":
                    df[col_name] = pd.to_numeric(df[col_name], errors='coerce').astype('Int64')

                elif mapping.data_type == "float":
                    df[col_name] = pd.to_numeric(df[col_name], errors='coerce')

                elif mapping.data_type == "date":
                    df[col_name] = pd.to_datetime(df[col_name], errors='coerce').dt.date

                elif mapping.data_type == "datetime":
                    df[col_name] = pd.to_datetime(df[col_name], errors='coerce')

                elif mapping.data_type == "boolean":
                    df[col_name] = df[col_name].astype(bool)

                elif mapping.data_type == "string":
                    df[col_name] = df[col_name].astype(str).replace('nan', None)

            except Exception as e:
                logger.warning(f"Could not convert column '{col_name}' to {mapping.data_type}: {e}")

        return df

    @staticmethod
    def validate_data_quality(df: pd.DataFrame, config: FileTypeConfig) -> List[Dict]:
        """
        Validate data quality and return list of warnings/errors
        """
        issues = []

        # Check row count
        if len(df) < config.min_rows:
            issues.append({
                'level': 'error',
                'message': f'File has {len(df)} rows, minimum required is {config.min_rows}',
                'row': None,
                'column': None
            })

        if config.max_rows and len(df) > config.max_rows:
            issues.append({
                'level': 'error',
                'message': f'File has {len(df)} rows, maximum allowed is {config.max_rows}',
                'row': None,
                'column': None
            })

        # Check required columns for null values
        for mapping in config.column_mappings:
            if mapping.required and mapping.file_column in df.columns:
                null_count = df[mapping.file_column].isnull().sum()
                if null_count > 0:
                    issues.append({
                        'level': 'warning',
                        'message': f"Required column '{mapping.file_column}' has {null_count} null values",
                        'row': None,
                        'column': mapping.file_column
                    })

        # Check for duplicates in unique columns
        if config.unique_columns:
            for col in config.unique_columns:
                if col in df.columns:
                    duplicates = df[col].duplicated().sum()
                    if duplicates > 0:
                        issues.append({
                            'level': 'error',
                            'message': f"Column '{col}' should be unique but has {duplicates} duplicate values",
                            'row': None,
                            'column': col
                        })

        return issues


class EmploymentListParser(HRFileParser):
    """Parser for Employment List Complete files"""

    @staticmethod
    async def parse(file_path: str) -> Tuple[pd.DataFrame, FileTypeConfig, List[Dict]]:
        """
        Parse Employment List Complete file
        Returns: (dataframe, config, logs)
        """
        logs = []
        config = get_file_config(FileCategory.EMPLOYMENT_LIST)

        try:
            # Read file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                parsing_opts = get_parsing_options(config)
                df = pd.read_excel(file_path, engine='openpyxl', **parsing_opts)

            logs.append({
                'level': 'info',
                'message': f'Successfully read file with {len(df)} rows and {len(df.columns)} columns',
                'details': {'rows': len(df), 'columns': list(df.columns)}
            })

            # Clean dataframe
            df = EmploymentListParser.clean_dataframe(df)
            logs.append({
                'level': 'info',
                'message': f'After cleaning: {len(df)} rows',
                'details': {'rows': len(df)}
            })

            # Validate structure
            is_valid, errors = validate_file_structure(df.columns.tolist(), config)
            if not is_valid:
                for error in errors:
                    logs.append({
                        'level': 'error',
                        'message': error,
                        'details': {}
                    })
                raise HTTPException(status_code=400, detail=f"File structure validation failed: {'; '.join(errors)}")

            # Convert data types
            df = EmploymentListParser.convert_data_types(df, config)
            logs.append({
                'level': 'info',
                'message': 'Data types converted successfully',
                'details': {}
            })

            # Validate data quality
            issues = EmploymentListParser.validate_data_quality(df, config)
            for issue in issues:
                logs.append(issue)

            # Check for critical errors
            critical_errors = [i for i in issues if i['level'] == 'error']
            if critical_errors:
                error_messages = [i['message'] for i in critical_errors]
                raise HTTPException(
                    status_code=400,
                    detail=f"Data validation failed: {'; '.join(error_messages)}"
                )

            logs.append({
                'level': 'success',
                'message': f'Employment List parsed successfully: {len(df)} employees',
                'details': {'employee_count': len(df)}
            })

            return df, config, logs

        except HTTPException:
            raise
        except Exception as e:
            logs.append({
                'level': 'error',
                'message': f'Error parsing Employment List: {str(e)}',
                'details': {'error': str(e)}
            })
            raise HTTPException(status_code=400, detail=f"Error parsing Employment List: {str(e)}")


class OTEarningsParser(HRFileParser):
    """Parser for Overtime Earnings files"""

    @staticmethod
    async def parse(file_path: str) -> Tuple[pd.DataFrame, FileTypeConfig, List[Dict]]:
        """
        Parse OT Earnings file
        Returns: (dataframe, config, logs)
        """
        logs = []
        config = get_file_config(FileCategory.OT_EARNINGS)

        try:
            # Read file with special header row
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path, skiprows=3)
            else:
                parsing_opts = get_parsing_options(config)
                df = pd.read_excel(file_path, engine='openpyxl', **parsing_opts)

            logs.append({
                'level': 'info',
                'message': f'Successfully read file with {len(df)} rows and {len(df.columns)} columns',
                'details': {'rows': len(df), 'columns': list(df.columns)}
            })

            # Remove unnamed columns (they are blank columns in the spreadsheet)
            df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

            # Clean dataframe
            df = OTEarningsParser.clean_dataframe(df)
            logs.append({
                'level': 'info',
                'message': f'After cleaning: {len(df)} rows',
                'details': {'rows': len(df)}
            })

            # Handle the special case where employee name appears once and ID/data repeats
            # Forward-fill the Employee column to propagate employee names
            if 'Employee' in df.columns:
                df['Employee'] = df['Employee'].ffill()  # Use ffill() instead of deprecated fillna(method='ffill')

            # Validate structure
            is_valid, errors = validate_file_structure(df.columns.tolist(), config)
            if not is_valid:
                for error in errors:
                    logs.append({
                        'level': 'error',
                        'message': error,
                        'details': {}
                    })
                raise HTTPException(status_code=400, detail=f"File structure validation failed: {'; '.join(errors)}")

            # Convert data types
            df = OTEarningsParser.convert_data_types(df, config)
            logs.append({
                'level': 'info',
                'message': 'Data types converted successfully',
                'details': {}
            })

            # Validate data quality
            issues = OTEarningsParser.validate_data_quality(df, config)
            for issue in issues:
                logs.append(issue)

            # Check for critical errors
            critical_errors = [i for i in issues if i['level'] == 'error']
            if critical_errors:
                error_messages = [i['message'] for i in critical_errors]
                raise HTTPException(
                    status_code=400,
                    detail=f"Data validation failed: {'; '.join(error_messages)}"
                )

            # Calculate summary statistics
            total_hours = df['Hours'].sum()
            total_amount = df['Amount'].sum()
            unique_employees = df['ID'].nunique()

            logs.append({
                'level': 'success',
                'message': f'OT Earnings parsed successfully: {len(df)} records, {unique_employees} employees, {total_hours:.2f} total hours, ${total_amount:,.2f} total amount',
                'details': {
                    'record_count': len(df),
                    'unique_employees': unique_employees,
                    'total_hours': round(total_hours, 2),
                    'total_amount': round(total_amount, 2)
                }
            })

            return df, config, logs

        except HTTPException:
            raise
        except Exception as e:
            logs.append({
                'level': 'error',
                'message': f'Error parsing OT Earnings: {str(e)}',
                'details': {'error': str(e)}
            })
            raise HTTPException(status_code=400, detail=f"Error parsing OT Earnings: {str(e)}")


class HSAReportParser(HRFileParser):
    """Parser for HSA Contribution Report PDFs"""

    @staticmethod
    async def parse(file_path: str) -> Tuple[pd.DataFrame, FileTypeConfig, List[Dict]]:
        """
        Parse HSA Report PDF file
        Returns: (dataframe, config, logs)
        """
        logs = []
        config = get_file_config(FileCategory.HSA_REPORT)

        try:
            # Extract text-based table data from PDF
            all_rows = []
            headers = ['Employee', 'Emp Id', 'SSN', 'Deferral Rate', 'Hours', 'Gross Pay', 'Pre Tax', 'Post', 'ER', 'Total']

            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()

                    if not text:
                        continue

                    lines = text.split('\n')

                    # Find where employee data starts (after the header line)
                    data_started = False
                    for line in lines:
                        line = line.strip()

                        # Skip empty lines
                        if not line:
                            continue

                        # Detect header line
                        if 'Employee Emp Id SSN Deferral Rate' in line or 'Employee' in line and 'Emp Id' in line:
                            data_started = True
                            continue

                        # Skip header/metadata lines
                        if any(skip in line for skip in ['Check Date:', 'HSA Report', 'Page', 'Process:', 'National Benefit Services', 'Pay Period:', 'Totals:', 'Report Total']):
                            continue

                        # If we've started reading data, parse employee rows
                        if data_started and not line.lower().startswith('total'):
                            # Parse the line using regex to extract employee name and numeric fields
                            # Pattern: "LastName, FirstName MiddleInitial. EmpID DeferralRate Hours GrossPay PreTax Post ER Total"

                            # Match: Name (with comma and optional middle initial/period), then numbers
                            match = re.match(r'^(.+?,\s+\S+(?:\s+\S\.)?)\s+(\d+)\s+(.+)$', line)

                            if match:
                                try:
                                    employee_name = match.group(1).strip()
                                    emp_id = match.group(2).strip()
                                    remaining_values = match.group(3).strip()

                                    # Split remaining values by spaces
                                    values = remaining_values.split()

                                    # Values should be: [DeferralRate, Hours, GrossPay, PreTax, Post, ER, Total]
                                    # But DeferralRate might have /Flat suffix or might be just a number
                                    # Minimum we need: 6 values (deferral, hours, gross, pre, post, er, total)

                                    if len(values) >= 6:
                                        # Build the row
                                        row = {
                                            'Employee': employee_name,
                                            'Emp Id': emp_id,
                                            'SSN': '',  # SSN is not shown in this report
                                            'Deferral Rate': values[0],  # e.g., "0.00/Flat" or "80.00"
                                            'Hours': values[1] if len(values) > 1 else '0',
                                            'Gross Pay': values[2] if len(values) > 2 else '0',
                                            'Pre Tax': values[3] if len(values) > 3 else '0',
                                            'Post': values[4] if len(values) > 4 else '0',
                                            'ER': values[5] if len(values) > 5 else '0',
                                            'Total': values[6] if len(values) > 6 else '0'
                                        }
                                        all_rows.append(row)
                                except (IndexError, ValueError) as e:
                                    # Skip rows that don't parse correctly
                                    logger.debug(f"Skipping line that couldn't be parsed: {line}: {e}")

            if not all_rows:
                raise HTTPException(status_code=400, detail="No valid employee data found in PDF")

            # Create dataframe
            df = pd.DataFrame(all_rows)

            logs.append({
                'level': 'info',
                'message': f'Successfully extracted data from PDF with {len(df)} rows',
                'details': {'rows': len(df), 'columns': list(df.columns)}
            })

            # Clean dataframe
            df = HSAReportParser.clean_dataframe(df)

            # Remove rows where Employee is empty
            df = df[df['Employee'].notna() & (df['Employee'].astype(str).str.strip() != '')]

            logs.append({
                'level': 'info',
                'message': f'After cleaning: {len(df)} rows',
                'details': {'rows': len(df)}
            })

            # Validate structure
            is_valid, errors = validate_file_structure(df.columns.tolist(), config)
            if not is_valid:
                for error in errors:
                    logs.append({
                        'level': 'error',
                        'message': error,
                        'details': {}
                    })
                raise HTTPException(status_code=400, detail=f"File structure validation failed: {'; '.join(errors)}")

            # Convert data types - clean currency and numeric values
            for col in ['Gross Pay', 'Pre Tax', 'Post', 'ER', 'Total', 'Hours']:
                if col in df.columns:
                    # Remove currency symbols, commas, and convert to float
                    df[col] = df[col].astype(str).str.replace('$', '').str.replace(',', '').str.strip()
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)

            # Clean employee ID column
            if 'Emp Id' in df.columns:
                df['Emp Id'] = df['Emp Id'].astype(str).str.strip()

            logs.append({
                'level': 'info',
                'message': 'Data types converted successfully',
                'details': {}
            })

            # Validate data quality
            issues = HSAReportParser.validate_data_quality(df, config)
            for issue in issues:
                logs.append(issue)

            # Check for critical errors
            critical_errors = [i for i in issues if i['level'] == 'error']
            if critical_errors:
                error_messages = [i['message'] for i in critical_errors]
                raise HTTPException(
                    status_code=400,
                    detail=f"Data validation failed: {'; '.join(error_messages)}"
                )

            # Calculate summary statistics
            total_employees = len(df)
            total_gross_pay = df['Gross Pay'].sum() if 'Gross Pay' in df.columns else 0
            total_pre_tax = df['Pre Tax'].sum() if 'Pre Tax' in df.columns else 0
            total_employer = df['ER'].sum() if 'ER' in df.columns else 0
            total_contributions = df['Total'].sum() if 'Total' in df.columns else 0

            logs.append({
                'level': 'success',
                'message': f'HSA Report parsed successfully: {total_employees} employees, ${total_gross_pay:,.2f} gross pay, ${total_contributions:,.2f} total HSA contributions',
                'details': {
                    'employee_count': total_employees,
                    'total_gross_pay': round(total_gross_pay, 2),
                    'total_pre_tax': round(total_pre_tax, 2),
                    'total_employer': round(total_employer, 2),
                    'total_contributions': round(total_contributions, 2)
                }
            })

            return df, config, logs

        except HTTPException:
            raise
        except Exception as e:
            logs.append({
                'level': 'error',
                'message': f'Error parsing HSA Report: {str(e)}',
                'details': {'error': str(e)}
            })
            raise HTTPException(status_code=400, detail=f"Error parsing HSA Report: {str(e)}")


class DeductionListingParser(HRFileParser):
    """Parser for Deduction Listing Report PDFs"""

    @staticmethod
    async def parse(file_path: str) -> Tuple[pd.DataFrame, FileTypeConfig, List[Dict]]:
        """
        Parse Deduction Listing Report PDF with multiple deduction type sections
        Returns: (dataframe, config, logs)
        """
        logs = []
        config = get_file_config(FileCategory.DEDUCTION_LISTING)

        try:
            all_rows = []
            headers = ['Employee', 'ID', 'SSN', 'Location', 'Amount', 'Deduction Type', 'Deduction Description']

            current_deduction_type = None
            current_deduction_description = None

            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if not text:
                        continue

                    lines = text.split('\n')

                    for line in lines:
                        line = line.strip()

                        # Skip empty lines
                        if not line:
                            continue

                        # Skip report metadata lines
                        if any(skip in line for skip in [
                            'Deduction Listing',
                            'Check Date:',
                            'Pay Period:',
                            'Page',
                            'Process:',
                            'Report Total',
                            'Deduction Code',
                            'Total Number'
                        ]):
                            continue

                        # Detect deduction type header: "CODE -- Description"
                        if ' -- ' in line and 'Company:' not in line and 'Totals for' not in line:
                            parts = line.split(' -- ', 1)
                            if len(parts) == 2:
                                current_deduction_type = parts[0].strip()
                                current_deduction_description = parts[1].strip()
                                logs.append({
                                    'level': 'info',
                                    'message': f'Found deduction type: {current_deduction_type} - {current_deduction_description}',
                                    'details': {}
                                })
                                continue

                        # Skip company code line
                        if line.startswith('Company:'):
                            continue

                        # Skip column header line
                        if 'Employee' in line and 'ID' in line and 'SSN' in line and 'Location' in line and 'Amount' in line:
                            continue

                        # Skip section totals
                        if line.startswith('Totals for') or 'Employees' in line:
                            continue

                        # Parse employee deduction records
                        # Pattern: LastName, FirstName [MiddleInitial.]  ID  SSN  Location  $Amount
                        if current_deduction_type:
                            # Match employee name, ID, and remaining data
                            match = re.match(r'^(.+?,\s+\S+(?:\s+\S\.)?)\s+(\d+)\s+(.+)$', line)

                            if match:
                                try:
                                    employee_name = match.group(1).strip()
                                    emp_id = match.group(2).strip()
                                    remaining_values = match.group(3).strip()

                                    # Split remaining values: SSN Location Amount
                                    values = remaining_values.split()

                                    if len(values) >= 2:
                                        # Last value is amount (with $ and commas)
                                        amount_str = values[-1]

                                        # Location is second to last (or may be combined with others)
                                        location = values[-2] if len(values) >= 2 else ''

                                        # SSN is everything before location (may have spaces or dashes)
                                        ssn = ' '.join(values[:-2]) if len(values) > 2 else ''

                                        # Clean amount
                                        amount_str = amount_str.replace('$', '').replace(',', '').strip()

                                        row = {
                                            'Employee': employee_name,
                                            'ID': emp_id,
                                            'SSN': ssn,
                                            'Location': location,
                                            'Amount': amount_str,
                                            'Deduction Type': current_deduction_type,
                                            'Deduction Description': current_deduction_description
                                        }
                                        all_rows.append(row)

                                except (IndexError, ValueError) as e:
                                    logger.debug(f"Skipping line that couldn't be parsed: {line}: {e}")

            if not all_rows:
                logs.append({
                    'level': 'error',
                    'message': 'No deduction records found in PDF',
                    'details': {}
                })
                raise HTTPException(status_code=400, detail="No deduction records found in PDF")

            # Create DataFrame
            df = pd.DataFrame(all_rows, columns=headers)

            # Clean and convert data types
            df = HRFileParser.clean_dataframe(df)

            # Convert Amount to float
            if 'Amount' in df.columns:
                df['Amount'] = df['Amount'].astype(str).str.replace('$', '').str.replace(',', '').str.strip()
                df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce').fillna(0.0)

            # Validate structure
            is_valid, errors = validate_file_structure(df.columns.tolist(), config)
            if not is_valid:
                for error in errors:
                    logs.append({
                        'level': 'error',
                        'message': error,
                        'details': {}
                    })
                raise HTTPException(status_code=400, detail=f"File structure validation failed: {'; '.join(errors)}")

            # Data quality checks
            quality_logs = HRFileParser.validate_data_quality(df, config)
            logs.extend(quality_logs)

            # Calculate summary statistics
            total_employees = len(df)
            unique_employees = df['ID'].nunique()
            unique_deduction_types = df['Deduction Type'].nunique()
            total_deductions = df['Amount'].sum()

            # Group by deduction type
            deduction_summary = df.groupby('Deduction Type').agg({
                'Amount': 'sum',
                'ID': 'count'
            }).round(2).to_dict('index')

            logs.append({
                'level': 'success',
                'message': f'Deduction Listing parsed successfully: {total_employees} records, {unique_employees} employees, {unique_deduction_types} deduction types, ${total_deductions:,.2f} total deductions',
                'details': {
                    'total_records': total_employees,
                    'unique_employees': unique_employees,
                    'unique_deduction_types': unique_deduction_types,
                    'total_deductions': round(total_deductions, 2),
                    'deduction_summary': deduction_summary
                }
            })

            return df, config, logs

        except HTTPException:
            raise
        except Exception as e:
            logs.append({
                'level': 'error',
                'message': f'Error parsing Deduction Listing: {str(e)}',
                'details': {'error': str(e)}
            })
            raise HTTPException(status_code=400, detail=f"Error parsing Deduction Listing: {str(e)}")


class AutoDetectParser:
    """Auto-detect file type and parse accordingly"""

    @staticmethod
    async def parse(file_path: str) -> Tuple[pd.DataFrame, FileTypeConfig, List[Dict]]:
        """
        Auto-detect file type and parse with appropriate parser
        Returns: (dataframe, config, logs)
        """
        logs = []

        try:
            # Read first few rows to detect file type
            if file_path.endswith('.csv'):
                preview_df = pd.read_csv(file_path, nrows=0)  # Just get columns
            else:
                preview_df = pd.read_excel(file_path, engine='openpyxl', nrows=0)

            # Detect category
            category = detect_file_category(preview_df.columns.tolist())

            if category == FileCategory.EMPLOYMENT_LIST:
                logs.append({
                    'level': 'info',
                    'message': 'Auto-detected file type: Employment List Complete',
                    'details': {}
                })
                return await EmploymentListParser.parse(file_path)

            elif category == FileCategory.OT_EARNINGS:
                logs.append({
                    'level': 'info',
                    'message': 'Auto-detected file type: OT Earnings Report',
                    'details': {}
                })
                return await OTEarningsParser.parse(file_path)

            else:
                # Could not detect - try different header rows for OT Earnings
                try:
                    if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
                        preview_df_alt = pd.read_excel(file_path, engine='openpyxl', header=3, nrows=0)
                        category_alt = detect_file_category(preview_df_alt.columns.tolist())

                        if category_alt == FileCategory.OT_EARNINGS:
                            logs.append({
                                'level': 'info',
                                'message': 'Auto-detected file type: OT Earnings Report (alternate header)',
                                'details': {}
                            })
                            return await OTEarningsParser.parse(file_path)
                except:
                    pass

                logs.append({
                    'level': 'error',
                    'message': 'Could not auto-detect file type. Please specify the file category manually.',
                    'details': {'columns_found': list(preview_df.columns)}
                })
                raise HTTPException(
                    status_code=400,
                    detail="Could not auto-detect file type. Please specify the file category."
                )

        except HTTPException:
            raise
        except Exception as e:
            logs.append({
                'level': 'error',
                'message': f'Error during auto-detection: {str(e)}',
                'details': {'error': str(e)}
            })
            raise HTTPException(status_code=400, detail=f"Error during auto-detection: {str(e)}")


# Parser registry
PARSER_REGISTRY = {
    FileCategory.EMPLOYMENT_LIST: EmploymentListParser,
    FileCategory.OT_EARNINGS: OTEarningsParser,
    FileCategory.HSA_REPORT: HSAReportParser,
    FileCategory.DEDUCTION_LISTING: DeductionListingParser,
}


def get_parser(category: FileCategory):
    """Get parser for a file category"""
    return PARSER_REGISTRY.get(category)
