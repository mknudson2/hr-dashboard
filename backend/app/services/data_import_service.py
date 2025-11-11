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
