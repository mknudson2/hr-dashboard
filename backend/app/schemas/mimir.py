"""Pydantic schemas for Mímir API requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[int] = None


class SourceCitation(BaseModel):
    document: str
    section: str


class ChatResponse(BaseModel):
    message: str
    sources: list[SourceCitation] = []
    conversation_id: int


class ConversationMessage(BaseModel):
    id: int
    role: str
    content: str
    sources: list[SourceCitation] = []
    created_at: datetime


class ConversationSummary(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    message_count: int
    preview: str  # First user message truncated


class DocumentInfo(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    chunk_count: int
    created_at: datetime


class IngestResponse(BaseModel):
    document_id: int
    filename: str
    chunk_count: int
    message: str
