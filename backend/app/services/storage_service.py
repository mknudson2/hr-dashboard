"""
Storage Abstraction Layer

Provides a unified interface for file storage operations, enabling seamless
migration between local filesystem and cloud storage (Azure Blob Storage).

Usage:
    from app.services.storage_service import storage

    # Save a file
    path = await storage.save("resumes", "resume.pdf", content)

    # Read a file
    data = await storage.read("resumes", "resume.pdf")

    # Delete a file
    await storage.delete("resumes", "resume.pdf")

    # Check if a file exists
    exists = await storage.exists("resumes", "resume.pdf")
"""

import os
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import aiofiles

logger = logging.getLogger(__name__)

# ============================================================================
# Storage bucket definitions — all storage paths centralized here
# ============================================================================
STORAGE_BUCKETS = {
    "uploads": "data/uploads",
    "resumes": "data/uploads/resumes",
    "applicant_documents": "data/uploads/applicant_documents",
    "recruiting": "data/uploads/recruiting",
    "job_descriptions": "data/uploads/job-descriptions",
    "garnishments": "data/uploads/garnishments",
    "employee_documents": "data/employee_documents",
    "filled_forms": "storage/filled_forms",
    "quarantine": "data/uploads/quarantine",
}


class StorageBackend(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    async def save(self, bucket: str, key: str, data: bytes) -> str:
        """Save data to storage. Returns the full path/URL of the saved file."""
        ...

    @abstractmethod
    async def read(self, bucket: str, key: str) -> bytes:
        """Read data from storage. Raises FileNotFoundError if not found."""
        ...

    @abstractmethod
    async def delete(self, bucket: str, key: str) -> bool:
        """Delete a file from storage. Returns True if deleted, False if not found."""
        ...

    @abstractmethod
    async def exists(self, bucket: str, key: str) -> bool:
        """Check if a file exists in storage."""
        ...

    @abstractmethod
    def get_path(self, bucket: str, key: str) -> str:
        """Get the full path/URL for a file. Used for FileResponse and direct access."""
        ...


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage backend (development and single-server deployments)."""

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            # Default: app/ directory inside backend
            self.base_dir = Path(__file__).parent.parent

    def _resolve(self, bucket: str, key: str) -> Path:
        bucket_path = STORAGE_BUCKETS.get(bucket, bucket)
        return self.base_dir / bucket_path / key

    def _ensure_dir(self, file_path: Path) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)

    async def save(self, bucket: str, key: str, data: bytes) -> str:
        file_path = self._resolve(bucket, key)
        self._ensure_dir(file_path)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(data)
        logger.debug("Saved %s/%s (%d bytes)", bucket, key, len(data))
        return str(file_path)

    async def read(self, bucket: str, key: str) -> bytes:
        file_path = self._resolve(bucket, key)
        if not file_path.exists():
            raise FileNotFoundError(f"{bucket}/{key} not found")
        async with aiofiles.open(file_path, "rb") as f:
            return await f.read()

    async def delete(self, bucket: str, key: str) -> bool:
        file_path = self._resolve(bucket, key)
        if file_path.exists():
            os.remove(file_path)
            logger.debug("Deleted %s/%s", bucket, key)
            return True
        return False

    async def exists(self, bucket: str, key: str) -> bool:
        return self._resolve(bucket, key).exists()

    def get_path(self, bucket: str, key: str) -> str:
        return str(self._resolve(bucket, key))


class AzureBlobStorageBackend(StorageBackend):
    """Azure Blob Storage backend (production cloud deployments).

    Requires:
        pip install azure-storage-blob

    Environment variables:
        AZURE_STORAGE_CONNECTION_STRING: Connection string for the storage account
        AZURE_STORAGE_CONTAINER: Container name (default: "hr-dashboard")
    """

    def __init__(self) -> None:
        try:
            from azure.storage.blob.aio import BlobServiceClient
        except ImportError:
            raise ImportError(
                "azure-storage-blob is required for Azure storage. "
                "Install it with: pip install azure-storage-blob"
            )

        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        if not connection_string:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING environment variable is required")

        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER", "hr-dashboard")
        self.client = BlobServiceClient.from_connection_string(connection_string)
        self.container_client = self.client.get_container_client(self.container_name)

    def _blob_name(self, bucket: str, key: str) -> str:
        bucket_path = STORAGE_BUCKETS.get(bucket, bucket)
        return f"{bucket_path}/{key}"

    async def save(self, bucket: str, key: str, data: bytes) -> str:
        blob_name = self._blob_name(bucket, key)
        blob_client = self.container_client.get_blob_client(blob_name)
        await blob_client.upload_blob(data, overwrite=True)
        logger.debug("Saved to Azure: %s (%d bytes)", blob_name, len(data))
        return blob_name

    async def read(self, bucket: str, key: str) -> bytes:
        blob_name = self._blob_name(bucket, key)
        blob_client = self.container_client.get_blob_client(blob_name)
        try:
            download = await blob_client.download_blob()
            return await download.readall()
        except Exception:
            raise FileNotFoundError(f"{bucket}/{key} not found in Azure Blob Storage")

    async def delete(self, bucket: str, key: str) -> bool:
        blob_name = self._blob_name(bucket, key)
        blob_client = self.container_client.get_blob_client(blob_name)
        try:
            await blob_client.delete_blob()
            logger.debug("Deleted from Azure: %s", blob_name)
            return True
        except Exception:
            return False

    async def exists(self, bucket: str, key: str) -> bool:
        blob_name = self._blob_name(bucket, key)
        blob_client = self.container_client.get_blob_client(blob_name)
        try:
            await blob_client.get_blob_properties()
            return True
        except Exception:
            return False

    def get_path(self, bucket: str, key: str) -> str:
        return self._blob_name(bucket, key)


def _create_storage_backend() -> StorageBackend:
    """Factory: select storage backend based on environment configuration."""
    backend_type = os.getenv("STORAGE_BACKEND", "local").lower()

    if backend_type == "azure":
        logger.info("Using Azure Blob Storage backend")
        return AzureBlobStorageBackend()
    else:
        logger.info("Using local filesystem storage backend")
        return LocalStorageBackend()


# Singleton instance — import this in other modules
storage = _create_storage_backend()
