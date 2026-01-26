"""
ValidatorAgent: Sanitizes and validates the response before returning to client.
"""

from __future__ import annotations

import logging
from typing import Any

from .base import AgentContext

logger = logging.getLogger(__name__)


class ValidatorAgent:
    """
    Validates and sanitizes the combined output from router and response agents.
    Ensures all values are within allowed ranges and types.
    """
    
    def __init__(self, *, qdrant_client: Any):
        self.qdrant = qdrant_client
    
    def run(self, ctx: AgentContext) -> AgentContext:
        """
        Execute validation and sanitization.
        Updates ctx.response with the final validated response dict.
        """
        from ..retrieval import is_ui_visible_item
        
        answer_out = ctx.answer_raw
        router_out = {"ui": ctx.router_ui, "hints": ctx.router_hints}
        
        # Assistant text
        assistant = answer_out.get("assistant") if isinstance(answer_out.get("assistant"), dict) else {}
        assistant_text = (assistant.get("text") if isinstance(assistant, dict) else None) or ""
        
        logger.info(f"ValidatorAgent: answer_out keys: {list(answer_out.keys())}")
        logger.info(f"ValidatorAgent: assistant type: {type(assistant)}, keys: {list(assistant.keys()) if isinstance(assistant, dict) else 'not a dict'}")
        logger.info(f"ValidatorAgent: assistant_text length: {len(assistant_text)}, empty: {not assistant_text.strip()}")
        
        if not isinstance(assistant_text, str) or not assistant_text.strip():
            logger.error(f"ValidatorAgent: Invalid assistant_text - answer_out: {answer_out}")
            assistant_text = "Whoa... a problem occurred! Please try that again."
        
        # UI directive
        ui_raw = answer_out.get("ui") or router_out.get("ui") or {"view": "chat"}
        ui_view = ui_raw.get("view") if isinstance(ui_raw, dict) else "chat"
        if ui_view not in ("chat", "split"):
            ui_view = "chat"
        
        # Never downgrade: if the client is already in split view, keep server response in split
        if ctx.client_view == "split":
            ui_view = "split"
        
        ui_directive: dict[str, Any] = {"view": ui_view}
        if ui_view == "split":
            split_raw = ui_raw.get("split") if isinstance(ui_raw, dict) else {}
            active_tab = split_raw.get("activeTab") if isinstance(split_raw, dict) else "brief"
            # If router/answer omitted split.activeTab, fall back to the client's current active tab
            if not active_tab or active_tab not in ("brief", "experience"):
                active_tab = ctx.client_active_tab or "brief"
            if active_tab not in ("brief", "experience"):
                active_tab = "brief"
            ui_directive["split"] = {"activeTab": active_tab}
        
        # Hints
        hints_raw = answer_out.get("hints") or router_out.get("hints") or {}
        suggest_tab = hints_raw.get("suggestTab") if isinstance(hints_raw, dict) else None
        if suggest_tab not in ("brief", "experience", None):
            suggest_tab = None
        
        # Chips
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
                        
                        # Use Qdrant payload as source of truth for metadata
                        title = payload.get("title") if payload else item.get("title")
                        company = payload.get("company") if payload else item.get("company")
                        role = payload.get("role") if payload else item.get("role")
                        period = payload.get("period") if payload else item.get("period")
                        
                        items.append({
                            "slug": slug,
                            "type": item_type,
                            "title": str(title)[:200] if title else "",
                            "company": str(company)[:200] if company else None,
                            "role": str(role)[:200] if role else None,
                            "period": str(period)[:100] if period else None,
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
        
        # If we ended up with split view but no renderable artifacts, downgrade to chat
        if ui_view == "split":
            client_already_split = ctx.client_view == "split"
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
        
        ctx.response = {
            "assistant": {"text": assistant_text},
            "ui": ui_directive,
            "hints": {
                "suggestShare": False,
                "suggestTab": suggest_tab,
            },
            "chips": chips,
            "artifacts": artifacts,
        }
        
        # Add thinking text if available
        if ctx.thinking_text:
            ctx.response["thinking"] = ctx.thinking_text
        
        return ctx
