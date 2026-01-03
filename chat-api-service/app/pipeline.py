from __future__ import annotations

import json
import os
from typing import Any

from .models import ChatRequest, ChatResponse
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

    def handle(self, req: ChatRequest) -> ChatResponse:
        last_user_text = ""
        for m in reversed(req.messages):
            if m.role == "user" and m.text.strip():
                last_user_text = m.text.strip()
                break
        if not last_user_text:
            # FastAPI/Pydantic already enforces messages>=1, but we still guard.
            last_user_text = "hello"

        router_out = self._router(req=req, last_user_text=last_user_text)
        retrieval_query = (router_out.get("retrievalQuery") or last_user_text).strip() or last_user_text

        query_vec = self.openai.embed(retrieval_query)
        retrieval_k = int(os.environ.get("RETRIEVAL_K", "40"))
        retrieval_results = self.retrieval.retrieve(query_embedding=query_vec, k=retrieval_k)

        answer_out = self._answer(req=req, router_out=router_out, retrieval_results=retrieval_results)

        sanitized = self._sanitize_and_validate_response(
            req=req,
            router_out=router_out,
            retrieval_results=retrieval_results,
            answer_out=answer_out,
        )
        return ChatResponse.model_validate(sanitized)

    def _router(self, *, req: ChatRequest, last_user_text: str) -> dict[str, Any]:
        page = (req.client.page if req.client else None) or None
        page_context = ""
        if page and page.path:
            page_context = f"\nUser is currently on page: {page.path}"
            if page.activeSlug:
                page_context += f" (viewing: {page.activeSlug})"

        system_prompt = f"""You are a router for a resume/portfolio chat system. Analyze the user's message and return a JSON object with:

1. **classification**: "new_opportunity" or "general_talk"
2. **tone**: "warm", "direct", "neutral", or "enthusiastic"
3. **retrievalQuery**: A rewritten query optimized for vector search to find relevant experience/project examples (1-2 sentences)
4. **suggestedRelatedSlugs**: Array of 0-3 slug strings for relevant experience/project items (optional)
5. **next**: Object with:
   - "offerMoreExamples": boolean
   - "askForEmail": boolean

{page_context}

Return ONLY valid JSON, no markdown formatting."""

        if self.model_provider == "anthropic":
            raw = self.anthropic.router(
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

        classification = out.get("classification", "general_talk")
        if classification not in ("new_opportunity", "general_talk"):
            classification = "general_talk"
        tone = out.get("tone", "neutral")
        if tone not in ("warm", "direct", "neutral", "enthusiastic"):
            tone = "neutral"
        retrieval_query = out.get("retrievalQuery") or last_user_text
        next_flags = out.get("next") if isinstance(out.get("next"), dict) else {}

        return {
            "classification": classification,
            "tone": tone,
            "retrievalQuery": retrieval_query,
            "suggestedRelatedSlugs": out.get("suggestedRelatedSlugs") or [],
            "next": {
                "offerMoreExamples": bool(next_flags.get("offerMoreExamples", False)),
                "askForEmail": bool(next_flags.get("askForEmail", False)),
            },
        }

    def _answer(self, *, req: ChatRequest, router_out: dict[str, Any], retrieval_results: dict[str, Any]) -> dict[str, Any]:
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
        classification = router_out.get("classification", "general_talk")
        tone = router_out.get("tone", "neutral")
        next_flags = router_out.get("next", {})

        tone_guidance_map = {
            "warm": "Be friendly, personable, and approachable. Use a conversational, warm tone.",
            "direct": "Be concise, professional, and to the point. Avoid unnecessary pleasantries.",
            "neutral": "Be professional and balanced. Use a neutral, informative tone.",
            "enthusiastic": "Be energetic and positive. Show genuine interest and excitement.",
        }
        tone_guidance = tone_guidance_map.get(tone, tone_guidance_map["neutral"])

        classification_guidance = {
            "new_opportunity": """This appears to be a new opportunity (hiring, project, contract).
- Confirm interest and ask 1 clarifying question (role/company/problem)
- Be helpful and show relevant experience
- Keep response scannable and PM-oriented""",
            "general_talk": """This is general conversation or browsing.
- Invite browsing or ask what they want to explore
- Be helpful and informative
- Keep responses short and scannable""",
        }.get(classification, "")

        system_prompt = f"""You are a helpful assistant representing a PM/PO professional's portfolio/resume website.

{tone_guidance}

{classification_guidance}

**Context from portfolio content:**
{context_text}

**Rules:**
- Use retrieved text as the source of truth for experience/project claims
- Background content may influence tone/preferences but should not invent facts
- If insufficient info, ask 1 clarifying question
- Keep responses short, scannable, and PM-oriented
- Never mention "background" content explicitly in your response

**Response format (JSON):**
{{
  "assistant": {{"text": "Your response text here"}},
  "classification": "{classification}",
  "tone": "{tone}",
  "related": [
    {{"slug": "slug-name", "reason": "Brief reason why this is relevant"}}
  ],
  "citations": [
    {{"type": "experience", "slug": "slug-name", "chunkId": 1}}
  ],
  "next": {{
    "offerMoreExamples": {str(bool(next_flags.get("offerMoreExamples", False))).lower()},
    "askForEmail": {str(bool(next_flags.get("askForEmail", False))).lower()}
  }}
}}

Return ONLY valid JSON, no markdown formatting."""

        msgs: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        # Client-managed memory; keep it bounded.
        for m in req.messages[-12:]:
            if m.role == "system":
                continue
            msgs.append({"role": m.role, "content": m.text})

        if self.model_provider == "anthropic":
            raw = self.anthropic.answer(messages=msgs)
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
        classification = answer_out.get("classification") or router_out.get("classification") or "general_talk"
        if classification not in ("new_opportunity", "general_talk"):
            classification = "general_talk"
        tone = answer_out.get("tone") or router_out.get("tone") or "neutral"
        if tone not in ("warm", "direct", "neutral", "enthusiastic"):
            tone = "neutral"

        assistant = answer_out.get("assistant") if isinstance(answer_out.get("assistant"), dict) else {}
        assistant_text = (assistant.get("text") if isinstance(assistant, dict) else None) or ""
        if not isinstance(assistant_text, str) or not assistant_text.strip():
            assistant_text = "I'd be happy to help! What do you have in mind today?"

        # Citations: use retrieved chunk metadata. Include background for debugging, but UI can hide it.
        citations: list[dict[str, Any]] = []
        for c in retrieval_results.get("chunks") or []:
            ctype = c.get("type")
            if ctype not in ("experience", "project", "background"):
                continue
            citations.append({"type": ctype, "slug": c.get("slug", ""), "chunkId": int(c.get("chunkId", 0))})

        # Related: validate that slugs exist and are uiVisible (never background).
        related_in = answer_out.get("related") if isinstance(answer_out.get("related"), list) else []
        related_out: list[dict[str, Any]] = []
        seen: set[str] = set()

        def try_add_slug(slug: str, reason: str | None) -> None:
            slug = (slug or "").strip()
            if not slug or slug in seen:
                return
            payload = self.qdrant.get_item_by_slug(slug)
            if not is_ui_visible_item(payload):
                return
            related_out.append({"slug": slug, "reason": reason})
            seen.add(slug)

        for r in related_in:
            if not isinstance(r, dict):
                continue
            try_add_slug(str(r.get("slug") or ""), (str(r.get("reason")) if r.get("reason") is not None else None))

        if not related_out:
            # Fallback: computed related slugs from retrieval (experience/project only).
            for slug in (retrieval_results.get("relatedSlugs") or [])[:6]:
                try_add_slug(str(slug), "Relevant experience")

        next_flags = answer_out.get("next") if isinstance(answer_out.get("next"), dict) else {}
        if not isinstance(next_flags, dict):
            next_flags = {}

        return {
            "assistant": {"text": assistant_text},
            "classification": classification,
            "tone": tone,
            "related": related_out,
            "citations": citations,
            "next": {
                "offerMoreExamples": bool(next_flags.get("offerMoreExamples", False)),
                "askForEmail": bool(next_flags.get("askForEmail", False)),
            },
        }


