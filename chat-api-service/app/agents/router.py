"""
RouterAgent: Analyzes user intent and decides retrieval query + UI state.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from .base import AgentContext

logger = logging.getLogger(__name__)


# System prompt template for the router
ROUTER_SYSTEM_PROMPT = """You are a router for a resume/portfolio chat system, with vector search access to the site owner's experience and background. 
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 
Analyze the user's message and conversation context, then return this JSON:

{{"retrievalQuery": "...", "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "hints": {{"suggestTab": null|"brief"|"experience"}}}}

Fields:
- retrievalQuery: Rewritten query optimized for vector search to find relevant experience/project examples (1-2 sentences)
- ui.view: "chat" or "split"
  - Recommend "split" when the user is asking for evidence/experience ("have you done X?", "project leadership", "regulated delivery", etc.) OR when there have been ~2+ user turns and you can start producing meaningful artifacts.
  - If the client is already in "split", keep it in "split" (do not downgrade).
- ui.split.activeTab: "brief" or "experience" (only if view is "split")
- hints.suggestTab: "brief" or "experience" or null (subtle hint for which tab to focus when in split view)

Context:
- Current message count: {message_count}
- Current view: {current_view}{page_context}
- Recent transcript (most recent last):
{recent_context}

Guidelines:
- First message: stay in "chat" view, provide chips to help clarify intent/domain
- After ~2-4 messages with meaningful context: transition to "split" view (can be earlier for explicit experience/proof requests)
- In split view: continue providing relevant chips and optionally suggest which tab is most relevant
- If user intent is "just browsing" but they select a topic area (e.g. "Project leadership", "Regulated delivery"), prefer "split" with activeTab="experience" so the workspace can show Relevant Experience.

Return ONLY valid JSON, no markdown formatting."""


class RouterAgent:
    """
    Determines retrieval query and UI directives based on user message.
    """
    
    def __init__(self, *, anthropic_client: Any, openai_client: Any, model_provider: str = "anthropic"):
        self.anthropic = anthropic_client
        self.openai = openai_client
        self.model_provider = model_provider
    
    async def run(self, ctx: AgentContext) -> AgentContext:
        """
        Execute the router step.
        Updates ctx with retrieval_query, router_ui, router_hints.
        """
        # Build context for the prompt
        page_context = ""
        if ctx.page_path:
            page_context = f"\nUser is currently on page: {ctx.page_path}"
        
        message_count = len(ctx.messages)
        
        # Build recent transcript
        recent_lines: list[str] = []
        for m in ctx.messages[-8:]:
            role = m.get("role", "")
            if role == "system":
                continue
            text = (m.get("text") or m.get("content") or "").strip()
            if not text:
                continue
            text = " ".join(text.split())
            if len(text) > 220:
                text = text[:220] + "…"
            recent_lines.append(f"- {role}: {text}")
        recent_context = "\n".join(recent_lines) if recent_lines else "(none)"
        
        # Build the prompt
        system_prompt = ROUTER_SYSTEM_PROMPT.format(
            message_count=message_count,
            current_view=ctx.client_view,
            page_context=page_context,
            recent_context=recent_context,
        )
        
        # Call the LLM
        if self.model_provider == "anthropic":
            raw = await self.anthropic.router(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": ctx.last_user_text},
                ]
            )
        else:
            raw = self.openai.router(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": ctx.last_user_text},
                ]
            )
        
        # Parse output
        try:
            out = json.loads(raw)
        except Exception:
            out = {}
        
        ctx.retrieval_query = (out.get("retrievalQuery") or ctx.last_user_text).strip() or ctx.last_user_text
        ctx.router_ui = out.get("ui") if isinstance(out.get("ui"), dict) else {"view": "chat"}
        ctx.router_hints = out.get("hints") if isinstance(out.get("hints"), dict) else {}
        
        return ctx
