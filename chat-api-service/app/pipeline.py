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

        # Guard: only recommend entering split if there's at least one UI-visible experience/project item.
        # This prevents entering split for purely generic/philosophy questions that only retrieve "background".
        self._guard_router_split(router_out=router_out, req=req, retrieval_results=retrieval_results)

        answer_out = await self._answer(req=req, router_out=router_out, retrieval_results=retrieval_results)

        sanitized = self._sanitize_and_validate_response(
            req=req,
            router_out=router_out,
            retrieval_results=retrieval_results,
            answer_out=answer_out,
        )
        return ChatResponse.model_validate(sanitized)

    def _guard_router_split(self, *, router_out: dict[str, Any], req: ChatRequest, retrieval_results: dict[str, Any]) -> None:
        """
        If the router recommends split, but retrieval contains no UI-visible (artifacts-visible) experience/project,
        keep the conversation in chat view. This is a best-effort guard; final response is still sanitized later.
        """
        try:
            ui = router_out.get("ui")
            if not isinstance(ui, dict):
                return
            if ui.get("view") != "split":
                return
            # Never downgrade if the client is already in split.
            if req.client and req.client.ui and req.client.ui.view == "split":
                return
            if not self._has_ui_visible_main_item(retrieval_results=retrieval_results):
                ui["view"] = "chat"
                ui.pop("split", None)
        except Exception:
            # Best-effort; never fail the request due to guarding.
            return

    def _has_ui_visible_main_item(self, *, retrieval_results: dict[str, Any]) -> bool:
        # Look at a small number of unique non-background slugs and check if they are artifacts-visible.
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

        # Provide the router enough context to decide whether "split" is appropriate.
        # The router is intentionally lightweight, so we only include a small recent transcript.
        recent_lines: list[str] = []
        for m in req.messages[-8:]:
            if m.role == "system":
                continue
            text = (m.text or "").strip()
            if not text:
                continue
            text = " ".join(text.split())
            if len(text) > 220:
                text = text[:220] + "…"
            recent_lines.append(f"- {m.role}: {text}")
        recent_context = "\n".join(recent_lines) if recent_lines else "(none)"

        system_prompt = f"""You are a router for a resume/portfolio chat system, with vector search access to the site owner's experience and background. 
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
        hints = out.get("hints") if isinstance(out.get("hints"), dict) else {}

        return {
            "retrievalQuery": retrieval_query,
            "ui": ui_directive,
            # Chips are intentionally NOT generated by the router.
            # They must match the assistant's message, so they come from the answer step only.
            "chips": [],
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
            title = chunk.get("title")
            company = chunk.get("company")
            role = chunk.get("role")
            period = chunk.get("period")
            
            label = f"[{ctype}:{slug}:{chunk_id}]"
            # Add metadata to label so LLM can use exact values
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

        context_text = "\n\n---\n\n".join(context_parts)
        ui_directive = router_out.get("ui", {"view": "chat"})
        hints = router_out.get("hints", {})

        # Determine if we need to produce artifacts.
        # Once the client is in split view, never stop producing artifacts (even if the router misfires).
        client_view = "chat"
        if req.client and req.client.ui:
            client_view = req.client.ui.view
        should_produce_artifacts = client_view == "split" or ui_directive.get("view") == "split"

        system_prompt = f"""You are an AI agent representing Jaan Sokk's resume and portfolio. 
You have vector search access to Jaan's experience and background content.
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 

**Context from portfolio content:**
{context_text}

**Current UI state:**
- Client view: {client_view}
- Server recommended view: {ui_directive.get("view", "chat")}
- Producing artifacts: {"yes" if should_produce_artifacts else "no"}

**Rules:**
- Do NOT roleplay as Jaan. Do NOT claim you are Jaan. Speak as an agent representing him.
- Refer to Jaan in third person ("Jaan", "he") when describing his experience.
- Use retrieved text as the source of truth for experience/project claims
- If no grounded data to respond, suggest the user to contact Jaan in person from the Contact page.
- Background type content may influence tone/preferences, or illustrate experience, but should not invent facts
- Type "background" can be used as a relevant add-on or illustration of experience, personality or way-of-thinking. But only where it is relevant. 
- If insufficient info, ask 1-2 short clarifying questions
- Keep responses short, scannable, and Product Manager or Product Engineer oriented.
- Never assume metrics or achievements, only use exact references from experience type content.
- Never expose raw original source content.
- When bringing an example of work with relevant links, use them in the response (no hedging) as Markdown links.
- If official links exist in retrieved content, include them in assistant.text and in relevantExperience bullets when relevant (even if the user didn’t ask).
- Chips policy:
  - Chips are optional, but when provided they MUST be plausible “next user messages” that directly answer your most recent clarifying question(s).
  - If you ask for clarification (industry/domain, product type, stage, team size, constraints, success metric), include 2–4 chips that are short answer-options (not generic questions).
  - If you asked two clarifying questions, cover BOTH with the chips (e.g., 2 chips for Q1 + 2 chips for Q2).
  - Use first-person phrasing only when it would be natural for the user to click (e.g., “B2B SaaS”, “~8-person squad”, “Existing product”).
  - Avoid chips that ask the assistant to do something vague (“Tell me about…”) unless the assistant just invited that.
  - If the best next turn is open-ended, return an empty chips array.

**Response JSON:**
{{"assistant": {{"text": "..."}}, "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "hints": {{"suggestTab": null|"brief"|"experience"}}, "chips": ["..."], "artifacts": {{"fitBrief": {{"title": "...", "sections": [{{"id": "need|proof|risks|plan|questions", "title": "...", "content": "..."}}]}}, "relevantExperience": {{"groups": [{{"title": "...", "items": [{{"slug": "slug-from-retrieval", "type": "experience"|"project", "title": "...", "role": "...", "period": "...", "bullets": ["..."], "whyRelevant": "..."}}]}}]}}}}}}

**Artifact generation rules (only when view is "split"):**
- fitBrief: Infer what the user needs based on context from the user; omit sections if not confident
- relevantExperience: ONLY include items where slug exists in retrieved chunks and type is "experience" or "project" (never "background").
- Role/title must match the source markdown exactly (use the role/title values present in retrieved chunk metadata; do not paraphrase, merge, or invent).
- For each relevantExperience item: set `title` from chunk `title`, set `role` from chunk `role`, set `period` from chunk `period` if present; never combine multiple roles or titles into one.
- If role/title/period are missing from chunk metadata, leave them null/empty; never infer from user text.
- Extract the slug from chunk labels: labels are formatted as [type:slug:chunkId] - use ONLY the middle part (slug) without the type or chunkId. Example: from [experience:positium:0], use slug "positium" not "experience:positium:0".
- If any retrieved experience/project chunks exist, include at least one relevantExperience item (don’t leave it empty).
- If a retrieved chunk includes “See also” or official links, include them as Markdown links in the relevantExperience bullets.
- Type "background" can be used as a relevant add-on or illustration in the artifacts, but not as an artifact or its sub-item itself.
- Never assume metrics or achievements, only use exact references from experience type content.
- Each experience item must have 2-4 grounded bullets with outcomes/metrics when that data is available.
- If producing artifacts, keep assistant.text brief (an example, but can be different "Two quick checks so I don't hallucinate the fit: what's the team size, and is this greenfield or existing product?")
- assistant.text may include Markdown for bold, lists, and links (no headings, no fenced code blocks).
- Do not include Markdown outside assistant.text or artifacts.

Return ONLY valid JSON (no surrounding prose or code fences)."""

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
            assistant_text = "Whoa... a problem occurred! Please try that again."

        # UI directive
        ui_raw = answer_out.get("ui") or router_out.get("ui") or {"view": "chat"}
        ui_view = ui_raw.get("view") if isinstance(ui_raw, dict) else "chat"
        if ui_view not in ("chat", "split"):
            ui_view = "chat"

        # Never downgrade: if the client is already in split view, keep server response in split.
        if req.client and req.client.ui and req.client.ui.view == "split":
            ui_view = "split"
        
        ui_directive: dict[str, Any] = {"view": ui_view}
        if ui_view == "split":
            split_raw = ui_raw.get("split") if isinstance(ui_raw, dict) else {}
            active_tab = split_raw.get("activeTab") if isinstance(split_raw, dict) else "brief"
            # If router/answer omitted split.activeTab, fall back to the client's current active tab.
            if (not active_tab or active_tab not in ("brief", "experience")) and req.client and req.client.ui:
                client_split = req.client.ui.split if isinstance(req.client.ui.split, dict) else None
                if isinstance(client_split, dict):
                    active_tab = client_split.get("activeTab") or active_tab
            if active_tab not in ("brief", "experience"):
                active_tab = "brief"
            ui_directive["split"] = {"activeTab": active_tab}

        # Hints
        hints_raw = answer_out.get("hints") or router_out.get("hints") or {}
        suggest_tab = hints_raw.get("suggestTab") if isinstance(hints_raw, dict) else None
        if suggest_tab not in ("brief", "experience", None):
            suggest_tab = None

        # Chips
        # Chips must match the assistant's message (especially clarifying questions),
        # so we do NOT fall back to router chips if the answer omitted them.
        chips_raw = answer_out.get("chips") or []
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

        # If we ended up with split view but no renderable artifacts, downgrade to chat (unless client is already split).
        # This prevents the UI from showing an empty workspace with "Finding..." placeholders indefinitely.
        if ui_view == "split":
            client_already_split = bool(req.client and req.client.ui and req.client.ui.view == "split")
            has_fit_brief = bool(
                isinstance(artifacts.get("fitBrief"), dict)
                and isinstance((artifacts.get("fitBrief") or {}).get("sections"), list)
                and len((artifacts.get("fitBrief") or {}).get("sections") or []) > 0
            )
            has_relevant_exp = bool(
                isinstance(artifacts.get("relevantExperience"), dict)
                and isinstance((artifacts.get("relevantExperience") or {}).get("groups"), list)
                and len((artifacts.get("relevantExperience") or {}).get("groups") or []) > 0
            )
            if not client_already_split and not (has_fit_brief or has_relevant_exp):
                ui_view = "chat"
                ui_directive = {"view": "chat"}
                artifacts = {}

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

        # Apply the same split guard for streaming before emitting the UI event.
        self._guard_router_split(router_out=router_out, req=req, retrieval_results=retrieval_results)

        # Emit early UI directive so the client can transition before the full answer completes.
        ui_raw = router_out.get("ui") if isinstance(router_out.get("ui"), dict) else {"view": "chat"}
        ui_view = ui_raw.get("view") if isinstance(ui_raw, dict) else "chat"
        if ui_view not in ("chat", "split"):
            ui_view = "chat"
        if req.client and req.client.ui and req.client.ui.view == "split":
            ui_view = "split"
        ui_payload: dict[str, Any] = {"view": ui_view}
        if ui_view == "split":
            split_raw = ui_raw.get("split") if isinstance(ui_raw, dict) else {}
            active_tab = split_raw.get("activeTab") if isinstance(split_raw, dict) else "brief"
            if active_tab not in ("brief", "experience"):
                active_tab = "brief"
            ui_payload["split"] = {"activeTab": active_tab}

        hints_raw = router_out.get("hints") if isinstance(router_out.get("hints"), dict) else {}
        suggest_tab = hints_raw.get("suggestTab")
        if suggest_tab not in ("brief", "experience", None):
            suggest_tab = None
        yield {"event": "ui", "data": {"ui": ui_payload, "hints": {"suggestTab": suggest_tab}}}

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
            title = chunk.get("title")
            company = chunk.get("company")
            role = chunk.get("role")
            period = chunk.get("period")
            
            label = f"[{ctype}:{slug}:{chunk_id}]"
            # Add metadata to label so LLM can use exact values
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

        context_text = "\n\n---\n\n".join(context_parts)
        ui_directive = router_out.get("ui", {"view": "chat"})
        should_produce_artifacts = ui_directive.get("view") == "split"

        system_prompt = f"""You are an AI agent representing Jaan Sokk's resume and portfolio. 
You have vector search access to Jaan's experience and background content.
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 

**Context from portfolio content:**
{context_text}

**Current UI state:**
- View: {ui_directive.get("view", "chat")}
- Producing artifacts: {"yes" if should_produce_artifacts else "no"}

**Rules:**
- Do NOT roleplay as Jaan. Do NOT claim you are Jaan. Speak as an agent representing him.
- Refer to Jaan in third person ("Jaan", "he") when describing his experience.
- Use retrieved text as the source of truth for experience/project claims
- If no grounded data to respond, suggest the user to contact Jaan in person from the Contact page.
- When citing ideas from books or notes, mention the original authors / books, when relevant.
- Type "background" can be used as a relevant add-on or illustration of experience, personality or way-of-thinking. But only where it is relevant. 
- If insufficient info, ask 1-2 short clarifying questions
- Keep responses short, scannable, and Product Manager or Product Engineer oriented.
- Never assume metrics or achievements, only use exact references from experience type content.
- Never expose raw original source content.
- Chips policy:
  - Chips are optional, but when provided they MUST be plausible “next user messages” that directly answer your most recent clarifying question(s).
  - If you ask for clarification (industry/domain, product type, stage, team size, constraints, success metric), include 2–4 chips that are short answer-options (not generic questions).
  - If you asked two clarifying questions, cover BOTH with the chips (e.g., 2 chips for Q1 + 2 chips for Q2).
  - Use first-person phrasing only when it would be natural for the user to click (e.g., “B2B SaaS”, “~8-person squad”, “Existing product”).
  - Avoid chips that ask the assistant to do something vague (“Tell me about…”) unless the assistant just invited that.
  - If the best next turn is open-ended, return an empty chips array.

**Response JSON:**
{{"assistant": {{"text": "..."}}, "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "hints": {{"suggestTab": null|"brief"|"experience"}}, "chips": ["..."], "artifacts": {{"fitBrief": {{"title": "...", "sections": [{{"id": "need|proof|risks|plan|questions", "title": "...", "content": "..."}}]}}, "relevantExperience": {{"groups": [{{"title": "...", "items": [{{"slug": "slug-from-retrieval", "type": "experience"|"project", "title": "...", "role": "...", "period": "...", "bullets": ["..."], "whyRelevant": "..."}}]}}]}}}}}}

**Artifact generation rules (only when view is "split"):**
- fitBrief: Infer what the user needs based on context from the user; omit sections if not confident
- relevantExperience: ONLY include items where slug exists in retrieved chunks and type is "experience" or "project" (never "background").
- Role/title must match the source markdown exactly (use the role/title values present in retrieved chunk metadata; do not paraphrase, merge, or invent).
- For each relevantExperience item: set `title` from chunk `title`, set `role` from chunk `role`, set `period` from chunk `period` if present; never combine multiple roles or titles into one.
- Extract the slug from chunk labels: labels are formatted as [type:slug:chunkId] - use ONLY the middle part (slug) without the type or chunkId. Example: from [experience:positium:0], use slug "positium" not "experience:positium:0".
- If any retrieved experience/project chunks exist, include at least one relevantExperience item (don’t leave it empty).
- If a retrieved chunk includes “See also” or official links, include them as Markdown links in the relevantExperience bullets.
- Type "background" can be used as a relevant add-on or illustration in the artifacts, but not as an artifact or its sub-item itself.
- Never assume metrics or achievements, only use exact references from experience type content.
- Each experience item must have 2-4 grounded bullets with outcomes/metrics when that data is available.
- If producing artifacts, keep assistant.text brief (an example, but can be different "Two quick checks so I don't hallucinate the fit: what's the team size, and is this greenfield or existing product?")
- assistant.text may include Markdown for bold, lists, and links (no headings, no fenced code blocks).
- Do not include Markdown outside assistant.text or artifacts.

Return ONLY valid JSON (no surrounding prose or code fences)."""

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
