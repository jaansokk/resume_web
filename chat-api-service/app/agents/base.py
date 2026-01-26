"""
Base classes and shared context for agents.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentContext:
    """
    Shared context passed between agents in the pipeline.
    This is the "state" that flows through the orchestration graph.
    """
    
    # Request data
    conversation_id: str = ""
    last_user_text: str = ""
    messages: list[dict[str, str]] = field(default_factory=list)
    client_view: str = "chat"
    client_active_tab: str = "brief"
    page_path: str | None = None
    thinking_enabled: bool = True  # Extended thinking toggle
    
    # Router output
    retrieval_query: str = ""
    router_ui: dict[str, Any] = field(default_factory=dict)
    router_hints: dict[str, Any] = field(default_factory=dict)
    
    # Retrieval output
    retrieval_results: dict[str, Any] = field(default_factory=dict)
    context_text: str = ""
    
    # Response output
    assistant_text: str = ""
    thinking_text: str = ""  # Accumulated thinking for display
    answer_raw: dict[str, Any] = field(default_factory=dict)
    
    # Final validated output
    response: dict[str, Any] = field(default_factory=dict)
