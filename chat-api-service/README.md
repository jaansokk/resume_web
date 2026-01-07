# chat-api-service

Local FastAPI chat API service (Qdrant-backed).

## Local run (dev)

### Where to put `.env`

Put it in **`chat-api-service/.env`** (next to `requirements.txt`), not under `app/`.
The service loads `chat-api-service/.env` and `chat-api-service/.env.local` on startup.

### Environment Variables

**Model Provider Selection:**
- `MODEL_PROVIDER` - Choose `"openai"` or `"anthropic"` (default: `"anthropic"`)
  - Controls which provider is used for chat and routing
  - Embeddings always use OpenAI

**Anthropic (when MODEL_PROVIDER=anthropic):**
- `ANTHROPIC_API_KEY` (required if using Anthropic)
- `ANTHROPIC_CHAT_MODEL` (default: `claude-sonnet-4-20250514`)
- `ANTHROPIC_ROUTER_MODEL` (default: `claude-sonnet-4-20250514`)
- `ANTHROPIC_MAX_TOKENS` (default: `4096`)

**OpenAI:**
- `OPENAI_API_KEY` (always required for embeddings)
- `OPENAI_EMBED_MODEL` (default: `text-embedding-3-small`)
- `EMBEDDING_DIM` (default: `1536`)
- `OPENAI_CHAT_MODEL` (default: `gpt-4o-mini`, used when MODEL_PROVIDER=openai)
- `OPENAI_ROUTER_MODEL` (default: `gpt-5-nano`, used when MODEL_PROVIDER=openai)

**Qdrant (vector store):**
- `QDRANT_URL` (default: `http://127.0.0.1:6333`)
- `QDRANT_COLLECTION_ITEMS` (default: `content_items_v1`)
- `QDRANT_COLLECTION_CHUNKS` (default: `content_chunks_v1`)

**Contact form email (SMTP):**
- `SMTP_HOST` (required) - e.g. `smtp.zone.eu`
- `SMTP_PORT` (required) - `465` (SSL/TLS) or `587` (STARTTLS)
- `SMTP_USE_SSL` (optional) - `true` for port 465 (defaults based on port)
- `SMTP_USE_STARTTLS` (optional) - `true` for port 587 (defaults based on port)
- `SMTP_USERNAME` (optional but usually required) - mailbox username/login
- `SMTP_PASSWORD` (optional but usually required) - mailbox password
- `SMTP_FROM_EMAIL` (required) - From address used when sending (must match provider rules)
- `CONTACT_TO_EMAIL` (required) - your destination email (usually your own)
- `CONTACT_SUBJECT_PREFIX` (optional) - default: `[resume-web] Contact`
- `SMTP_TIMEOUT_SECONDS` (optional) - default: `10`

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

**Choosing a Provider:**

Set `MODEL_PROVIDER` to choose between OpenAI or Anthropic for chat/routing:

```bash
# Use Anthropic (Claude) for chat/router (default)
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_CHAT_MODEL=claude-sonnet-4-20250514

# OR use OpenAI for chat/router
MODEL_PROVIDER=openai
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_ROUTER_MODEL=gpt-4o-mini

# OpenAI always needed for embeddings
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBED_MODEL=text-embedding-3-small
```

**Available Models:**

1. **Anthropic** (when `MODEL_PROVIDER=anthropic`):
   - `claude-sonnet-4-20250514` (Claude Sonnet 4.5) - default
   - `claude-opus-4-20250514` (Claude Opus 4)
   - `claude-3-7-sonnet-20250219` (Claude 3.7 Sonnet)

2. **OpenAI** (when `MODEL_PROVIDER=openai`):
   - Chat: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`
   - Router: `gpt-4o-mini`, `gpt-4o` (note: `gpt-5-nano` is placeholder)

3. **Embeddings** (always OpenAI):
   - `text-embedding-3-small` (1536 dims) - default
   - `text-embedding-3-large` (3072 dims)
   - If you change models, update `EMBEDDING_DIM` to match


