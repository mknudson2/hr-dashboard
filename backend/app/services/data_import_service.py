"""
Data Import Service
Imports parsed file data into database tables
"""

import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
import logging

from app.db import models
from app.services.file_type_configs import FileTypeConfig, FileCategory, get_file_config
from app.services.file_parsers import get_parser

logger = logging.getLogger(__name__)


class DataImportService:
    """Service for importing parsed data into the database"""

    @staticmethod
    async def import_employment_list(
        df: pd.DataFrame,
        config: FileTypeConfig,
        file_upload_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Import Employment List data into employees table
        """
        imported = 0
        updated = 0
        skipped = 0
        errors = []

        try:
            for idx, row in df.iterrows():
                try:
                    employee_id_str = str(int(row['Employee Id'])) if pd.notna(row['Employee Id']) else None

                    if not employee_id_str:
                        skipped += 1
                        errors.append(f"Row {idx + 1}: Missing Employee ID")
                        continue

                    # Check if employee exists
                    employee = db.query(models.Employee).filter(
                        models.Employee.employee_id == employee_id_str
                    ).first()

                    # Prepare data
                    employee_data = {
                        'employee_id': employee_id_str,
                        'first_name': str(row['Preferred/First Name']) if pd.notna(row['Preferred/First Name']) else None,
                        'last_name': str(row['Last Name']) if pd.notna(row['Last Name']) else None,
                        'department': str(row['Department Description']) if pd.notna(row['Department Description']) else None,
                        'position': str(row['Position Description']) if pd.notna(row['Position Description']) else None,
                        'hire_date': row['Hire Date'].date() if pd.notna(row['Hire Date']) else None,
                        'status': str(row['Employee Status Description']) if pd.notna(row['Employee Status Description']) else 'Active',
                    }

                    # Handle termination
                    if pd.notna(row['Termination Date']):
                        employee_data['termination_date'] = pd.to_datetime(row['Termination Date']).date()
                        employee_data['status'] = 'Terminated'

                    # Additional fields
                    if pd.notna(row['Annual Salary']):
                        employee_data['salary'] = float(row['Annual Salary'])

                    if pd.notna(row['Current Home State']):
                        employee_data['location'] = str(row['Current Home State'])

                    # Employment type
                    if pd.notna(row['Employment Type Description']):
                        emp_type_str = str(row['Employment Type Description']).lower()
                        if 'full' in emp_type_str:
                            employee_data['employment_type'] = 'Full-time'
                        elif 'part' in emp_type_str:
                            employee_data['employment_type'] = 'Part-time'

                    if employee:
                        # Update existing employee
                        for key, value in employee_data.items():
                            if value is not None:  # Only update non-null values
                                setattr(employee, key, value)
                        updated += 1
                    else:
                        # Create new employee
                        employee = models.Employee(**employee_data)
                        db.add(employee)
                        imported += 1

                except Exception as e:
                    skipped += 1
                    errors.append(f"Row {idx + 1}: {str(e)}")
                    logger.warning(f"Error importing row {idx + 1}: {e}")

            # Commit all changes
            db.commit()

            # Update file upload record
            file_upload = db.query(models.FileUpload).filter(
                models.FileUpload.id == file_upload_id
            ).first()

            if file_upload:
                file_upload.status = 'completed'
                file_upload.records_processed = imported + updated
                file_upload.records_failed = skipped
                file_upload.processing_completed_at = datetime.now()
                if errors:
                    file_upload.error_message = '; '.join(errors[:5])  # Store first 5 errors
                db.commit()

            return {
                'status': 'success',
                'imported': imported,
                'updated': updated,
                'skipped': skipped,
                'total': len(df),
                'errors': errors
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error importing employment list: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    @staticmethod
    async def import_ot_earnings(
        df: pd.DataFrame,
        config: FileTypeConfig,
        file_upload_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Import OT Earnings data
        This creates a simple log/record of overtime hours and earnings
        """
        imported = 0
        skipped = 0
        errors = []

        # For now, we'll store this in file_metadata as we don't have a dedicated OT table
        # In a real system, you might create an OvertimeRecord table

        try:
            ot_records = []

            for idx, row in df.iterrows():
                try:
                    employee_id_str = str(int(row['ID'])) if pd.notna(row['ID']) else None

                    if not employee_id_str:
                        skipped += 1
                        errors.append(f"Row {idx + 1}: Missing Employee ID")
                        continue

                    record = {
                        'employee_id': employee_id_str,
                        'employee_name': str(row['Employee']) if pd.notna(row['Employee']) else None,
                        'check_date': row['Chk Date'].isoformat() if pd.notna(row['Chk Date']) else None,
                        'hours': float(row['Hours']) if pd.notna(row['Hours']) else 0.0,
                        'rate': float(row['Rate']) if pd.notna(row['Rate']) else None,
                        'amount': float(row['Amount']) if pd.notna(row['Amount']) else 0.0,
                        'location': str(row['Location']) if pd.notna(row['Location']) else None,
                    }

                    ot_records.append(record)
                    imported += 1

                except Exception as e:
                    skipped += 1
                    errors.append(f"Row {idx + 1}: {str(e)}")
                    logger.warning(f"Error processing OT row {idx + 1}: {e}")

            # Update file upload record with OT data
            file_upload = db.query(models.FileUpload).filter(
                models.FileUpload.id == file_upload_id
            ).first()

            if file_upload:
                file_upload.status = 'completed'
                file_upload.records_processed = imported
                file_upload.records_failed = skipped
                file_upload.processing_completed_at = datetime.now()

                # Store OT records in metadata
                file_upload.file_metadata = {
                    'ot_records': ot_records,
                    'summary': {
                        'total_hours': df['Hours'].sum(),
                        'total_amount': df['Amount'].sum(),
                        'unique_employees': df['ID'].nunique(),
                        'date_range': {
                            'start': df['Chk Date'].min().isoformat() if not df.empty else None,
                            'end': df['Chk Date'].max().isoformat() if not df.empty else None,
                        }
                    }
                }

                if errors:
                    file_upload.error_message = '; '.join(errors[:5])

                db.commit()

            return {
                'status': 'success',
                'imported': imported,
                'updated': 0,
                'skipped': skipped,
                'total': len(df),
                'errors': errors,
                'summary': {
                    'total_hours': float(df['Hours'].sum()),
                    'total_amount': float(df['Amount'].sum()),
                    'unique_employees': int(df['ID'].nunique())
                }
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error importing OT earnings: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    @staticmethod
    async def import_hsa_report(
        df: pd.DataFrame,
        config: FileTypeConfig,
        file_upload_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Import HSA Report data
        Stores HSA contribution records in file metadata
        """
        imported = 0
        skipped = 0
        errors = []

        try:
            hsa_records = []

            for idx, row in df.iterrows():
                try:
                    employee_id_str = str(row['Emp Id']).strip() if pd.notna(row['Emp Id']) else None

                    if not employee_id_str:
                        skipped += 1
                        errors.append(f"Row {idx + 1}: Missing Employee ID")
                        continue

                    record = {
                        'employee_id': employee_id_str,
                        'employee_name': str(row['Employee']).strip() if pd.notna(row['Employee']) else None,
                        'ssn': str(row['SSN']).strip() if pd.notna(row.get('SSN')) else None,
                        'deferral_rate': str(row['Deferral Rate']).strip() if pd.notna(row.get('Deferral Rate')) else None,
                        'hours': float(row['Hours']) if pd.notna(row.get('Hours')) else 0.0,
                        'gross_pay': float(row['Gross Pay']) if pd.notna(row['Gross Pay']) else 0.0,
                        'pre_tax': float(row['Pre Tax']) if pd.notna(row['Pre Tax']) else 0.0,
                        'post_tax': float(row['Post']) if pd.notna(row.get('Post')) else 0.0,
                        'employer_contribution': float(row['ER']) if pd.notna(row.get('ER')) else 0.0,
                        'total': float(row['Total']) if pd.notna(row['Total']) else 0.0,
                    }

                    hsa_records.append(record)
                    imported += 1

                except Exception as e:
                    skipped += 1
                    errors.append(f"Row {idx + 1}: {str(e)}")
                    logger.warning(f"Error processing HSA row {idx + 1}: {e}")

            # Update file upload record with HSA data
            file_upload = db.query(models.FileUpload).filter(
                models.FileUpload.id == file_upload_id
            ).first()

            if file_upload:
                file_upload.status = 'completed'
                file_upload.records_processed = imported
                file_upload.records_failed = skipped
                file_upload.processing_completed_at = datetime.now()

                # Store HSA records in metadata
                total_gross_pay = df['Gross Pay'].sum() if 'Gross Pay' in df.columns else 0
                total_pre_tax = df['Pre Tax'].sum() if 'Pre Tax' in df.columns else 0
                total_post_tax = df['Post'].sum() if 'Post' in df.columns else 0
                total_employer = df['ER'].sum() if 'ER' in df.columns else 0
                total_contributions = df['Total'].sum() if 'Total' in df.columns else 0

                file_upload.file_metadata = {
                    'hsa_records': hsa_records,
                    'summary': {
                        'total_employees': len(df),
                        'total_gross_pay': round(total_gross_pay, 2),
                        'total_pre_tax': round(total_pre_tax, 2),
                        'total_post_tax': round(total_post_tax, 2),
                        'total_employer': round(total_employer, 2),
                        'total_contributions': round(total_contributions, 2),
                    }
                }

                if errors:
                    file_upload.error_message = '; '.join(errors[:5])

                db.commit()

            return {
                'status': 'success',
                'imported': imported,
                'updated': 0,
                'skipped': skipped,
                'total': len(df),
                'errors': errors,
                'summary': {
                    'total_employees': len(df),
                    'total_gross_pay': float(total_gross_pay),
                    'total_pre_tax': float(total_pre_tax),
                    'total_employer': float(total_employer),
                    'total_contributions': float(total_contributions)
                }
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error importing HSA report: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    @staticmethod
    async def import_deduction_listing(
        df: pd.DataFrame,
        config: FileTypeConfig,
        file_upload_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Import Deduction Listing data
        Stores deduction records in file metadata
        """
        imported = 0
        skipped = 0
        errors = []

        try:
            deduction_records = []

            for idx, row in df.iterrows():
                try:
                    employee_id_str = str(row['ID']).strip() if pd.notna(row['ID']) else None

                    if not employee_id_str:
                        skipped += 1
                        errors.append(f"Row {idx + 1}: Missing Employee ID")
                        continue

                    record = {
                        'employee_id': employee_id_str,
                        'employee_name': str(row['Employee']).strip() if pd.notna(row['Employee']) else None,
                        'ssn': str(row['SSN']).strip() if pd.notna(row.get('SSN')) else None,
                        'location': str(row['Location']).strip() if pd.notna(row['Location']) else None,
                        'amount': float(row['Amount']) if pd.notna(row['Amount']) else 0.0,
                        'deduction_type': str(row['Deduction Type']).strip() if pd.notna(row['Deduction Type']) else None,
                        'deduction_description': str(row['Deduction Description']).strip() if pd.notna(row['Deduction Description']) else None,
                    }

                    deduction_records.append(record)
                    imported += 1

                except Exception as e:
                    skipped += 1
                    errors.append(f"Row {idx + 1}: {str(e)}")
                    logger.warning(f"Error processing deduction row {idx + 1}: {e}")

            # Update file upload record with deduction data
            file_upload = db.query(models.FileUpload).filter(
                models.FileUpload.id == file_upload_id
            ).first()

            if file_upload:
                file_upload.status = 'completed'
                file_upload.records_processed = imported
                file_upload.records_failed = skipped
                file_upload.processing_completed_at = datetime.now()

                # Calculate summary by deduction type
                df_summary = df.groupby('Deduction Type').agg({
                    'Amount': 'sum',
                    'ID': 'count'
                }).reset_index()

                deduction_type_summary = {}
                for _, summary_row in df_summary.iterrows():
                    deduction_type_summary[summary_row['Deduction Type']] = {
                        'total_amount': round(float(summary_row['Amount']), 2),
                        'employee_count': int(summary_row['ID'])
                    }

                # Store deduction records in metadata
                file_upload.file_metadata = {
                    'deduction_records': deduction_records,
                    'summary': {
                        'total_records': len(df),
                        'unique_employees': int(df['ID'].nunique()),
                        'unique_deduction_types': int(df['Deduction Type'].nunique()),
                        'total_deductions': round(float(df['Amount'].sum()), 2),
                        'by_deduction_type': deduction_type_summary
                    }
                }

                if errors:
                    file_upload.error_message = '; '.join(errors[:5])

                db.commit()

            return {
                'status': 'success',
                'imported': imported,
                'updated': 0,
                'skipped': skipped,
                'total': len(df),
                'errors': errors,
                'summary': {
                    'total_records': len(df),
                    'unique_employees': int(df['ID'].nunique()),
                    'unique_deduction_types': int(df['Deduction Type'].nunique()),
                    'total_deductions': float(df['Amount'].sum())
                }
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error importing deduction listing: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    @staticmethod
    @staticmethod
    async def import_compensation_history(
        df: pd.DataFrame,
        config: FileTypeConfig,
        file_upload_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Import compensation/pay rate history into wage_history table.
        Also updates each employee's current wage, hourly_wage, annual_wage,
        and wage_effective_date from their most recent entry.
        """
        imported = 0
        skipped = 0
        errors = []

        def parse_date(val):
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return None
            if str(val).strip().lower() == 'nat':
                return None
            if hasattr(val, 'date'):
                return val.date()
            if hasattr(val, 'year'):
                return val
            if isinstance(val, str):
                val = val.strip()
                for fmt in ['%m/%d/%Y', '%Y-%m-%d', '%Y-%m-%d %H:%M:%S', '%m-%d-%Y']:
                    try:
                        return datetime.strptime(val, fmt).date()
                    except ValueError:
                        continue
            return None

        try:
            # Track latest rate per employee to update current compensation
            latest_by_employee: Dict[str, dict] = {}

            for idx, row in df.iterrows():
                try:
                    emp_id = str(row.get('Employee Id', '')).strip()
                    if emp_id.endswith('.0'):
                        emp_id = emp_id[:-2]
                    if not emp_id:
                        skipped += 1
                        errors.append(f"Row {idx + 2}: Missing Employee Id")
                        continue

                    base_rate = row.get('Base Rate')
                    if pd.isna(base_rate) or not base_rate:
                        skipped += 1
                        errors.append(f"Row {idx + 2}: Missing Base Rate")
                        continue
                    base_rate = float(base_rate)

                    effective_date = parse_date(row.get('Pay Rate Effective Date'))
                    start_date = parse_date(row.get('Pay Rate Start Date'))
                    end_date = parse_date(row.get('Pay Rate End Date'))
                    change_reason = str(row.get('Pay Rate Change Reason', '')).strip() if pd.notna(row.get('Pay Rate Change Reason')) else None
                    wage_unit = str(row.get('Base Rate Per Unit', '')).strip() if pd.notna(row.get('Base Rate Per Unit')) else None
                    annual_salary = float(row['Annual Salary']) if pd.notna(row.get('Annual Salary')) and row.get('Annual Salary') else None

                    # Check for duplicate (same employee + effective_date + wage)
                    existing = db.query(models.WageHistory).filter(
                        models.WageHistory.employee_id == emp_id,
                        models.WageHistory.effective_date == effective_date,
                        models.WageHistory.wage == base_rate
                    ).first()
                    if existing:
                        skipped += 1
                        continue

                    record = models.WageHistory(
                        employee_id=emp_id,
                        effective_date=effective_date,
                        pay_rate_start_date=start_date,
                        pay_rate_end_date=end_date,
                        wage=base_rate,
                        wage_unit=wage_unit,
                        annual_salary=annual_salary,
                        change_reason=change_reason,
                    )
                    db.add(record)
                    imported += 1

                    # Track the most recent entry per employee (by effective_date)
                    if emp_id not in latest_by_employee or (
                        effective_date and (
                            latest_by_employee[emp_id]['effective_date'] is None or
                            effective_date > latest_by_employee[emp_id]['effective_date']
                        )
                    ):
                        latest_by_employee[emp_id] = {
                            'effective_date': effective_date,
                            'start_date': start_date,
                            'wage': base_rate,
                            'annual_salary': annual_salary,
                        }

                except Exception as e:
                    skipped += 1
                    errors.append(f"Row {idx + 2}: {str(e)}")
                    logger.warning(f"Error importing comp history row {idx + 2}: {e}")

            db.flush()

            # Compute change_amount and change_percentage for each employee's records
            for emp_id in latest_by_employee:
                records = db.query(models.WageHistory).filter(
                    models.WageHistory.employee_id == emp_id
                ).order_by(models.WageHistory.effective_date.asc()).all()

                prev_wage = None
                for rec in records:
                    if prev_wage is not None and rec.wage and prev_wage > 0:
                        rec.change_amount = round(rec.wage - prev_wage, 4)
                        rec.change_percentage = round(((rec.wage - prev_wage) / prev_wage) * 100, 2)
                    prev_wage = rec.wage if rec.wage else prev_wage

            # Update each employee's current compensation from their latest rate
            employees_updated = 0
            for emp_id, latest in latest_by_employee.items():
                emp = db.query(models.Employee).filter(
                    models.Employee.employee_id == emp_id
                ).first()
                if emp:
                    emp.wage = latest['wage']
                    emp.hourly_wage = latest['wage']
                    if latest['start_date']:
                        emp.wage_effective_date = latest['start_date']
                    elif latest['effective_date']:
                        emp.wage_effective_date = latest['effective_date']
                    # Recalculate annual wage
                    emp_type = str(emp.type or '').lower()
                    if latest['annual_salary'] and latest['annual_salary'] > 0 and 'part time' not in emp_type:
                        emp.annual_wage = latest['annual_salary']
                    elif 'part time' in emp_type or 'part-time' in emp_type:
                        emp.annual_wage = round(latest['wage'] * 1040, 2)
                    else:
                        emp.annual_wage = round(latest['wage'] * 2080, 2)
                    employees_updated += 1

            db.commit()

            # Update file upload record
            file_upload = db.query(models.FileUpload).filter(
                models.FileUpload.id == file_upload_id
            ).first()
            if file_upload:
                file_upload.status = 'completed'
                file_upload.records_processed = imported
                file_upload.records_failed = skipped
                file_upload.processing_completed_at = datetime.now()
                file_upload.file_metadata = {
                    'import_stats': {
                        'records_imported': imported,
                        'records_skipped': skipped,
                        'unique_employees': len(latest_by_employee),
                        'employees_updated': employees_updated,
                    }
                }
                if errors:
                    file_upload.error_message = '; '.join(errors[:5])
                db.commit()

            return {
                'status': 'success',
                'imported': imported,
                'updated': employees_updated,
                'skipped': skipped,
                'total': len(df),
                'errors': errors,
                'summary': {
                    'records_imported': imported,
                    'unique_employees': len(latest_by_employee),
                    'employees_updated': employees_updated,
                }
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error importing compensation history: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    @staticmethod
    async def import_file_data(
        file_upload_id: int,
        db: Session,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Main import function - parses file and imports data based on category

        Args:
            file_upload_id: ID of the file upload record
            db: Database session
            dry_run: If True, parse but don't import data

        Returns:
            Import statistics and results
        """
        # Get file upload record
        file_upload = db.query(models.FileUpload).filter(
            models.FileUpload.id == file_upload_id
        ).first()

        if not file_upload:
            raise HTTPException(status_code=404, detail="File upload not found")

        if not file_upload.file_category:
            raise HTTPException(
                status_code=400,
                detail="File has not been parsed yet. Please parse the file first."
            )

        try:
            # Get category and config
            category = FileCategory(file_upload.file_category)
            config = get_file_config(category)

            if not config:
                raise HTTPException(
                    status_code=400,
                    detail=f"No configuration found for category: {category}"
                )

            # Parse file
            parser_class = get_parser(category)
            if not parser_class:
                raise HTTPException(
                    status_code=400,
                    detail=f"No parser found for category: {category}"
                )

            df, config, logs = await parser_class.parse(file_upload.file_path)

            if dry_run:
                return {
                    'status': 'dry_run',
                    'category': category.value,
                    'rows': len(df),
                    'columns': len(df.columns),
                    'preview': df.head(10).to_dict('records')
                }

            # Import based on category
            if category == FileCategory.EMPLOYMENT_LIST:
                result = await DataImportService.import_employment_list(
                    df, config, file_upload_id, db
                )
            elif category == FileCategory.OT_EARNINGS:
                result = await DataImportService.import_ot_earnings(
                    df, config, file_upload_id, db
                )
            elif category == FileCategory.HSA_REPORT:
                result = await DataImportService.import_hsa_report(
                    df, config, file_upload_id, db
                )
            elif category == FileCategory.DEDUCTION_LISTING:
                result = await DataImportService.import_deduction_listing(
                    df, config, file_upload_id, db
                )
            elif category == FileCategory.COMPENSATION_HISTORY:
                result = await DataImportService.import_compensation_history(
                    df, config, file_upload_id, db
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Import not implemented for category: {category}"
                )

            # Create import history record
            import_history = models.DataImportHistory(
                file_upload_id=file_upload_id,
                import_type=category.value,
                records_imported=result.get('imported', 0),
                records_updated=result.get('updated', 0),
                records_failed=result.get('skipped', 0),
                import_status='completed' if result.get('status') == 'success' else 'failed',
                error_log=result.get('errors', [])
            )
            db.add(import_history)
            db.commit()

            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error importing file {file_upload_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    @staticmethod
    async def import_with_custom_mappings(
        file_upload_id: int,
        column_mappings: Dict[str, str],
        db: Session,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Import file data using custom column mappings

        Args:
            file_upload_id: ID of the file upload record
            column_mappings: Dict mapping source columns to database fields
            db: Database session
            dry_run: If True, validate but don't import

        Returns:
            Import statistics and results
        """
        from app.services.column_mapping_service import column_mapping_service
        from app.services.file_upload_service import CSVParser, ExcelParser

        # Get file upload record
        file_upload = db.query(models.FileUpload).filter(
            models.FileUpload.id == file_upload_id
        ).first()

        if not file_upload:
            raise HTTPException(status_code=404, detail="File upload not found")

        # Update status to processing
        file_upload.status = 'processing'
        file_upload.processing_started_at = datetime.now()
        db.commit()

        imported = 0
        updated = 0
        skipped = 0
        errors = []

        try:
            # Parse file based on type
            if file_upload.file_type == 'csv':
                parser = CSVParser()
            elif file_upload.file_type in ['xlsx', 'xls']:
                parser = ExcelParser()
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file_upload.file_type}"
                )

            # Parse the file
            df, _logs = await parser.parse(file_upload.file_path)
            # Convert DataFrame to list of dicts
            data_rows = df.where(df.notna(), None).to_dict('records')
            total_rows = len(data_rows)

            if dry_run:
                # Validate and return preview
                preview_data = []
                for row in data_rows[:10]:
                    mapped_row = column_mapping_service.apply_mappings(row, column_mappings)
                    preview_data.append(mapped_row)

                return {
                    'status': 'dry_run',
                    'imported': 0,
                    'updated': 0,
                    'skipped': 0,
                    'total': total_rows,
                    'errors': [],
                    'preview': preview_data
                }

            # Process each row
            for idx, row in enumerate(data_rows):
                try:
                    # Apply column mappings
                    mapped_data = column_mapping_service.apply_mappings(row, column_mappings)

                    # Get employee_id - required field
                    employee_id = mapped_data.get('employee_id')
                    if not employee_id:
                        skipped += 1
                        errors.append(f"Row {idx + 2}: Missing employee_id")
                        continue

                    # Convert to string and clean
                    employee_id = str(employee_id).strip()
                    if employee_id.endswith('.0'):
                        employee_id = employee_id[:-2]

                    mapped_data['employee_id'] = employee_id

                    # Parse dates
                    date_fields = ['hire_date', 'termination_date', 'birth_date', 'rehire_date', 'original_hire_date', 'wage_effective_date']
                    for date_field in date_fields:
                        if date_field not in mapped_data:
                            continue
                        date_val = mapped_data[date_field]
                        # Handle None, empty, NaT, and "NaT" string
                        if date_val is None or date_val == "" or str(date_val).strip().lower() == "nat":
                            mapped_data[date_field] = None
                            continue
                        try:
                            # Handle native datetime/Timestamp objects
                            if hasattr(date_val, 'date'):
                                mapped_data[date_field] = date_val.date()
                            elif hasattr(date_val, 'year'):
                                # Already a date object
                                mapped_data[date_field] = date_val
                            elif isinstance(date_val, str):
                                # Try various date formats
                                for fmt in ['%Y-%m-%d', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y', '%m-%d-%Y', '%d/%m/%Y']:
                                    try:
                                        parsed = datetime.strptime(date_val.strip(), fmt)
                                        mapped_data[date_field] = parsed.date()
                                        break
                                    except ValueError:
                                        continue
                                else:
                                    mapped_data[date_field] = None
                            else:
                                mapped_data[date_field] = None
                        except Exception:
                            mapped_data[date_field] = None

                    # Composite location from address components if not directly mapped
                    if not mapped_data.get('location'):
                        loc_parts = []
                        state = mapped_data.get('address_state')
                        zip_code = mapped_data.get('address_zip')
                        country = mapped_data.get('address_country')
                        if state:
                            loc_parts.append(str(state).strip())
                        if zip_code:
                            loc_parts.append(str(zip_code).strip())
                        if country:
                            country_val = str(country).strip()
                            # Only append country if it's not a US variant
                            if country_val and country_val.upper() not in ('US', 'USA', 'UNITED STATES'):
                                loc_parts.append(country_val)
                        if loc_parts:
                            mapped_data['location'] = ", ".join(loc_parts)

                    # Derive compensation fields from base rate
                    base_rate = mapped_data.get('wage')
                    if base_rate and isinstance(base_rate, (int, float)) and base_rate > 0:
                        # hourly_wage = base rate
                        if not mapped_data.get('hourly_wage'):
                            mapped_data['hourly_wage'] = base_rate
                        # annual_wage: part time always uses ×1040, others use
                        # imported Annual Salary if > 0, otherwise ×2080
                        emp_type = str(mapped_data.get('type') or '').lower()
                        if 'part time' in emp_type or 'part-time' in emp_type:
                            mapped_data['annual_wage'] = round(base_rate * 1040, 2)
                        else:
                            annual = mapped_data.get('annual_wage')
                            if not annual or annual <= 0:
                                mapped_data['annual_wage'] = round(base_rate * 2080, 2)

                    # Check if employee exists
                    existing_employee = db.query(models.Employee).filter(
                        models.Employee.employee_id == employee_id
                    ).first()

                    if existing_employee:
                        # Update existing employee
                        for key, value in mapped_data.items():
                            if value is not None and hasattr(existing_employee, key):
                                setattr(existing_employee, key, value)
                        updated += 1
                    else:
                        # Create new employee
                        # Filter to only valid model fields
                        valid_fields = {k: v for k, v in mapped_data.items()
                                       if hasattr(models.Employee, k) and v is not None}
                        new_employee = models.Employee(**valid_fields)
                        db.add(new_employee)
                        imported += 1

                except Exception as e:
                    skipped += 1
                    errors.append(f"Row {idx + 2}: {str(e)}")
                    logger.warning(f"Error importing row {idx + 2}: {e}")

            # Commit employee records first
            db.commit()

            # Resolve supervisor employee codes to names
            # If "Supervisor's Employee Code" was mapped to supervisor, values will
            # be employee IDs — look up each one and replace with the actual name.
            if any(v == 'supervisor' for v in column_mappings.values()):
                all_employees = db.query(models.Employee).all()
                emp_name_map = {
                    str(emp.employee_id): f"{emp.first_name} {emp.last_name}".strip()
                    for emp in all_employees
                    if emp.first_name or emp.last_name
                }
                resolved_count = 0
                for emp in all_employees:
                    sup = str(emp.supervisor).strip() if emp.supervisor else None
                    if sup and sup in emp_name_map:
                        emp.supervisor = emp_name_map[sup]
                        resolved_count += 1
                if resolved_count:
                    db.commit()
                    logger.info(f"Resolved {resolved_count} supervisor codes to names")

            # Update file upload record
            file_upload.status = 'completed'
            file_upload.records_processed = imported + updated
            file_upload.records_failed = skipped
            file_upload.processing_completed_at = datetime.now()

            # Store the column mappings used
            file_upload.file_metadata = {
                'column_mappings_used': column_mappings,
                'import_stats': {
                    'imported': imported,
                    'updated': updated,
                    'skipped': skipped,
                    'total': total_rows
                }
            }

            if errors:
                file_upload.error_message = '; '.join(errors[:10])

            db.commit()

            return {
                'status': 'success',
                'imported': imported,
                'updated': updated,
                'skipped': skipped,
                'total': total_rows,
                'errors': errors[:50]  # Limit errors returned
            }

        except HTTPException:
            raise
        except Exception as e:
            # Update file upload with error
            file_upload.status = 'failed'
            file_upload.error_message = str(e)
            file_upload.processing_completed_at = datetime.now()
            db.commit()

            logger.error(f"Error importing file {file_upload_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
