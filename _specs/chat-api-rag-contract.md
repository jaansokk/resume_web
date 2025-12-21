

## Goal
Define the MVP `/chat` API contract and RAG flow for a Lambda backend, with client-managed conversation state.

Key requirements:
- UI sends last N messages each request (client-managed memory).
- Backend uses OpenSearch vector retrieval + LLM generation.
- LLM-driven tone + classification + “related items” selection.
- Include `background` content for LLM context, but never present it as a UI artifact.
- Response is structured JSON so UI is stable.

---

## Endpoints (MVP)

### POST /chat
Generates next assistant message + UI directives.

Request (suggested):
{
  "conversationId": "uuid-v4",
  "client": {
    "origin": "https://your-vps-subdomain.example.com",
    "page": { "path": "/experience/guardtime", "activeSlug": "guardtime-po" }
  },
  "messages": [
    { "role": "system", "text": "optional short client context" },
    { "role": "user", "text": "..." },
    { "role": "assistant", "text": "..." }
  ]
}

Rules:
- UI should send only the last ~8–20 messages (bounded).
- Optionally include a rolling summary later (not required in MVP).

Response (suggested):
{
  "assistant": { "text": "..." },

  "classification": "new_opportunity" | "general_talk",
  "tone": "warm" | "direct" | "neutral" | "enthusiastic",

  "related": [
    { "slug": "positium-mobility", "reason": "..." },
    { "slug": "guardtime-po", "reason": "..." }
  ],

  "citations": [
    { "type": "experience", "slug": "guardtime-po", "chunkId": 3 },
    { "type": "background", "slug": "principles", "chunkId": 1 }
  ],

  "next": {
    "offerMoreExamples": true,
    "askForEmail": false
  }
}

UI behavior:
- Use `related[].slug` to drive the left panel (cards/tabs).
- Never display background as cards/tabs; ignore `type="background"` for any UI artifact selection.
- `citations` are optional for debugging; if shown, UI should hide background citations by default.
- If slugs are invalid, backend must drop them and return fallback slugs.

### POST /lead (optional, later)
Stores email/LinkedIn lead in DynamoDB (out of MVP scope unless desired).

---

## RAG pipeline inside Lambda (MVP)

### Step 1) Router LLM call (structured JSON)
Purpose:
- Make the interaction feel LLM-driven: classification + tone + what to do next.

Inputs:
- recent messages
- a small system style prompt (“PM/PO tone, concise, confident”)

Outputs (JSON):
- classification
- tone/style hints
- retrievalQuery (string)
- suggestedRelatedSlugs (0–6)  // ONLY experience/project slugs
- flags: offerMoreExamples / askForEmail

Validation rules:
- If router suggests slugs that don’t exist or include background slugs, drop them.

---

### Step 2) Retrieval (vector search)
Goal:
- Retrieve grounded content chunks for answer generation.
- Include `background` chunks for personalization/context, but cap them.

MVP retrieval strategy (recommended):
- Run ONE vector search with a larger K (e.g., 30–50) across `content_chunks_v1`.
- In application code:
  - Keep up to `maxBackgroundChunks = 2`
  - Keep up to `maxExperienceProjectChunks = 10`
  - Prefer experience/project chunks when building the final context window.

Alternative retrieval strategy (upgrade path):
- Run two searches:
  1) background-only: filter `type="background"` with k=6
  2) main: filter `type in ("experience","project")` with k=20
- Merge and cap background chunks.

Aggregation:
- Aggregate experience/project hits by slug to compute candidate slugs.
- NEVER compute related slugs from background hits.

---

### Step 3) Answer LLM call (grounded generation)
Inputs:
- recent conversation
- router output (classification + tone)
- retrieved chunks (include: type, slug, section, chunkId, text)
Instructions:
- Use retrieved text as the source of truth for factual claims about experience/projects.
- Background can shape tone and personal preferences, but should not introduce unverifiable claims.
- If missing info, ask 1 clarifying question.
- Return JSON with:
  - `assistant.text`
  - `related[]` (experience/projects only)
  - `citations[]` (may include background for internal traceability)
  - `next{...}`

---

### Step 4) Validate + return
- Validate JSON schema (zod).
- Validate `related[].slug` exist and are NOT background.
- If invalid/empty:
  - fallback to top slugs from retrieval aggregation (experience/project only).

---

## CORS / hosting note (VPS UI)
- UI is hosted on your VPS subdomain.
- Lambda API must allow CORS for that exact origin.
- Prefer HTTPS everywhere.

Two viable MVP approaches:
A) Call API Gateway default URL directly from UI (enable CORS).
B) Reverse proxy `/api/*` on your VPS to API Gateway to avoid browser CORS entirely.

---

## Env vars (MVP)
- OPENAI_API_KEY
- OPENAI_CHAT_MODEL
- OPENAI_EMBED_MODEL
- EMBEDDING_DIM
- OPENSEARCH_ENDPOINT
- OPENSEARCH_COLLECTION (if needed)
- OS_INDEX_ITEMS=content_items_v1
- OS_INDEX_CHUNKS=content_chunks_v1
- ALLOWED_ORIGINS=https://your-vps-subdomain.example.com

Optional tuning:
- MAX_BACKGROUND_CHUNKS=2
- MAX_MAIN_CHUNKS=10
- RETRIEVAL_K=40

---

## Observability (MVP)
Log per request:
- conversationId
- latency: embed, search, router, answer
- #chunks retrieved, top slugs
Never log:
- OPENAI_API_KEY
- full user transcript in production logs (optional: truncate)
