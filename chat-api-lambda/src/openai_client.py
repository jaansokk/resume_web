"""
OpenAI client for embeddings and chat completion.
"""
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI


class OpenAIClient:
    """Client for OpenAI API (embeddings and chat)."""
    
    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("Missing OPENAI_API_KEY")
        
        self.client = OpenAI(api_key=api_key)
        self.embed_model = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        self.chat_model = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.embedding_dim = int(os.environ.get("EMBEDDING_DIM", "1536"))
    
    def embed(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        response = self.client.embeddings.create(
            model=self.embed_model,
            input=text,
            dimensions=self.embedding_dim
        )
        return response.data[0].embedding
    
    def chat_completion(self, messages: List[Dict[str, str]], response_format: Optional[Dict[str, str]] = None, **kwargs) -> Dict[str, Any]:
        """
        Call OpenAI chat completion.
        
        Args:
            messages: List of message dicts with "role" and "content" keys
            response_format: Optional format spec (e.g., {"type": "json_object"})
            **kwargs: Additional parameters (temperature, etc.)
        
        Returns:
            Response dict with "content" and other fields
        """
        # Convert messages format if needed (handle "text" vs "content")
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content") or msg.get("text", "")
            formatted_messages.append({"role": role, "content": content})
        
        params = {
            "model": self.chat_model,
            "messages": formatted_messages,
            **kwargs
        }
        
        if response_format:
            params["response_format"] = response_format
        
        response = self.client.chat.completions.create(**params)
        
        # Extract content
        content = response.choices[0].message.content
        
        return {
            "content": content,
            "model": response.model,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }

