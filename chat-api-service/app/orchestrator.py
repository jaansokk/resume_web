"""
Orchestrator: Coordinates agent execution in sequence.

Currently implements sequential execution. Can be replaced with
LangGraph for parallel execution of independent agents (e.g., FitBrief + RelevantExperience).
"""

from __future__ import annotations

import logging
from typing import Any, AsyncGenerator

from .agents import AgentContext, RouterAgent, RetrievalAgent, ResponseAgent, ValidatorAgent
from .models import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


class ChatOrchestrator:
    """
    Orchestrates the chat pipeline agents in sequence.
    
    Flow:
    1. RouterAgent -> determines retrieval query + UI intent
    2. RetrievalAgent -> embeds query + searches Qdrant
    3. ResponseAgent -> generates answer (with optional thinking)
    4. ValidatorAgent -> sanitizes + validates output
    """
    
    def __init__(
        self,
        *,
        anthropic_client: Any,
        openai_client: Any,
        qdrant_client: Any,
        retrieval_service: Any,
        model_provider: str = "anthropic",
    ):
        self.model_provider = model_provider
        
        # Initialize agents
        self.router = RouterAgent(
            anthropic_client=anthropic_client,
            openai_client=openai_client,
            model_provider=model_provider,
        )
        self.retrieval = RetrievalAgent(
            openai_client=openai_client,
            qdrant_client=qdrant_client,
            retrieval_service=retrieval_service,
        )
        self.response = ResponseAgent(
            anthropic_client=anthropic_client,
            openai_client=openai_client,
            model_provider=model_provider,
        )
        self.validator = ValidatorAgent(qdrant_client=qdrant_client)
    
    def _build_context(self, req: ChatRequest) -> AgentContext:
        """Build the initial agent context from the request."""
        # Extract last user text
        last_user_text = ""
        for m in reversed(req.messages):
            if m.role == "user" and m.text.strip():
                last_user_text = m.text.strip()
                break
        if not last_user_text:
            last_user_text = "hello"
        
        # Extract client state
        client_view = "chat"
        client_active_tab = "brief"
        page_path = None
        thinking_enabled = True  # Default to enabled
        
        if req.client:
            if req.client.ui:
                client_view = req.client.ui.view or "chat"
                if req.client.ui.split and isinstance(req.client.ui.split, dict):
                    client_active_tab = req.client.ui.split.get("activeTab", "brief")
            if req.client.page:
                page_path = req.client.page.path
            # Check for thinking_enabled in client
            if req.client.thinkingEnabled is not None:
                thinking_enabled = req.client.thinkingEnabled
        
        # Build messages list
        messages = [{"role": m.role, "text": m.text} for m in req.messages]
        
        return AgentContext(
            conversation_id=req.conversationId,
            last_user_text=last_user_text,
            messages=messages,
            client_view=client_view,
            client_active_tab=client_active_tab,
            page_path=page_path,
            thinking_enabled=thinking_enabled,
        )

    def _attach_usage(self, ctx: AgentContext) -> None:
        """
        Attach best-effort usage metadata to ctx.response.

        Expected ctx.usage_by_agent format:
          {"router": {"outputTokens": 12}, "answer": {"outputTokens": 34}}
        """
        try:
            by_agent = ctx.usage_by_agent or {}
            if not isinstance(by_agent, dict) or not by_agent:
                return
            total = 0
            out_by_agent: dict[str, dict[str, int]] = {}
            for name, usage in by_agent.items():
                if not isinstance(name, str) or not isinstance(usage, dict):
                    continue
                out_tokens = int(usage.get("outputTokens") or 0)
                total += max(0, out_tokens)
                out_by_agent[name] = {"outputTokens": max(0, out_tokens)}
            if not out_by_agent:
                return
            if not isinstance(ctx.response, dict) or not ctx.response:
                return
            ctx.response["usage"] = {"outputTokens": total, "byAgent": out_by_agent}
        except Exception:
            # Best-effort only; do not fail the request on usage accounting
            return
    
    async def handle(self, req: ChatRequest) -> ChatResponse:
        """
        Execute the full pipeline (non-streaming).
        Returns the complete ChatResponse.
        """
        ctx = self._build_context(req)
        
        # Run agents in sequence
        ctx = await self.router.run(ctx)
        ctx = self.retrieval.run(ctx)
        ctx = await self.response.run(ctx)
        ctx = self.validator.run(ctx)
        self._attach_usage(ctx)
        
        return ChatResponse.model_validate(ctx.response)
    
    async def handle_stream(self, req: ChatRequest) -> AsyncGenerator[dict[str, Any], None]:
        """
        Execute the pipeline with streaming.
        
        Yields events:
        - {"event": "ui", "data": {"ui": {...}, "hints": {...}}}
        - {"event": "thinking", "data": {"delta": "..."}} (when thinking enabled)
        - {"event": "text", "data": {"delta": "..."}}
        - {"event": "done", "data": {full ChatResponse}}
        """
        ctx = self._build_context(req)
        
        # 1. Router (async, fast)
        ctx = await self.router.run(ctx)
        
        # 2. Retrieval (sync, fast)
        ctx = self.retrieval.run(ctx)
        
        # 3. Emit early UI directive
        ui_payload = self._build_early_ui_payload(ctx)
        yield {
            "event": "ui",
            "data": {
                "ui": ui_payload,
                "hints": {"suggestTab": ctx.router_hints.get("suggestTab")},
            },
        }
        
        # 4. Response with streaming
        thinking_count = 0
        text_count = 0
        async for event_type, data in self.response.run_stream(ctx):
            if event_type == "thinking" and data:
                thinking_count += len(data)
                yield {"event": "thinking", "data": {"delta": data}}
            elif event_type == "text" and data:
                text_count += len(data)
                yield {"event": "text", "data": {"delta": data}}
            elif event_type == "done":
                # Response complete, now validate
                logger.info(f"ChatOrchestrator: Response done - thinking_chars={thinking_count}, text_chars={text_count}")
                pass
        
        # 5. Validate
        logger.info(f"ChatOrchestrator: Running validator with answer_raw keys: {list(ctx.answer_raw.keys())}")
        ctx = self.validator.run(ctx)
        self._attach_usage(ctx)
        
        # 6. Yield final response
        logger.info(f"ChatOrchestrator: Validator complete, response keys: {list(ctx.response.keys())}")
        response = ChatResponse.model_validate(ctx.response)
        logger.info(f"ChatOrchestrator: Final response validated, assistant text length: {len(response.assistant.text)}")
        yield {"event": "done", "data": response.model_dump()}
    
    def _build_early_ui_payload(self, ctx: AgentContext) -> dict[str, Any]:
        """Build the early UI directive payload from router output."""
        ui_raw = ctx.router_ui if isinstance(ctx.router_ui, dict) else {"view": "chat"}
        ui_view = ui_raw.get("view", "chat")
        if ui_view not in ("chat", "split"):
            ui_view = "chat"
        if ctx.client_view == "split":
            ui_view = "split"
        
        ui_payload: dict[str, Any] = {"view": ui_view}
        if ui_view == "split":
            split_raw = ui_raw.get("split") if isinstance(ui_raw, dict) else {}
            active_tab = split_raw.get("activeTab") if isinstance(split_raw, dict) else "brief"
            if active_tab not in ("brief", "experience"):
                active_tab = "brief"
            ui_payload["split"] = {"activeTab": active_tab}
        
        return ui_payload
