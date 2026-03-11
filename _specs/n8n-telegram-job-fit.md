## n8n Telegram Job-Fit Bot

A demo n8n workflow that takes a pasted job description via Telegram and responds with a fit brief + relevant projects from Jaan's portfolio. Built as a portfolio piece for the n8n Product Engineer application.

---

## Why this exists

Show n8n's AI/RAG capabilities in a real, working workflow — not a toy example. The workflow reuses the existing Qdrant vector store that already indexes all experience, projects, and background content for the resume website.

---

## User flow

1. User sends (or pastes) a job description to a Telegram bot.
2. n8n triggers, embeds the JD, retrieves relevant chunks from Qdrant.
3. An LLM generates a structured fit brief: match assessment, relevant experience, relevant projects, and gaps.
4. Telegram responds with the brief.

One message in, one message out. No multi-turn conversation needed for MVP.

---

## Architecture

```
Telegram Bot (@fit-brief-bot or similar)
  │
  ▼
┌─────────────────────────────────────────────┐
│  n8n (local dev / or on VPS)                │
│                                             │
│  Telegram Trigger (polling mode for dev)    │
│       │                                     │
│       ▼                                     │
│  Qdrant Vector Store (retrieve)             │
│  ├─ Embeddings: OpenAI text-embedding-3-small│
│  ├─ Collection: content_chunks_v1           │
│  ├─ Top-k: ~10 chunks                      │
│  └─ (uses same embeddings as resume site)   │
│       │                                     │
│       ▼                                     │
│  AI Agent / Chat Model                      │
│  ├─ Model: Claude or GPT-4                  │
│  ├─ System prompt: fit-brief instructions   │
│  └─ Context: retrieved chunks + JD          │
│       │                                     │
│       ▼                                     │
│  Telegram Send Message                      │
└─────────────────────────────────────────────┘
         │
         ▼
   Qdrant (existing deployment)
   ├─ content_chunks_v1 (embeddings + metadata)
   └─ content_items_v1 (item-level metadata)
```

---

## Qdrant integration

Reuses the existing vector store — no new ingestion needed.

- **Embedding model**: `text-embedding-3-small` (1536 dims) — must match what n8n uses for query embedding.
- **Collection**: `content_chunks_v1` — chunk-level embeddings with `itemSlug`, `chunkIndex`, `type`, `tags`, etc.
- **Metadata collection**: `content_items_v1` — item-level records with `title`, `summary`, `tags`, `period`, `company`.
- **Retrieval strategy**: embed the JD text → top-k similarity search against `content_chunks_v1` → use chunk payloads for context.

### Connectivity (dev)

For local n8n development:

**SSH tunnel to production Qdrant (recommended, real data)**

```bash
ssh -L 6333:127.0.0.1:6333 ubuntu@jaan.sokkphoto.com
# n8n connects to http://localhost:6333
```

### Connectivity (production on VPS)

If n8n is added to the VPS docker-compose, it joins the `resume-web` network and reaches Qdrant at `http://qdrant:6333` — same as the chat API service.

---

## LLM prompt (system)

```
You are a job-fit analyst for Jaan Sokk's portfolio. You receive a job description and retrieved context chunks from Jaan's experience, projects, and background.

Produce a structured fit brief in this exact format:

**Match: [High / Medium / Low]** — one-line rationale.

**Relevant Experience**
- 2-4 bullet points mapping specific roles, skills, or achievements to JD requirements.
- Reference concrete details from the retrieved context (company names, technologies, outcomes).

**Relevant Projects**
- List project names with a one-line explanation of relevance to this role.
- Only include projects that genuinely connect to the JD.

**Gaps**
- Honest assessment of JD requirements not well-covered by the context.
- If a gap is minor or learnable, say so briefly.

**Suggested Angle**
One paragraph on how to position the application — what to lead with, what narrative to use.

Rules:
- Be specific. Use actual names, technologies, and details from the context — never fabricate.
- If the context doesn't contain enough information to assess a requirement, say so rather than guessing.
- Keep the total response under 2000 characters (Telegram message limit).
- Use plain text with markdown bold (**) only — no headers, no code blocks.

```

---

## n8n setup (local dev)

### 1. Run n8n

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --network host \
  n8nio/n8n
```

`--network host` lets n8n reach `localhost:6333` (the SSH-tunneled Qdrant).

Open `http://localhost:5678` to access the n8n editor.

### 2. Create Telegram bot

1. Message `@BotFather` on Telegram.
2. `/newbot` → pick a name and username.
3. Copy the bot token.

### 3. Build the workflow

Nodes to create in n8n:

1. **Telegram Trigger** — credential: bot token, mode: polling ("getUpdates").
2. **Qdrant Vector Store** — credential: Qdrant URL `http://localhost:6333`, collection: `content_chunks_v1`.
3. **OpenAI Embeddings** — model: `text-embedding-3-small` (must match existing index).
4. **AI Agent** (or Basic LLM Chain) — model: Claude/GPT-4, system prompt as above, user message = JD from Telegram.
5. **Telegram Send Message** — sends the LLM output back to the chat.

### 4. Credentials needed

| Credential       | Where to get it                    |
|-------------------|------------------------------------|
| Telegram Bot Token| @BotFather                         |
| OpenAI API Key    | platform.openai.com (for embeddings) |
| Anthropic API Key | console.anthropic.com (if using Claude) |
| Qdrant URL        | `http://localhost:6333` (tunneled) or `http://qdrant:6333` (compose) |

---

## Production path (optional, on VPS)

Add to `infra-vps/docker-compose.yml`:

```yaml
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      - N8N_SECURE_COOKIE=false
      - WEBHOOK_URL=https://${DOMAIN}/n8n/
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - qdrant
```

Add to Caddyfile:
```
handle /n8n/* {
    reverse_proxy n8n:5678
}
```

Add `n8n_data:` to the volumes section.

This exposes n8n behind Caddy with TLS, and enables webhook mode for Telegram (instant, no polling).

---

## Deliverable

Export the workflow as JSON from n8n (Settings → Export) and include it alongside the application. The JSON is self-contained — the reviewer can import it into any n8n instance, add their own credentials, and see it work.

---

## Out of scope (MVP)

- Multi-turn conversation / memory
- Multiple JD comparison
- Auto-generating cover letters
- Storing results / history


---

## Issue encountered 11.03.26

### Webhook connection required with Telegram trigger, no polling option
...which means ngrok or equivalent is needed to expose :5678 externally for Telegram to connect with n8n.

### "Bad request" with qdrant action
The core problem: your collection stores vectors under the name "embedding", but n8n queries the default unnamed vector. n8n's Qdrant node doesn't expose a vector name option.

Quickest fix: create a copy of the collection with an unnamed default vector. 