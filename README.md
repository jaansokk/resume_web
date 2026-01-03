# resume_web

This repo contains:
- `ui/`: Astro resume site (currently uses `package-lock.json` / npm)
- `chat-api-service/`: **NEW baseline (planned)** long-lived chat API orchestrator service (Qdrant-backed), deployed on Lightsail behind a reverse proxy
- `ingest/`: ingestion CLI (chunk + embed + index/upsert vectors)
- `chat-api-lambda/`: **DEPRECATED** legacy Lambda-based chat API (OpenSearch-backed) kept during migration/cleanup
- `infra-vps/`: **NEW baseline (planned)** Lightsail deploy assets (Docker Compose, Caddy/Nginx config, scripts)
- `infra/`: **DEPRECATED** legacy Lambda/OpenSearch deployment scripts kept during migration/cleanup

## Current architecture (baseline)
Target baseline is a **single AWS Lightsail instance** running:
- Reverse proxy (Caddy or Nginx) terminating TLS and routing `/api/*`
- Chat API service (orchestrator) implementing `/chat`
- Qdrant (vector store)

Key specs:
- `_specs/chat-api-rag-contract.md`
- `_specs/qdrant-index-design.md`
- `_specs/ingestion-pipeline.md`

Legacy (deprecated) architecture:
- Lambda + API Gateway + OpenSearch Serverless (kept for reference during migration/cleanup)

## Prerequisites

- **Node.js 18+** (needs native `fetch`)
- **aws-vault** (optional; only needed if you want AWS-backed legacy flows)
- **Corepack** (recommended for `pnpm` without global installs)
- **Python 3.11+** (for `chat-api-service/`)
- **Docker** (for local Qdrant via `docker-compose.yml`)

Enable Corepack once:

```bash
corepack enable
```

## Ingestion env setup

Create `ingest/.env` (or repo-root `.env`). `ingest/.env.example` shows all supported variables.

Preferred variables:
- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL` (default: `text-embedding-3-small`)
- `OPENAI_EMBEDDING_DIM` (optional; OpenAI `dimensions` parameter)
- `QDRANT_URL` (e.g. `http://127.0.0.1:6333` or `http://qdrant:6333`)
- `QDRANT_COLLECTION_ITEMS` (default: `content_items_v1`)
- `QDRANT_COLLECTION_CHUNKS` (default: `content_chunks_v1`)
- `QDRANT_NAMESPACE_UUID` (optional; deterministic UUIDv5 namespace for point IDs)

DEPRECATED (legacy OpenSearch ingestion / verification):
- `AOSS_ENDPOINT`, `AOSS_ITEMS_INDEX`, `AOSS_CHUNKS_INDEX`, `AWS_REGION`

## Running ingestion (from repo root)

You can run ingestion **without pnpm** (recommended) since `ingest/` has no external dependencies.

### 1) Export UI content index (no AWS/OpenAI needed)

```bash
npm run ingest:export
```

Outputs:
- `ingest/exported-content/content-index.json`
- `ui/public/content-index.json`

### 2) Verify OpenSearch Serverless access (DEPRECATED; AWS creds required)

Run via `aws-vault`:

```bash
aws-vault exec resume-web-ingest -- npm run ingest:verify
```

### 3) Vectors pipeline (chunk + embed + optional index)

- **Dry-run** (no OpenAI key, no AWS):

```bash
npm run ingest:vectors -- --dry-run
```

Writes debug dumps:
- `ingest/exported-content/debug/items.json`
- `ingest/exported-content/debug/chunks.json`

- **Embed only** (OpenAI key required, no AWS indexing):

```bash
npm run ingest:vectors -- --no-index
```

- **Embed + index (full run)**:
  - NEW baseline: OpenAI key + reachable Qdrant
  - DEPRECATED legacy: OpenAI key + AWS (OpenSearch Serverless)

```bash
npm run ingest:vectors
```

### 4) Full “all” command

Runs export + vectors:

```bash
npm run ingest:all
```

## Local dev: Qdrant + Chat API + UI (end-to-end)

### 1) Start local Qdrant

From repo root:

```bash
docker compose up -d
```

Qdrant will be reachable at `http://127.0.0.1:6333`.

### 2) Run ingestion into Qdrant

Ensure you have `OPENAI_API_KEY` set and (optionally) `QDRANT_URL=http://127.0.0.1:6333`.

```bash
npm run ingest:all
```

### 3) Run the FastAPI chat service

```bash
cd chat-api-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/healthz
```

### 4) Run API tests

```bash
cd chat-api-service
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

### 5) Run the UI against the local service

The UI defaults to calling **same-origin** `POST /api/chat`. During dev, Astro proxies:\n- `/api/chat` → `${CHAT_API_PROXY_TARGET:-http://127.0.0.1:8000}/chat`

```bash
cd ui
npm ci
npm run dev
```

Optional (to point the dev proxy somewhere else later, e.g. Lightsail):

```bash
CHAT_API_PROXY_TARGET=http://<host>:8000 npm run dev
```

## (Optional) Using pnpm

If you prefer pnpm, enable Corepack:

```bash
corepack enable
```

Then you can use:

```bash
corepack pnpm ingest:export
corepack pnpm ingest:vectors -- --dry-run
aws-vault exec resume-web-ingest -- zsh -lc 'corepack pnpm ingest:vectors'
```

## UI setup (`ui/`)

`ui/` currently has a `package-lock.json`, so use npm:

```bash
cd ui
npm ci
npm run dev
```


