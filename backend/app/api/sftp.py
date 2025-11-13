"""
SFTP Configuration API
Endpoints for managing SFTP connections and polling
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.db import database, models
from app.services.sftp_service import SFTPService
from app.services.scheduler_service import scheduler

router = APIRouter(prefix="/sftp", tags=["SFTP"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class SFTPConfigRequest(BaseModel):
    name: str
    host: str
    port: int = 22
    username: str
    auth_type: str = 'key'
    private_key_path: Optional[str] = None
    remote_directory: str = '/'
    file_pattern: str = '*.csv'
    poll_frequency: int = 60  # minutes
    is_active: bool = False


class SFTPConfigResponse(BaseModel):
    id: int
    name: str
    host: str
    port: int
    username: str
    auth_type: str
    private_key_path: Optional[str]
    remote_directory: str
    file_pattern: str
    poll_frequency: int
    is_active: bool
    last_poll_at: Optional[datetime]
    last_poll_status: Optional[str]
    last_error: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str


class ManualPollResponse(BaseModel):
    success: bool
    message: str
    files_downloaded: int


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/configurations", response_model=List[SFTPConfigResponse])
async def list_sftp_configurations(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(database.get_db)
):
    """
    List all SFTP configurations

    Optionally filter by active status
    """
    query = db.query(models.SFTPConfiguration)

    if is_active is not None:
        query = query.filter(models.SFTPConfiguration.is_active == is_active)

    configs = query.order_by(models.SFTPConfiguration.created_at.desc()).all()

    return [SFTPConfigResponse.model_validate(c) for c in configs]


@router.get("/configurations/{config_id}", response_model=SFTPConfigResponse)
async def get_sftp_configuration(
    config_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Get a specific SFTP configuration
    """
    config = db.query(models.SFTPConfiguration).filter(
        models.SFTPConfiguration.id == config_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration {config_id} not found")

    return SFTPConfigResponse.model_validate(config)


@router.post("/configurations", response_model=SFTPConfigResponse)
async def create_sftp_configuration(
    config_data: SFTPConfigRequest,
    db: Session = Depends(database.get_db)
):
    """
    Create a new SFTP configuration

    Note: Configuration will not be active until explicitly enabled
    """
    # Validate auth type
    if config_data.auth_type == 'key' and not config_data.private_key_path:
        raise HTTPException(
            status_code=400,
            detail="private_key_path required for key-based authentication"
        )

    # Create configuration
    config = models.SFTPConfiguration(
        name=config_data.name,
        host=config_data.host,
        port=config_data.port,
        username=config_data.username,
        auth_type=config_data.auth_type,
        private_key_path=config_data.private_key_path,
        remote_directory=config_data.remote_directory,
        file_pattern=config_data.file_pattern,
        poll_frequency=config_data.poll_frequency,
        is_active=config_data.is_active,
        created_at=datetime.now()
    )

    db.add(config)
    db.commit()
    db.refresh(config)

    return SFTPConfigResponse.model_validate(config)


@router.put("/configurations/{config_id}", response_model=SFTPConfigResponse)
async def update_sftp_configuration(
    config_id: int,
    config_data: SFTPConfigRequest,
    db: Session = Depends(database.get_db)
):
    """
    Update an existing SFTP configuration
    """
    config = db.query(models.SFTPConfiguration).filter(
        models.SFTPConfiguration.id == config_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration {config_id} not found")

    # Update fields
    config.name = config_data.name
    config.host = config_data.host
    config.port = config_data.port
    config.username = config_data.username
    config.auth_type = config_data.auth_type
    config.private_key_path = config_data.private_key_path
    config.remote_directory = config_data.remote_directory
    config.file_pattern = config_data.file_pattern
    config.poll_frequency = config_data.poll_frequency
    config.is_active = config_data.is_active
    config.updated_at = datetime.now()

    db.commit()
    db.refresh(config)

    return SFTPConfigResponse.model_validate(config)


@router.delete("/configurations/{config_id}")
async def delete_sftp_configuration(
    config_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Delete an SFTP configuration
    """
    config = db.query(models.SFTPConfiguration).filter(
        models.SFTPConfiguration.id == config_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration {config_id} not found")

    db.delete(config)
    db.commit()

    return {"message": f"Configuration {config_id} deleted successfully"}


@router.post("/configurations/{config_id}/test", response_model=ConnectionTestResponse)
async def test_sftp_connection(
    config_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Test SFTP connection for a configuration

    Verifies credentials and remote directory access
    """
    config = db.query(models.SFTPConfiguration).filter(
        models.SFTPConfiguration.id == config_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration {config_id} not found")

    success, message = SFTPService.test_connection(config)

    return ConnectionTestResponse(success=success, message=message)


@router.post("/configurations/{config_id}/poll", response_model=ManualPollResponse)
async def manual_poll(
    config_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Manually trigger a poll for files

    Downloads new files from SFTP server immediately
    """
    config = db.query(models.SFTPConfiguration).filter(
        models.SFTPConfiguration.id == config_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration {config_id} not found")

    success, message, count = scheduler.trigger_manual_poll(config_id)

    return ManualPollResponse(
        success=success,
        message=message,
        files_downloaded=count
    )


@router.post("/configurations/{config_id}/toggle")
async def toggle_sftp_configuration(
    config_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Toggle active status of SFTP configuration

    Enables or disables automatic polling
    """
    config = db.query(models.SFTPConfiguration).filter(
        models.SFTPConfiguration.id == config_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration {config_id} not found")

    config.is_active = not config.is_active
    config.updated_at = datetime.now()
    db.commit()

    status = "enabled" if config.is_active else "disabled"
    return {"message": f"Configuration {config.name} {status}", "is_active": config.is_active}


@router.get("/scheduler/status")
async def get_scheduler_status():
    """
    Get status of the SFTP polling scheduler
    """
    return {
        "running": scheduler.is_running,
        "active_polls": len(scheduler.poll_tasks),
        "next_polls": {
            config_id: next_time.isoformat()
            for config_id, next_time in scheduler.poll_tasks.items()
        }
    }
