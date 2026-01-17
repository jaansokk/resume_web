from __future__ import annotations

import os
from typing import Any

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _env() -> None:
    # OpenAI client requires a key at import time in app.main; tests mock all calls anyway.
    os.environ.setdefault("OPENAI_API_KEY", "test-key")
    # Anthropic is the default provider in this service; tests mock all calls anyway.
    os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
    os.environ.setdefault("MODEL_PROVIDER", "anthropic")
    os.environ.setdefault("QDRANT_URL", "http://127.0.0.1:6333")


def test_healthz() -> None:
    from app.main import app

    client = TestClient(app)
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_chat_rejects_invalid_request() -> None:
    from app.main import app

    client = TestClient(app)
    res = client.post("/chat", json={"conversationId": "x", "messages": []})
    # FastAPI returns 422 on request model validation errors.
    assert res.status_code == 422


def test_chat_v2_contract_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that the v2 contract is returned correctly."""
    from app.main import app
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient

    # Mock OpenAI: embeddings
    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    # Mock router to return v2-style directives
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"test query","ui":{"view":"chat"},"chips":["B2B SaaS","Consumer fintech"],"hints":{"suggestTab":null}}'

    monkeypatch.setattr(
        AnthropicClient,
        "router",
        _router,
    )
    
    # Mock answer to return v2 response with artifacts
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return """{"assistant":{"text":"Great question! What domain are you working in?"},"ui":{"view":"chat"},"chips":["B2B SaaS","AI/ML platform"],"hints":{"suggestTab":null},"artifacts":{}}"""

    monkeypatch.setattr(
        AnthropicClient,
        "answer",
        _answer,
    )

    # Mock Qdrant search: include one experience chunk and one background chunk
    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.9,
                "payload": {
                    "type": "experience",
                    "slug": "guardtime-po",
                    "chunkId": 0,
                    "section": "A",
                    "text": "Product strategy",
                    "title": "Product Owner",
                    "company": "Guardtime",
                    "role": "Product Owner",
                    "period": "2024 — 2025",
                },
            },
            {
                "score": 0.8,
                "payload": {"type": "background", "slug": "principles", "chunkId": 0, "section": "B", "text": "Values"},
            },
        ]

    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)

    # Slug validation: reject background, accept experience
    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "principles":
            return {"type": "background", "uiVisible": False, "slug": "principles"}
        if slug == "guardtime-po":
            return {"type": "experience", "uiVisible": True, "slug": "guardtime-po"}
        return None

    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)

    client = TestClient(app)
    payload = {
        "conversationId": "test-conv-1",
        "client": {
            "origin": "http://localhost:4321",
            "page": {"path": "/"},
            "ui": {"view": "chat"},
        },
        "messages": [{"role": "user", "text": "I'm hiring for a Product Manager"}],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    # Validate v2 contract structure
    assert "assistant" in data
    assert "text" in data["assistant"]
    assert isinstance(data["assistant"]["text"], str)
    
    assert "ui" in data
    assert data["ui"]["view"] in ("chat", "split")
    
    assert "hints" in data
    assert isinstance(data["hints"], dict)
    
    assert "chips" in data
    assert isinstance(data["chips"], list)
    
    assert "artifacts" in data
    assert isinstance(data["artifacts"], dict)


def test_chat_v2_split_view_with_artifacts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that split view returns artifacts correctly."""
    from app.main import app
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient

    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    # Router recommends split view
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"product manager experience","ui":{"view":"split","split":{"activeTab":"brief"}},"chips":[],"hints":{"suggestTab":"brief"}}'

    monkeypatch.setattr(
        AnthropicClient,
        "router",
        _router,
    )
    
    # Answer with artifacts
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return """{"assistant":{"text":"Let me check a couple things..."},"ui":{"view":"split","split":{"activeTab":"brief"}},"chips":[],"hints":{"suggestTab":"brief"},"artifacts":{"fitBrief":{"title":"Fit Brief — Jaan Sokk / Product Manager","sections":[{"id":"need","title":"What I think you need","content":"A product leader who can balance strategy and execution."}]},"relevantExperience":{"groups":[{"title":"Most relevant","items":[{"slug":"guardtime-po","type":"experience","title":"GuardTime","role":"Product Owner","period":"2024-2025","bullets":["Led product strategy","Owned roadmap"],"whyRelevant":"Relevant blockchain experience"}]}]}}}"""

    monkeypatch.setattr(
        AnthropicClient,
        "answer",
        _answer,
    )

    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.9,
                "payload": {
                    "type": "experience",
                    "slug": "guardtime-po",
                    "chunkId": 0,
                    "section": "A",
                    "text": "Blockchain PM",
                    "title": "Product Owner",
                    "company": "Guardtime",
                    "role": "Product Owner",
                    "period": "2024 — 2025",
                },
            },
        ]

    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)

    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "guardtime-po":
            return {"type": "experience", "uiVisible": True, "slug": "guardtime-po"}
        return None

    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)

    client = TestClient(app)
    payload = {
        "conversationId": "test-conv-2",
        "client": {
            "origin": "http://localhost:4321",
            "page": {"path": "/"},
            "ui": {"view": "chat"},
        },
        "messages": [
            {"role": "user", "text": "I'm hiring for a Product Manager"},
            {"role": "assistant", "text": "What domain?"},
            {"role": "user", "text": "Blockchain / B2B SaaS"},
        ],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    # Should transition to split view
    assert data["ui"]["view"] == "split"
    assert "split" in data["ui"]
    assert data["ui"]["split"]["activeTab"] in ("brief", "experience")
    
    # Should have artifacts
    assert "artifacts" in data
    if data["artifacts"].get("fitBrief"):
        assert "title" in data["artifacts"]["fitBrief"]
        assert "sections" in data["artifacts"]["fitBrief"]
    
    if data["artifacts"].get("relevantExperience"):
        assert "groups" in data["artifacts"]["relevantExperience"]
        # Validate no background items leak through
        for group in data["artifacts"]["relevantExperience"]["groups"]:
            for item in group["items"]:
                assert item["type"] in ("experience", "project")
                assert item["slug"] != "principles"  # Background slug should not appear


def test_background_never_in_ui_visible_experience(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that background items are never exposed as UI-visible relevant experience."""
    from app.main import app
    from app.anthropic_client import AnthropicClient
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient

    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    
    async def _router(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return '{"retrievalQuery":"test","ui":{"view":"split","split":{"activeTab":"experience"}},"chips":[],"hints":{}}'

    monkeypatch.setattr(
        AnthropicClient,
        "router",
        _router,
    )
    
    # Try to return background item in artifacts (should be filtered out)
    async def _answer(self: AnthropicClient, *, messages: list[dict[str, str]]) -> str:
        return """{"assistant":{"text":"Here's what I found"},"ui":{"view":"split","split":{"activeTab":"experience"}},"artifacts":{"relevantExperience":{"groups":[{"title":"Relevant","items":[{"slug":"principles","type":"experience","title":"My Principles","bullets":["Value 1"]},{"slug":"guardtime-po","type":"experience","title":"GuardTime","bullets":["Real work"]}]}]}}}"""

    monkeypatch.setattr(
        AnthropicClient,
        "answer",
        _answer,
    )

    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.9,
                "payload": {"type": "background", "slug": "principles", "chunkId": 0, "section": "B", "text": "Values"},
            },
            {
                "score": 0.85,
                "payload": {
                    "type": "experience",
                    "slug": "guardtime-po",
                    "chunkId": 0,
                    "section": "A",
                    "text": "Work",
                    "title": "Product Owner",
                    "company": "Guardtime",
                    "role": "Product Owner",
                    "period": "2024 — 2025",
                },
            },
        ]

    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)

    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "principles":
            return {"type": "background", "uiVisible": False, "slug": "principles"}
        if slug == "guardtime-po":
            return {"type": "experience", "uiVisible": True, "slug": "guardtime-po"}
        return None

    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)

    client = TestClient(app)
    payload = {
        "conversationId": "test-conv-3",
        "client": {
            "origin": "http://localhost:4321",
            "page": {"path": "/"},
            "ui": {"view": "chat"},
        },
        "messages": [{"role": "user", "text": "show me experience"}],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    # Validate background slug is NOT in relevant experience
    if data["artifacts"].get("relevantExperience"):
        for group in data["artifacts"]["relevantExperience"]["groups"]:
            for item in group["items"]:
                assert item["slug"] != "principles", "Background item 'principles' should be filtered out"
                # Only guardtime-po should appear
                assert item["slug"] == "guardtime-po"
