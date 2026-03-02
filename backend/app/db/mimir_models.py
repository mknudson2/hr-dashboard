"""SQLAlchemy models for Mímir AI assistant — conversation history and document metadata."""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from .database import Base


class MimirConversation(Base):
    """Stores a conversation session between a user and Mímir."""
    __tablename__ = "mimir_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MimirMessage(Base):
    """Stores individual messages within a Mímir conversation."""
    __tablename__ = "mimir_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("mimir_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    sources = Column(Text, nullable=True)  # JSON string of source citations
    created_at = Column(DateTime, server_default=func.now())


class MimirDocument(Base):
    """Metadata for documents ingested into the Mímir knowledge base."""
    __tablename__ = "mimir_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "pdf", "docx", "txt"
    chunk_count = Column(Integer, default=0)
    file_size_bytes = Column(Integer, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MimirDocumentChunk(Base):
    """Individual text chunks from ingested documents, stored for reference."""
    __tablename__ = "mimir_document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("mimir_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    embedding_id = Column(String, nullable=True)  # ChromaDB embedding ID
    created_at = Column(DateTime, server_default=func.now())
