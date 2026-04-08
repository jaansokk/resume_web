"""
OpenAI client for embeddings and chat completion.
"""
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from openai import BadRequestError


class OpenAIClient:
    """Client for OpenAI API (embeddings and chat)."""
    
    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("Missing OPENAI_API_KEY")
        
        self.client = OpenAI(api_key=api_key)
        self.embed_model = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        # Answer model (used for the final response generation)
        self.chat_model = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        # Router model (used only for routing/classification/query rewrite)
        self.router_model = os.environ.get("OPENAI_ROUTER_MODEL", "gpt-5-nano")
        self.router_effort = os.environ.get("OPENAI_ROUTER_EFFORT", "low")
        self.router_verbosity = os.environ.get("OPENAI_ROUTER_VERBOSITY", "low")
        # Answer tuning knobs (optional). When set, we will prefer the Responses API
        # for the answer call in order to apply effort/verbosity.
        self.answer_effort = os.environ.get("OPENAI_ANSWER_EFFORT", "")
        self.answer_verbosity = os.environ.get("OPENAI_ANSWER_VERBOSITY", "")
        self.embedding_dim = int(os.environ.get("EMBEDDING_DIM", "1536"))

    def _supports_custom_temperature(self, model: Optional[str] = None) -> bool:
        """
        Some models only support the default temperature (1) and reject custom values.
        When unsure, prefer a safe default: allow temperature for most models, but
        disable for known families that reject custom temperature.
        """
        model = (model or self.chat_model or "").lower()
        # gpt-5* models currently reject custom temperature values in this project setup.
        if model.startswith("gpt-5"):
            return False
        return True
    
    def embed(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        response = self.client.embeddings.create(
            model=self.embed_model,
            input=text,
            dimensions=self.embedding_dim
        )
        return response.data[0].embedding

    def _chat_completions(
        self,
        *,
        model: str,
        messages: List[Dict[str, str]],
        response_format: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Internal helper for Chat Completions API calls with an explicit model.
        """
        # Convert messages format if needed (handle "text" vs "content")
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content") or msg.get("text", "")
            formatted_messages.append({"role": role, "content": content})

        # Some models (e.g. gpt-5*) only allow the default temperature (1).
        # If a call site provides a non-default temperature, drop it for those models.
        if "temperature" in kwargs and not self._supports_custom_temperature(model):
            try:
                temp = float(kwargs.get("temperature"))
            except Exception:
                temp = None
            if temp is None or temp != 1.0:
                kwargs.pop("temperature", None)

        params: Dict[str, Any] = {
            "model": model,
            "messages": formatted_messages,
            **kwargs
        }
        if response_format:
            params["response_format"] = response_format

        try:
            response = self.client.chat.completions.create(**params)
        except BadRequestError as e:
            # One-time retry without temperature if the model rejects custom temperature.
            msg = str(e)
            if "temperature" in msg and ("Only the default (1) value is supported" in msg or "unsupported_value" in msg):
                params.pop("temperature", None)
                response = self.client.chat.completions.create(**params)
            else:
                raise

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
        return self._chat_completions(
            model=self.chat_model,
            messages=messages,
            response_format=response_format,
            **kwargs
        )

    def router_completion(
        self,
        messages: List[Dict[str, str]],
        response_format: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Router-specific completion call.

        Tries the Responses API first so we can apply router tuning knobs
        (reasoning effort + text verbosity). Falls back to chat.completions if the
        SDK/model rejects those parameters.
        """
        # Convert messages format if needed (handle "text" vs "content")
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content") or msg.get("text", "")
            formatted_messages.append({"role": role, "content": content})

        # Prefer Responses API when available (supports GPT-5 router knobs)
        try:
            create_fn = getattr(getattr(self.client, "responses"), "create")
        except Exception:
            create_fn = None

        if create_fn:
            params: Dict[str, Any] = {
                "model": self.router_model,
                "input": formatted_messages,
            }

            # Router tuning knobs (best-effort)
            if self.router_effort:
                params["reasoning"] = {"effort": self.router_effort}

            text_cfg: Dict[str, Any] = {}
            if self.router_verbosity:
                text_cfg["verbosity"] = self.router_verbosity
            if response_format:
                # Expected shape: {"type": "json_object"}
                text_cfg["format"] = response_format
            if text_cfg:
                params["text"] = text_cfg

            # Allow call sites to override/extend, but avoid passing temperature to gpt-5*
            params.update(kwargs or {})
            if "temperature" in params and not self._supports_custom_temperature(self.router_model):
                params.pop("temperature", None)

            try:
                response = create_fn(**params)
                # The Python SDK exposes a convenience property for assembled output text.
                content = getattr(response, "output_text", None)
                if not content:
                    # Best-effort fallback extraction from structured output blocks
                    parts: List[str] = []
                    output = getattr(response, "output", None) or []
                    for item in output:
                        for c in getattr(item, "content", None) or []:
                            if getattr(c, "type", None) == "output_text" and getattr(c, "text", None):
                                parts.append(c.text)
                    content = "\n".join(parts).strip()
                if not content:
                    raise ValueError("Router response contained no output_text")
                return {"content": content, "model": getattr(response, "model", self.router_model), "usage": {}}
            except Exception:
                # Fall back to chat.completions
                pass

        # Fallback: chat.completions using router model (no effort/verbosity)
        return self._chat_completions(
            model=self.router_model,
            messages=messages,
            response_format=response_format,
            **kwargs
        )

    def answer_completion(
        self,
        messages: List[Dict[str, str]],
        response_format: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Answer-specific completion call.

        If OPENAI_ANSWER_EFFORT and/or OPENAI_ANSWER_VERBOSITY are set, tries the
        Responses API so we can apply those knobs. Otherwise uses chat.completions.
        """
        use_responses = bool((self.answer_effort or "").strip() or (self.answer_verbosity or "").strip())

        if not use_responses:
            return self._chat_completions(
                model=self.chat_model,
                messages=messages,
                response_format=response_format,
                **kwargs
            )

        # Convert messages format if needed (handle "text" vs "content")
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content") or msg.get("text", "")
            formatted_messages.append({"role": role, "content": content})

        # Prefer Responses API when available
        try:
            create_fn = getattr(getattr(self.client, "responses"), "create")
        except Exception:
            create_fn = None

        if create_fn:
            params: Dict[str, Any] = {
                "model": self.chat_model,
                "input": formatted_messages,
            }

            if self.answer_effort:
                params["reasoning"] = {"effort": self.answer_effort}

            text_cfg: Dict[str, Any] = {}
            if self.answer_verbosity:
                text_cfg["verbosity"] = self.answer_verbosity
            if response_format:
                text_cfg["format"] = response_format
            if text_cfg:
                params["text"] = text_cfg

            params.update(kwargs or {})
            if "temperature" in params and not self._supports_custom_temperature(self.chat_model):
                params.pop("temperature", None)

            try:
                response = create_fn(**params)
                content = getattr(response, "output_text", None)
                if not content:
                    parts: List[str] = []
                    output = getattr(response, "output", None) or []
                    for item in output:
                        for c in getattr(item, "content", None) or []:
                            if getattr(c, "type", None) == "output_text" and getattr(c, "text", None):
                                parts.append(c.text)
                    content = "\n".join(parts).strip()
                if not content:
                    raise ValueError("Answer response contained no output_text")
                return {"content": content, "model": getattr(response, "model", self.chat_model), "usage": {}}
            except Exception:
                # Fall back to chat.completions
                pass

        return self._chat_completions(
            model=self.chat_model,
            messages=messages,
            response_format=response_format,
            **kwargs
        )
