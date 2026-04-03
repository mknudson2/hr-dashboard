from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional, List
import os
import json
from app.db import database, models
from app.api.auth import get_current_user

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)

# File path for storing folder settings (in production, use database)
FOLDER_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "folder_settings.json")

# File path for storing HR contacts settings
HR_CONTACTS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "hr_contacts_settings.json")

# File path for storing international settings
INTERNATIONAL_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "international_settings.json")


class EmployeeFolderSettings(BaseModel):
    base_path: str = ""
    subfolders: List[str] = []
    enabled: bool = False


def get_folder_settings() -> EmployeeFolderSettings:
    """Load folder settings from file"""
    try:
        if os.path.exists(FOLDER_SETTINGS_FILE):
            with open(FOLDER_SETTINGS_FILE, 'r') as f:
                data = json.load(f)
                return EmployeeFolderSettings(**data)
    except Exception:
        pass
    return EmployeeFolderSettings()


def save_folder_settings(settings: EmployeeFolderSettings) -> None:
    """Save folder settings to file"""
    os.makedirs(os.path.dirname(FOLDER_SETTINGS_FILE), exist_ok=True)
    with open(FOLDER_SETTINGS_FILE, 'w') as f:
        json.dump(settings.model_dump(), f, indent=2)


class PageVisibilitySettings(BaseModel):
    visible_pages: Dict[str, bool]  # e.g., {"dashboard": True, "employees": True, "fmla": False}


@router.get("/page-visibility")
def get_page_visibility(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get the current page visibility settings (admin only returns custom settings, others get default)"""

    # Default: all pages visible
    default_visibility = {
        "dashboard": True,
        "employees": True,
        "onboarding": True,
        "offboarding": True,
        "equipment": True,
        "fmla": True,
        "garnishments": True,
        "turnover": True,
        "events": True,
        "contributions": True,
        "overtime": True,
        "compensation": True,
        "performance": True,
        "aca": True,
        "eeo": True,
        "reports": True,
        "advanced-analytics": True,
        "users": True,  # Will be filtered by adminOnly in frontend
        "settings": True,  # Always visible
    }

    # Try to get custom settings from database (organization-wide setting)
    # For simplicity, we'll store this as a JSON field in a settings table
    # For now, use localStorage on frontend, but provide endpoint for future database storage

    return {"visible_pages": default_visibility}


@router.post("/page-visibility")
def update_page_visibility(
    settings: PageVisibilitySettings,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update page visibility settings (admin only)"""

    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can modify page visibility settings")

    # For now, we'll return success and let the frontend handle localStorage
    # In a future enhancement, you could store this in a database table

    return {
        "message": "Page visibility settings updated successfully",
        "visible_pages": settings.visible_pages
    }


# ============================================================================
# Employee Folder Settings Endpoints
# ============================================================================

@router.get("/employee-folders")
def get_employee_folder_settings():
    """Get the current employee folder creation settings"""
    settings = get_folder_settings()
    return {
        "base_path": settings.base_path,
        "subfolders": settings.subfolders,
        "enabled": settings.enabled
    }


@router.post("/employee-folders")
def update_employee_folder_settings(settings: EmployeeFolderSettings):
    """Update employee folder creation settings"""
    # Validate base path if enabled
    if settings.enabled and settings.base_path:
        if not os.path.isabs(settings.base_path):
            raise HTTPException(status_code=400, detail="Base path must be an absolute path")
        # Check if path exists (or can be created)
        if not os.path.exists(settings.base_path):
            try:
                os.makedirs(settings.base_path, exist_ok=True)
            except PermissionError:
                raise HTTPException(status_code=400, detail="Cannot create or access the specified folder path. Check permissions.")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid path: {str(e)}")

    save_folder_settings(settings)
    return {
        "message": "Employee folder settings updated successfully",
        "settings": settings.model_dump()
    }


@router.post("/employee-folders/add-subfolder")
def add_subfolder(subfolder_name: str):
    """Add a subfolder to the default list"""
    if not subfolder_name or not subfolder_name.strip():
        raise HTTPException(status_code=400, detail="Subfolder name cannot be empty")

    # Sanitize folder name (remove invalid characters)
    sanitized = "".join(c for c in subfolder_name.strip() if c.isalnum() or c in (' ', '_', '-'))
    if not sanitized:
        raise HTTPException(status_code=400, detail="Invalid subfolder name")

    settings = get_folder_settings()
    if sanitized not in settings.subfolders:
        settings.subfolders.append(sanitized)
        save_folder_settings(settings)

    return {"message": f"Subfolder '{sanitized}' added", "subfolders": settings.subfolders}


@router.delete("/employee-folders/remove-subfolder/{subfolder_name}")
def remove_subfolder(subfolder_name: str):
    """Remove a subfolder from the default list"""
    settings = get_folder_settings()
    if subfolder_name in settings.subfolders:
        settings.subfolders.remove(subfolder_name)
        save_folder_settings(settings)
        return {"message": f"Subfolder '{subfolder_name}' removed", "subfolders": settings.subfolders}
    else:
        raise HTTPException(status_code=404, detail="Subfolder not found")


def create_employee_folder(first_name: str, last_name: str, state: str = None) -> dict:
    """
    Create an employee folder with subfolders based on settings.
    Returns a dict with success status and folder path.
    """
    settings = get_folder_settings()

    if not settings.enabled or not settings.base_path:
        return {"created": False, "reason": "Folder creation not enabled or base path not set"}

    # Build folder name: "LastName, FirstName - StateAbbreviation"
    folder_name = f"{last_name}, {first_name}"
    if state:
        # Extract state abbreviation from location string
        state_abbrev = extract_state_abbreviation(state)
        if state_abbrev:
            folder_name += f" - {state_abbrev}"

    # Sanitize folder name
    folder_name = "".join(c for c in folder_name if c.isalnum() or c in (' ', ',', '-', '_'))

    # Full path
    employee_folder_path = os.path.join(settings.base_path, folder_name)

    try:
        # Create main folder
        os.makedirs(employee_folder_path, exist_ok=True)

        # Create subfolders
        created_subfolders = []
        for subfolder in settings.subfolders:
            subfolder_path = os.path.join(employee_folder_path, subfolder)
            os.makedirs(subfolder_path, exist_ok=True)
            created_subfolders.append(subfolder)

        return {
            "created": True,
            "folder_path": employee_folder_path,
            "subfolders": created_subfolders
        }
    except PermissionError:
        return {"created": False, "reason": "Permission denied when creating folder"}
    except Exception as e:
        return {"created": False, "reason": str(e)}


# ============================================================================
# HR Contacts Settings
# ============================================================================

class HRContactsSettings(BaseModel):
    retirement_contact_name: str = "Kat Haynie"
    equipment_return_contact_name: str = ""
    equipment_return_contact_email: str = ""


def get_hr_contacts_settings() -> HRContactsSettings:
    """Load HR contacts settings from file"""
    try:
        if os.path.exists(HR_CONTACTS_FILE):
            with open(HR_CONTACTS_FILE, 'r') as f:
                data = json.load(f)
                return HRContactsSettings(**data)
    except Exception:
        pass
    return HRContactsSettings()


def save_hr_contacts_settings(settings: HRContactsSettings) -> None:
    """Save HR contacts settings to file"""
    os.makedirs(os.path.dirname(HR_CONTACTS_FILE), exist_ok=True)
    with open(HR_CONTACTS_FILE, 'w') as f:
        json.dump(settings.model_dump(), f, indent=2)


@router.get("/hr-contacts")
def get_hr_contacts():
    """Get the current HR contacts settings"""
    settings = get_hr_contacts_settings()
    return settings.model_dump()


@router.put("/hr-contacts")
def update_hr_contacts(settings: HRContactsSettings):
    """Update HR contacts settings"""
    if not settings.retirement_contact_name.strip():
        raise HTTPException(status_code=400, detail="Retirement contact name cannot be empty")
    save_hr_contacts_settings(settings)
    return {
        "message": "HR contacts settings updated successfully",
        "settings": settings.model_dump()
    }


# ============================================================================
# International Employee Settings
# ============================================================================

class InternationalSettings(BaseModel):
    id_prefixes: List[str] = ["NL", "VV", "SN"]
    prefix_labels: Dict[str, str] = {"NL": "Norðurljós", "VV": "Vestanvind", "SN": "Súlnasker"}
    contractor_contact_name: str = ""
    contractor_contact_email: str = ""


def get_international_settings() -> InternationalSettings:
    """Load international settings from file"""
    try:
        if os.path.exists(INTERNATIONAL_SETTINGS_FILE):
            with open(INTERNATIONAL_SETTINGS_FILE, 'r') as f:
                data = json.load(f)
                return InternationalSettings(**data)
    except Exception:
        pass
    return InternationalSettings()


def save_international_settings(settings: InternationalSettings) -> None:
    """Save international settings to file"""
    os.makedirs(os.path.dirname(INTERNATIONAL_SETTINGS_FILE), exist_ok=True)
    with open(INTERNATIONAL_SETTINGS_FILE, 'w') as f:
        json.dump(settings.model_dump(), f, indent=2)


@router.get("/international")
def get_international():
    """Get the current international employee settings"""
    settings = get_international_settings()
    return settings.model_dump()


@router.put("/international")
def update_international(settings: InternationalSettings):
    """Update international employee settings"""
    # Validate prefixes are non-empty strings
    settings.id_prefixes = [p.strip() for p in settings.id_prefixes if p.strip()]
    if not settings.id_prefixes:
        raise HTTPException(status_code=400, detail="At least one ID prefix is required")
    # Ensure prefix_labels keys match id_prefixes
    for prefix in settings.id_prefixes:
        if prefix not in settings.prefix_labels:
            settings.prefix_labels[prefix] = prefix
    save_international_settings(settings)
    return {
        "message": "International settings updated successfully",
        "settings": settings.model_dump()
    }


@router.get("/browse-directories")
def browse_directories(path: str = None):
    """Browse directories on the server filesystem for folder picker"""
    import platform

    # Default to user's home directory or root
    if not path:
        if platform.system() == "Darwin":  # macOS
            path = os.path.expanduser("~")
        elif platform.system() == "Windows":
            path = "C:\\"
        else:
            path = os.path.expanduser("~")

    # SECURITY: Normalize path FIRST to prevent path traversal attacks
    # os.path.realpath resolves symlinks and normalizes the path (removes ../ etc)
    try:
        path = os.path.realpath(os.path.normpath(path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid path: {str(e)}")

    # Security check - don't allow browsing certain system directories
    # MUST happen AFTER normalization to prevent bypass via ../
    forbidden_paths = ['/etc', '/var', '/usr', '/bin', '/sbin', '/lib', '/boot', '/proc', '/sys', '/dev']
    home_dir = os.path.expanduser("~")
    for forbidden in forbidden_paths:
        if path.startswith(forbidden) and not path.startswith(home_dir):
            raise HTTPException(status_code=403, detail="Access to this directory is restricted")

    # Validate path exists and is a directory
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Path does not exist")
        if not os.path.isdir(path):
            raise HTTPException(status_code=400, detail="Path is not a directory")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid path: {str(e)}")

    # Get parent directory
    parent = os.path.dirname(path) if path != "/" else None

    # List subdirectories only (not files)
    try:
        entries = []
        for entry in os.listdir(path):
            full_path = os.path.join(path, entry)
            try:
                if os.path.isdir(full_path) and not entry.startswith('.'):
                    entries.append({
                        "name": entry,
                        "path": full_path,
                        "is_dir": True
                    })
            except PermissionError:
                # Skip directories we don't have permission to access
                continue

        # Sort alphabetically
        entries.sort(key=lambda x: x["name"].lower())

        return {
            "current_path": path,
            "parent_path": parent,
            "directories": entries,
            "can_select": True  # Can select this directory
        }
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied to access this directory")


@router.get("/common-directories")
def get_common_directories():
    """Get common starting directories for the folder picker"""
    import platform

    directories = []

    # Home directory
    home = os.path.expanduser("~")
    if os.path.exists(home):
        directories.append({"name": "Home", "path": home, "icon": "home"})

    # Desktop
    desktop = os.path.join(home, "Desktop")
    if os.path.exists(desktop):
        directories.append({"name": "Desktop", "path": desktop, "icon": "monitor"})

    # Documents
    documents = os.path.join(home, "Documents")
    if os.path.exists(documents):
        directories.append({"name": "Documents", "path": documents, "icon": "file-text"})

    # Downloads
    downloads = os.path.join(home, "Downloads")
    if os.path.exists(downloads):
        directories.append({"name": "Downloads", "path": downloads, "icon": "download"})

    if platform.system() == "Darwin":  # macOS
        # Volumes (for external drives)
        volumes = "/Volumes"
        if os.path.exists(volumes):
            directories.append({"name": "Volumes", "path": volumes, "icon": "hard-drive"})
    elif platform.system() == "Windows":
        # Add common Windows drives
        for drive in ['C:', 'D:', 'E:']:
            if os.path.exists(drive + '\\'):
                directories.append({"name": f"Drive {drive}", "path": drive + '\\', "icon": "hard-drive"})

    return {"directories": directories}


def extract_state_abbreviation(location: str) -> str:
    """Extract state abbreviation from a location string"""
    if not location:
        return ""

    # US State abbreviations mapping
    state_abbrevs = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
    }

    # Also handle if abbreviation is already in location
    location_upper = location.upper()
    for abbrev in state_abbrevs.values():
        # Check if abbreviation appears as a word in location
        if f", {abbrev}," in location_upper or f", {abbrev} " in location_upper or location_upper.endswith(f", {abbrev}"):
            return abbrev

    # Check for full state name
    location_lower = location.lower()
    for state_name, abbrev in state_abbrevs.items():
        if state_name in location_lower:
            return abbrev

    # If it's an international location, try to get country code
    if 'usa' not in location_lower and 'united states' not in location_lower:
        # Return first part of location as identifier for international
        parts = location.split(',')
        if len(parts) >= 2:
            return parts[-1].strip()[:3].upper()

    return ""
