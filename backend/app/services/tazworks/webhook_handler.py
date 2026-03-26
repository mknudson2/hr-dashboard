"""
Webhook event processor for TazWorks status notifications.

TazWorks sends webhook POSTs when order/search statuses change.
This handler validates, deduplicates, and processes those events.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

logger = logging.getLogger("tazworks.webhook")


class WebhookHandler:
    """Processes incoming TazWorks webhook events."""

    async def handle_event(self, payload: dict, db: Session) -> dict:
        """
        Process a webhook event from TazWorks.

        Steps:
        1. Compute payload hash for idempotency
        2. Check if already processed (skip if duplicate)
        3. Route to appropriate handler based on event type
        4. Update database records
        5. Log the webhook event
        """
        from app.db.models import ScreeningWebhookLog, ScreeningOrder

        payload_hash = self._compute_hash(payload)

        # Idempotency check via database
        existing = db.query(ScreeningWebhookLog).filter(
            ScreeningWebhookLog.payload_hash == payload_hash
        ).first()
        if existing:
            logger.info("Duplicate webhook, skipping: %s", payload_hash[:12])
            return {"status": "duplicate", "hash": payload_hash[:12]}

        # Log the webhook
        event_type = payload.get("eventType", payload.get("type", "unknown"))
        order_guid = payload.get("orderGuid", payload.get("order", {}).get("orderGuid"))
        new_status = payload.get("status", payload.get("orderStatus"))

        webhook_log = ScreeningWebhookLog(
            event_type=event_type,
            order_guid=order_guid,
            payload_hash=payload_hash,
            payload_json=json.dumps(payload),
            processed=False,
        )
        db.add(webhook_log)

        logger.info(
            "Processing webhook: type=%s order=%s status=%s",
            event_type, order_guid, new_status,
        )

        if order_guid and new_status:
            await self._handle_status_change(order_guid, new_status, payload, db)
            webhook_log.processed = True

        db.commit()

        return {
            "status": "processed",
            "event_type": event_type,
            "order_guid": order_guid,
            "hash": payload_hash[:12],
        }

    def _compute_hash(self, payload: dict) -> str:
        """Hash the payload for idempotency checking."""
        raw = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    async def _handle_status_change(
        self, order_guid: str, new_status: str, payload: dict, db: Session
    ):
        """Handle an order status change event."""
        from app.db.models import ScreeningOrder

        logger.info("Order %s status -> %s", order_guid, new_status)

        # Update screening_orders table
        order = db.query(ScreeningOrder).filter(
            ScreeningOrder.order_guid == order_guid
        ).first()

        if order:
            order.status = new_status
            order.updated_at = datetime.now(timezone.utc)

            # Extract decision if present
            decision = payload.get("decision")
            if decision:
                order.decision = decision

            # Extract report URL if present
            report_url = payload.get("reportUrl", payload.get("report_url"))
            if report_url:
                order.report_url = report_url

            # Mark completed if order is done
            if new_status in ("ready", "complete"):
                order.completed_at = datetime.now(timezone.utc)
                logger.info("Order %s marked complete", order_guid)
        else:
            logger.warning("Order %s not found in database", order_guid)


webhook_handler = WebhookHandler()
