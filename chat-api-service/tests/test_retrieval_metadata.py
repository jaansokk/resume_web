"""
Tests for retrieval metadata handling.

These tests cover the bug where metadata fields (title, role, company, period)
were not being extracted from Qdrant chunks and passed to the LLM.
"""
from __future__ import annotations

from typing import Any

import pytest

from app.retrieval import RetrievalService, RetrievedChunk
from app.qdrant_client import QdrantClient


def test_retrieved_chunk_includes_metadata_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that RetrievedChunk extracts metadata from Qdrant payload."""
    
    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.95,
                "payload": {
                    "type": "experience",
                    "slug": "guardtime-pm",
                    "chunkId": 0,
                    "section": "Impact",
                    "text": "Digitised construction asset management at NEOM...",
                    "title": "Technical Project Manager / ScrumMaster",
                    "company": "Guardtime",
                    "role": "Technical Project Manager / ScrumMaster",
                    "period": "2019 — 2024",
                },
            },
        ]
    
    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)
    
    from app.qdrant_client import QdrantConfig
    
    qdrant = QdrantClient(
        QdrantConfig(
            url="http://localhost:6333",
            collection_items="content_items_v1",
            collection_chunks="content_chunks_v1",
        )
    )
    retrieval = RetrievalService(qdrant)
    
    result = retrieval.retrieve(query_embedding=[0.0] * 1536, k=10)
    
    assert "chunks" in result
    assert len(result["chunks"]) == 1
    
    chunk = result["chunks"][0]
    # Verify all metadata fields are present
    assert chunk["title"] == "Technical Project Manager / ScrumMaster"
    assert chunk["company"] == "Guardtime"
    assert chunk["role"] == "Technical Project Manager / ScrumMaster"
    assert chunk["period"] == "2019 — 2024"
    assert chunk["slug"] == "guardtime-pm"
    assert chunk["text"] == "Digitised construction asset management at NEOM..."


def test_retrieved_chunk_handles_missing_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that RetrievedChunk gracefully handles missing metadata fields."""
    
    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.9,
                "payload": {
                    "type": "background",
                    "slug": "principles",
                    "chunkId": 0,
                    "section": "",
                    "text": "Some background content...",
                    # Background items don't have company/role/period
                },
            },
        ]
    
    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)
    
    from app.qdrant_client import QdrantConfig
    
    qdrant = QdrantClient(
        QdrantConfig(
            url="http://localhost:6333",
            collection_items="content_items_v1",
            collection_chunks="content_chunks_v1",
        )
    )
    retrieval = RetrievalService(qdrant)
    
    result = retrieval.retrieve(query_embedding=[0.0] * 1536, k=10)
    
    chunk = result["chunks"][0]
    # Missing metadata should be None
    assert chunk["title"] is None
    assert chunk["company"] is None
    assert chunk["role"] is None
    assert chunk["period"] is None


def test_context_includes_metadata_in_labels(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that metadata is included in context labels sent to LLM."""
    from app.pipeline import ChatPipeline
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient, QdrantConfig
    from app.models import ChatRequest, ChatMessage
    
    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    # Capture what system prompt is sent to the LLM
    captured_messages = []
    
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"test","ui":{"view":"chat"},"chips":[],"hints":{}}'
    
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        captured_messages.extend(messages)
        return '{"assistant":{"text":"test"},"ui":{"view":"chat"},"chips":[],"artifacts":{}}'
    
    monkeypatch.setattr(AnthropicClient, "router", _router)
    monkeypatch.setattr(AnthropicClient, "answer", _answer)
    
    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.95,
                "payload": {
                    "type": "experience",
                    "slug": "positium",
                    "chunkId": 0,
                    "section": "Impact",
                    "text": "Led delivery of nationwide mobility model...",
                    "title": "Technical Project Lead",
                    "company": "Positium",
                    "role": "Technical Project Lead",
                    "period": "2025 — 2025",
                },
            },
        ]
    
    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)
    
    # Create pipeline (clients read API keys from env which are set by fixture)
    import os
    os.environ.setdefault("OPENAI_API_KEY", "test-key")
    os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
    
    openai = OpenAIClient()
    anthropic = AnthropicClient()
    qdrant = QdrantClient(
        QdrantConfig(
            url="http://localhost:6333",
            collection_items="content_items_v1",
            collection_chunks="content_chunks_v1",
        )
    )
    pipeline = ChatPipeline(openai=openai, anthropic=anthropic, qdrant=qdrant)
    
    # Execute
    import asyncio
    req = ChatRequest(
        conversationId="test-123",
        messages=[ChatMessage(role="user", text="Tell me about Positium")],
    )
    asyncio.run(pipeline.handle(req))
    
    # Verify system prompt includes metadata in chunk labels
    assert len(captured_messages) > 0
    system_content = captured_messages[0]["content"]
    
    # Should contain the formatted label with all metadata
    assert '[experience:positium:0]' in system_content
    assert 'title:"Technical Project Lead"' in system_content
    assert 'company:"Positium"' in system_content
    assert 'role:"Technical Project Lead"' in system_content
    assert 'period:"2025 — 2025"' in system_content
