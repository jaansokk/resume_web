from __future__ import annotations

import os
from typing import Any

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _env() -> None:
    # OpenAI client requires a key at import time in app.main; tests mock all calls anyway.
    os.environ.setdefault("OPENAI_API_KEY", "test-key")
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


def test_chat_happy_path_mocked(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.main import app
    from app.openai_client import OpenAIClient
    from app.qdrant_client import QdrantClient

    # Mock OpenAI: router -> embeddings -> answer
    monkeypatch.setattr(OpenAIClient, "embed", lambda self, text: [0.0] * 1536)
    monkeypatch.setattr(
        OpenAIClient,
        "router",
        lambda self, messages: '{"classification":"general_talk","tone":"neutral","retrievalQuery":"test","suggestedRelatedSlugs":[],"next":{"offerMoreExamples":false,"askForEmail":false}}',
    )
    # Answer tries to return a background slug in related; service must filter it out.
    monkeypatch.setattr(
        OpenAIClient,
        "answer",
        lambda self, messages: '{"assistant":{"text":"hello"},"classification":"general_talk","tone":"neutral","related":[{"slug":"principles","reason":"background"}],"next":{"offerMoreExamples":false,"askForEmail":false}}',
    )

    # Mock Qdrant search: include one experience chunk and one background chunk
    def _search_chunks(self: QdrantClient, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        return [
            {
                "score": 0.9,
                "payload": {"type": "experience", "slug": "guardtime-po", "chunkId": 0, "section": "A", "text": "x"},
            },
            {
                "score": 0.8,
                "payload": {"type": "background", "slug": "principles", "chunkId": 0, "section": "B", "text": "y"},
            },
        ]

    monkeypatch.setattr(QdrantClient, "search_chunks", _search_chunks)

    # Slug validation should reject background and accept experience.
    def _get_item_by_slug(self: QdrantClient, slug: str) -> dict[str, Any] | None:
        if slug == "principles":
            return {"type": "background", "uiVisible": False, "slug": "principles"}
        if slug == "guardtime-po":
            return {"type": "experience", "uiVisible": True, "slug": "guardtime-po"}
        return None

    monkeypatch.setattr(QdrantClient, "get_item_by_slug", _get_item_by_slug)

    client = TestClient(app)
    payload = {
        "conversationId": "test",
        "client": {"origin": "http://localhost:4321", "page": {"path": "/", "activeSlug": None}},
        "messages": [{"role": "user", "text": "hello"}],
    }
    res = client.post("/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["assistant"]["text"] == "hello"
    # background MUST NOT be surfaced in related[]
    assert all(r["slug"] != "principles" for r in data.get("related", []))


