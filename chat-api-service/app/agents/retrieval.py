"""
RetrievalAgent: Handles embedding + vector search.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from .base import AgentContext

logger = logging.getLogger(__name__)


class RetrievalAgent:
    """
    Embeds the retrieval query and searches Qdrant for relevant chunks.
    Also guards against entering split view without UI-visible items.
    """
    
    def __init__(self, *, openai_client: Any, qdrant_client: Any, retrieval_service: Any):
        self.openai = openai_client
        self.qdrant = qdrant_client
        self.retrieval = retrieval_service
    
    def run(self, ctx: AgentContext) -> AgentContext:
        """
        Execute retrieval step (synchronous - embedding + vector search are fast).
        Updates ctx with retrieval_results and context_text.
        """
        # Embed the query
        query_vec = self.openai.embed(ctx.retrieval_query)
        
        # Search
        retrieval_k = int(os.environ.get("RETRIEVAL_K", "40"))
        ctx.retrieval_results = self.retrieval.retrieve(query_embedding=query_vec, k=retrieval_k)
        
        # Guard: only recommend entering split if there's at least one UI-visible item
        self._guard_router_split(ctx)
        
        # Build context text for the response agent
        ctx.context_text = self._build_context_text(ctx.retrieval_results)
        
        return ctx
    
    def _guard_router_split(self, ctx: AgentContext) -> None:
        """
        If the router recommends split, but retrieval contains no UI-visible items,
        downgrade to chat view.
        """
        from ..retrieval import is_ui_visible_item
        
        try:
            ui = ctx.router_ui
            if not isinstance(ui, dict):
                return
            if ui.get("view") != "split":
                return
            # Never downgrade if the client is already in split
            if ctx.client_view == "split":
                return
            if not self._has_ui_visible_main_item(ctx.retrieval_results):
                ui["view"] = "chat"
                ui.pop("split", None)
        except Exception:
            # Best-effort; never fail the request due to guarding
            return
    
    def _has_ui_visible_main_item(self, retrieval_results: dict[str, Any]) -> bool:
        """Check if retrieval results contain any UI-visible experience/project items."""
        from ..retrieval import is_ui_visible_item
        
        chunks = retrieval_results.get("chunks") if isinstance(retrieval_results, dict) else None
        if not isinstance(chunks, list):
            return False
        
        slugs: list[str] = []
        seen: set[str] = set()
        for c in chunks:
            if not isinstance(c, dict):
                continue
            ctype = c.get("type")
            if ctype not in ("experience", "project"):
                continue
            slug = str(c.get("slug") or "").strip()
            if not slug or slug in seen:
                continue
            seen.add(slug)
            slugs.append(slug)
            if len(slugs) >= 6:
                break
        
        for slug in slugs:
            payload = self.qdrant.get_item_by_slug(slug)
            if is_ui_visible_item(payload):
                return True
        return False
    
    def _build_context_text(self, retrieval_results: dict[str, Any]) -> str:
        """Build formatted context text for the LLM from retrieval results."""
        context_parts: list[str] = []
        
        for chunk in retrieval_results.get("chunks") or []:
            ctype = chunk.get("type", "experience")
            slug = chunk.get("slug", "")
            chunk_id = chunk.get("chunkId", 0)
            section = chunk.get("section", "")
            text = chunk.get("text", "")
            title = chunk.get("title")
            company = chunk.get("company")
            role = chunk.get("role")
            period = chunk.get("period")
            
            label = f"[{ctype}:{slug}:{chunk_id}]"
            if title:
                label += f' title:"{title}"'
            if company:
                label += f' company:"{company}"'
            if role:
                label += f' role:"{role}"'
            if period:
                label += f' period:"{period}"'
            if section:
                label += f' section:"{section}"'
            context_parts.append(f"{label}\n{text}")
        
        return "\n\n---\n\n".join(context_parts)
