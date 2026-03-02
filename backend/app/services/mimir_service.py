"""
Mímir RAG service — orchestrates retrieval, prompt assembly, and Claude API calls.
Gracefully falls back to a helpful message when API keys are not configured.
"""

import os
import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.services.document_ingestion_service import search_documents

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Mímir, the HR Knowledge Assistant for National Benefit Services (NBS).

## Your Identity
- Name: Mímir (pronounced "MEE-mir"), named after the Norse god of wisdom
- Role: Answer employee questions about HR topics using company documents
- Personality: Knowledgeable, approachable, warm, and concise
- You speak in a professional but friendly tone — like a helpful HR colleague

## What You Can Help With
- Benefits (medical, dental, vision, 401k, HSA, FSA, life insurance)
- Time off (PTO accrual, vacation, sick leave, personal days, holidays)
- Payroll (pay dates, direct deposit, tax forms, deductions, W-2)
- FMLA (eligibility, process, intermittent leave, documentation)
- Company policies (dress code, remote work, travel, expense reimbursement)
- Onboarding (new hire checklist, orientation, first day info)
- Employee handbook questions
- Forms and where to find them

## Rules — STRICTLY FOLLOW THESE

1. **ONLY answer from provided context.** Your knowledge comes from NBS documents that have been loaded into your knowledge base. Never make up information. Never infer policies that aren't explicitly stated in the documents.

2. **If the context doesn't contain the answer**, respond with: "I don't have that specific information in my knowledge base yet. I'd recommend reaching out to HR directly at hr@nbs.com or submitting a question through the HR portal's request form."

3. **Never provide legal advice.** For legal questions, say: "That's a great question, but it touches on legal territory. I'd recommend discussing this with HR or consulting with a legal professional for guidance specific to your situation."

4. **Never provide medical advice.** For medical questions, say: "I can help with the benefits and coverage details, but for medical decisions, please consult with your healthcare provider."

5. **Never share other employees' information.** If asked about another employee's salary, benefits elections, performance, or any personal data, decline and explain that employee information is confidential.

6. **Cite your sources.** When answering, include which document and section your answer comes from. Format citations as a JSON array at the end of your response on a new line, like: SOURCES:[{"document":"Employee Handbook","section":"Section 4.2"}]

7. **For urgent matters**, always recommend contacting HR directly. This includes: workplace safety concerns, harassment reports, medical emergencies, legal threats, or anything requiring immediate action.

8. **Be concise.** Answer the question directly first, then provide additional context if helpful. Employees are busy — respect their time.

9. **When uncertain**, err on the side of directing to HR rather than guessing. It's better to say "I'm not 100% sure about that" than to give potentially incorrect policy information.

10. **Handle follow-up questions** by considering the conversation history. If an employee asks about dental coverage and then asks "what about vision?", understand they're still asking about benefits.

## Response Format

Keep responses conversational and scannable:
- Lead with the direct answer
- Use **bold** for key numbers, dates, or terms
- Keep paragraphs short (2-3 sentences max)
- End with source citation in the SOURCES:[] format
- If there are action items, list them clearly"""


NO_API_KEY_RESPONSE = (
    "I'm currently in **demo mode** — the AI backend hasn't been configured yet. "
    "To enable full AI responses, set the `ANTHROPIC_API_KEY` environment variable.\n\n"
    "In the meantime, I can still help! Check out these portal sections:\n"
    "- **My HR → Benefits** for coverage details\n"
    "- **My HR → Time Off** for PTO balances\n"
    "- **Resources → Handbook** for company policies\n"
    "- **Resources → FAQs** for common questions"
)

NO_CONTEXT_RESPONSE = (
    "I don't have that specific information in my knowledge base yet. "
    "No documents have been ingested into my system.\n\n"
    "An admin can upload HR documents (Employee Handbook, Benefits Guide, etc.) "
    "through the admin panel to enable AI-powered answers.\n\n"
    "In the meantime, I'd recommend reaching out to HR directly at **hr@nbs.com**."
)


def _get_anthropic_client():
    """Get Anthropic client. Returns None if unavailable."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        logger.warning("anthropic package not installed")
        return None


def _parse_sources(response_text: str) -> tuple[str, list[dict]]:
    """Extract SOURCES:[] JSON from the end of the response text."""
    sources = []
    clean_text = response_text

    if "SOURCES:" in response_text:
        parts = response_text.rsplit("SOURCES:", 1)
        clean_text = parts[0].strip()
        try:
            sources_json = parts[1].strip()
            sources = json.loads(sources_json)
        except (json.JSONDecodeError, IndexError):
            pass

    return clean_text, sources


def _build_conversation_history(db: Session, conversation_id: int, limit: int = 10) -> list[dict]:
    """Load recent conversation history from DB."""
    from app.db.mimir_models import MimirMessage

    messages = (
        db.query(MimirMessage)
        .filter(MimirMessage.conversation_id == conversation_id)
        .order_by(MimirMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    # Reverse to chronological order
    messages.reverse()
    return [{"role": msg.role, "content": msg.content} for msg in messages]


def chat(
    user_message: str,
    conversation_id: Optional[int],
    user_id: int,
    db: Session,
) -> dict:
    """
    Process a chat message through the RAG pipeline.

    Returns dict with: message, sources, conversation_id
    """
    from app.db.mimir_models import MimirConversation, MimirMessage

    # Create or get conversation
    if conversation_id:
        conversation = db.query(MimirConversation).filter(
            MimirConversation.id == conversation_id,
            MimirConversation.user_id == user_id,
        ).first()
        if not conversation:
            conversation_id = None

    if not conversation_id:
        conversation = MimirConversation(user_id=user_id)
        db.add(conversation)
        db.flush()
        conversation_id = conversation.id

    # Save user message
    user_msg = MimirMessage(
        conversation_id=conversation_id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)
    db.flush()

    # Check for Anthropic API key
    client = _get_anthropic_client()
    if client is None:
        # Save fallback response
        assistant_msg = MimirMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=NO_API_KEY_RESPONSE,
        )
        db.add(assistant_msg)
        db.commit()
        return {
            "message": NO_API_KEY_RESPONSE,
            "sources": [],
            "conversation_id": conversation_id,
        }

    # Retrieve relevant context from knowledge base
    context_chunks = search_documents(user_message, top_k=6)

    if not context_chunks:
        # No documents ingested or no relevant matches
        assistant_msg = MimirMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=NO_CONTEXT_RESPONSE,
        )
        db.add(assistant_msg)
        db.commit()
        return {
            "message": NO_CONTEXT_RESPONSE,
            "sources": [],
            "conversation_id": conversation_id,
        }

    # Build context text from retrieved chunks
    context_text = "\n\n---\n\n".join([
        f"[Source: {chunk['metadata'].get('filename', 'Unknown')}, Page {chunk['metadata'].get('page', 'N/A')}]\n{chunk['text']}"
        for chunk in context_chunks
    ])

    system_with_context = f"""{SYSTEM_PROMPT}

## Retrieved Context (from NBS documents)
The following excerpts are from NBS's official documents. Use ONLY this information to answer the employee's question.

{context_text}

## Important
If the above context does not contain information to answer the question, say so honestly. Do not make up information."""

    # Build conversation history
    history = _build_conversation_history(db, conversation_id, limit=10)
    # Remove the last message (current user message, already in history from DB)
    messages = []
    for msg in history[:-1]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    # Call Claude API
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_with_context,
            messages=messages,
        )
        response_text = response.content[0].text
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        error_msg = (
            "I'm having trouble connecting to my AI backend right now. "
            "Please try again in a moment, or reach out to HR directly at **hr@nbs.com**."
        )
        assistant_msg = MimirMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=error_msg,
        )
        db.add(assistant_msg)
        db.commit()
        return {
            "message": error_msg,
            "sources": [],
            "conversation_id": conversation_id,
        }

    # Parse response and extract sources
    clean_text, sources = _parse_sources(response_text)

    # Save assistant response
    assistant_msg = MimirMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=clean_text,
        sources=json.dumps(sources) if sources else None,
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "message": clean_text,
        "sources": sources,
        "conversation_id": conversation_id,
    }
