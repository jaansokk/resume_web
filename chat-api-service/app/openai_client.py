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

    def router(self, *, messages: list[dict[str, str]]) -> str:
        return self.chat_json(model=self.router_model, messages=messages)

    def answer(self, *, messages: list[dict[str, str]]) -> str:
        return self.chat_json(model=self.chat_model, messages=messages)


