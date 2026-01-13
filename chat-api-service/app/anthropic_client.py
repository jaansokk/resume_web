from __future__ import annotations

import json
import os
from typing import Any, AsyncGenerator

import httpx


# JSON schemas for structured outputs
ROUTER_SCHEMA = {
    "type": "object",
    "properties": {
        "retrievalQuery": {"type": "string"},
        "ui": {
            "type": "object",
            "properties": {
                "view": {"type": "string", "enum": ["chat", "split"]},
                "split": {
                    "type": "object",
                    "properties": {
                        "activeTab": {"type": "string", "enum": ["brief", "experience"]}
                    },
                    "required": ["activeTab"]
                }
            },
            "required": ["view"]
        },
        "chips": {"type": "array", "items": {"type": "string"}},
        "hints": {
            "type": "object",
            "properties": {
                "suggestTab": {"type": ["string", "null"], "enum": ["brief", "experience", None]}
            },
            "required": ["suggestTab"]
        }
    },
    "required": ["retrievalQuery", "ui", "chips", "hints"]
}

ANSWER_SCHEMA = {
    "type": "object",
    "properties": {
        "assistant": {
            "type": "object",
            "properties": {
                "text": {"type": "string"}
            },
            "required": ["text"]
        },
        "ui": {
            "type": "object",
            "properties": {
                "view": {"type": "string", "enum": ["chat", "split"]},
                "split": {
                    "type": "object",
                    "properties": {
                        "activeTab": {"type": "string", "enum": ["brief", "experience"]}
                    },
                    "required": ["activeTab"]
                }
            },
            "required": ["view"]
        },
        "hints": {
            "type": "object",
            "properties": {
                "suggestTab": {"type": ["string", "null"], "enum": ["brief", "experience", None]}
            }
        },
        "chips": {"type": "array", "items": {"type": "string"}},
        "artifacts": {
            "type": "object",
            "properties": {
                "fitBrief": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "sections": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "title": {"type": "string"},
                                    "content": {"type": "string"}
                                },
                                "required": ["id", "title", "content"]
                            }
                        }
                    },
                    "required": ["title", "sections"]
                },
                "relevantExperience": {
                    "type": "object",
                    "properties": {
                        "groups": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "items": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "slug": {"type": "string"},
                                                "type": {"type": "string", "enum": ["experience", "project"]},
                                                "title": {"type": "string"},
                                                "role": {"type": ["string", "null"]},
                                                "period": {"type": ["string", "null"]},
                                                "bullets": {"type": "array", "items": {"type": "string"}},
                                                "whyRelevant": {"type": ["string", "null"]}
                                            },
                                            "required": ["slug", "type", "title", "bullets"]
                                        }
                                    }
                                },
                                "required": ["title", "items"]
                            }
                        }
                    },
                    "required": ["groups"]
                }
            }
        }
    },
    "required": ["assistant", "ui"]
}


class AnthropicClient:
    """
    Direct HTTP client for Anthropic API using httpx.
    Provides proper async streaming without SDK blocking issues.
    """
    
    BASE_URL = "https://api.anthropic.com/v1"
    API_VERSION = "2023-06-01"
    
    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        # Don't raise immediately - allow initialization even without key
        # This lets users choose OpenAI without needing Anthropic key
        self.api_key = api_key
        self.chat_model = os.environ.get("ANTHROPIC_CHAT_MODEL", "claude-sonnet-4-20250514")
        self.router_model = os.environ.get("ANTHROPIC_ROUTER_MODEL", "claude-3-5-haiku-20241022")
        self.router_max_tokens = int(os.environ.get("ANTHROPIC_ROUTER_MAX_TOKENS", "1024"))
        self.answer_max_tokens = int(os.environ.get("ANTHROPIC_ANSWER_MAX_TOKENS", "2048"))
        # Structured outputs are in beta - enable with ANTHROPIC_USE_STRUCTURED_OUTPUTS=1
        self.use_structured_outputs = os.environ.get("ANTHROPIC_USE_STRUCTURED_OUTPUTS", "0").strip() == "1"
        
        # Create async HTTP client
        self._client: httpx.AsyncClient | None = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the async HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "anthropic-version": self.API_VERSION,
                    "x-api-key": self.api_key,
                    "content-type": "application/json",
                },
                timeout=60.0,
            )
        return self._client
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def chat_json(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        max_tokens: int,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        """
        Non-streaming API call that returns raw JSON string.
        Anthropic requires system messages to be passed separately.
        
        Args:
            model: Model ID to use
            messages: List of messages (including system message)
            max_tokens: Maximum tokens to generate
            json_schema: Optional JSON schema for structured outputs
        """
        if not self.api_key:
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

        # Build the API request body
        request_body: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": conversation_messages,
        }
        
        if system_content:
            # Enable prompt caching for system message to reduce latency
            request_body["system"] = [
                {
                    "type": "text",
                    "text": system_content,
                    "cache_control": {"type": "ephemeral"}
                }
            ]

        # Add structured output schema if enabled
        if json_schema and self.use_structured_outputs:
            request_body["output_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "response",
                    "strict": True,
                    "schema": json_schema
                }
            }

        client = await self._get_client()
        response = await client.post("/messages", json=request_body)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract text content from the response
        content = ""
        if "content" in data and len(data["content"]) > 0:
            content = data["content"][0].get("text", "{}")
        
        # Strip markdown code blocks if present
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

    async def router(self, *, messages: list[dict[str, str]]) -> str:
        """Router call with structured output schema."""
        return await self.chat_json(
            model=self.router_model,
            messages=messages,
            max_tokens=self.router_max_tokens,
            json_schema=ROUTER_SCHEMA,
        )

    async def answer(self, *, messages: list[dict[str, str]]) -> str:
        """Answer call with structured output schema."""
        return await self.chat_json(
            model=self.chat_model,
            messages=messages,
            max_tokens=self.answer_max_tokens,
            json_schema=ANSWER_SCHEMA,
        )

    async def answer_stream(
        self, *, messages: list[dict[str, str]]
    ) -> AsyncGenerator[tuple[str, str | None], None]:
        """
        Stream answer with true async streaming using httpx.
        
        The model outputs JSON like: {"assistant": {"text": "..."}, "ui": {...}, ...}
        We extract and stream only the assistant.text portion for display,
        while accumulating the full JSON for final parsing.
        
        Yields tuples of (event_type, data):
        - ("text", delta_text): Just the assistant text content as it arrives
        - ("done", full_json): Complete response JSON string
        """
        if not self.api_key:
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

        # Build the API request body
        request_body: dict[str, Any] = {
            "model": self.chat_model,
            "max_tokens": self.answer_max_tokens,
            "messages": conversation_messages,
            "stream": True,  # Enable streaming
        }
        
        if system_content:
            request_body["system"] = [
                {
                    "type": "text",
                    "text": system_content,
                    "cache_control": {"type": "ephemeral"}
                }
            ]

        # Add structured output schema if enabled
        if self.use_structured_outputs:
            request_body["output_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "response",
                    "strict": True,
                    "schema": ANSWER_SCHEMA
                }
            }

        client = await self._get_client()
        
        # Stream the response using httpx
        # We need to extract just the assistant.text from the JSON structure
        accumulated_json = ""
        
        # State machine to extract assistant.text from streaming JSON
        # The JSON looks like: {"assistant":{"text":"..."},"ui":{...},...}
        # We look for the pattern: "assistant"...{"text":" and stream until closing "
        # States: 0=looking, 1=found pattern, 2=inside text value, 3=done
        state = 0
        pattern_buffer = ""
        escape_next = False
        # Pattern to look for (handles optional whitespace)
        TARGET_PATTERNS = ['"assistant":{"text":', '"assistant": {"text":', '"assistant":{ "text":']
        
        async with client.stream("POST", "/messages", json=request_body) as response:
            response.raise_for_status()
            
            # Parse Server-Sent Events (SSE) from the stream
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                
                # SSE format: "event: event_type" or "data: json_data"
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    
                    try:
                        data = json.loads(data_str)
                        
                        # Handle different event types from Anthropic's streaming API
                        event_type = data.get("type", "")
                        
                        if event_type == "content_block_delta":
                            # Text delta event
                            delta_data = data.get("delta", {})
                            if delta_data.get("type") == "text_delta":
                                chunk = delta_data.get("text", "")
                                if chunk:
                                    accumulated_json += chunk
                                    
                                    # Process each character to extract assistant.text
                                    for char in chunk:
                                        if state == 0:
                                            # Looking for "assistant":{"text": pattern
                                            pattern_buffer += char
                                            
                                            # Check if we found the pattern
                                            found = False
                                            for pattern in TARGET_PATTERNS:
                                                if pattern_buffer.endswith(pattern):
                                                    state = 1
                                                    pattern_buffer = ""
                                                    found = True
                                                    break
                                            
                                            if not found and len(pattern_buffer) > 50:
                                                # Keep buffer bounded
                                                pattern_buffer = pattern_buffer[-30:]
                                        
                                        elif state == 1:
                                            # Found pattern, looking for opening quote of value
                                            if char == '"':
                                                state = 2
                                            elif char in ' \t\n':
                                                # Skip whitespace
                                                pass
                                            else:
                                                # Unexpected, but continue in state 1
                                                pass
                                        
                                        elif state == 2:
                                            # Inside the text value, stream it!
                                            if escape_next:
                                                # Handle escaped character
                                                if char == 'n':
                                                    yield ("text", "\n")
                                                elif char == 't':
                                                    yield ("text", "\t")
                                                elif char == 'r':
                                                    yield ("text", "\r")
                                                else:
                                                    yield ("text", char)
                                                escape_next = False
                                            elif char == '\\':
                                                escape_next = True
                                            elif char == '"':
                                                # End of text value
                                                state = 3
                                            else:
                                                yield ("text", char)
                                        
                                        # state == 3: done with text, just accumulate JSON
                        
                        elif event_type == "message_stop":
                            # Stream complete
                            break
                            
                    except json.JSONDecodeError:
                        # Skip invalid JSON lines
                        continue
        
        # After stream completes, yield the full JSON
        content = accumulated_json.strip()
        
        # Strip markdown code blocks if present
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
        
        yield ("done", content)

