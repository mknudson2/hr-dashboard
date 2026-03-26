"""
Business logic for TazWorks screening operations.

This service orchestrates the HTTP client calls and provides
clean methods for the FastAPI router to consume.

IMPORTANT: Always use model_dump(by_alias=True, exclude_none=True)
when sending data TO TazWorks to produce pascalCase JSON.
"""

import logging
import os
from typing import Optional

from app.services.tazworks.client import tazworks_client
from app.services.tazworks.models import (
    ApplicantCreate,
    ApplicantResponse,
    OrderSubmit,
    OrderResponse,
    OrderStatusResponse,
    SearchAdd,
    SearchResponse,
    AttachmentResponse,
    QuickAppAttachment,
    ClientProduct,
)

logger = logging.getLogger("tazworks.service")

CLIENT_GUID = os.getenv("TAZWORKS_CLIENT_GUID", "")


class ScreeningService:
    """Orchestrates TazWorks screening operations for Bifröst."""

    # ---- Clients & Products ----

    async def list_products(self) -> list[ClientProduct]:
        """Get available screening packages for the NBS client."""
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/products"
        )
        products = data if isinstance(data, list) else data.get("products", data.get("clientProducts", []))
        return [ClientProduct.model_validate(p) for p in products]

    async def get_certification_text(self) -> str:
        """Fetch FCRA permissible purpose certification text."""
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/preferences/certification/text"
        )
        if isinstance(data, dict):
            return data.get("text", data.get("certificationText", str(data)))
        return str(data)

    # ---- Applicants ----

    async def create_applicant(
        self, applicant: ApplicantCreate
    ) -> ApplicantResponse:
        """Create applicant in TazWorks. Returns the applicantGuid."""
        data = await tazworks_client.post(
            f"/clients/{CLIENT_GUID}/applicants",
            data=applicant.model_dump(by_alias=True, exclude_none=True),
        )
        return ApplicantResponse.model_validate(data)

    async def get_applicant(self, applicant_guid: str) -> ApplicantResponse:
        """Retrieve applicant details."""
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/applicants/{applicant_guid}"
        )
        return ApplicantResponse.model_validate(data)

    # ---- Orders ----

    async def submit_order(self, order: OrderSubmit) -> OrderResponse:
        """
        Submit a background check order.

        PREREQUISITE: FCRA certification must be logged BEFORE calling this.
        """
        data = await tazworks_client.post(
            f"/clients/{CLIENT_GUID}/orders",
            data=order.model_dump(by_alias=True, exclude_none=True),
        )
        return OrderResponse.model_validate(data)

    async def get_order_status(self, order_guid: str) -> OrderStatusResponse:
        """Check the current status of an order."""
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/orders/{order_guid}/status"
        )
        return OrderStatusResponse.model_validate(data)

    async def list_orders(self) -> list[dict]:
        """List all orders for the NBS client."""
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/orders"
        )
        return data if isinstance(data, list) else data.get("orders", [])

    # ---- Searches ----

    async def add_searches(
        self, order_guid: str, searches: list[SearchAdd]
    ) -> list[SearchResponse]:
        """Add individual searches to an existing order."""
        payload = [s.model_dump(by_alias=True, exclude_none=True) for s in searches]
        data = await tazworks_client.post(
            f"/clients/{CLIENT_GUID}/orders/{order_guid}/searches",
            data=payload,
        )
        results = data if isinstance(data, list) else [data]
        return [SearchResponse.model_validate(r) for r in results]

    # ---- Attachments ----

    async def get_attachment(
        self, order_guid: str, attachment_guid: str
    ) -> AttachmentResponse:
        """Retrieve a specific order attachment with Base64 content."""
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/orders/{order_guid}/attach/{attachment_guid}"
        )
        return AttachmentResponse.model_validate(data)

    async def get_quickapp_documents(
        self, order_guid: str, doc_type: str = "APPLICANT_AUTHORIZATION"
    ) -> list[QuickAppAttachment]:
        """
        Retrieve signed QuickApp compliance documents.

        Valid doc_type values:
        - APPLICANT_AUTHORIZATION
        - AUTHORIZATION_FORMS
        - E_SIGNATURE
        """
        data = await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/orders/{order_guid}/attach/quickapp",
            params={"type": doc_type},
        )
        results = data if isinstance(data, list) else [data]
        return [QuickAppAttachment.model_validate(r) for r in results]

    async def get_order_results(self, order_guid: str) -> dict:
        """
        Retrieve the completed screening results.
        Returns the raw response which may include a report URL or PDF data.
        """
        return await tazworks_client.get(
            f"/clients/{CLIENT_GUID}/orders/{order_guid}/results"
        )


# Singleton
screening_service = ScreeningService()
