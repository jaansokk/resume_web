"""
Router LLM call: classification, tone, retrieval query generation.
"""
import json
from typing import Dict, Any, List
from src.openai_client import OpenAIClient


class Router:
    """Router service for classification and retrieval query generation."""
    
    def __init__(self, openai_client: OpenAIClient):
        self.openai = openai_client
    
    def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process request through router LLM.
        
        Returns:
            {
                "classification": "new_opportunity" | "general_talk",
                "tone": "warm" | "direct" | "neutral" | "enthusiastic",
                "retrievalQuery": "...",
                "suggestedRelatedSlugs": ["slug1", "slug2"],
                "next": {
                    "offerMoreExamples": bool,
                    "askForEmail": bool
                }
            }
        """
        messages = request.get("messages", [])
        if not messages:
            raise ValueError("No messages in request")
        
        last_user_message = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_message = msg.get("text") or msg.get("content", "")
                break
        
        if not last_user_message:
            raise ValueError("No user message found")
        
        # Build router prompt
        router_prompt = self._build_router_prompt(request, last_user_message)
        
        # Call LLM with structured JSON output
        response = self.openai.chat_completion(
            messages=[
                {"role": "system", "content": router_prompt},
                {"role": "user", "content": last_user_message}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        # Parse JSON response
        try:
            router_output = json.loads(response["content"])
        except json.JSONDecodeError:
            # Fallback to defaults
            router_output = {
                "classification": "general_talk",
                "tone": "neutral",
                "retrievalQuery": last_user_message,
                "suggestedRelatedSlugs": [],
                "next": {
                    "offerMoreExamples": False,
                    "askForEmail": False
                }
            }
        
        # Validate classification
        classification = router_output.get("classification", "general_talk")
        if classification not in ["new_opportunity", "general_talk"]:
            classification = "general_talk"
        router_output["classification"] = classification
        
        # Validate tone
        tone = router_output.get("tone", "neutral")
        if tone not in ["warm", "direct", "neutral", "enthusiastic"]:
            tone = "neutral"
        router_output["tone"] = tone
        
        # Ensure retrievalQuery exists
        if not router_output.get("retrievalQuery"):
            router_output["retrievalQuery"] = last_user_message
        
        # Ensure next flags exist
        if "next" not in router_output:
            router_output["next"] = {}
        router_output["next"]["offerMoreExamples"] = router_output["next"].get("offerMoreExamples", False)
        router_output["next"]["askForEmail"] = router_output["next"].get("askForEmail", False)
        
        # Validate suggestedRelatedSlugs (will be validated later against actual items)
        if "suggestedRelatedSlugs" not in router_output:
            router_output["suggestedRelatedSlugs"] = []
        
        return router_output
    
    def _build_router_prompt(self, request: Dict[str, Any], user_message: str) -> str:
        """Build system prompt for router LLM."""
        client_page = request.get("client", {}).get("page", {})
        page_context = ""
        if client_page.get("path"):
            page_context = f"\nUser is currently on page: {client_page.get('path')}"
            if client_page.get("activeSlug"):
                page_context += f" (viewing: {client_page.get('activeSlug')})"
        
        return f"""You are a router for a resume/portfolio chat system. Analyze the user's message and return a JSON object with:

1. **classification**: "new_opportunity" or "general_talk"
   - "new_opportunity": hiring, PM/PO role, contract work, project request, "can you help", "we need", "looking for"
   - "general_talk": browsing, curiosity, small talk, unrelated questions

2. **tone**: "warm", "direct", "neutral", or "enthusiastic"
   - Choose based on the user's message style and context

3. **retrievalQuery**: A rewritten query optimized for vector search to find relevant experience/project examples
   - Should capture the key concepts, skills, or domains mentioned
   - Keep it concise (1-2 sentences max)

4. **suggestedRelatedSlugs**: Array of 0-3 slug strings for relevant experience/project items (optional, can be empty)
   - Only suggest if you're confident based on the message
   - These will be validated against actual content

5. **next**: Object with:
   - "offerMoreExamples": boolean (true if we should offer more examples)
   - "askForEmail": boolean (true if we should ask for LinkedIn/email)

{page_context}

Return ONLY valid JSON, no markdown formatting."""

