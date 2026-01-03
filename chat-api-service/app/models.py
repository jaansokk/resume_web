from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


ChatRole = Literal["system", "user", "assistant"]


class ClientPage(BaseModel):
    path: str | None = None
    activeSlug: str | None = None


class Client(BaseModel):
    origin: str | None = None
    page: ClientPage | None = None


class ChatMessage(BaseModel):
    role: ChatRole
    text: str = ""


class ChatRequest(BaseModel):
    conversationId: str
    client: Client | None = None
    messages: list[ChatMessage] = Field(..., min_length=1)


ChatClassification = Literal["new_opportunity", "general_talk"]
ChatTone = Literal["warm", "direct", "neutral", "enthusiastic"]


class RelatedItem(BaseModel):
    slug: str
    reason: str | None = None


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
    classification: ChatClassification
    tone: ChatTone
    related: list[RelatedItem] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    next: NextFlags = Field(default_factory=NextFlags)


