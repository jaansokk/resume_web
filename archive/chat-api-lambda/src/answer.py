"""
Answer generator: grounded LLM response with retrieved context.
"""
import json
from typing import Dict, Any, List
from src.openai_client import OpenAIClient
from src.opensearch_client import OpenSearchClient


class AnswerGenerator:
    """Service for generating grounded assistant responses."""
    
    def __init__(self, openai_client: OpenAIClient, opensearch_client: OpenSearchClient):
        self.openai = openai_client
        self.opensearch = opensearch_client
    
    def generate(self, messages: List[Dict[str, Any]], router_output: Dict[str, Any], retrieval_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate grounded assistant response.
        
        Returns:
            {
                "assistant": {"text": "..."},
                "classification": "new_opportunity" | "general_talk",
                "tone": "warm" | "direct" | "neutral" | "enthusiastic",
                "related": [
                    {"slug": "...", "reason": "..."}
                ],
                "citations": [
                    {"type": "experience", "slug": "...", "chunkId": int}
                ],
                "next": {
                    "offerMoreExamples": bool,
                    "askForEmail": bool
                }
            }
        """
        # Build context from retrieved chunks
        context_parts = []
        citations = []
        
        for chunk in retrieval_results.get("chunks", []):
            chunk_type = chunk.get("type", "experience")
            slug = chunk.get("slug", "")
            chunk_id = chunk.get("chunkId", 0)
            section = chunk.get("section", "")
            text = chunk.get("text", "")
            
            # Add to context
            context_label = f"[{chunk_type}:{slug}:{chunk_id}]"
            if section:
                context_label += f" section:{section}"
            context_parts.append(f"{context_label}\n{text}")
            
            # Track citation (only experience/project for UI)
            if chunk_type != "background":
                citations.append({
                    "type": chunk_type,
                    "slug": slug,
                    "chunkId": chunk_id
                })
        
        context_text = "\n\n---\n\n".join(context_parts)
        
        # Build system prompt
        system_prompt = self._build_system_prompt(router_output, context_text)
        
        # Format messages for LLM
        llm_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation history (last few messages)
        for msg in messages[-8:]:  # Last 8 messages for context
            role = msg.get("role", "user")
            content = msg.get("text") or msg.get("content", "")
            if role != "system":  # Skip system messages from client
                llm_messages.append({"role": role, "content": content})
        
        # Generate response
        response = self.openai.answer_completion(
            messages=llm_messages,
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        # Parse JSON response
        try:
            answer_output = json.loads(response["content"])
        except json.JSONDecodeError:
            # Fallback
            answer_output = {
                "assistant": {"text": "I'd be happy to help! Could you tell me more about what you're looking for?"},
                "classification": router_output.get("classification", "general_talk"),
                "tone": router_output.get("tone", "neutral"),
                "related": [],
                "citations": [],
                "next": router_output.get("next", {})
            }
        
        # Ensure required fields
        if "assistant" not in answer_output:
            answer_output["assistant"] = {}
        if not isinstance(answer_output["assistant"], dict):
            answer_output["assistant"] = {"text": str(answer_output["assistant"])}
        if "text" not in answer_output["assistant"]:
            answer_output["assistant"]["text"] = "I'd be happy to help!"
        
        # Use router classification/tone if not provided
        answer_output["classification"] = answer_output.get("classification", router_output.get("classification", "general_talk"))
        answer_output["tone"] = answer_output.get("tone", router_output.get("tone", "neutral"))
        
        # Build related items with reasons
        related_slugs = retrieval_results.get("relatedSlugs", [])
        if not answer_output.get("related"):
            # Generate reasons for related slugs
            answer_output["related"] = []
            for slug in related_slugs[:6]:  # Top 6
                item = self.opensearch.get_item(slug)
                reason = f"Relevant to your question about {self._extract_keywords_from_messages(messages)}"
                if item:
                    title = item.get("title", slug)
                    reason = f"Relevant experience: {title}"
                answer_output["related"].append({"slug": slug, "reason": reason})
        
        # Use citations from context (filter background)
        answer_output["citations"] = citations
        
        # Ensure next flags
        if "next" not in answer_output:
            answer_output["next"] = router_output.get("next", {})
        answer_output["next"]["offerMoreExamples"] = answer_output["next"].get("offerMoreExamples", False)
        answer_output["next"]["askForEmail"] = answer_output["next"].get("askForEmail", False)
        
        return answer_output
    
    def _build_system_prompt(self, router_output: Dict[str, Any], context_text: str) -> str:
        """Build system prompt for answer generation."""
        classification = router_output.get("classification", "general_talk")
        tone = router_output.get("tone", "neutral")
        next_flags = router_output.get("next", {})
        
        tone_guidance_map = {
            "warm": "Be friendly, personable, and approachable. Use a conversational, warm tone.",
            "direct": "Be concise, professional, and to the point. Avoid unnecessary pleasantries.",
            "neutral": "Be professional and balanced. Use a neutral, informative tone.",
            "enthusiastic": "Be energetic and positive. Show genuine interest and excitement."
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
- Keep responses short and scannable"""
        }.get(classification, "")
        
        return f"""You are a helpful assistant representing a PM/PO professional's portfolio/resume website.

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
    "offerMoreExamples": {str(next_flags.get("offerMoreExamples", False)).lower()},
    "askForEmail": {str(next_flags.get("askForEmail", False)).lower()}
  }}
}}

Return ONLY valid JSON, no markdown formatting."""
    
    def _extract_keywords_from_messages(self, messages: List[Dict[str, Any]]) -> str:
        """Extract keywords from recent messages for related item reasons."""
        # Simple extraction: take last user message
        for msg in reversed(messages):
            if msg.get("role") == "user":
                text = msg.get("text") or msg.get("content", "")
                # Take first few words
                words = text.split()[:5]
                return " ".join(words)
        return "your question"

