from __future__ import annotations

import os
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from .models import ChatRequest, ChatResponse
from .anthropic_client import AnthropicClient
from .openai_client import OpenAIClient
from .pipeline import ChatPipeline
from .qdrant_client import QdrantClient, QdrantConfig


log = logging.getLogger("resume_web_chat_api")


def _load_dotenv() -> None:
    """
    Load env vars from `chat-api-service/.env` if present.

    Uvicorn does NOT automatically load a `.env` unless you pass `--env-file`,
    so we do it here to keep local dev simple.
    """
    try:
        from dotenv import load_dotenv
    except Exception:
        return

    service_root = Path(__file__).resolve().parents[1]
    load_dotenv(dotenv_path=service_root / ".env", override=False)
    load_dotenv(dotenv_path=service_root / ".env.local", override=True)


def create_app() -> FastAPI:
    _load_dotenv()
 
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    app = FastAPI(title="resume-web chat api", version="0.1.0")

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        # Always log the full traceback to the uvicorn console.
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        # In local dev, you can opt into a more verbose response.
        if os.environ.get("DEBUG_ERRORS", "0") == "1":
            return JSONResponse(status_code=500, content={"error": repr(exc)})
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

    @app.on_event("startup")
    async def _startup_log() -> None:
        openai_key = os.environ.get("OPENAI_API_KEY", "")
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        model_provider = os.environ.get("MODEL_PROVIDER", "anthropic").lower().strip()
        log.info("Config: QDRANT_URL=%s", os.environ.get("QDRANT_URL", "http://127.0.0.1:6333"))
        log.info("Config: MODEL_PROVIDER=%s", model_provider)
        log.info("Config: OPENAI_API_KEY set=%s prefix=%s", bool(openai_key), (openai_key[:12] if openai_key else ""))
        log.info("Config: ANTHROPIC_API_KEY set=%s prefix=%s", bool(anthropic_key), (anthropic_key[:12] if anthropic_key else ""))

    qdrant_url = os.environ.get("QDRANT_URL", "http://127.0.0.1:6333").strip()
    qdrant_items = os.environ.get("QDRANT_COLLECTION_ITEMS", "content_items_v1").strip()
    qdrant_chunks = os.environ.get("QDRANT_COLLECTION_CHUNKS", "content_chunks_v1").strip()

    qdrant = QdrantClient(QdrantConfig(url=qdrant_url, collection_items=qdrant_items, collection_chunks=qdrant_chunks))
    openai = OpenAIClient()
    anthropic = AnthropicClient()
    pipeline = ChatPipeline(openai=openai, anthropic=anthropic, qdrant=qdrant)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/chat", response_model=ChatResponse)
    def chat(req: ChatRequest) -> ChatResponse:
        # OpenAI is always needed for embeddings
        # Anthropic or OpenAI needed for chat/router based on MODEL_PROVIDER
        return pipeline.handle(req)

    return app


app = create_app()


