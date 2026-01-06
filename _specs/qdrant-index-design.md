## Goal
Define the MVP Qdrant index design for the portfolio RAG system:
- Store chunk-level embeddings (for retrieval).
- Store item-level metadata (for slug validation + display metadata).
- Preserve current retrieval rules (background is allowed for LLM context but is never surfaced as a UI artifact).

This spec replaces OpenSearch as the baseline vector store.

---

## Embedding model decision (MVP)
Default to:
- `OPENAI_EMBED_MODEL=text-embedding-3-small`
- `EMBEDDING_DIM=1536`

Upgrade path:
- Switch to `text-embedding-3-large` (3072 dims) if retrieval quality is insufficient.
- If the embedding dimension changes, you MUST reindex the vector collection(s).

---

## Collections (MVP)

### 1) `content_items_v1` (metadata)
One record per item: experience/project/background.

Required fields (payload):
- `type`: `"experience" | "project" | "background"`
- `uiVisible`: boolean (false for background)
- `slug`: string (canonical identifier)
- `title`: string
- `tags`: string[]
- `summary`: string
- `updatedAt`: ISO string

Optional fields:
- `keywords`: string[]
- `heroImage`: string
- `gallery`: string[]
- `urlPath`: string (canonical UI path for the item; optional)
- `highlights`: string[] (optional curated proof points; short bullets)
- `links`: object (optional graph edges)
- For experience/project: `company`, `role`, `period`, optional `startDate`, `endDate`

Point ID strategy:
- Qdrant point IDs are **integers or UUIDs** (not arbitrary strings).
- Use **UUID v5** derived from `slug` for determinism:
  - `id = uuidv5(NAMESPACE_UUID, slug)`

Notes:
- Background items MUST set `uiVisible=false`.

### 2) `content_chunks_v1` (RAG chunks)
Many records per item, including background.

Required fields (payload):
- `type`: `"experience" | "project" | "background"`
- `slug`: string
- `chunkId`: integer
- `section`: string
- `text`: string
- `title`: string
- `tags`: string[]
- `company`: string | null
- `role`: string | null
- `updatedAt`: ISO string

Vector:
- Single vector named `embedding` with size `EMBEDDING_DIM`
- Distance: cosine

Point ID strategy:
- Deterministic UUID v5 derived from `(slug, chunkId)`:
  - `id = uuidv5(NAMESPACE_UUID, slug + \"::\" + chunkId)`

---

## Query / Retrieval rules (MVP)

### Retrieval inclusion
Default behavior:
- Vector search includes all types (experience/project/background).
- Background is allowed into the LLM context window but must not dominate it.

MVP post-processing guideline:
- Retrieve a larger candidate pool (e.g., `k=30..50`).
- In application code:
  - keep up to `MAX_BACKGROUND_CHUNKS=2` background chunks
  - keep up to `MAX_MAIN_CHUNKS=10` experience/project chunks

### Related items for UI
When computing `relatedSlugs`:
- ONLY consider chunks where `type in ("experience", "project")`.
- Never surface background slugs in the left panel.

Implementation recipe:
1) Group candidate experience/project hits by `slug`.
2) Rank by hit count (primary) and best score (secondary).
3) Take top 3–6 slugs.
4) Validate slugs as UI-visible (see next section).

---

## Slug validation (MVP)
The chat service must validate `related[].slug` before returning it to the UI.

Preferred approach (recommended):
- Validate against Qdrant `content_items_v1`:
  - slug exists
  - `uiVisible=true`
  - `type != "background"`

Alternative approach (acceptable for MVP):
- Treat `ui/public/content-index.json` as the canonical list of UI-visible items and load it at service startup.
- Still store background in `content_chunks_v1` for retrieval, but never accept background slugs for UI.

---

## Versioning strategy
- Collections include `_v1`.
- When changing embedding dimension, chunking rules, or payload schema in a breaking way:
  - create new collections (`*_v2`)
  - re-run ingestion
  - update service env vars to point to the new collections

---

## DEPRECATED: OpenSearch index design
See `_specs/_archive/opensearch-index-design.md` for legacy OpenSearch mappings and query recipes.

