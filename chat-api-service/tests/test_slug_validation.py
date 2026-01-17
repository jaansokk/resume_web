"""
Tests for slug validation and parsing.

These tests cover the bug where the LLM was copying the full chunk label
"experience:positium:0" as the slug instead of just "positium", causing
validation failures.
"""
from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient


def test_malformed_slug_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Test that when LLM returns a malformed slug (e.g., "experience:positium:0"),
    it fails validation and is filtered out.
    """
    from app.main import app
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient
    
    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"test","ui":{"view":"split","split":{"activeTab":"experience"}},"chips":[],"hints":{}}'
    
    # LLM returns MALFORMED slug (includes the chunk label format)
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return """{"assistant":{"text":"Here's the experience"},"ui":{"view":"split","split":{"activeTab":"experience"}},"artifacts":{"relevantExperience":{"groups":[{"title":"Relevant","items":[{"slug":"experience:positium:0","type":"experience","title":"Positium","role":"Technical Project Lead","period":"2025","bullets":["Led delivery"],"whyRelevant":"Relevant"}]}]}}}"""
    
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
                    "text": "Led delivery...",
                    "title": "Technical Project Lead",
                    "company": "Positium",
                    "role": "Technical Project Lead",
                    "period": "2025 — 2025",
                },
            },
        ]
    
    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)
    
    # get_item_by_slug should return None for malformed slug
    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "positium":
            return {"type": "experience", "visibleIn": ["artifacts"], "uiVisible": True, "slug": "positium"}
        # Malformed slug won't be found
        return None
    
    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)
    
    client = TestClient(app)
    payload = {
        "conversationId": "test-malformed-slug",
        "client": {
            "origin": "http://localhost:4321",
            "page": {"path": "/"},
            "ui": {"view": "chat"},
        },
        "messages": [{"role": "user", "text": "Tell me about Positium"}],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    # Malformed slug should be filtered out, leaving no relevant experience
    if data["artifacts"].get("relevantExperience"):
        # Either no groups, or all groups are empty
        groups = data["artifacts"]["relevantExperience"].get("groups", [])
        assert len(groups) == 0, "Malformed slug should result in no valid experience items"


def test_correct_slug_passes_validation(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Test that when LLM returns the correct slug format (just "positium"),
    it passes validation.
    """
    from app.main import app
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient
    
    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"test","ui":{"view":"split","split":{"activeTab":"experience"}},"chips":[],"hints":{}}'
    
    # LLM returns CORRECT slug (just the slug part)
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return """{"assistant":{"text":"Here's the experience"},"ui":{"view":"split","split":{"activeTab":"experience"}},"artifacts":{"relevantExperience":{"groups":[{"title":"Relevant","items":[{"slug":"positium","type":"experience","title":"Technical Project Lead","role":"Technical Project Lead","period":"2025 — 2025","bullets":["Led delivery of nationwide mobility model"],"whyRelevant":"Project leadership"}]}]}}}"""
    
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
                    "text": "Led delivery...",
                    "title": "Technical Project Lead",
                    "company": "Positium",
                    "role": "Technical Project Lead",
                    "period": "2025 — 2025",
                },
            },
        ]
    
    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)
    
    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "positium":
            return {
                "type": "experience",
                "visibleIn": ["artifacts"],
                "uiVisible": True,
                "slug": "positium",
                "title": "Technical Project Lead",
                "company": "Positium",
                "role": "Technical Project Lead",
                "period": "2025 — 2025",
            }
        return None
    
    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)
    
    client = TestClient(app)
    payload = {
        "conversationId": "test-correct-slug",
        "client": {
            "origin": "http://localhost:4321",
            "page": {"path": "/"},
            "ui": {"view": "chat"},
        },
        "messages": [{"role": "user", "text": "Tell me about Positium"}],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    # Correct slug should pass validation
    assert "artifacts" in data
    assert "relevantExperience" in data["artifacts"]
    assert "groups" in data["artifacts"]["relevantExperience"]
    
    groups = data["artifacts"]["relevantExperience"]["groups"]
    assert len(groups) > 0, "Should have at least one group"
    assert len(groups[0]["items"]) > 0, "Should have at least one item"
    
    item = groups[0]["items"][0]
    assert item["slug"] == "positium"
    assert item["role"] == "Technical Project Lead"
    assert item["title"] == "Technical Project Lead"


def test_role_matches_source_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Test that the role in relevantExperience matches the source metadata,
    not a paraphrased or hallucinated version.
    """
    from app.main import app
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient
    
    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"guardtime experience","ui":{"view":"split","split":{"activeTab":"experience"}},"chips":[],"hints":{}}'
    
    # LLM should use exact role from metadata
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        # The system prompt now provides role:"Technical Project Manager / ScrumMaster" in the context
        return """{"assistant":{"text":"Found Guardtime experience"},"ui":{"view":"split","split":{"activeTab":"experience"}},"artifacts":{"relevantExperience":{"groups":[{"title":"Blockchain Experience","items":[{"slug":"guardtime-pm","type":"experience","title":"Technical Project Manager / ScrumMaster","role":"Technical Project Manager / ScrumMaster","period":"2019 — 2024","bullets":["Digitised construction at NEOM","Pioneered COVID certificate"],"whyRelevant":"Blockchain PM experience"}]}]}}}"""
    
    monkeypatch.setattr(AnthropicClient, "router", _router)
    monkeypatch.setattr(AnthropicClient, "answer", _answer)
    
    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.95,
                "payload": {
                    "type": "experience",
                    "slug": "guardtime-pm",
                    "chunkId": 0,
                    "section": "Impact",
                    "text": "Digitised construction...",
                    "title": "Technical Project Manager / ScrumMaster",
                    "company": "Guardtime",
                    "role": "Technical Project Manager / ScrumMaster",
                    "period": "2019 — 2024",
                },
            },
        ]
    
    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)
    
    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "guardtime-pm":
            return {
                "type": "experience",
                "visibleIn": ["artifacts"],
                "uiVisible": True,
                "slug": "guardtime-pm",
                "title": "Technical Project Manager / ScrumMaster",
                "company": "Guardtime",
                "role": "Technical Project Manager / ScrumMaster",
                "period": "2019 — 2024",
            }
        return None
    
    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)
    
    client = TestClient(app)
    payload = {
        "conversationId": "test-role-match",
        "client": {
            "origin": "http://localhost:4321",
            "page": {"path": "/"},
            "ui": {"view": "chat"},
        },
        "messages": [{"role": "user", "text": "Tell me about Guardtime"}],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    # Verify role is NOT paraphrased (e.g., "Product Manager" would be wrong)
    groups = data["artifacts"]["relevantExperience"]["groups"]
    item = groups[0]["items"][0]
    
    # Should be the EXACT role from source, not paraphrased
    assert item["role"] == "Technical Project Manager / ScrumMaster"
    assert item["role"] != "Product Manager"  # Common hallucination we want to avoid
    assert item["title"] == "Technical Project Manager / ScrumMaster"
