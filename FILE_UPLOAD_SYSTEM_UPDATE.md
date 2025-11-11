# File Upload System Update - Employment Data Processing

## Overview

The File Upload Management system has been successfully updated to handle two new HR data file types:

1. **Employment List Complete** - Complete employee roster with demographics, position, and compensation data
2. **OT Earnings Report** - Overtime hours and earnings by employee

## What's New

### 1. File Type Configuration System (`file_type_configs.py`)

A new configuration system that defines:
- Expected file structures and column names
- Required vs optional columns
- Data type specifications
- Validation rules
- Import behavior (upsert, append, etc.)

**Supported Categories:**
- `employment_list` - Employee roster data
- `ot_earnings` - Overtime earnings data
- Extensible for future file types

### 2. Specialized File Parsers (`file_parsers.py`)

Smart parsers that handle:
- **Multi-row headers** (OT Earnings has headers at row 3)
- **Auto-detection** of file type based on column structure
- **Data validation** and quality checks
- **Type conversion** (dates, numbers, strings)
- **Error logging** with detailed warnings and errors

**Parsers Created:**
- `EmploymentListParser` - Handles employee roster files
- `OTEarningsParser` - Handles overtime reports with special header structure
- `AutoDetectParser` - Automatically detects file type and routes to correct parser

### 3. Data Import Service (`data_import_service.py`)

Intelligent import logic that:
- **Employment List**: Creates or updates employee records in the database
- **OT Earnings**: Stores overtime records in file metadata
- **Dry-run mode**: Validate before importing
- **Error handling**: Tracks import success/failure per row
- **Statistics**: Returns detailed import metrics

### 4. Enhanced API Endpoints

New endpoints in `/file-uploads`:

#### `POST /file-uploads/upload`
Upload files with optional category hint
- Query param: `file_category` (employment_list, ot_earnings, etc.)

#### `POST /file-uploads/{file_id}/parse`
Parse an uploaded file and detect its structure
- Auto-detects category or accepts `force_category` param
- Returns preview of parsed data
- Validates against expected schema

#### `POST /file-uploads/{file_id}/import`
Import parsed file data into database
- Supports `dry_run=true` for validation
- Returns import statistics (imported, updated, skipped, errors)

#### `GET /file-uploads/categories`
Get list of supported file categories with their configurations

### 5. Database Schema Updates

New columns added to `file_uploads` table:
- `file_category` - Category identifier (employment_list, ot_earnings, etc.)
- `detected_columns` - JSON array of detected column names
- `row_count` - Number of rows in the file
- `processing_logs` - JSON array of parsing/processing logs

Migration script: `app/db/migrations/add_file_upload_fields.py`

## File Specifications

### Employment List Complete

**Expected Columns:**
- Required: Employee Id, Last Name, Preferred/First Name, Employee Status Description, Hire Date
- Optional: Department, Position, Salary, Location, Employment Type, etc.

**Import Behavior:**
- Mode: Upsert (update if exists, insert if new)
- Matches on: Employee Id
- Updates existing employee records with new data

### OT Earnings Report

**Expected Columns:**
- Required: ID (employee ID), Chk Date, Hours, Amount
- Optional: Employee (name), SSN, Location, Rate

**Special Features:**
- Handles multi-row header (headers at row 3)
- Forward-fills employee names across multiple records
- Removes empty columns from export

**Import Behavior:**
- Mode: Append (always add new records)
- Stores in file metadata as JSON
- Future enhancement: Create dedicated OvertimeRecord table

## Usage Example

### Via API:

```bash
# 1. Upload file
curl -X POST http://localhost:8000/file-uploads/upload \
  -F "file=@Employment_List_Complete.xlsx" \
  -F "uploaded_by=admin" \
  -F "file_category=employment_list"

# Response: { "id": 123, "status": "pending", ... }

# 2. Parse file
curl -X POST http://localhost:8000/file-uploads/123/parse

# Response: {
#   "category": "employment_list",
#   "rows": 250,
#   "columns": 22,
#   "data_preview": [...]
# }

# 3. Import data
curl -X POST http://localhost:8000/file-uploads/123/import

# Response: {
#   "status": "success",
#   "imported": 45,
#   "updated": 205,
#   "skipped": 0
# }
```

### Via Python:

```python
from app.services.file_parsers import AutoDetectParser
from app.services.data_import_service import DataImportService

# Parse file
df, config, logs = await AutoDetectParser.parse(file_path)

# Import to database
result = await DataImportService.import_file_data(
    file_upload_id=file_id,
    db=db,
    dry_run=False
)

print(f"Imported: {result['imported']}, Updated: {result['updated']}")
```

## Test Results

All tests passing ✓

```
✓ PASSED: Employment List Parser
✓ PASSED: OT Earnings Parser
✓ PASSED: Auto-Detection
✓ PASSED: Full Pipeline

Total: 4/4 tests passed 🎉
```

**Test file:** `backend/test_file_processing.py`

### Example Output:

**Employment List:**
- Parsed 7 employees from 261-row file (cleaned empty rows)
- Detected 22 columns
- Validated data types and required fields
- Average salary: $200,000

**OT Earnings:**
- Parsed 39 OT records
- 3 unique employees
- Total hours: 59.90
- Total amount: $3,100.50

## Architecture

```
File Upload Flow:
1. Upload → FileUploadService.upload_and_validate()
   - Security validation
   - Store with UUID filename
   - Create DB record

2. Parse → FileUploadService.parse_and_process()
   - Auto-detect file type
   - Validate structure
   - Convert data types
   - Return preview

3. Import → DataImportService.import_file_data()
   - Load parsed data
   - Execute category-specific import logic
   - Track success/failure
   - Update DB records
```

## Error Handling

The system provides comprehensive error handling:

- **File validation errors**: File size, type, MIME validation
- **Structure errors**: Missing required columns, wrong format
- **Data quality warnings**: Null values in required fields, data type issues
- **Import errors**: Per-row error tracking with detailed messages
- **Quarantine**: Suspicious files moved to quarantine directory

## Future Enhancements

1. **Add more file categories**: Benefits, Time Off, Performance Reviews, etc.
2. **Create OvertimeRecord table**: Instead of storing in metadata
3. **Scheduled imports**: Automatic processing of SFTP uploads
4. **Validation rules UI**: Configure rules without code changes
5. **Data transformation rules**: Custom transformations per field
6. **Duplicate detection**: Smart merge strategies for duplicate employees

## Files Created/Modified

**New Files:**
- `backend/app/services/file_type_configs.py` - Configuration system
- `backend/app/services/file_parsers.py` - Specialized parsers
- `backend/app/services/data_import_service.py` - Import logic
- `backend/app/db/migrations/add_file_upload_fields.py` - DB migration
- `backend/test_file_processing.py` - Test suite

**Modified Files:**
- `backend/app/services/file_upload_service.py` - Added parse_and_process()
- `backend/app/api/file_uploads.py` - Added new endpoints
- `backend/app/db/models.py` - Added new FileUpload fields

## Configuration Reference

### Adding a New File Type

1. Create configuration in `file_type_configs.py`:
```python
NEW_FILE_CONFIG = FileTypeConfig(
    category=FileCategory.NEW_TYPE,
    name="New File Type",
    required_columns=["col1", "col2"],
    column_mappings=[...],
    # ... other settings
)
```

2. Create parser in `file_parsers.py`:
```python
class NewFileParser(HRFileParser):
    @staticmethod
    async def parse(file_path: str):
        # Parsing logic
        return df, config, logs
```

3. Add import logic in `data_import_service.py`:
```python
async def import_new_file(df, config, file_upload_id, db):
    # Import logic
    return statistics
```

4. Register in dictionaries:
```python
FILE_TYPE_CONFIGS[FileCategory.NEW_TYPE] = NEW_FILE_CONFIG
PARSER_REGISTRY[FileCategory.NEW_TYPE] = NewFileParser
```

## Security Features

- File size limits (50MB max)
- Extension validation
- MIME type validation
- Filename sanitization
- UUID-based secure storage
- Malware scan hooks (ready for ClamAV)
- Quarantine directory for suspicious files
- Soft deletes for audit trail

## Performance

- Streaming file uploads (8KB chunks)
- Pandas-optimized data processing
- Efficient upsert operations
- JSON storage for flexible metadata
- Indexed database queries

---

**Status**: ✅ Complete and Tested
**Last Updated**: 2025-11-11
**Test Coverage**: 4/4 tests passing
