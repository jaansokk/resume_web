# chat-api-service

Local FastAPI chat API service (Qdrant-backed).

## Local run (dev)

Create an env file (or export env vars):
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` (default in code: `gpt-4o-mini`)
- `OPENAI_ROUTER_MODEL` (default in code: `gpt-5-nano`)
- `OPENAI_EMBED_MODEL` (default in code: `text-embedding-3-small`)
- `EMBEDDING_DIM` (default: `1536`)
- `QDRANT_URL` (e.g. `http://127.0.0.1:6333`)
- `QDRANT_COLLECTION_ITEMS` (default: `content_items_v1`)
- `QDRANT_COLLECTION_CHUNKS` (default: `content_chunks_v1`)

Install:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run:

```bash
uvicorn app.main:app --reload --port 8000
```


