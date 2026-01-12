from __future__ import annotations

import json
import os
from typing import Any

from anthropic import Anthropic


class AnthropicClient:
    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        # Don't raise immediately - allow initialization even without key
        # This lets users choose OpenAI without needing Anthropic key
        self.api_key = api_key
        self.client = Anthropic(api_key=api_key) if api_key else None
        self.chat_model = os.environ.get("ANTHROPIC_CHAT_MODEL", "claude-sonnet-4-20250514")
        self.router_model = os.environ.get("ANTHROPIC_ROUTER_MODEL", "claude-3-5-haiku-20241022")
        self.router_max_tokens = int(os.environ.get("ANTHROPIC_ROUTER_MAX_TOKENS", "1024"))
        self.answer_max_tokens = int(os.environ.get("ANTHROPIC_ANSWER_MAX_TOKENS", "2048"))

    def chat_json(self, *, model: str, messages: list[dict[str, str]], max_tokens: int) -> str:
        """
        Returns raw JSON string.
        Anthropic requires system messages to be passed separately.
        """
        if not self.client:
            raise ValueError("Missing ANTHROPIC_API_KEY - cannot use Anthropic client")
        
        # Separate system message from conversation messages
        system_content = ""
        conversation_messages: list[dict[str, Any]] = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"]
            else:
                conversation_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        # Build the API call
        api_params: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": conversation_messages,
        }
        
        if system_content:
            # Enable prompt caching for system message to reduce latency on repeated requests
            # The system prompt (especially with long context) will be cached for ~5 minutes
            api_params["system"] = [
                {
                    "type": "text",
                    "text": system_content,
                    "cache_control": {"type": "ephemeral"}
                }
            ]

        response = self.client.messages.create(**api_params)
        
        # Extract text content from the response
        content = response.content[0].text if response.content else "{}"
        
        # Try to extract JSON from markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        elif content.startswith("```"):
            content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        
        return content

    def router(self, *, messages: list[dict[str, str]]) -> str:
        return self.chat_json(model=self.router_model, messages=messages, max_tokens=self.router_max_tokens)

    def answer(self, *, messages: list[dict[str, str]]) -> str:
        return self.chat_json(model=self.chat_model, messages=messages, max_tokens=self.answer_max_tokens)

