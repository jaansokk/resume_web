"""
Request/response validation using Pydantic.
"""
from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field, ValidationError


class ClientPage(BaseModel):
    path: Optional[str] = None
    activeSlug: Optional[str] = None


class Client(BaseModel):
    origin: Optional[str] = None
    page: Optional[ClientPage] = None


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    text: Optional[str] = None
    content: Optional[str] = None
    
    def get_text(self) -> str:
        """Get text content from either 'text' or 'content' field."""
        return self.text or self.content or ""


class ChatRequest(BaseModel):
    conversationId: str
    client: Optional[Client] = None
    messages: List[Message] = Field(..., min_length=1)


class RelatedItem(BaseModel):
    slug: str
    reason: str


class Citation(BaseModel):
    type: Literal["experience", "project", "background"]
    slug: str
    chunkId: int


class NextFlags(BaseModel):
    offerMoreExamples: bool = False
    askForEmail: bool = False


class AssistantResponse(BaseModel):
    text: str


class ChatResponse(BaseModel):
    assistant: AssistantResponse
    classification: Literal["new_opportunity", "general_talk"]
    tone: Literal["warm", "direct", "neutral", "enthusiastic"]
    related: List[RelatedItem] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
    next: NextFlags


def validate_request(body: Dict[str, Any]) -> None:
    """Validate incoming chat request."""
    try:
        ChatRequest(**body)
    except ValidationError as e:
        raise ValueError(f"Invalid request: {e}")


def validate_response(response: Dict[str, Any]) -> None:
    """Validate outgoing chat response."""
    try:
        ChatResponse(**response)
    except ValidationError as e:
        # Log but don't fail - try to fix common issues
        print(f"Response validation warning: {e}")
        
        # Ensure required fields exist
        if "assistant" not in response:
            response["assistant"] = {"text": "I'd be happy to help!"}
        if "classification" not in response:
            response["classification"] = "general_talk"
        if "tone" not in response:
            response["tone"] = "neutral"
        if "related" not in response:
            response["related"] = []
        if "citations" not in response:
            response["citations"] = []
        if "next" not in response:
            response["next"] = {"offerMoreExamples": False, "askForEmail": False}
        
        # Validate again after fixes
        try:
            ChatResponse(**response)
        except ValidationError:
            # If still invalid, raise
            raise ValueError(f"Invalid response after fixes: {e}")

