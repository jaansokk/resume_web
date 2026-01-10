"""
Rate limiter for API endpoints to prevent abuse.

Implements multiple rate limiting strategies:
1. Per-IP daily limit (e.g., 100 requests/24h)
2. Per-IP burst limit (e.g., 10 requests/minute)
3. Global burst limit (e.g., 50 requests/minute across all IPs)
4. Per-conversation ID limit (prevents bypassing via new IDs)
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Literal


@dataclass
class RateLimitConfig:
    """Rate limiter configuration."""

    # Per-IP limits
    daily_limit: int = 100  # requests per 24h per IP
    burst_limit: int = 10  # requests per minute per IP
    burst_window_seconds: int = 60

    # Global limits (across all IPs)
    global_burst_limit: int = 50  # requests per minute globally
    global_burst_window_seconds: int = 60

    # Conversation ID limits (prevent bypass via rotating IDs)
    conversation_limit_per_ip: int = 20  # max new conversation IDs per hour per IP
    conversation_window_seconds: int = 3600


@dataclass
class RateLimitState:
    """Per-IP rate limit state."""

    # Daily counter (resets at UTC midnight)
    daily_count: int = 0
    daily_window_start: str = ""  # YYYY-MM-DD UTC

    # Burst counter (sliding window)
    burst_requests: list[float] = field(default_factory=list)  # timestamps

    # Conversation IDs seen from this IP (for new-ID limit)
    conversation_ids: set[str] = field(default_factory=set)
    conversation_window_start: float = 0.0  # unix timestamp


class InMemoryRateLimiter:
    """
    In-memory rate limiter suitable for single-container deployments.

    For multi-replica deployments, consider:
    - DynamoDB-backed limiter (atomic counters with TTL)
    - Redis-backed limiter (faster than DynamoDB)
    - Caddy/nginx rate limiting (handles basic cases at proxy layer)
    """

    def __init__(self, config: RateLimitConfig | None = None):
        self.config = config or RateLimitConfig()
        self._state: dict[str, RateLimitState] = defaultdict(RateLimitState)
        self._global_burst: list[float] = []
        self._lock = Lock()

    def check_limit(
        self,
        *,
        ip: str,
        route: str,
        conversation_id: str | None = None,
    ) -> tuple[bool, Literal["daily", "burst", "global", "conversation", "ok"]]:
        """
        Check if request is allowed.

        Returns:
            (allowed: bool, reason: str)
            - (True, "ok") if allowed
            - (False, "daily"|"burst"|"global"|"conversation") if rate limited
        """
        with self._lock:
            now = time.time()
            today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")

            state = self._state[ip]

            # 1. Check daily limit
            if state.daily_window_start != today_utc:
                # New day, reset counter
                state.daily_count = 0
                state.daily_window_start = today_utc

            if state.daily_count >= self.config.daily_limit:
                return (False, "daily")

            # 2. Check per-IP burst limit (sliding window)
            state.burst_requests = [
                ts for ts in state.burst_requests if now - ts < self.config.burst_window_seconds
            ]
            if len(state.burst_requests) >= self.config.burst_limit:
                return (False, "burst")

            # 3. Check global burst limit
            self._global_burst = [
                ts for ts in self._global_burst if now - ts < self.config.global_burst_window_seconds
            ]
            if len(self._global_burst) >= self.config.global_burst_limit:
                return (False, "global")

            # 4. Check conversation ID limit (prevent bypass via rotating IDs)
            if conversation_id:
                # Reset window if expired
                if now - state.conversation_window_start > self.config.conversation_window_seconds:
                    state.conversation_ids.clear()
                    state.conversation_window_start = now

                # Track new conversation IDs
                if conversation_id not in state.conversation_ids:
                    if len(state.conversation_ids) >= self.config.conversation_limit_per_ip:
                        return (False, "conversation")
                    state.conversation_ids.add(conversation_id)

            # All checks passed, increment counters
            state.daily_count += 1
            state.burst_requests.append(now)
            self._global_burst.append(now)

            return (True, "ok")

    def get_retry_after(self, reason: Literal["daily", "burst", "global", "conversation"]) -> int:
        """
        Get Retry-After header value (seconds) based on rate limit reason.
        """
        if reason == "daily":
            # Time until next UTC midnight
            now = datetime.now(timezone.utc)
            next_midnight = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
            next_midnight = next_midnight.replace(day=now.day + 1)
            return int((next_midnight - now).total_seconds())
        elif reason == "burst":
            return self.config.burst_window_seconds
        elif reason == "global":
            return self.config.global_burst_window_seconds
        elif reason == "conversation":
            return self.config.conversation_window_seconds
        return 60  # fallback

    def get_stats(self) -> dict[str, int]:
        """Get current rate limiter statistics (for monitoring/debugging)."""
        with self._lock:
            now = time.time()
            # Clean up expired entries
            self._global_burst = [
                ts for ts in self._global_burst if now - ts < self.config.global_burst_window_seconds
            ]
            return {
                "total_ips": len(self._state),
                "global_burst_count": len(self._global_burst),
                "global_burst_limit": self.config.global_burst_limit,
            }


def load_rate_limit_config_from_env() -> RateLimitConfig:
    """
    Load rate limit configuration from environment variables.

    Env vars:
    - RATE_LIMIT_DAILY: requests per 24h per IP (default: 100)
    - RATE_LIMIT_BURST: requests per minute per IP (default: 10)
    - RATE_LIMIT_GLOBAL_BURST: requests per minute globally (default: 50)
    - RATE_LIMIT_CONVERSATION_PER_IP: max new conversation IDs per hour per IP (default: 20)
    """
    return RateLimitConfig(
        daily_limit=int(os.environ.get("RATE_LIMIT_DAILY", "100")),
        burst_limit=int(os.environ.get("RATE_LIMIT_BURST", "10")),
        burst_window_seconds=60,
        global_burst_limit=int(os.environ.get("RATE_LIMIT_GLOBAL_BURST", "50")),
        global_burst_window_seconds=60,
        conversation_limit_per_ip=int(os.environ.get("RATE_LIMIT_CONVERSATION_PER_IP", "20")),
        conversation_window_seconds=3600,
    )
