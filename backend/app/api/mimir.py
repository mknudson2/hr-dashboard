"""
Mímir API router — chat endpoint for employees, document ingestion for admins.
"""

import os
import json
import tempfile
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.db import models, database
from app.db.mimir_models import MimirConversation, MimirMessage, MimirDocument
from app.api.auth import get_current_user
from app.schemas.mimir import (
    ChatRequest, ChatResponse, SourceCitation,
    ConversationSummary, ConversationMessage,
    DocumentInfo, IngestResponse,
)
from app.services import mimir_service
from app.services import document_ingestion_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mimir", tags=["mimir"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to Mímir and get a response."""
    result = mimir_service.chat(
        user_message=request.message,
        conversation_id=request.conversation_id,
        user_id=current_user.id,
        db=db,
    )

    return ChatResponse(
        message=result["message"],
        sources=[SourceCitation(**s) for s in result["sources"]],
        conversation_id=result["conversation_id"],
    )


@router.get("/conversations")
def list_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's Mímir conversations."""
    conversations = (
        db.query(MimirConversation)
        .filter(MimirConversation.user_id == current_user.id)
        .order_by(MimirConversation.updated_at.desc())
        .limit(20)
        .all()
    )

    results = []
    for conv in conversations:
        # Get message count and first user message
        messages = (
            db.query(MimirMessage)
            .filter(MimirMessage.conversation_id == conv.id)
            .order_by(MimirMessage.created_at.asc())
            .all()
        )
        first_user_msg = next((m for m in messages if m.role == "user"), None)
        preview = (first_user_msg.content[:80] + "...") if first_user_msg and len(first_user_msg.content) > 80 else (first_user_msg.content if first_user_msg else "Empty conversation")

        results.append(ConversationSummary(
            id=conv.id,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=len(messages),
            preview=preview,
        ))

    return results


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages for a specific conversation."""
    conversation = (
        db.query(MimirConversation)
        .filter(
            MimirConversation.id == conversation_id,
            MimirConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(MimirMessage)
        .filter(MimirMessage.conversation_id == conversation_id)
        .order_by(MimirMessage.created_at.asc())
        .all()
    )

    return [
        ConversationMessage(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            sources=json.loads(msg.sources) if msg.sources else [],
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation and its messages."""
    conversation = (
        db.query(MimirConversation)
        .filter(
            MimirConversation.id == conversation_id,
            MimirConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete messages first (cascade should handle this, but being explicit)
    db.query(MimirMessage).filter(MimirMessage.conversation_id == conversation_id).delete()
    db.delete(conversation)
    db.commit()

    return {"message": "Conversation deleted"}


# ============================================================================
# ADMIN: DOCUMENT INGESTION
# ============================================================================

def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Dependency that requires admin role."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/admin/ingest", response_model=IngestResponse)
def ingest_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload and ingest a document into the Mímir knowledge base. Admin only."""
    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "text/plain": "txt",
    }

    # Also check by extension as content_type can be unreliable
    ext_map = {".pdf": "pdf", ".docx": "docx", ".txt": "txt"}
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    file_type = allowed_types.get(file.content_type) or ext_map.get(file_ext)

    if not file_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT. Got: {file.content_type} ({file_ext})",
        )

    # Save to temp file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
            content = file.file.read()
            tmp.write(content)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    try:
        result = document_ingestion_service.ingest_document(
            file_path=tmp_path,
            original_filename=file.filename or "unknown",
            file_type=file_type,
            db=db,
            uploaded_by=current_user.id,
        )
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    if result is None:
        raise HTTPException(status_code=500, detail="Failed to ingest document. Check server logs.")

    return IngestResponse(
        document_id=result["document_id"],
        filename=result["filename"],
        chunk_count=result["chunk_count"],
        message=f"Successfully ingested '{result['filename']}' — {result['chunk_count']} chunks created.",
    )


@router.get("/admin/documents")
def list_documents(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all ingested documents. Admin only."""
    documents = (
        db.query(MimirDocument)
        .order_by(MimirDocument.created_at.desc())
        .all()
    )

    return [
        DocumentInfo(
            id=doc.id,
            filename=doc.filename,
            original_filename=doc.original_filename,
            file_type=doc.file_type,
            chunk_count=doc.chunk_count,
            created_at=doc.created_at,
        )
        for doc in documents
    ]


@router.delete("/admin/documents/{document_id}")
def delete_document(
    document_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a document and its chunks from the knowledge base. Admin only."""
    from app.db.mimir_models import MimirDocumentChunk

    document = db.query(MimirDocument).filter(MimirDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from ChromaDB
    try:
        collection = document_ingestion_service._get_chroma_collection()
        if collection:
            chunks = (
                db.query(MimirDocumentChunk)
                .filter(MimirDocumentChunk.document_id == document_id)
                .all()
            )
            chunk_ids = [c.embedding_id for c in chunks if c.embedding_id]
            if chunk_ids:
                collection.delete(ids=chunk_ids)
    except Exception as e:
        logger.warning(f"Failed to remove chunks from ChromaDB: {e}")

    # Remove from DB
    db.query(MimirDocumentChunk).filter(MimirDocumentChunk.document_id == document_id).delete()
    db.delete(document)
    db.commit()

    return {"message": f"Document '{document.original_filename}' deleted"}
