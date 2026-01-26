"""
ChatPipeline: Main entry point for chat request handling.

Delegates to the orchestrator which coordinates individual agents.
This module provides backward compatibility while the orchestrator
handles the actual agent coordination.
"""

from __future__ import annotations

import os
from typing import Any, AsyncGenerator

from .models import ChatRequest, ChatResponse
from .anthropic_client import AnthropicClient
from .openai_client import OpenAIClient
from .qdrant_client import QdrantClient
from .retrieval import RetrievalService
from .orchestrator import ChatOrchestrator


class ChatPipeline:
    """
    Main pipeline class that handles chat requests.
    Delegates to ChatOrchestrator for actual processing.
    """
    
    def __init__(self, *, openai: OpenAIClient, anthropic: AnthropicClient, qdrant: QdrantClient):
        self.openai = openai
        self.anthropic = anthropic
        self.qdrant = qdrant
        self.retrieval = RetrievalService(qdrant)
        
        # MODEL_PROVIDER: "openai" or "anthropic" (default: "anthropic")
        self.model_provider = os.environ.get("MODEL_PROVIDER", "anthropic").lower().strip()
        if self.model_provider not in ("openai", "anthropic"):
            self.model_provider = "anthropic"
        
        # Initialize the orchestrator
        self.orchestrator = ChatOrchestrator(
            anthropic_client=anthropic,
            openai_client=openai,
            qdrant_client=qdrant,
            retrieval_service=self.retrieval,
            model_provider=self.model_provider,
        )
    
    async def handle(self, req: ChatRequest) -> ChatResponse:
        """
        Handle a chat request (non-streaming).
        Delegates to the orchestrator.
        """
        return await self.orchestrator.handle(req)
    
    async def handle_stream(self, req: ChatRequest) -> AsyncGenerator[dict[str, Any], None]:
        """
        Handle a chat request with streaming.
        Delegates to the orchestrator.
        
        Yields events:
        - {"event": "ui", "data": {"ui": {...}, "hints": {...}}}
        - {"event": "thinking", "data": {"delta": "..."}} (when thinking enabled)
        - {"event": "text", "data": {"delta": "..."}}
        - {"event": "done", "data": {full ChatResponse}}
        """
        async for event in self.orchestrator.handle_stream(req):
            yield event
