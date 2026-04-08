from __future__ import annotations

from fastapi.testclient import TestClient

from app.models import ShareGetResponse
from app.rate_limiter import InMemoryRateLimiter, RateLimitConfig, RateLimitPolicy, build_chat_rate_limit_policy


def test_route_scoped_rate_limits_do_not_share_ip_counters() -> None:
    limiter = InMemoryRateLimiter(
        RateLimitConfig(
            daily_limit=2,
            burst_limit=10,
            global_burst_limit=100,
            conversation_limit_per_ip=20,
        )
    )
    chat_policy = build_chat_rate_limit_policy(limiter.config)
    contact_policy = RateLimitPolicy(
        daily_limit=1,
        burst_limit=10,
        burst_window_seconds=60,
    )

    assert limiter.check_limit(
        ip="203.0.113.10",
        route="/chat",
        policy=chat_policy,
        conversation_id="chat-1",
    ) == (True, "ok")
    assert limiter.check_limit(
        ip="203.0.113.10",
        route="/contact",
        policy=contact_policy,
    ) == (True, "ok")
    assert limiter.check_limit(
        ip="203.0.113.10",
        route="/chat",
        policy=chat_policy,
        conversation_id="chat-2",
    ) == (True, "ok")


def test_chat_request_rejects_invalid_split_active_tab() -> None:
    from app.main import app

    client = TestClient(app)
    res = client.post(
        "/chat",
        json={
            "conversationId": "invalid-split-tab",
            "client": {
                "origin": "http://localhost:4321",
                "page": {"path": "/"},
                "ui": {
                    "view": "split",
                    "split": {"activeTab": "summary"},
                },
            },
            "messages": [{"role": "user", "text": "hello"}],
        },
    )

    assert res.status_code == 422


def test_share_snapshot_round_trips_with_typed_ui_and_messages() -> None:
    payload = {
        "shareId": "share-123",
        "createdAt": "2026-01-06T12:34:56.000Z",
        "snapshot": {
            "conversationId": "conv-123",
            "createdAt": "2026-01-06T12:34:56.000Z",
            "ui": {
                "view": "split",
                "split": {"activeTab": "brief"},
            },
            "messages": [
                {"role": "user", "text": "Tell me about product engineering."},
                {
                    "role": "assistant",
                    "text": "Here is the fit brief.",
                    "thinking": "Condensed reasoning",
                    "metrics": {"elapsedMs": 842, "outputTokens": 321},
                },
            ],
            "artifacts": {
                "fitBrief": {
                    "title": "Fit brief",
                    "sections": [{"id": "need", "title": "Need", "content": "Build and ship."}],
                },
                "relevantExperience": {
                    "groups": [
                        {
                            "title": "Most relevant",
                            "items": [
                                {
                                    "slug": "guardtime-po",
                                    "type": "experience",
                                    "title": "Guardtime",
                                    "role": "Product Owner",
                                    "period": "2024-2025",
                                    "bullets": ["Led roadmap"],
                                }
                            ],
                        }
                    ]
                },
            },
        },
    }

    model = ShareGetResponse.model_validate(payload)

    assert model.snapshot.ui.view == "split"
    assert model.snapshot.ui.split is not None
    assert model.snapshot.ui.split.activeTab == "brief"
    assert model.snapshot.messages[1].metrics is not None
    assert model.snapshot.messages[1].metrics.outputTokens == 321
