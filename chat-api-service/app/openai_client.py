from __future__ import annotations

import os
from typing import Any

from openai import OpenAI


class OpenAIClient:
    def __init__(self) -> None:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise ValueError("Missing OPENAI_API_KEY")

        self.client = OpenAI(api_key=api_key)
        self.embed_model = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        self.chat_model = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.router_model = os.environ.get("OPENAI_ROUTER_MODEL", "gpt-5-nano")
        self.embedding_dim = int(os.environ.get("EMBEDDING_DIM", "1536"))

        # Best-effort usage (output tokens) from the most recent calls.
        # Tests may monkeypatch `router()` / `answer()`, so callers must treat these as optional.
        self.last_router_output_tokens: int = 0
        self.last_answer_output_tokens: int = 0

    def embed(self, text: str) -> list[float]:
        res = self.client.embeddings.create(
            model=self.embed_model,
            input=text,
            dimensions=self.embedding_dim,
        )
        return list(res.data[0].embedding)

    def chat_json(self, *, model: str, messages: list[dict[str, str]]) -> str:
        """
        Returns raw JSON string (model is instructed to output a json_object).
        """
        res = self.client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )
        return res.choices[0].message.content or "{}"

    def chat_json_with_usage(self, *, model: str, messages: list[dict[str, str]]) -> tuple[str, dict[str, int]]:
        """
        Returns (raw_json, usage) where usage is best-effort.

        For OpenAI Chat Completions, output tokens correspond to `usage.completion_tokens`.
        """
        res = self.client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )
        content = res.choices[0].message.content or "{}"
        out_tokens = 0
        try:
            out_tokens = int(getattr(res.usage, "completion_tokens", 0) or 0)
        except Exception:
            out_tokens = 0
        return content, {"output_tokens": out_tokens}

    def router(self, *, messages: list[dict[str, str]]) -> str:
        content, usage = self.chat_json_with_usage(model=self.router_model, messages=messages)
        try:
            self.last_router_output_tokens = int((usage or {}).get("output_tokens") or 0)
        except Exception:
            self.last_router_output_tokens = 0
        return content

    def router_with_usage(self, *, messages: list[dict[str, str]]) -> tuple[str, dict[str, int]]:
        return self.chat_json_with_usage(model=self.router_model, messages=messages)

    def answer(self, *, messages: list[dict[str, str]]) -> str:
        content, usage = self.chat_json_with_usage(model=self.chat_model, messages=messages)
        try:
            self.last_answer_output_tokens = int((usage or {}).get("output_tokens") or 0)
        except Exception:
            self.last_answer_output_tokens = 0
        return content

    def answer_with_usage(self, *, messages: list[dict[str, str]]) -> tuple[str, dict[str, int]]:
        return self.chat_json_with_usage(model=self.chat_model, messages=messages)


