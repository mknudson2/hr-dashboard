# Quick Start: File Upload System

## Upload and Process Files in 3 Steps

### Step 1: Upload the File

```bash
curl -X POST http://localhost:8000/file-uploads/upload \
  -F "file=@/path/to/Employment_List_Complete.xlsx" \
  -F "uploaded_by=admin"
```

**Response:**
```json
{
  "id": 1,
  "file_name": "abc123.xlsx",
  "original_filename": "Employment_List_Complete.xlsx",
  "status": "pending",
  "file_size": 45632
}
```

### Step 2: Parse the File

```bash
curl -X POST http://localhost:8000/file-uploads/1/parse
```

**Response:**
```json
{
  "file_upload_id": 1,
  "category": "employment_list",
  "category_name": "Employment List Complete",
  "rows": 250,
  "columns": 22,
  "logs": [
    {"level": "success", "message": "Employment List parsed successfully: 250 employees"}
  ],
  "data_preview": [
    {
      "Employee Id": "1",
      "First Name": "John",
      "Last Name": "Doe",
      "Department": "Engineering"
    }
  ]
}
```

### Step 3: Import the Data

```bash
curl -X POST http://localhost:8000/file-uploads/1/import
```

**Response:**
```json
{
  "status": "success",
  "imported": 50,
  "updated": 200,
  "skipped": 0,
  "total": 250,
  "errors": []
}
```

## Supported File Types

### 1. Employment List Complete (`.xlsx`)

**What it contains:** Full employee roster with demographics, positions, and compensation

**Required columns:**
- Employee Id
- Last Name
- Preferred/First Name
- Employee Status Description
- Hire Date

**What happens on import:**
- Creates new employees
- Updates existing employees (matched by Employee Id)
- Imports salary, department, position, hire date, etc.

### 2. OT Earnings Report (`.xlsx`)

**What it contains:** Overtime hours and earnings by employee

**Required columns:**
- ID (employee ID)
- Chk Date
- Hours
- Amount

**What happens on import:**
- Stores overtime records
- Calculates totals and statistics
- Links to employee records

## API Endpoints Reference

### Upload
```
POST /file-uploads/upload
```
- **Parameters**: `file` (multipart), `uploaded_by` (string), `file_category` (optional)
- **Returns**: File upload record with ID

### Parse
```
POST /file-uploads/{file_id}/parse
```
- **Parameters**: `force_category` (optional query param)
- **Returns**: Detected category, preview data, validation logs

### Import
```
POST /file-uploads/{file_id}/import
```
- **Parameters**: `dry_run` (optional boolean, default false)
- **Returns**: Import statistics (imported, updated, skipped, errors)

### List Files
```
GET /file-uploads/
```
- **Parameters**: `status`, `file_type`, `uploaded_by`, `limit`, `offset`
- **Returns**: List of file uploads

### Get Categories
```
GET /file-uploads/categories
```
- **Returns**: List of supported file categories with configurations

## Common Workflows

### Validate Before Importing

```bash
# Parse the file
curl -X POST http://localhost:8000/file-uploads/1/parse

# Check the preview and logs, then dry-run import
curl -X POST "http://localhost:8000/file-uploads/1/import?dry_run=true"

# If validation passes, do real import
curl -X POST http://localhost:8000/file-uploads/1/import
```

### Force a Specific File Type

If auto-detection fails:

```bash
curl -X POST "http://localhost:8000/file-uploads/1/parse?force_category=employment_list"
```

### Check Processing Status

```bash
# Get file details
curl http://localhost:8000/file-uploads/1

# Get processing logs
curl http://localhost:8000/file-uploads/1/logs
```

## Error Handling

### Upload Errors

- **File too large**: Max 50MB
- **Invalid file type**: Only .xlsx, .csv, .pdf, .docx allowed
- **Security validation failed**: File quarantined

### Parse Errors

- **Missing required columns**: Error with list of missing columns
- **Invalid file structure**: Auto-detection failed
- **Data quality issues**: Warnings logged but parsing continues

### Import Errors

- **Row-level errors**: Tracked with row number and error message
- **Database errors**: Transaction rolled back, file status = 'failed'
- **Validation errors**: Logged in `errors` array in response

## Tips & Best Practices

1. **Always parse before importing** - Check the preview to ensure correct detection
2. **Use dry-run mode** - Validate imports without changing data
3. **Check logs** - Review parsing logs for warnings about data quality
4. **Handle errors gracefully** - Check `skipped` count and `errors` array
5. **Monitor file status** - Track files through pending → processing → completed/failed

## Example: Full Workflow with Python

```python
import requests

BASE_URL = "http://localhost:8000"

# 1. Upload
with open("Employment_List.xlsx", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/file-uploads/upload",
        files={"file": f},
        data={"uploaded_by": "admin"}
    )
file_id = response.json()["id"]
print(f"Uploaded file ID: {file_id}")

# 2. Parse
response = requests.post(f"{BASE_URL}/file-uploads/{file_id}/parse")
parse_result = response.json()
print(f"Detected: {parse_result['category_name']}")
print(f"Rows: {parse_result['rows']}")

# 3. Dry run
response = requests.post(
    f"{BASE_URL}/file-uploads/{file_id}/import",
    params={"dry_run": True}
)
print(f"Dry run: {response.json()['status']}")

# 4. Import
response = requests.post(f"{BASE_URL}/file-uploads/{file_id}/import")
result = response.json()
print(f"Imported: {result['imported']}, Updated: {result['updated']}")
```

## File Upload Status Flow

```
pending → processing → parsed → completed
                         ↓
                      failed
```

- **pending**: Just uploaded, not processed yet
- **processing**: Currently being parsed
- **parsed**: Successfully parsed, ready to import
- **completed**: Data imported successfully
- **failed**: Error during processing or import

---

**Need help?** Check the full documentation in `FILE_UPLOAD_SYSTEM_UPDATE.md`
