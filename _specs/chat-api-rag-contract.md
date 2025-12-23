
## Goal
Define the MVP `/chat` API contract and RAG flow for a Lambda backend, with client-managed conversation state.

Key requirements:
- UI sends last N messages each request (client-managed memory).
- Backend uses OpenSearch vector retrieval + LLM generation.
- LLM-driven tone + classification + “related items” selection.
- Include `background` content for LLM context, but never present it as a UI artifact.
- Response is structured JSON so UI is stable.

This spec adds an explicit, end-to-end API flow description (who calls what, in what order, what the inputs/outputs are). :contentReference[oaicite:0]{index=0}

---

## Endpoints (MVP)

### POST /chat
Generates next assistant message + UI directives.

Request (suggested):
```json
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
```

Rules:
- UI should send only the last ~8–20 messages (bounded).
- Optionally include a rolling summary later (not required in MVP).
- Response (suggested):

```json
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
```

UI behavior:
- Use related[].slug to drive the left panel (cards/tabs).
- Never display background as cards/tabs; ignore type="background" for any UI artifact selection.
- Citations are optional for debugging; if shown, UI should hide background citations by default.
- If slugs are invalid, backend must drop them and return fallback slugs.



## Explicit end-to-end flow (who calls what)

### Actors
- **UI (browser on VPS-hosted site)**: holds chat memory (last N messages) and calls `/chat`.
- **API Gateway**: HTTPS entry point for the Lambda.
- **Lambda (`/chat`)**: orchestrator; validates input/output, calls OpenAI + OpenSearch, enforces rules (e.g., background not surfaced as UI items).
- **OpenAI Embeddings**: turns retrieval text into a vector.
- **OpenSearch Serverless**: vector store over `content_chunks_v1`, returns top chunk hits.
- **OpenAI Chat Model**: generates structured JSON output (classification/tone/assistant text/related slugs).

### Preconditions (outside the request)
- Ingestion has created and populated:
  - `content_items_v1` (metadata: experience/project/background)
  - `content_chunks_v1` (chunk embeddings: experience/project/background)
- Background items exist only for LLM context and are either:
  - flagged `uiVisible=false` in metadata, and/or
  - excluded from any UI-facing export (e.g., `content-index.json`)

### Sequence (single user message)
1) **UI → Lambda**: `POST /chat`
   - UI includes `messages[]` (last N turns) so Lambda has conversational context.
   - UI includes `client.page` so the model can optionally tailor responses (“I’m on your Guardtime page…”).

2) **Lambda → OpenAI Chat (Router)** 
   - Purpose: make the experience feel LLM-driven:
     - classification (`new_opportunity` vs `general_talk`)
     - tone/style direction
     - retrieval query rewrite for OpenSearch(“what should we search for?”)
     - stage flags (`offerMoreExamples`, `askForEmail`)
   - Output: strict JSON, e.g.:
     - `classification`, `tone`, `retrievalQuery`, `suggestedRelatedSlugs`, `next{...}`
   - Validation: `suggestedRelatedSlugs` must be experience/project only (never background).

3) **Lambda → OpenAI Embeddings**: compute retrieval vector
   - Input text is either:
     - router `retrievalQuery`, or
     - last user message (fallback)
   - Output: `queryEmbedding: number[]` with length `EMBEDDING_DIM`

4) **Lambda → OpenSearch Serverless**: vector search in `content_chunks_v1`
   - Lambda sends a kNN query using the embedding vector.
   - For MVP, retrieve a larger candidate pool (e.g., `k=30..50`) for better post-processing.

5) **Lambda post-processes retrieval results**
   - Split hits by `type`:
     - **experience/project**: primary evidence for examples and factual claims
     - **background**: secondary context (principles/books/preferences)
   - Enforce caps:
     - `maxBackgroundChunks = 2`
     - `maxMainChunks = 10` (experience/project)
   - Compute candidate related slugs **only from experience/project hits**:
     - group hits by `slug`
     - rank by score aggregation or hit count
     - take top 3–6 slugs
   - Never compute UI-related slugs from background hits.

6) **Lambda → OpenAI Chat (Answer)**: generate grounded assistant response
   - Inputs:
     - recent messages (from UI)
     - router output (classification/tone/flags) if router used
     - selected retrieved chunks (type, slug, chunkId, section, text)
   - Instructions:
     - use retrieved text as source of truth for experience/project claims
     - background may influence tone/preferences but should not invent facts
     - if insufficient info, ask 1 clarifying question
     - return strict JSON: `assistant.text`, `classification`, `tone`, `related[]`, `citations[]`, `next{...}`

7) **Lambda validates and sanitizes response JSON**
   - Validate JSON schema (zod).
   - Validate `related[].slug`:
     - exists in `content_items_v1` (or other canonical source)
     - is NOT background
   - If invalid/empty:
     - fallback to top slugs from step 5 (experience/project only)

8) **Lambda → UI**: return final JSON
   - UI appends `assistant.text` to chat
   - UI updates left panel using `related[]`
   - UI may store/display citations (optional; hide background by default)

---

## RAG pipeline summary (MVP)

### Step 1) Router LLM call (structured JSON) — optional but recommended
- Output: classification, tone, retrievalQuery, next-step flags, optional suggested related slugs.
- Validation: never allow background slugs in related.

### Step 2) Retrieval (vector search)
- Embed retrieval text (OpenAI embeddings).
- kNN search OpenSearch content_chunks_v1.
- Cap background chunks; prioritize experience/project chunks.

### Step 3) Answer LLM call (grounded generation)
- Provide retrieved chunks as context.
- Return strict JSON response for UI.

### Step 4) Validate + return
- zod validation
- slug validation
- fallback behavior

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
