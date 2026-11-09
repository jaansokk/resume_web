from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from app.anthropic_client import ANSWER_SCHEMA, ROUTER_SCHEMA, AnthropicClient


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> AnthropicClient:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_USE_STRUCTURED_OUTPUTS", "1")
    monkeypatch.setenv("ANTHROPIC_THINKING_BUDGET_TOKENS", "3000")
    for var in ("ANTHROPIC_ROUTER_EFFORT", "ANTHROPIC_ANSWER_EFFORT", "ANTHROPIC_ANSWER_THINKING_EFFORT"):
        monkeypatch.delenv(var, raising=False)
    return AnthropicClient()


def test_haiku_5_thinking_off_uses_effort_and_no_sampling(client: AnthropicClient) -> None:
    params = client._generation_params(
        model="claude-haiku-5-5",
        thinking_enabled=False,
        effort=client.answer_effort,
        json_schema=ANSWER_SCHEMA,
        temperature=0.7,
    )

    assert params == {
        "thinking": {"type": "disabled"},
        "output_config": {
            "effort": "low",
            "format": {"type": "json_schema", "schema": ANSWER_SCHEMA},
        },
    }


def test_haiku_5_thinking_on_is_adaptive_summarized_and_keeps_schema(client: AnthropicClient) -> None:
    params = client._generation_params(
        model="claude-haiku-5-5",
        thinking_enabled=True,
        effort=client.answer_thinking_effort,
        json_schema=ANSWER_SCHEMA,
        temperature=0.7,
    )

    assert params == {
        "thinking": {"type": "adaptive", "display": "summarized"},
        "output_config": {
            "effort": "medium",
            "format": {"type": "json_schema", "schema": ANSWER_SCHEMA},
        },
    }


def test_legacy_models_keep_budget_thinking_and_temperature(client: AnthropicClient) -> None:
    off = client._generation_params(
        model="claude-haiku-4-5-20251001",
        thinking_enabled=False,
        effort="low",
        json_schema=ANSWER_SCHEMA,
        temperature=0.7,
    )
    on = client._generation_params(
        model="claude-sonnet-4-20250514",
        thinking_enabled=True,
        effort="medium",
        json_schema=ANSWER_SCHEMA,
        temperature=0.7,
    )

    assert off == {
        "temperature": 0.7,
        "output_format": {"type": "json_schema", "schema": ANSWER_SCHEMA},
    }
    assert on == {
        "temperature": 1,
        "thinking": {"type": "enabled", "budget_tokens": 3000},
    }


def test_router_on_haiku_5_skips_leading_thinking_block(client: AnthropicClient) -> None:
    sent: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "content": [
                    {"type": "thinking", "thinking": "", "signature": "sig"},
                    {"type": "text", "text": '{"retrievalQuery": "q"}'},
                ],
                "stop_reason": "end_turn",
                "usage": {"output_tokens": 7},
            },
        )

    client.router_model = "claude-haiku-5-5"
    client._client = httpx.AsyncClient(
        base_url=client.BASE_URL, transport=httpx.MockTransport(handler)
    )

    content = asyncio.run(client.router(messages=[{"role": "user", "content": "hi"}]))

    assert content == '{"retrievalQuery": "q"}'
    assert client.last_router_output_tokens == 7
    assert sent["thinking"] == {"type": "disabled"}
    assert sent["output_config"]["effort"] == "low"
    assert sent["output_config"]["format"]["schema"] == ROUTER_SCHEMA
    assert "temperature" not in sent and "output_format" not in sent
