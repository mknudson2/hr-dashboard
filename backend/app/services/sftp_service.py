"""
SFTP Service for automated file retrieval from Paylocity
"""

import paramiko
import os
from pathlib import Path
from typing import Tuple, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.db import models
from app.services.file_upload_service import FileUploadService
from app.services import paylocity_ingest


class SFTPService:
    """Service for SFTP file operations"""

    @staticmethod
    def test_connection(config: models.SFTPConfiguration) -> Tuple[bool, str]:
        """
        Test SFTP connection with given configuration

        Args:
            config: SFTPConfiguration object

        Returns:
            Tuple of (success, message)
        """
        try:
            # Create SSH client
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Connect based on auth type
            if config.auth_type == 'key' and config.private_key_path:
                private_key = paramiko.RSAKey.from_private_key_file(config.private_key_path)
                ssh.connect(
                    hostname=config.host,
                    port=config.port,
                    username=config.username,
                    pkey=private_key,
                    timeout=10
                )
            else:
                # Password auth not implemented for security
                return False, "Password authentication not supported. Please use key-based auth."

            # Open SFTP session
            sftp = ssh.open_sftp()

            # Test directory access
            try:
                sftp.listdir(config.remote_directory)
            except Exception as e:
                ssh.close()
                return False, f"Cannot access remote directory: {str(e)}"

            # Close connections
            sftp.close()
            ssh.close()

            return True, "Connection successful"

        except paramiko.AuthenticationException:
            return False, "Authentication failed. Check credentials."
        except paramiko.SSHException as e:
            return False, f"SSH error: {str(e)}"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    @staticmethod
    def poll_for_files(config: models.SFTPConfiguration, db: Session) -> Tuple[bool, str, int]:
        """
        Poll SFTP server for new files and download them

        Args:
            config: SFTPConfiguration object
            db: Database session

        Returns:
            Tuple of (success, message, files_downloaded)
        """
        files_downloaded = 0

        try:
            # Create SSH client
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Connect
            if config.auth_type == 'key' and config.private_key_path:
                private_key = paramiko.RSAKey.from_private_key_file(config.private_key_path)
                ssh.connect(
                    hostname=config.host,
                    port=config.port,
                    username=config.username,
                    pkey=private_key,
                    timeout=30
                )
            else:
                return False, "Password authentication not supported", 0

            # Open SFTP session
            sftp = ssh.open_sftp()

            # Change to remote directory
            sftp.chdir(config.remote_directory)

            # List files matching pattern
            import fnmatch
            all_files = sftp.listdir()
            matching_files = [f for f in all_files if fnmatch.fnmatch(f, config.file_pattern)]

            if not matching_files:
                sftp.close()
                ssh.close()
                return True, "No new files found", 0

            # Create local download directory
            download_dir = Path("./data/sftp_downloads")
            download_dir.mkdir(parents=True, exist_ok=True)

            # Download each file
            for remote_file in matching_files:
                try:
                    # Generate local filename with timestamp
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    local_filename = f"{timestamp}_{remote_file}"
                    local_path = download_dir / local_filename

                    # Download file
                    sftp.get(remote_file, str(local_path))

                    # Create FileUpload record
                    file_size = local_path.stat().st_size
                    file_type = local_path.suffix.lstrip('.').lower()

                    file_upload = models.FileUpload(
                        file_name=local_filename,
                        original_filename=remote_file,
                        file_path=str(local_path),
                        file_type=file_type,
                        file_size=file_size,
                        mime_type=f'text/{file_type}' if file_type == 'csv' else f'application/{file_type}',
                        status='pending',
                        uploaded_by=f'sftp_{config.name}',
                        upload_source='sftp',
                        uploaded_at=datetime.now()
                    )
                    db.add(file_upload)
                    db.commit()
                    db.refresh(file_upload)

                    # Auto-process if it's an employee CSV/XLSX
                    if file_type in ['csv', 'xlsx', 'xls']:
                        try:
                            success, msg, stats = paylocity_ingest.process_single_file(
                                file_path=str(local_path),
                                file_upload_id=file_upload.id,
                                db=db
                            )
                            if success:
                                print(f"✓ Auto-processed {remote_file}: {msg}")
                        except Exception as e:
                            print(f"⚠ Failed to auto-process {remote_file}: {str(e)}")

                    files_downloaded += 1

                    # Optional: Delete from SFTP after successful download
                    # sftp.remove(remote_file)

                except Exception as file_error:
                    print(f"Error downloading {remote_file}: {str(file_error)}")
                    continue

            # Close connections
            sftp.close()
            ssh.close()

            return True, f"Downloaded {files_downloaded} file(s)", files_downloaded

        except Exception as e:
            return False, f"Polling failed: {str(e)}", files_downloaded

    @staticmethod
    def update_poll_status(config_id: int, success: bool, message: str, db: Session):
        """
        Update the last poll status for an SFTP configuration

        Args:
            config_id: SFTPConfiguration ID
            success: Whether poll was successful
            message: Status message
            db: Database session
        """
        config = db.query(models.SFTPConfiguration).filter(
            models.SFTPConfiguration.id == config_id
        ).first()

        if config:
            config.last_poll_at = datetime.now()
            config.last_poll_status = 'success' if success else 'failed'
            config.last_error = None if success else message
            db.commit()
