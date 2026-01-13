from __future__ import annotations

import json
import os
from typing import Any, AsyncGenerator

from .models import ChatRequest, ChatResponse, UIDirective, UISplit, Hints, AssistantResponse
from .models import Artifacts, FitBrief, FitBriefSection, RelevantExperience, RelevantExperienceGroup, RelevantExperienceItem
from .anthropic_client import AnthropicClient
from .openai_client import OpenAIClient
from .qdrant_client import QdrantClient
from .retrieval import RetrievalService, is_ui_visible_item


class ChatPipeline:
    def __init__(self, *, openai: OpenAIClient, anthropic: AnthropicClient, qdrant: QdrantClient):
        self.openai = openai
        self.anthropic = anthropic
        self.qdrant = qdrant
        self.retrieval = RetrievalService(qdrant)
        
        # MODEL_PROVIDER: "openai" or "anthropic" (default: "anthropic")
        self.model_provider = os.environ.get("MODEL_PROVIDER", "anthropic").lower().strip()
        if self.model_provider not in ("openai", "anthropic"):
            self.model_provider = "anthropic"

    async def handle(self, req: ChatRequest) -> ChatResponse:
        last_user_text = ""
        for m in reversed(req.messages):
            if m.role == "user" and m.text.strip():
                last_user_text = m.text.strip()
                break
        if not last_user_text:
            # FastAPI/Pydantic already enforces messages>=1, but we still guard.
            last_user_text = "hello"

        router_out = await self._router(req=req, last_user_text=last_user_text)
        retrieval_query = (router_out.get("retrievalQuery") or last_user_text).strip() or last_user_text

        query_vec = self.openai.embed(retrieval_query)
        retrieval_k = int(os.environ.get("RETRIEVAL_K", "40"))
        retrieval_results = self.retrieval.retrieve(query_embedding=query_vec, k=retrieval_k)

        answer_out = await self._answer(req=req, router_out=router_out, retrieval_results=retrieval_results)

        sanitized = self._sanitize_and_validate_response(
            req=req,
            router_out=router_out,
            retrieval_results=retrieval_results,
            answer_out=answer_out,
        )
        return ChatResponse.model_validate(sanitized)

    async def _router(self, *, req: ChatRequest, last_user_text: str) -> dict[str, Any]:
        page = (req.client.page if req.client else None) or None
        page_context = ""
        if page and page.path:
            page_context = f"\nUser is currently on page: {page.path}"

        # Detect current conversation stage based on message count and client UI state
        message_count = len(req.messages)
        current_view = "chat"
        if req.client and req.client.ui:
            current_view = req.client.ui.view

        system_prompt = f"""You are a router for a resume/portfolio chat system, with vector search access to the site owner's experience and background. 
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 
Analyze the user's message and conversation context, then return this JSON:

{{"retrievalQuery": "...", "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "chips": ["...", "..."], "hints": {{"suggestTab": null|"brief"|"experience"}}}}

Fields:
- retrievalQuery: Rewritten query optimized for vector search to find relevant experience/project examples (1-2 sentences)
- ui.view: "chat" or "split" (recommend "split" only after 2-4 meaningful exchanges when you have enough context to start producing artifacts; "split" view is for generating Fit Brief and Relevant Experience artifacts.)
- ui.split.activeTab: "brief" or "experience" (only if view is "split")
- chips: Array of 2-3 suggested pre-written follow-up phrases (strings) for the user to ask the assistant. Can also be empty if the assistant can not suggest a specific follow-up response that the user would ask.
- hints.suggestTab: "brief" or "experience" or null (subtle hint for which tab to focus when in split view)

Context:
- Current message count: {message_count}
- Current view: {current_view}{page_context}

Guidelines:
- First message: stay in "chat" view, provide chips to help clarify intent/domain
- After 2-4 messages with meaningful context: transition to "split" view
- In split view: continue providing relevant chips and optionally suggest which tab is most relevant

Return ONLY valid JSON, no markdown formatting."""

        if self.model_provider == "anthropic":
            raw = await self.anthropic.router(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": last_user_text},
                ]
            )
        else:
            raw = self.openai.router(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": last_user_text},
                ]
            )

        try:
            out = json.loads(raw)
        except Exception:
            out = {}

        retrieval_query = out.get("retrievalQuery") or last_user_text
        ui_directive = out.get("ui") if isinstance(out.get("ui"), dict) else {"view": "chat"}
        chips = out.get("chips") if isinstance(out.get("chips"), list) else []
        hints = out.get("hints") if isinstance(out.get("hints"), dict) else {}

        return {
            "retrievalQuery": retrieval_query,
            "ui": ui_directive,
            "chips": chips,
            "hints": hints,
        }

    async def _answer(self, *, req: ChatRequest, router_out: dict[str, Any], retrieval_results: dict[str, Any]) -> dict[str, Any]:
        context_parts: list[str] = []

        for chunk in retrieval_results.get("chunks") or []:
            ctype = chunk.get("type", "experience")
            slug = chunk.get("slug", "")
            chunk_id = chunk.get("chunkId", 0)
            section = chunk.get("section", "")
            text = chunk.get("text", "")
            label = f"[{ctype}:{slug}:{chunk_id}]"
            if section:
                label += f" section:{section}"
            context_parts.append(f"{label}\n{text}")

        context_text = "\n\n---\n\n".join(context_parts)
        ui_directive = router_out.get("ui", {"view": "chat"})
        chips = router_out.get("chips", [])
        hints = router_out.get("hints", {})

        # Determine if we need to produce artifacts
        should_produce_artifacts = ui_directive.get("view") == "split"

        system_prompt = f"""You are a virtual Jaan Sokk - a product management professional, technical lead, agile enthusiast with experience leading teams for 15 years. 
You are representing him on his resume website with vector search access to his experience and background.
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 

**Context from portfolio content:**
{context_text}

**Current UI state:**
- View: {ui_directive.get("view", "chat")}
- Producing artifacts: {"yes" if should_produce_artifacts else "no"}

**Rules:**
- Use retrieved text as the source of truth for experience/project claims
- Background type content may influence tone/preferences, or illustrate experience, but should not invent facts
- Type "background" can be used as a relevant add-on or illustration of experience, personality or way-of-thinking. But only where it is relevant. 
- If insufficient info, ask 1-2 short clarifying questions
- Keep responses short, scannable, and Product Manager or Product Engineer oriented.
- Never assume metrics or achievements, only use exact references from experience type content.
- Never expose raw original source content.

**Response JSON:**
{{"assistant": {{"text": "..."}}, "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "hints": {{"suggestTab": null|"brief"|"experience"}}, "chips": ["..."], "artifacts": {{"fitBrief": {{"title": "...", "sections": [{{"id": "need|proof|risks|plan|questions", "title": "...", "content": "..."}}]}}, "relevantExperience": {{"groups": [{{"title": "...", "items": [{{"slug": "slug-from-retrieval", "type": "experience"|"project", "title": "...", "role": "...", "period": "...", "bullets": ["..."], "whyRelevant": "..."}}]}}]}}}}}}

**Artifact generation rules (only when view is "split"):**
- fitBrief: Infer what the user needs based on context from the user; omit sections if not confident
- relevantExperience: ONLY include items where slug exists in retrieved chunks and type is "experience" or "project" (never "background").
- Type "background" can be used as a relevant add-on or illustration in the artifacts, but not as an artifact or its sub-item itself.
- Never assume metrics or achievements, only use exact references from experience type content.
- Each experience item must have 2-4 grounded bullets with outcomes/metrics when that data is available.
- If producing artifacts, keep assistant.text brief (an example, but can be different "Two quick checks so I don't hallucinate the fit: what's the team size, and is this greenfield or existing product?")

Return ONLY valid JSON, no markdown formatting."""

        msgs: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        # Client-managed memory; keep it bounded.
        for m in req.messages[-12:]:
            if m.role == "system":
                continue
            msgs.append({"role": m.role, "content": m.text})

        if self.model_provider == "anthropic":
            raw = await self.anthropic.answer(messages=msgs)
        else:
            raw = self.openai.answer(messages=msgs)
        try:
            out = json.loads(raw)
        except Exception:
            out = {}
        return out

    def _sanitize_and_validate_response(
        self,
        *,
        req: ChatRequest,
        router_out: dict[str, Any],
        retrieval_results: dict[str, Any],
        answer_out: dict[str, Any],
    ) -> dict[str, Any]:
        # Assistant text
        assistant = answer_out.get("assistant") if isinstance(answer_out.get("assistant"), dict) else {}
        assistant_text = (assistant.get("text") if isinstance(assistant, dict) else None) or ""
        if not isinstance(assistant_text, str) or not assistant_text.strip():
            assistant_text = "I'd be happy to help! What do you have in mind today?"

        # UI directive
        ui_raw = answer_out.get("ui") or router_out.get("ui") or {"view": "chat"}
        ui_view = ui_raw.get("view") if isinstance(ui_raw, dict) else "chat"
        if ui_view not in ("chat", "split"):
            ui_view = "chat"
        
        ui_directive: dict[str, Any] = {"view": ui_view}
        if ui_view == "split":
            split_raw = ui_raw.get("split") if isinstance(ui_raw, dict) else {}
            active_tab = split_raw.get("activeTab") if isinstance(split_raw, dict) else "brief"
            if active_tab not in ("brief", "experience"):
                active_tab = "brief"
            ui_directive["split"] = {"activeTab": active_tab}

        # Hints
        hints_raw = answer_out.get("hints") or router_out.get("hints") or {}
        suggest_tab = hints_raw.get("suggestTab") if isinstance(hints_raw, dict) else None
        if suggest_tab not in ("brief", "experience", None):
            suggest_tab = None

        # Chips
        chips_raw = answer_out.get("chips") or router_out.get("chips") or []
        chips = [str(c).strip() for c in (chips_raw if isinstance(chips_raw, list) else [])]
        chips = [c for c in chips if c][:6]  # Limit to 6

        # Artifacts (only if split view)
        artifacts: dict[str, Any] = {}
        if ui_view == "split":
            artifacts_raw = answer_out.get("artifacts") if isinstance(answer_out.get("artifacts"), dict) else {}
            
            # Fit Brief
            fit_brief_raw = artifacts_raw.get("fitBrief") if isinstance(artifacts_raw, dict) else {}
            if isinstance(fit_brief_raw, dict):
                sections_raw = fit_brief_raw.get("sections") if isinstance(fit_brief_raw.get("sections"), list) else []
                sections = []
                for s in sections_raw[:10]:  # Limit to 10 sections
                    if isinstance(s, dict) and s.get("id") and s.get("title") and s.get("content"):
                        sections.append({
                            "id": str(s["id"]),
                            "title": str(s["title"])[:100],
                            "content": str(s["content"])[:2000],
                        })
                artifacts["fitBrief"] = {
                    "title": str(fit_brief_raw.get("title") or "Fit Brief")[:200],
                    "sections": sections,
                }

            # Relevant Experience (must be grounded and UI-visible)
            rel_exp_raw = artifacts_raw.get("relevantExperience") if isinstance(artifacts_raw, dict) else {}
            if isinstance(rel_exp_raw, dict):
                groups_raw = rel_exp_raw.get("groups") if isinstance(rel_exp_raw.get("groups"), list) else []
                groups = []
                for g in groups_raw[:5]:  # Limit to 5 groups
                    if not isinstance(g, dict):
                        continue
                    items_raw = g.get("items") if isinstance(g.get("items"), list) else []
                    items = []
                    for item in items_raw[:10]:  # Limit to 10 items per group
                        if not isinstance(item, dict):
                            continue
                        slug = str(item.get("slug") or "")
                        item_type = str(item.get("type") or "experience")
                        if item_type not in ("experience", "project"):
                            continue
                        # Validate slug exists and is UI-visible
                        payload = self.qdrant.get_item_by_slug(slug)
                        if not is_ui_visible_item(payload):
                            continue
                        
                        bullets = item.get("bullets") if isinstance(item.get("bullets"), list) else []
                        bullets = [str(b).strip() for b in bullets if b][:6]  # Limit to 6 bullets
                        
                        items.append({
                            "slug": slug,
                            "type": item_type,
                            "title": str(item.get("title") or "")[:200],
                            "role": str(item.get("role"))[:200] if item.get("role") else None,
                            "period": str(item.get("period"))[:100] if item.get("period") else None,
                            "bullets": bullets,
                            "whyRelevant": str(item.get("whyRelevant"))[:500] if item.get("whyRelevant") else None,
                        })
                    
                    if items:
                        groups.append({
                            "title": str(g.get("title") or "Relevant")[:200],
                            "items": items,
                        })
                
                if groups:
                    artifacts["relevantExperience"] = {"groups": groups}

        return {
            "assistant": {"text": assistant_text},
            "ui": ui_directive,
            "hints": {
                "suggestShare": False,  # Always false until Share is implemented
                "suggestTab": suggest_tab,
            },
            "chips": chips,
            "artifacts": artifacts,
        }

    async def handle_stream(self, req: ChatRequest) -> AsyncGenerator[dict[str, Any], None]:
        """
        Streaming version of handle().
        
        Yields events:
        - {"event": "text", "data": {"delta": "..."}}
        - {"event": "done", "data": {full ChatResponse}}
        """
        # Extract last user text
        last_user_text = ""
        for m in reversed(req.messages):
            if m.role == "user" and m.text.strip():
                last_user_text = m.text.strip()
                break
        if not last_user_text:
            last_user_text = "hello"

        # Router step (async, fast)
        router_out = await self._router(req=req, last_user_text=last_user_text)
        retrieval_query = (router_out.get("retrievalQuery") or last_user_text).strip() or last_user_text

        # Retrieval step (synchronous, fast)
        query_vec = self.openai.embed(retrieval_query)
        retrieval_k = int(os.environ.get("RETRIEVAL_K", "40"))
        retrieval_results = self.retrieval.retrieve(query_embedding=query_vec, k=retrieval_k)

        # Answer step (streaming)
        if self.model_provider != "anthropic":
            # Fallback to non-streaming for OpenAI
            answer_out = await self._answer(req=req, router_out=router_out, retrieval_results=retrieval_results)
            sanitized = self._sanitize_and_validate_response(
                req=req,
                router_out=router_out,
                retrieval_results=retrieval_results,
                answer_out=answer_out,
            )
            response = ChatResponse.model_validate(sanitized)
            yield {"event": "done", "data": response.model_dump()}
            return

        # Build system prompt for answer
        context_parts: list[str] = []
        for chunk in retrieval_results.get("chunks") or []:
            ctype = chunk.get("type", "experience")
            slug = chunk.get("slug", "")
            chunk_id = chunk.get("chunkId", 0)
            section = chunk.get("section", "")
            text = chunk.get("text", "")
            label = f"[{ctype}:{slug}:{chunk_id}]"
            if section:
                label += f" section:{section}"
            context_parts.append(f"{label}\n{text}")

        context_text = "\n\n---\n\n".join(context_parts)
        ui_directive = router_out.get("ui", {"view": "chat"})
        should_produce_artifacts = ui_directive.get("view") == "split"

        system_prompt = f"""You are a virtual Jaan Sokk - a product management professional, technical lead, agile enthusiast with experience leading teams for 15 years. 
You are representing him on his resume website with vector search access to his experience and background.
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 

**Context from portfolio content:**
{context_text}

**Current UI state:**
- View: {ui_directive.get("view", "chat")}
- Producing artifacts: {"yes" if should_produce_artifacts else "no"}

**Rules:**
- Use retrieved text as the source of truth for experience/project claims
- Background type content may influence tone/preferences, or illustrate experience, but should not invent facts
- Type "background" can be used as a relevant add-on or illustration of experience, personality or way-of-thinking. But only where it is relevant. 
- If insufficient info, ask 1-2 short clarifying questions
- Keep responses short, scannable, and Product Manager or Product Engineer oriented.
- Never assume metrics or achievements, only use exact references from experience type content.
- Never expose raw original source content.

**Response JSON:**
{{"assistant": {{"text": "..."}}, "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "hints": {{"suggestTab": null|"brief"|"experience"}}, "chips": ["..."], "artifacts": {{"fitBrief": {{"title": "...", "sections": [{{"id": "need|proof|risks|plan|questions", "title": "...", "content": "..."}}]}}, "relevantExperience": {{"groups": [{{"title": "...", "items": [{{"slug": "slug-from-retrieval", "type": "experience"|"project", "title": "...", "role": "...", "period": "...", "bullets": ["..."], "whyRelevant": "..."}}]}}]}}}}}}

**Artifact generation rules (only when view is "split"):**
- fitBrief: Infer what the user needs based on context from the user; omit sections if not confident
- relevantExperience: ONLY include items where slug exists in retrieved chunks and type is "experience" or "project" (never "background").
- Type "background" can be used as a relevant add-on or illustration in the artifacts, but not as an artifact or its sub-item itself.
- Never assume metrics or achievements, only use exact references from experience type content.
- Each experience item must have 2-4 grounded bullets with outcomes/metrics when that data is available.
- If producing artifacts, keep assistant.text brief (an example, but can be different "Two quick checks so I don't hallucinate the fit: what's the team size, and is this greenfield or existing product?")

Return ONLY valid JSON, no markdown formatting."""

        msgs: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        for m in req.messages[-12:]:
            if m.role == "system":
                continue
            msgs.append({"role": m.role, "content": m.text})

        # Stream the answer
        answer_json_str = ""
        async for event_type, data in self.anthropic.answer_stream(messages=msgs):
            if event_type == "text" and data:
                # Yield text delta
                yield {"event": "text", "data": {"delta": data}}
            elif event_type == "done" and data:
                # Store complete JSON for final processing
                answer_json_str = data

        # Parse and sanitize the final response
        try:
            answer_out = json.loads(answer_json_str)
        except Exception:
            answer_out = {}

        sanitized = self._sanitize_and_validate_response(
            req=req,
            router_out=router_out,
            retrieval_results=retrieval_results,
            answer_out=answer_out,
        )
        
        response = ChatResponse.model_validate(sanitized)
        
        # Yield final complete response
        yield {"event": "done", "data": response.model_dump()}
