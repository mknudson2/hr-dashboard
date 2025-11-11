# File Upload Management API Documentation

## Overview

The File Upload Management API provides secure file upload, validation, processing, and tracking capabilities for HR data files. It supports CSV, XLSX, DOCX, and PDF file types with comprehensive security features.

**Base URL:** `http://localhost:8000/file-uploads`

**Interactive Documentation:** `http://localhost:8000/docs#/File%20Uploads`

---

## Security Features

✅ **Multi-Layer Validation**
- File size limits (max 50MB)
- Extension whitelist (CSV, XLSX, DOCX, PDF only)
- Filename sanitization (prevents directory traversal attacks)
- Optional MIME type validation (magic bytes)

✅ **Secure Storage**
- UUID-based filenames (prevents guessing/enumeration)
- Storage outside web root
- File permissions hardened to 0600 (owner only)
- Quarantine capability for suspicious files

✅ **Audit Trail**
- Complete upload history
- Processing logs with row-level detail
- Data import history (compliance tracking)

---

## API Endpoints

### 1. Upload Single File

Upload a single file for processing.

**Endpoint:** `POST /file-uploads/upload`

**Parameters:**
- `file` (form-data, required): The file to upload
- `uploaded_by` (query, optional): Username of uploader (default: "system")

**Request Example:**
```bash
curl -X POST "http://localhost:8000/file-uploads/upload?uploaded_by=mknudson" \
  -F "file=@/path/to/employees.csv"
```

**Response:**
```json
{
  "id": 1,
  "file_name": "2d8a2d82-a7d7-4cfa-884e-f1c398ad66d3.csv",
  "original_filename": "employees.csv",
  "file_type": "csv",
  "file_size": 1024,
  "status": "pending",
  "uploaded_by": "mknudson",
  "uploaded_at": "2025-11-11T19:07:24",
  "records_processed": 0,
  "records_failed": 0,
  "error_message": null
}
```

**Status Codes:**
- `200 OK` - File uploaded successfully
- `400 Bad Request` - Invalid file type, size exceeded, or validation failed
- `500 Internal Server Error` - Server error during upload

---

### 2. Batch Upload Files

Upload multiple files at once.

**Endpoint:** `POST /file-uploads/batch-upload`

**Parameters:**
- `files` (form-data, required): Multiple files to upload
- `uploaded_by` (query, optional): Username of uploader (default: "system")

**Request Example:**
```bash
curl -X POST "http://localhost:8000/file-uploads/batch-upload?uploaded_by=mknudson" \
  -F "files=@/path/to/employees.csv" \
  -F "files=@/path/to/benefits.xlsx"
```

**Response:**
```json
[
  {
    "id": 1,
    "file_name": "2d8a2d82-a7d7-4cfa-884e-f1c398ad66d3.csv",
    "original_filename": "employees.csv",
    ...
  },
  {
    "id": 2,
    "file_name": "3e9b3e93-b8e8-5dfb-995f-g2d409be77e4.xlsx",
    "original_filename": "benefits.xlsx",
    ...
  }
]
```

---

### 3. List Uploads

Retrieve list of uploaded files with filtering and pagination.

**Endpoint:** `GET /file-uploads/`

**Query Parameters:**
- `status` (optional): Filter by status - `pending`, `processing`, `completed`, `failed`
- `file_type` (optional): Filter by type - `csv`, `xlsx`, `docx`, `pdf`
- `uploaded_by` (optional): Filter by uploader username
- `limit` (optional, default: 50, max: 500): Number of results to return
- `offset` (optional, default: 0): Pagination offset

**Request Example:**
```bash
# Get all pending CSV files
curl "http://localhost:8000/file-uploads/?status=pending&file_type=csv&limit=10"

# Get uploads by specific user
curl "http://localhost:8000/file-uploads/?uploaded_by=mknudson"
```

**Response:**
```json
[
  {
    "id": 1,
    "file_name": "2d8a2d82-a7d7-4cfa-884e-f1c398ad66d3.csv",
    "original_filename": "employees.csv",
    "file_type": "csv",
    "file_size": 1024,
    "status": "pending",
    "uploaded_by": "mknudson",
    "uploaded_at": "2025-11-11T19:07:24",
    "records_processed": 0,
    "records_failed": 0,
    "error_message": null
  }
]
```

---

### 4. Get Upload Details

Get detailed information about a specific upload.

**Endpoint:** `GET /file-uploads/{file_id}`

**Request Example:**
```bash
curl "http://localhost:8000/file-uploads/1"
```

**Response:**
```json
{
  "id": 1,
  "file_name": "2d8a2d82-a7d7-4cfa-884e-f1c398ad66d3.csv",
  "original_filename": "employees.csv",
  "file_type": "csv",
  "file_size": 1024,
  "file_path": "/path/to/uploads/2025/11/2d8a2d82-a7d7-4cfa-884e-f1c398ad66d3.csv",
  "mime_type": "text/csv",
  "upload_source": "manual",
  "uploaded_by": "mknudson",
  "uploaded_at": "2025-11-11T19:07:24",
  "status": "completed",
  "processing_started_at": "2025-11-11T19:07:25",
  "processing_completed_at": "2025-11-11T19:07:26",
  "records_processed": 150,
  "records_failed": 2,
  "records_skipped": 0,
  "target_table": "employees",
  "file_metadata": {
    "columns": ["Employee ID", "First Name", "Last Name", ...],
    "row_count": 152
  },
  "error_message": null
}
```

---

### 5. Preview File Contents

Preview the first 10 rows of a CSV/XLSX file or text content of DOCX/PDF.

**Endpoint:** `POST /file-uploads/{file_id}/preview`

**Request Example:**
```bash
curl -X POST "http://localhost:8000/file-uploads/1/preview"
```

**Response (CSV/XLSX):**
```json
{
  "columns": [
    "Employee ID",
    "First Name",
    "Last Name",
    "Email",
    "Department"
  ],
  "sample_data": [
    {
      "Employee ID": "EMP001",
      "First Name": "John",
      "Last Name": "Doe",
      "Email": "john.doe@company.com",
      "Department": "Engineering"
    },
    ...
  ],
  "row_count": 150,
  "file_type": "csv"
}
```

**Response (DOCX/PDF):**
```json
{
  "columns": ["text"],
  "sample_data": [
    {
      "text": "Document content preview (first 1000 characters)..."
    }
  ],
  "row_count": 1,
  "file_type": "pdf"
}
```

---

### 6. Get Processing Logs

Retrieve processing logs for a specific file upload.

**Endpoint:** `GET /file-uploads/{file_id}/logs`

**Query Parameters:**
- `log_level` (optional): Filter by level - `info`, `warning`, `error`, `debug`
- `limit` (optional, default: 100, max: 1000): Number of log entries

**Request Example:**
```bash
# Get all logs
curl "http://localhost:8000/file-uploads/1/logs"

# Get only errors
curl "http://localhost:8000/file-uploads/1/logs?log_level=error"
```

**Response:**
```json
[
  {
    "id": 1,
    "log_level": "info",
    "log_message": "Successfully parsed CSV file with 150 rows and 8 columns",
    "log_details": {
      "rows": 150,
      "columns": ["Employee ID", "First Name", ...]
    },
    "row_number": null,
    "column_name": null,
    "created_at": "2025-11-11T19:07:25"
  },
  {
    "id": 2,
    "log_level": "error",
    "log_message": "Invalid email format",
    "log_details": {
      "value": "invalid-email",
      "expected": "email format"
    },
    "row_number": 15,
    "column_name": "Email",
    "created_at": "2025-11-11T19:07:26"
  }
]
```

---

### 7. Delete Upload

Soft delete an upload record. The physical file remains for audit purposes.

**Endpoint:** `DELETE /file-uploads/{file_id}`

**Request Example:**
```bash
curl -X DELETE "http://localhost:8000/file-uploads/1"
```

**Response:**
```json
{
  "message": "Upload 1 deleted successfully"
}
```

---

### 8. Get Upload Statistics

Get dashboard statistics for file uploads.

**Endpoint:** `GET /file-uploads/stats/summary`

**Request Example:**
```bash
curl "http://localhost:8000/file-uploads/stats/summary"
```

**Response:**
```json
{
  "total_uploads": 25,
  "pending": 3,
  "processing": 1,
  "completed": 20,
  "failed": 1,
  "total_size_mb": 45.67,
  "recent_uploads": [
    {
      "id": 25,
      "file_name": "...",
      "original_filename": "latest_file.csv",
      ...
    }
  ]
}
```

---

## File Type Support

### CSV Files (`.csv`)
- **Supported Formats:** Text-based comma-separated values
- **Encoding:** UTF-8 (recommended), ASCII
- **Max Size:** 50MB
- **Features:** Column detection, data preview, row-by-row validation

### Excel Files (`.xlsx`, `.xls`)
- **Supported Formats:** Excel 2007+ (.xlsx), Excel 97-2003 (.xls)
- **Sheet Support:** Reads first sheet by default
- **Max Size:** 50MB
- **Features:** Column detection, data preview, formula evaluation

### Word Documents (`.docx`)
- **Supported Formats:** Word 2007+ (.docx)
- **Max Size:** 50MB
- **Features:** Text extraction, table extraction

### PDF Files (`.pdf`)
- **Max Size:** 50MB
- **Features:** Text extraction (using pdfplumber + PyPDF2 fallback), page-by-page processing

---

## Error Handling

### Common Error Responses

**Invalid File Type:**
```json
{
  "detail": "File type '.txt' not allowed. Allowed types: csv, xlsx, xls, docx, pdf"
}
```

**File Too Large:**
```json
{
  "detail": "File size (52428800 bytes) exceeds maximum allowed size (52428800 bytes)"
}
```

**File Not Found:**
```json
{
  "detail": "Upload 999 not found"
}
```

**Empty File:**
```json
{
  "detail": "File is empty"
}
```

---

## Security Considerations

### File Naming
- Original filenames are preserved for reference only
- Files are stored with UUID-based names to prevent:
  - Filename guessing/enumeration
  - Path traversal attacks
  - Special character injection

### Storage Location
- Files stored in `/backend/app/data/uploads/{year}/{month}/`
- Directory structure organized by upload date
- Storage path is outside web root (not directly accessible)

### Validation Pipeline
1. **Extension Check:** Verify file has allowed extension
2. **Size Check:** Ensure file is within limits
3. **MIME Type Check:** Validate magic bytes match extension (optional, graceful degradation)
4. **Malware Scan Hook:** Ready for ClamAV integration
5. **Content Validation:** Parse and validate file structure

### File Permissions
- All uploaded files have `0600` permissions (owner read/write only)
- Quarantine directory for suspicious files

---

## Best Practices

### For Developers

1. **Always validate response status codes** - Don't assume success
2. **Use appropriate query parameters** - Filter on the backend, not the frontend
3. **Handle pagination properly** - Use `limit` and `offset` for large datasets
4. **Check file size before upload** - Validate on client side first
5. **Display meaningful error messages** - Use the `detail` field from error responses

### For Users

1. **Use descriptive filenames** - Helps with tracking and organization
2. **Validate CSV/Excel formats** - Ensure consistent column structure
3. **Check preview before processing** - Use the preview endpoint to verify data
4. **Monitor processing logs** - Check for warnings and errors
5. **Keep original files** - System stores copies, but keep your originals

---

## Future Enhancements

### Planned Features
- ✅ SFTP Integration (Paylocity automation)
- ✅ Automated data import to database tables
- ✅ Column mapping configuration UI
- ✅ Scheduled file processing
- ✅ Email notifications for processing completion
- ✅ File templates download
- ✅ Batch reprocessing

### In Progress
- ClamAV virus scanning integration
- Advanced validation rules engine
- Data transformation pipelines
- Webhook notifications

---

## Testing

### Test Endpoints with cURL

```bash
# 1. Upload a file
FILE_ID=$(curl -s -X POST "http://localhost:8000/file-uploads/upload?uploaded_by=test_user" \
  -F "file=@/path/to/test.csv" | jq -r '.id')

# 2. Preview the file
curl -s -X POST "http://localhost:8000/file-uploads/${FILE_ID}/preview" | jq '.'

# 3. Check statistics
curl -s "http://localhost:8000/file-uploads/stats/summary" | jq '.'

# 4. List all uploads
curl -s "http://localhost:8000/file-uploads/" | jq '.'
```

---

## Support

For issues, questions, or feature requests:
- **API Documentation:** `http://localhost:8000/docs`
- **Backend Logs:** Check uvicorn logs for detailed error information
- **Database:** SQLite database at `/backend/hr_dashboard.db`

---

**Last Updated:** November 11, 2025
**API Version:** 1.0
**Status:** ✅ Production Ready
