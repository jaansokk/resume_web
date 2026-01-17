from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


ChatRole = Literal["system", "user", "assistant"]


class ClientUI(BaseModel):
    view: Literal["chat", "split"] = "chat"
    split: dict[str, str] | None = None  # {activeTab: "brief" | "experience"}


class ClientPage(BaseModel):
    path: str | None = None
    referrerShareId: str | None = None


class Client(BaseModel):
    origin: str | None = None
    page: ClientPage | None = None
    ui: ClientUI | None = None


class ChatMessage(BaseModel):
    role: ChatRole
    text: str = ""


class ChatRequest(BaseModel):
    conversationId: str
    client: Client | None = None
    messages: list[ChatMessage] = Field(..., min_length=1)


# V2 Response models


class FitBriefSection(BaseModel):
    id: str
    title: str
    content: str


class FitBrief(BaseModel):
    title: str
    sections: list[FitBriefSection] = Field(default_factory=list)


class RelevantExperienceItem(BaseModel):
    slug: str
    type: Literal["experience", "project"]
    title: str
    company: str | None = None
    role: str | None = None
    period: str | None = None
    bullets: list[str] = Field(default_factory=list)
    whyRelevant: str | None = None


class RelevantExperienceGroup(BaseModel):
    title: str
    items: list[RelevantExperienceItem] = Field(default_factory=list)


class RelevantExperience(BaseModel):
    groups: list[RelevantExperienceGroup] = Field(default_factory=list)


class Artifacts(BaseModel):
    fitBrief: FitBrief | None = None
    relevantExperience: RelevantExperience | None = None


class UISplit(BaseModel):
    activeTab: Literal["brief", "experience"] = "brief"


class UIDirective(BaseModel):
    view: Literal["chat", "split"] = "chat"
    split: UISplit | None = None


class Hints(BaseModel):
    suggestShare: bool = False
    suggestTab: Literal["brief", "experience"] | None = None


class AssistantResponse(BaseModel):
    text: str


class ChatResponse(BaseModel):
    assistant: AssistantResponse
    ui: UIDirective
    hints: Hints = Field(default_factory=Hints)
    chips: list[str] = Field(default_factory=list)
    artifacts: Artifacts = Field(default_factory=Artifacts)


# Contact form models


class ContactRequest(BaseModel):
    contact: str = Field(..., min_length=3, max_length=200)  # email or LinkedIn or phone
    message: str = Field(..., min_length=3, max_length=5000)
    # Optional metadata to help you debug spam / trace origin
    pagePath: str | None = None
    # Honeypot field: should be empty. Bots often fill it.
    website: str | None = None


class ContactResponse(BaseModel):
    ok: bool = True


# Share snapshot models (DynamoDB-backed)


class ShareSnapshot(BaseModel):
    conversationId: str
    createdAt: str
    ui: UIDirective
    messages: list[ChatMessage] = Field(default_factory=list)
    artifacts: Artifacts


class ShareCreateRequest(BaseModel):
    createdByContact: str = Field(..., min_length=3, max_length=200)
    snapshot: ShareSnapshot


class ShareCreateResponse(BaseModel):
    shareId: str
    path: str


class ShareGetResponse(BaseModel):
    shareId: str
    createdAt: str
    snapshot: ShareSnapshot
