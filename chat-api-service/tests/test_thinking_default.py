from __future__ import annotations

import pytest

from app.models import ChatRequest
from app.orchestrator import ChatOrchestrator


def _build_context(payload: dict):
    # _build_context only reads the request, so skip the client wiring in __init__.
    orchestrator = object.__new__(ChatOrchestrator)
    return orchestrator._build_context(ChatRequest.model_validate(payload))


@pytest.mark.parametrize(
    "client",
    [None, {"origin": "http://localhost:4321"}],
    ids=["no-client", "client-without-flag"],
)
def test_thinking_defaults_to_disabled_when_omitted(client: dict | None) -> None:
    payload = {"conversationId": "c1", "messages": [{"role": "user", "text": "hi"}]}
    if client is not None:
        payload["client"] = client

    assert _build_context(payload).thinking_enabled is False


def test_thinking_follows_explicit_client_flag() -> None:
    ctx = _build_context(
        {
            "conversationId": "c1",
            "client": {"thinkingEnabled": True},
            "messages": [{"role": "user", "text": "hi"}],
        }
    )

    assert ctx.thinking_enabled is True
