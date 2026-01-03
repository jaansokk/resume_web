# chat-api-service

Local FastAPI chat API service (Qdrant-backed).

## Local run (dev)

### Where to put `.env`

Put it in **`chat-api-service/.env`** (next to `requirements.txt`), not under `app/`.
The service loads `chat-api-service/.env` and `chat-api-service/.env.local` on startup.

### Environment Variables

**Anthropic (chat & routing):**
- `ANTHROPIC_API_KEY` (required for chat/router)
- `ANTHROPIC_CHAT_MODEL` (default: `claude-sonnet-4-20250514`)
- `ANTHROPIC_ROUTER_MODEL` (default: `claude-sonnet-4-20250514`)
- `ANTHROPIC_MAX_TOKENS` (default: `4096`)

**OpenAI (embeddings only):**
- `OPENAI_API_KEY` (required for embeddings)
- `OPENAI_EMBED_MODEL` (default: `text-embedding-3-small`)
- `EMBEDDING_DIM` (default: `1536`)

**Qdrant (vector store):**
- `QDRANT_URL` (default: `http://127.0.0.1:6333`)
- `QDRANT_COLLECTION_ITEMS` (default: `content_items_v1`)
- `QDRANT_COLLECTION_CHUNKS` (default: `content_chunks_v1`)

### Install

```bash
# Conda (recommended)
conda create -n resume-web-api python=3.11 -y
conda activate resume-web-api
pip install -r requirements.txt
```

### Run

```bash
uvicorn app.main:app --reload --port 8000 --log-level debug
```

### Model Configuration

To change which models are used:

1. **Chat/Router models** (Anthropic): Set `ANTHROPIC_CHAT_MODEL` and/or `ANTHROPIC_ROUTER_MODEL`
   - Default: `claude-sonnet-4-20250514` (Claude Sonnet 4.5)
   - Other options: `claude-opus-4-20250514`, `claude-3-7-sonnet-20250219`, etc.

2. **Embedding model** (OpenAI): Set `OPENAI_EMBED_MODEL`
   - Default: `text-embedding-3-small`
   - Other options: `text-embedding-3-large`, `text-embedding-ada-002`
   - If you change models, ensure `EMBEDDING_DIM` matches (1536 for small, 3072 for large)


