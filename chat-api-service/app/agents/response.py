"""
ResponseAgent: Generates the assistant response with optional extended thinking.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator

from .base import AgentContext

logger = logging.getLogger(__name__)


# System prompt template for the answer step
ANSWER_SYSTEM_PROMPT = """You are an AI agent representing Jaan Sokk's resume and portfolio. 
You have vector search access to Jaan's experience and background content.
The intended audience of the site is hiring managers, recruiters, HR, or anyone just browsing. 

**Context from portfolio content:**
{context_text}

**Current UI state:**
- Client view: {client_view}
- Server recommended view: {server_view}
- Producing artifacts: {producing_artifacts}

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
- If official links exist in retrieved content, include them in assistant.text and in relevantExperience bullets when relevant (even if the user didn't ask).
- Chips policy:
  - Chips are optional, but when provided they MUST be plausible "next user messages" that directly answer your most recent clarifying question(s).
  - If you ask for clarification (industry/domain, product type, stage, team size, constraints, success metric), include 2–4 chips that are short answer-options (not generic questions).
  - If you asked two clarifying questions, cover BOTH with the chips (e.g., 2 chips for Q1 + 2 chips for Q2).
  - Use first-person phrasing only when it would be natural for the user to click (e.g., "B2B SaaS", "~8-person squad", "Existing product").
  - Avoid chips that ask the assistant to do something vague ("Tell me about…") unless the assistant just invited that.
  - If the best next turn is open-ended, return an empty chips array.

**Response JSON:**
{{"assistant": {{"text": "..."}}, "ui": {{"view": "chat"|"split", "split": {{"activeTab": "brief"|"experience"}}}}, "hints": {{"suggestTab": null|"brief"|"experience"}}, "chips": ["..."], "artifacts": {{"fitBrief": {{"title": "...", "sections": [{{"id": "need|proof|risks|plan|questions", "title": "...", "content": "..."}}]}}, "relevantExperience": {{"groups": [{{"title": "...", "items": [{{"slug": "slug-from-retrieval", "type": "experience"|"project", "title": "...", "company": "...", "role": "...", "period": "...", "bullets": ["..."], "whyRelevant": "..."}}]}}]}}}}}}

**Artifact generation rules (only when view is "split"):**
- fitBrief: Infer what the user needs based on context from the user; omit sections if not confident
- relevantExperience: ONLY include items where slug exists in retrieved chunks and type is "experience" or "project" (never "background").
- Metadata must match the source markdown exactly (use the title/company/role/period values present in retrieved chunk metadata; do not paraphrase, merge, or invent).
- For each relevantExperience item: set `title` from chunk `title`, set `company` from chunk `company`, set `role` from chunk `role`, set `period` from chunk `period` if present; never combine multiple roles or titles into one.
- If title/company/role/period are missing from chunk metadata, leave them null/empty; never infer from user text.
- Extract the slug from chunk labels: labels are formatted as [type:slug:chunkId] - use ONLY the middle part (slug) without the type or chunkId. Example: from [experience:positium:0], use slug "positium" not "experience:positium:0".
- If any retrieved experience/project chunks exist, include at least one relevantExperience item (don't leave it empty).
- If a retrieved chunk includes "See also" or official links, include them as Markdown links in the relevantExperience bullets.
- Type "background" can be used as a relevant add-on or illustration in the artifacts, but not as an artifact or its sub-item itself.
- Never assume metrics or achievements, only use exact references from experience type content.
- Each experience item must have 2-4 grounded bullets with outcomes/metrics when that data is available.
- If producing artifacts, keep assistant.text brief (an example, but can be different "Two quick checks so I don't hallucinate the fit: what's the team size, and is this greenfield or existing product?")
- assistant.text may include Markdown for bold, lists, and links (no headings, no fenced code blocks).
- Do not include Markdown outside assistant.text or artifacts.

Return ONLY valid JSON (no surrounding prose or code fences)."""


class ResponseAgent:
    """
    Generates the assistant response, optionally with extended thinking.
    
    Supports both non-streaming and streaming modes.
    When thinking is enabled, streams thinking deltas before text deltas.
    """
    
    def __init__(self, *, anthropic_client: Any, openai_client: Any, model_provider: str = "anthropic"):
        self.anthropic = anthropic_client
        self.openai = openai_client
        self.model_provider = model_provider
    
    async def run(self, ctx: AgentContext) -> AgentContext:
        """
        Execute the response step (non-streaming).
        Updates ctx with answer_raw.
        """
        system_prompt = self._build_system_prompt(ctx)
        msgs = self._build_messages(ctx, system_prompt)
        
        if self.model_provider == "anthropic":
            raw = await self.anthropic.answer(messages=msgs)
        else:
            raw = self.openai.answer(messages=msgs)

        # Best-effort usage (tests may monkeypatch answer(), so usage may be missing)
        usage_out_tokens = 0
        try:
            if self.model_provider == "anthropic":
                usage_out_tokens = int(getattr(self.anthropic, "last_answer_output_tokens", 0) or 0)
            else:
                usage_out_tokens = int(getattr(self.openai, "last_answer_output_tokens", 0) or 0)
        except Exception:
            usage_out_tokens = 0
        ctx.usage_by_agent["answer"] = {"outputTokens": max(0, usage_out_tokens)}
        
        try:
            ctx.answer_raw = json.loads(raw)
        except Exception:
            ctx.answer_raw = {}
        
        return ctx
    
    async def run_stream(
        self,
        ctx: AgentContext,
    ) -> AsyncGenerator[tuple[str, str], None]:
        """
        Execute the response step with streaming.
        
        Yields tuples of (event_type, data):
        - ("thinking", delta) - thinking content (when thinking enabled)
        - ("text", delta) - assistant text content
        - ("done", json_str) - complete response JSON
        
        Also updates ctx.answer_raw and ctx.thinking_text when done.
        """
        system_prompt = self._build_system_prompt(ctx)
        msgs = self._build_messages(ctx, system_prompt)
        
        if self.model_provider != "anthropic":
            # Fallback to non-streaming for OpenAI
            await self.run(ctx)
            yield ("done", json.dumps(ctx.answer_raw))
            return
        
        # Stream with thinking support
        accumulated_thinking = ""
        answer_json_str = ""
        
        async for event_type, data in self.anthropic.answer_stream(
            messages=msgs,
            thinking_enabled=ctx.thinking_enabled,
        ):
            if event_type == "thinking" and data:
                accumulated_thinking += data
                yield ("thinking", data)
            elif event_type == "text" and data:
                yield ("text", data)
            elif event_type == "usage" and data:
                # Internal usage event from AnthropicClient (JSON string)
                try:
                    usage_obj = json.loads(data) if isinstance(data, str) else {}
                    out_tokens = int((usage_obj or {}).get("output_tokens") or 0)
                    ctx.usage_by_agent["answer"] = {"outputTokens": out_tokens}
                except Exception:
                    pass
            elif event_type == "done" and data:
                answer_json_str = data
        
        # Parse the final response
        try:
            ctx.answer_raw = json.loads(answer_json_str)
            logger.info(f"ResponseAgent: Parsed answer_raw with keys: {list(ctx.answer_raw.keys())}")
        except Exception as e:
            logger.error(f"ResponseAgent: Failed to parse answer JSON: {e}")
            logger.error(f"ResponseAgent: Raw JSON string length: {len(answer_json_str)}")
            logger.error(f"ResponseAgent: Raw JSON string preview: {answer_json_str[:500]}")
            
            # When thinking is enabled without structured outputs, model may return plain text
            # In this case, treat the accumulated text as the assistant response
            if answer_json_str.strip():
                logger.info(f"ResponseAgent: Treating response as plain text (thinking_enabled={ctx.thinking_enabled})")
                
                # Try to extract chips from the plain text response
                text_content, chips = self._extract_chips_from_text(answer_json_str.strip())
                
                ctx.answer_raw = {
                    "assistant": {"text": text_content},
                    "ui": ctx.router_ui or {"view": "chat"},
                    "chips": chips,
                }
            else:
                logger.error("ResponseAgent: No content in answer_json_str")
                ctx.answer_raw = {}
        
        ctx.thinking_text = accumulated_thinking
        if accumulated_thinking:
            logger.info(f"ResponseAgent: Accumulated thinking length: {len(accumulated_thinking)}")
        
        yield ("done", answer_json_str)
    
    def _build_system_prompt(self, ctx: AgentContext) -> str:
        """Build the system prompt for the answer step."""
        server_view = ctx.router_ui.get("view", "chat")
        should_produce_artifacts = ctx.client_view == "split" or server_view == "split"
        
        return ANSWER_SYSTEM_PROMPT.format(
            context_text=ctx.context_text,
            client_view=ctx.client_view,
            server_view=server_view,
            producing_artifacts="yes" if should_produce_artifacts else "no",
        )
    
    def _build_messages(self, ctx: AgentContext, system_prompt: str) -> list[dict[str, str]]:
        """Build the messages list for the LLM call."""
        msgs: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        
        # Client-managed memory; keep it bounded
        for m in ctx.messages[-12:]:
            role = m.get("role", "")
            if role == "system":
                continue
            text = m.get("text") or m.get("content") or ""
            msgs.append({"role": role, "content": text})
        
        return msgs
    
    def _extract_chips_from_text(self, text: str) -> tuple[str, list[str]]:
        """
        Extract chip suggestions from plain text response.
        Looks for patterns like ["chip1", "chip2"] at the end of the text.
        
        Returns: (cleaned_text, chips_list)
        """
        import re
        
        # Look for array-like patterns at the end: ["...", "..."]
        pattern = r'\[(?:"[^"]*"(?:\s*,\s*"[^"]*")*)\]\s*$'
        match = re.search(pattern, text)
        
        if match:
            chips_text = match.group(0)
            # Remove the chips from the main text
            cleaned_text = text[:match.start()].strip()
            
            # Parse the chips
            try:
                # Extract quoted strings
                chip_pattern = r'"([^"]*)"'
                chips = re.findall(chip_pattern, chips_text)
                logger.info(f"ResponseAgent: Extracted {len(chips)} chips from plain text")
                return cleaned_text, chips
            except Exception as e:
                logger.warning(f"ResponseAgent: Failed to parse chips: {e}")
                return text, []
        
        return text, []
