from __future__ import annotations

import os

from fastapi import FastAPI

from .models import ChatRequest, ChatResponse
from .openai_client import OpenAIClient
from .pipeline import ChatPipeline
from .qdrant_client import QdrantClient, QdrantConfig


def create_app() -> FastAPI:
    app = FastAPI(title="resume-web chat api", version="0.1.0")

    qdrant_url = os.environ.get("QDRANT_URL", "http://127.0.0.1:6333").strip()
    qdrant_items = os.environ.get("QDRANT_COLLECTION_ITEMS", "content_items_v1").strip()
    qdrant_chunks = os.environ.get("QDRANT_COLLECTION_CHUNKS", "content_chunks_v1").strip()

    qdrant = QdrantClient(QdrantConfig(url=qdrant_url, collection_items=qdrant_items, collection_chunks=qdrant_chunks))
    openai = OpenAIClient()
    pipeline = ChatPipeline(openai=openai, qdrant=qdrant)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/chat", response_model=ChatResponse)
    def chat(req: ChatRequest) -> ChatResponse:
        _ = os.environ.get("OPENAI_API_KEY", "")  # ensure env is present early (OpenAIClient enforces)
        return pipeline.handle(req)

    return app


app = create_app()


