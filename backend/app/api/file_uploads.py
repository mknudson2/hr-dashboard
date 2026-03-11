"""
File Uploads API
Handles file upload, processing, and management endpoints
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel
from pathlib import Path

from app.db import database, models
from app.api.auth import get_current_user
from app.services.file_upload_service import (
    FileUploadService,
    CSVParser,
    ExcelParser,
    PDFParser,
    DocxParser
)
from app.services.data_import_service import DataImportService
from app.services import paylocity_ingest

router = APIRouter(
    prefix="/file-uploads",
    tags=["File Uploads"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class FileUploadResponse(BaseModel):
    id: int
    file_name: str
    original_filename: str
    file_type: str
    file_size: int
    status: str
    uploaded_by: str
    uploaded_at: datetime
    records_processed: int
    records_failed: int
    error_message: Optional[str]

    class Config:
        from_attributes = True


class FileUploadDetailResponse(FileUploadResponse):
    file_path: str
    mime_type: Optional[str]
    upload_source: str
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    records_skipped: int
    target_table: Optional[str]
    file_metadata: Optional[dict]


class ProcessingLogResponse(BaseModel):
    id: int
    log_level: str
    log_message: str
    log_details: Optional[dict]
    row_number: Optional[int]
    column_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FileUploadStatsResponse(BaseModel):
    total_uploads: int
    pending: int
    processing: int
    completed: int
    failed: int
    total_size_mb: float
    recent_uploads: List[FileUploadResponse]


class PreviewResponse(BaseModel):
    columns: List[str]
    sample_data: List[dict]
    row_count: int
    file_type: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    uploaded_by: str = Query(default="system"),
    file_category: Optional[str] = Query(None, description="File category: employment_list, ot_earnings, etc."),
    db: Session = Depends(database.get_db)
):
    """
    Upload a single file (CSV, XLSX, DOCX, PDF)

    Security features:
    - File size validation (max 50MB)
    - Extension validation
    - MIME type validation (optional)
    - Filename sanitization
    - Secure UUID-based storage

    Optional file_category can be specified to hint at the file type:
    - employment_list: Complete employee roster
    - ot_earnings: Overtime earnings report
    - (more categories can be added)
    """
    try:
        # Upload and validate file
        file_upload = await FileUploadService.upload_and_validate(
            upload_file=file,
            uploaded_by=uploaded_by,
            file_category=file_category,
            db=db
        )

        return FileUploadResponse.model_validate(file_upload)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/batch-upload", response_model=List[FileUploadResponse])
async def batch_upload_files(
    files: List[UploadFile] = File(...),
    uploaded_by: str = Query(default="system"),
    db: Session = Depends(database.get_db)
):
    """
    Upload multiple files at once

    Returns list of upload results (successful and failed)
    """
    results = []
    errors = []

    for file in files:
        try:
            file_upload = await FileUploadService.upload_and_validate(
                upload_file=file,
                uploaded_by=uploaded_by,
                db=db
            )
            results.append(FileUploadResponse.model_validate(file_upload))
        except Exception as e:
            errors.append({
                'filename': file.filename,
                'error': str(e)
            })

    # If all files failed, raise error
    if len(results) == 0 and len(errors) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"All uploads failed: {errors}"
        )

    return results


@router.get("/", response_model=List[FileUploadResponse])
async def list_uploads(
    status: Optional[str] = Query(None, description="Filter by status: pending, processing, completed, failed"),
    file_type: Optional[str] = Query(None, description="Filter by file type: csv, xlsx, docx, pdf"),
    uploaded_by: Optional[str] = Query(None, description="Filter by uploader"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(database.get_db)
):
    """
    List all file uploads with optional filters

    Supports pagination and filtering by:
    - status (pending, processing, completed, failed)
    - file_type (csv, xlsx, docx, pdf)
    - uploaded_by (username)
    """
    query = db.query(models.FileUpload).filter(
        models.FileUpload.is_deleted == False
    )

    # Apply filters
    if status:
        query = query.filter(models.FileUpload.status == status)
    if file_type:
        query = query.filter(models.FileUpload.file_type == file_type)
    if uploaded_by:
        query = query.filter(models.FileUpload.uploaded_by == uploaded_by)

    # Order by most recent first
    query = query.order_by(models.FileUpload.uploaded_at.desc())

    # Apply pagination
    uploads = query.offset(offset).limit(limit).all()

    return [FileUploadResponse.model_validate(u) for u in uploads]


@router.get("/{file_id}", response_model=FileUploadDetailResponse)
async def get_upload_detail(
    file_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Get detailed information about a specific upload
    """
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id,
        models.FileUpload.is_deleted == False
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    return FileUploadDetailResponse.model_validate(upload)


@router.get("/{file_id}/logs", response_model=List[ProcessingLogResponse])
async def get_upload_logs(
    file_id: int,
    log_level: Optional[str] = Query(None, description="Filter by log level: info, warning, error, debug"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(database.get_db)
):
    """
    Get processing logs for a specific upload
    """
    # Verify upload exists
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    # Query logs
    query = db.query(models.FileProcessingLog).filter(
        models.FileProcessingLog.file_upload_id == file_id
    )

    if log_level:
        query = query.filter(models.FileProcessingLog.log_level == log_level)

    logs = query.order_by(models.FileProcessingLog.created_at.asc()).limit(limit).all()

    return [ProcessingLogResponse.model_validate(log) for log in logs]


@router.post("/{file_id}/preview", response_model=PreviewResponse)
async def preview_file(
    file_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Preview file contents (first 10 rows for CSV/XLSX)

    Shows column headers and sample data for validation before processing
    """
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id,
        models.FileUpload.is_deleted == False
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    try:
        if upload.file_type in ['csv', 'xlsx', 'xls']:
            # Parse file
            if upload.file_type == 'csv':
                df, logs = await CSVParser.parse(upload.file_path)
            else:
                df, logs = await ExcelParser.parse(upload.file_path)

            # Get preview data
            preview_rows = df.head(10).to_dict('records')
            columns = list(df.columns)
            row_count = len(df)

            return PreviewResponse(
                columns=columns,
                sample_data=preview_rows,
                row_count=row_count,
                file_type=upload.file_type
            )

        elif upload.file_type == 'pdf':
            text, logs = await PDFParser.parse(upload.file_path)
            return PreviewResponse(
                columns=['text'],
                sample_data=[{'text': text[:1000] + '...' if len(text) > 1000 else text}],
                row_count=1,
                file_type='pdf'
            )

        elif upload.file_type == 'docx':
            text, logs = await DocxParser.parse(upload.file_path)
            return PreviewResponse(
                columns=['text'],
                sample_data=[{'text': text[:1000] + '...' if len(text) > 1000 else text}],
                row_count=1,
                file_type='docx'
            )

        else:
            raise HTTPException(status_code=400, detail=f"Preview not supported for {upload.file_type}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.delete("/{file_id}")
async def delete_upload(
    file_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Soft delete a file upload record

    The actual file remains on disk for audit purposes
    """
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    # Soft delete
    upload.is_deleted = True
    upload.deleted_at = datetime.now()
    db.commit()

    return {"message": f"Upload {file_id} deleted successfully"}


@router.post("/{file_id}/process")
async def process_employee_file(
    file_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Process uploaded employee data file and import to database

    Triggers the Paylocity ingest process for the uploaded file
    """
    # Get upload record
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id,
        models.FileUpload.is_deleted == False
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    # Check file type
    if upload.file_type not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot process {upload.file_type} files. Only CSV and Excel files supported."
        )

    # Check status
    if upload.status == 'processing':
        raise HTTPException(status_code=400, detail="File is already being processed")

    if upload.status == 'completed':
        raise HTTPException(status_code=400, detail="File has already been processed")

    try:
        # Process the file
        success, message, stats = paylocity_ingest.process_single_file(
            file_path=upload.file_path,
            file_upload_id=file_id,
            db=db
        )

        if success:
            return {
                "success": True,
                "message": message,
                "stats": stats
            }
        else:
            raise HTTPException(status_code=500, detail=message)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/stats/summary", response_model=FileUploadStatsResponse)
async def get_upload_stats(
    db: Session = Depends(database.get_db)
):
    """
    Get file upload statistics

    Returns counts by status, total size, and recent uploads
    """
    # Count by status
    total_uploads = db.query(models.FileUpload).filter(
        models.FileUpload.is_deleted == False
    ).count()

    pending = db.query(models.FileUpload).filter(
        models.FileUpload.status == 'pending',
        models.FileUpload.is_deleted == False
    ).count()

    processing = db.query(models.FileUpload).filter(
        models.FileUpload.status == 'processing',
        models.FileUpload.is_deleted == False
    ).count()

    completed = db.query(models.FileUpload).filter(
        models.FileUpload.status == 'completed',
        models.FileUpload.is_deleted == False
    ).count()

    failed = db.query(models.FileUpload).filter(
        models.FileUpload.status == 'failed',
        models.FileUpload.is_deleted == False
    ).count()

    # Calculate total size
    total_size_bytes = db.query(
        func.sum(models.FileUpload.file_size)
    ).filter(
        models.FileUpload.is_deleted == False
    ).scalar() or 0

    total_size_mb = total_size_bytes / (1024 * 1024)

    # Get recent uploads
    recent = db.query(models.FileUpload).filter(
        models.FileUpload.is_deleted == False
    ).order_by(
        models.FileUpload.uploaded_at.desc()
    ).limit(10).all()

    return FileUploadStatsResponse(
        total_uploads=total_uploads,
        pending=pending,
        processing=processing,
        completed=completed,
        failed=failed,
        total_size_mb=round(total_size_mb, 2),
        recent_uploads=[FileUploadResponse.model_validate(u) for u in recent]
    )


# ============================================================================
# COLUMN MAPPING CONFIGURATION
# ============================================================================

class ColumnMappingRequest(BaseModel):
    file_type: str  # 'employee_csv', 'benefits_xlsx', etc.
    target_table: str  # 'employees', 'benefits', etc.
    mappings: dict  # {"source_column": "target_field"}


class ColumnMappingResponse(BaseModel):
    id: int
    rule_name: str
    file_type: str
    target_table: str
    mappings: dict
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/column-mappings", response_model=List[ColumnMappingResponse])
async def get_column_mappings(
    file_type: Optional[str] = Query(None),
    target_table: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    """
    Get column mapping configurations

    Filter by file_type (e.g., 'employee_csv') or target_table (e.g., 'employees')
    """
    query = db.query(models.FileValidationRule).filter(
        models.FileValidationRule.rule_type == 'column_mapping',
        models.FileValidationRule.is_active == True
    )

    if file_type:
        query = query.filter(models.FileValidationRule.file_type == file_type)
    if target_table:
        query = query.filter(models.FileValidationRule.target_table == target_table)

    rules = query.all()

    return [
        ColumnMappingResponse(
            id=rule.id,
            rule_name=rule.rule_name,
            file_type=rule.file_type,
            target_table=rule.target_table,
            mappings=rule.rule_config.get('mappings', {}),
            is_active=rule.is_active,
            created_at=rule.created_at
        )
        for rule in rules
    ]


@router.post("/column-mappings", response_model=ColumnMappingResponse)
async def create_column_mapping(
    mapping: ColumnMappingRequest,
    db: Session = Depends(database.get_db)
):
    """
    Create a new column mapping configuration

    Stores custom column mappings for file processing
    """
    # Check if mapping already exists
    existing = db.query(models.FileValidationRule).filter(
        models.FileValidationRule.file_type == mapping.file_type,
        models.FileValidationRule.target_table == mapping.target_table,
        models.FileValidationRule.rule_type == 'column_mapping'
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Column mapping already exists for {mapping.file_type} -> {mapping.target_table}"
        )

    # Create new validation rule for column mapping
    rule = models.FileValidationRule(
        rule_name=f"{mapping.file_type}_to_{mapping.target_table}",
        file_type=mapping.file_type,
        target_table=mapping.target_table,
        rule_type='column_mapping',
        rule_config={'mappings': mapping.mappings},
        is_active=True,
        severity='info'
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return ColumnMappingResponse(
        id=rule.id,
        rule_name=rule.rule_name,
        file_type=rule.file_type,
        target_table=rule.target_table,
        mappings=rule.rule_config.get('mappings', {}),
        is_active=rule.is_active,
        created_at=rule.created_at
    )


@router.put("/column-mappings/{mapping_id}", response_model=ColumnMappingResponse)
async def update_column_mapping(
    mapping_id: int,
    mappings: dict,
    db: Session = Depends(database.get_db)
):
    """
    Update an existing column mapping configuration
    """
    rule = db.query(models.FileValidationRule).filter(
        models.FileValidationRule.id == mapping_id,
        models.FileValidationRule.rule_type == 'column_mapping'
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Column mapping not found")

    # Update the mappings
    rule.rule_config = {'mappings': mappings}
    rule.updated_at = datetime.now()
    db.commit()
    db.refresh(rule)

    return ColumnMappingResponse(
        id=rule.id,
        rule_name=rule.rule_name,
        file_type=rule.file_type,
        target_table=rule.target_table,
        mappings=rule.rule_config.get('mappings', {}),
        is_active=rule.is_active,
        created_at=rule.created_at
    )


@router.delete("/column-mappings/{mapping_id}")
async def delete_column_mapping(
    mapping_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Delete a column mapping configuration
    """
    rule = db.query(models.FileValidationRule).filter(
        models.FileValidationRule.id == mapping_id,
        models.FileValidationRule.rule_type == 'column_mapping'
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Column mapping not found")

    # Soft delete by setting is_active to False
    rule.is_active = False
    rule.updated_at = datetime.now()
    db.commit()

    return {"message": f"Column mapping {mapping_id} deleted successfully"}


@router.get("/column-mappings/default-employee")
async def get_default_employee_mapping():
    """
    Get the default Paylocity employee column mapping

    Returns the standard column mappings used by the system
    """
    return {
        "file_type": "employee_csv",
        "target_table": "employees",
        "mappings": {
            "Employee Id": "employee_id",
            "Preferred/First Name": "first_name",
            "Last Name": "last_name",
            "Type": "type",
            "Worked CostCenter": "cost_center",
            "Worked Department": "department",
            "Worked Team": "team",
            "Hire Date": "hire_date",
            "Term Date": "termination_date",
            "Termination Type": "termination_type",
            "Status": "status",
            "Location": "location",
            "Rate": "wage"
        }
    }


# ============================================================================
# NEW HR FILE PROCESSING ENDPOINTS
# ============================================================================

class ParseFileResponse(BaseModel):
    """Response from parsing a file"""
    file_upload_id: int
    category: str
    category_name: str
    rows: int
    columns: int
    logs: List[dict]
    data_preview: List[dict]


class ImportFileResponse(BaseModel):
    """Response from importing file data"""
    status: str
    imported: int
    updated: int
    skipped: int
    total: int
    errors: List[str]


@router.post("/{file_id}/parse", response_model=ParseFileResponse)
async def parse_file(
    file_id: int,
    force_category: Optional[str] = Query(None, description="Force file category instead of auto-detect"),
    db: Session = Depends(database.get_db)
):
    """
    Parse an uploaded file and detect its structure

    This endpoint:
    1. Auto-detects or uses forced file category (employment_list, ot_earnings, etc.)
    2. Validates file structure against expected schema
    3. Returns preview of parsed data
    4. Updates file upload record with detected metadata

    Use this before importing to validate the file structure.
    """
    try:
        result = await FileUploadService.parse_and_process(
            file_upload_id=file_id,
            db=db,
            force_category=force_category
        )
        return ParseFileResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse failed: {str(e)}")


@router.post("/{file_id}/import", response_model=ImportFileResponse)
async def import_file_data(
    file_id: int,
    dry_run: bool = Query(False, description="If true, validate but don't import"),
    db: Session = Depends(database.get_db)
):
    """
    Import parsed file data into database

    This endpoint:
    1. Reads the already-parsed file data
    2. Imports data based on file category:
       - employment_list: Creates/updates employees
       - ot_earnings: Stores overtime records
    3. Returns import statistics

    File must be parsed first using /parse endpoint.
    Use dry_run=true to validate without importing.
    """
    try:
        result = await DataImportService.import_file_data(
            file_upload_id=file_id,
            db=db,
            dry_run=dry_run
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/categories")
async def get_file_categories():
    """
    Get list of supported file categories

    Returns available file categories with their configurations
    """
    from app.services.file_type_configs import FILE_TYPE_CONFIGS

    categories = []
    for category, config in FILE_TYPE_CONFIGS.items():
        categories.append({
            'category': category.value,
            'name': config.name,
            'description': config.description,
            'expected_extensions': config.expected_extensions,
            'required_columns': config.required_columns,
            'optional_columns': config.optional_columns
        })

    return categories


# ============================================================================
# FLEXIBLE COLUMN MAPPING ENDPOINTS
# ============================================================================

@router.get("/mapping/available-fields")
async def get_available_fields():
    """
    Get all available database fields that can be mapped to

    Returns fields organized by category with metadata including:
    - db_field: Database column name
    - display_name: Human-readable name
    - description: Field description
    - data_type: Expected data type (string, number, date, boolean)
    - required: Whether field is required
    - example: Example value
    - common_aliases: Common column names that map to this field
    """
    from app.services.column_mapping_service import column_mapping_service

    return {
        "fields": column_mapping_service.get_all_fields(),
        "fields_by_category": column_mapping_service.get_fields_by_category()
    }


@router.post("/{file_id}/detect-mappings")
async def detect_column_mappings(
    file_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Auto-detect column mappings for an uploaded file

    Analyzes the file's column headers and suggests mappings based on:
    - Exact matches to known aliases
    - Fuzzy matching for similar names
    - Common patterns

    Returns:
    - detected_columns: List of columns found in file
    - suggested_mappings: Dict mapping source columns to suggested db fields
    - unmapped_columns: Columns that couldn't be automatically mapped
    - validation_warnings: Any issues found
    """
    from app.services.column_mapping_service import column_mapping_service

    # Get upload record
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id,
        models.FileUpload.is_deleted == False
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    # Parse file to get columns
    try:
        file_path = Path(upload.file_path)

        if upload.file_type in ['csv']:
            parser = CSVParser()
        elif upload.file_type in ['xlsx', 'xls']:
            parser = ExcelParser()
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files support column mapping")

        # Get columns and sample data
        df, _logs = await parser.parse(str(file_path))
        columns = list(df.columns)
        sample_df = df.head(5).where(df.notna(), None)
        sample_data = [
            {k: (None if v != v else v) for k, v in row.items()}
            for row in sample_df.to_dict('records')
        ]

        # Auto-detect file category
        from app.services.file_type_configs import detect_file_category
        detected_category = detect_file_category(columns)
        file_category = detected_category.value if detected_category else None

        # Auto-detect mappings (pass category so benefits files get benefit fields)
        suggested_mappings = column_mapping_service.auto_detect_mappings(columns, file_category)

        # Find unmapped columns
        unmapped = [col for col in columns if col not in suggested_mappings]

        # Validate the auto-detected mappings
        is_valid, validation_errors = column_mapping_service.validate_mappings(suggested_mappings)

        return {
            "file_id": file_id,
            "file_category": file_category,
            "detected_columns": columns,
            "row_count": len(df),
            "sample_data": sample_data,
            "suggested_mappings": suggested_mappings,
            "unmapped_columns": unmapped,
            "is_valid": is_valid,
            "validation_warnings": validation_errors,
            "available_fields": column_mapping_service.get_fields_by_category(file_category)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect mappings: {str(e)}")


class CustomMappingImportRequest(BaseModel):
    """Request body for import with custom mappings"""
    column_mappings: Dict[str, str]  # source_column -> db_field
    file_category: Optional[str] = None  # e.g. "compensation_history", "employment_list"
    dry_run: bool = False


@router.post("/{file_id}/import-with-mappings", response_model=ImportFileResponse)
async def import_with_custom_mappings(
    file_id: int,
    request: CustomMappingImportRequest,
    db: Session = Depends(database.get_db)
):
    """
    Import file data using custom column mappings

    This endpoint allows you to specify exactly which columns map to which
    database fields, overriding the auto-detection.

    Request body:
    - column_mappings: Dict mapping source column names to database field names
    - dry_run: If true, validate but don't actually import

    The column_mappings should map your file's column names to the database
    fields. Get available fields from /mapping/available-fields endpoint.

    Example:
    {
        "column_mappings": {
            "EmpID": "employee_id",
            "FirstName": "first_name",
            "LastName": "last_name",
            "HireDate": "hire_date",
            "Department": "department"
        },
        "dry_run": false
    }
    """
    from app.services.column_mapping_service import column_mapping_service
    from app.services.data_import_service import DataImportService

    # Get upload record
    upload = db.query(models.FileUpload).filter(
        models.FileUpload.id == file_id,
        models.FileUpload.is_deleted == False
    ).first()

    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {file_id} not found")

    # Validate file type
    if upload.file_type not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files can be imported"
        )

    # Validate mappings
    is_valid, errors = column_mapping_service.validate_mappings(request.column_mappings)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid column mappings: {'; '.join(errors)}"
        )

    try:
        # Route to dedicated importer for compensation history
        if request.file_category == "compensation_history":
            from app.services.file_upload_service import ExcelParser, CSVParser
            from app.services.file_type_configs import FileCategory, get_file_config
            import pandas as pd

            if upload.file_type == 'csv':
                parser = CSVParser()
            else:
                parser = ExcelParser()
            df, _logs = await parser.parse(upload.file_path)
            config = get_file_config(FileCategory.COMPENSATION_HISTORY)
            result = await DataImportService.import_compensation_history(
                df, config, file_id, db
            )
            return result

        # Route to dedicated importer for benefits data
        if request.file_category == "benefits_data":
            from app.services.file_parsers import BenefitsDataParser
            df, config, _logs = await BenefitsDataParser.parse(upload.file_path)
            result = await DataImportService.import_benefits_data(
                df, config, file_id, db
            )
            return result

        # Default: import as employee data
        result = await DataImportService.import_with_custom_mappings(
            file_upload_id=file_id,
            column_mappings=request.column_mappings,
            db=db,
            dry_run=request.dry_run
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/templates/download")
async def download_template(
    template_type: str = Query(..., description="Template type: employee, comprehensive"),
):
    """
    Download file templates for import

    Available templates:
    - employee: Basic Paylocity employee data template (CSV)
    - comprehensive: Full employee template with all available fields (CSV)
    """
    templates_dir = Path(__file__).parent.parent / "data" / "templates"

    if template_type == "employee":
        template_path = templates_dir / "paylocity_employee_template.csv"
        filename = "employee_import_template.csv"
    elif template_type == "comprehensive":
        template_path = templates_dir / "comprehensive_employee_template.csv"
        filename = "comprehensive_employee_template.csv"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown template type: {template_type}")

    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    return FileResponse(
        path=str(template_path),
        filename=filename,
        media_type="text/csv"
    )
