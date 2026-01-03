## DEPRECATED (legacy OpenSearch Serverless architecture)
This spec is kept for migration/cleanup reference only.

New baseline:
- Qdrant is the vector store.
- See `_specs/qdrant-index-design.md` for the active index/collection design.

---

## Goal
Define the MVP OpenSearch (Serverless) index design for a portfolio RAG system:
- Store structured “content item” metadata (for UI cards/tabs).
- Store chunk-level embeddings (for retrieval).
- Support minimal filters + reliable linking back to `/experience/:slug` pages.

## Non-goals (MVP)
- Complex hybrid ranking (BM25 + vector).
- Multi-tenant auth.
- Fine-grained per-user access control.

---

## Embedding model decision (MVP)
Default to:
- `EMBEDDING_MODEL=text-embedding-3-small`
- `EMBEDDING_DIM=1536`

Upgrade path:
- Switch to `text-embedding-3-large` (3072 dims) if retrieval quality is insufficient.
- If the embedding dimension changes, you MUST reindex the vector index.

Optional cost/size optimization:
- You may use OpenAI’s `dimensions` parameter to shorten embeddings (e.g., 1024), but then:
  - `EMBEDDING_DIM` must match everywhere (ingest + query).
  - Reindex required when changing dims.

### What is `background`?
A third content type used to provide personal context to the LLM:
- beliefs / principles
- books and influences
- ways of working / preferences
- “about me” style narrative
- optional links to experience/projects (for grounding)

**Important:** `background` is NOT shown as a card/tab/artifact in the UI.
It exists only to improve conversation quality and grounding.

---

## Indexes (MVP)

### 1) `content_items_v1` (metadata)
One document per item: experience/project/background.

Add a visibility flag so UI can safely ignore `background`.

**Doc ID**: `slug` (recommended)

**Mapping (additions)**
- Add `uiVisible` boolean (default true for experience/project; false for background)
- Allow `type="background"`

PUT content_items_v1
{
  "mappings": {
    "properties": {
      "type": { "type": "keyword" },                 // "experience" | "project" | "background"
      "uiVisible": { "type": "boolean" },            // false for background

      "slug": { "type": "keyword" },
      "title": { "type": "text", "fields": { "raw": { "type": "keyword" } } },

      "company": { "type": "keyword" },
      "role": { "type": "keyword" },
      "period": { "type": "keyword" },
      "startDate": { "type": "date", "ignore_malformed": true },
      "endDate": { "type": "date", "ignore_malformed": true },

      "tags": { "type": "keyword" },
      "keywords": { "type": "keyword" },
      "summary": { "type": "text" },

      "heroImage": { "type": "keyword" },
      "gallery": { "type": "keyword" },

      "links": {                                        // optional: explicit graph edges
        "properties": {
          "experienceSlugs": { "type": "keyword" },
          "projectSlugs": { "type": "keyword" }
        }
      },

      "sourcePath": { "type": "keyword" },
      "updatedAt": { "type": "date" }
    }
  }
}

Notes:
- For `background`, set:
  - `uiVisible=false`
  - `company/role/period` may be omitted (or blank)
  - `links.*` can be used to connect background to experience/projects

---


### 2) `content_chunks_v1` (RAG chunks)
Many documents per item, including background.

Update the allowed `type` and (optionally) a retrieval weight.

**Doc ID**: `${slug}::${chunkId}`

**Mapping (additions)**
- Allow `type="background"`
- Add `retrievalBoost` numeric for future weighting (optional; defaults to 1.0)

PUT content_chunks_v1
{
  "settings": { "index.knn": true },
  "mappings": {
    "properties": {
      "type": { "type": "keyword" },                 // "experience" | "project" | "background"
      "slug": { "type": "keyword" },
      "chunkId": { "type": "integer" },

      "title": { "type": "text" },
      "tags": { "type": "keyword" },
      "company": { "type": "keyword" },
      "role": { "type": "keyword" },

      "section": { "type": "keyword" },
      "text": { "type": "text" },

      "retrievalBoost": { "type": "float" },         // optional, default 1.0

      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "space_type": "cosinesimil"
      },

      "updatedAt": { "type": "date" }
    }
  }
}

Notes:
- For MVP we keep engine/method defaults (OpenSearch Serverless tutorial defaults).
- If you later need faster + better filtering behavior, revisit the mapping to use a specific engine/method.



---

## Query recipes (MVP)

### A) Vector search (no filters)
GET content_chunks_v1/_search
{
  "size": 12,
  "query": {
    "knn": {
      "embedding": {
        "vector": [/* query embedding */],
        "k": 12
      }
    }
  }
}

### B) Vector search + soft metadata filter (post-filter style)
MVP approach: retrieve more than you need and filter in Lambda (recommended).
- Query with `k=40, size=40`
- Then filter by tags/type in application code and select top results.

---

## Query / Retrieval rules (MVP)

### Retrieval inclusion
Default behavior:
- Include `background` chunks in retrieval results (they improve tone and personalization).
- BUT do not let background dominate “example” retrieval.

MVP implementation guideline:
- Run ONE vector search with `k=20..40`, then in application code:
  - keep up to `maxBackgroundChunks = 2` in the final context window
  - keep up to `maxExperienceProjectChunks = 8..12`

Upgrade path:
- Run two searches:
  1) a smaller one restricted to `type=background` (k=3..6)
  2) the main one restricted to `type in (experience, project)` (k=12..20)
  Then merge.

### Related items for UI
When computing `relatedSlugs`:
- ONLY consider items where:
  - `type in ("experience", "project")`
  - `uiVisible=true`
- Never surface `background` slugs in the left panel.


---

## “Related items” selection rule (for UI)
Given retrieved chunk hits:
1) Group by `slug`.
2) Sum top scores per slug or count hits per slug.
3) Return top 3–6 slugs for the left panel.
4) Always validate slug exists in `content_items_v1`. If missing, drop it.

---

## Versioning strategy
- Index names include `_v1`.
- When you change embedding dimension, chunking rules, or mapping:
  - Create `_v2` indexes
  - Reindex by re-running ingestion
  - Switch aliases (optional) or update env var `CHUNKS_INDEX=content_chunks_v2`.
- If you later decide background should be stored separately (e.g., different retention or weighting),
you can move it to a dedicated index `background_chunks_v1`. For MVP, keep it unified to reduce complexity.
