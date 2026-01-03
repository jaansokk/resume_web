

## Goal
Implement a reproducible ingestion pipeline that:
- Reads Astro content collection Markdown from `../ui/src/content/**`
- Exports a UI-friendly content graph JSON (experience/projects only)
- Chunks + embeds content and indexes it into Qdrant (experience/projects/background)

MVP target: run ingestion on 3–5 experience entries end-to-end (plus optionally 1–2 background docs).

---

## Inputs
Source markdown lives in:
- `ui/src/content/experience/*.md`
- `ui/src/content/projects/*.md`
- `ui/src/content/background/*.md`   <-- new type

Each file contains frontmatter + body.

### Required frontmatter fields (MVP)
For `experience` and `projects`:
- `title`, `company`, `role`, `period`, `tags[]`, `summary`

For `background`:
- `title`, `tags[]`, `summary`

### Optional frontmatter fields
All types:
- `keywords[]`, `heroImage`, `gallery[]`, `updatedAt`

Experience/projects:
- `startDate`, `endDate`

Background:
- `links` (explicit graph edges; optional)
  - `links.experienceSlugs[]`
  - `links.projectSlugs[]`

Notes:
- For `background`, `company/role/period` are not required and may be absent.

---

## Outputs

### A) Content graph export (for UI)
Write to: `ingest/exported-content/content-index.json`
And copy to UI as one of:
- `ui/public/content-index.json` (simplest), OR
- `ui/src/generated/content-index.ts`

Rules:
- Export ONLY `experience` and `project` items.
- EXCLUDE `background` entirely from this artifact.

Shape (suggested):
{
  "generatedAt": "...",
  "items": [
    {
      "type":"experience",
      "slug":"...",
      "title":"...",
      "company":"...",
      "role":"...",
      "period":"...",
      "tags":[...],
      "summary":"...",
      "heroImage":"...",
      "gallery":[...]
    }
  ]
}

### B) Qdrant collections
Index ALL types into Qdrant:
- `content_items_v1`  (one point per item: experience/project/background)
- `content_chunks_v1` (many points per item: experience/project/background)

Indexing rules for `background`:
- `type="background"`
- `uiVisible=false` in `content_items_v1`
- Still chunk + embed into `content_chunks_v1`

---

## CLI commands (suggested)
From repo root:

- `pnpm ingest:export`  -> generates content-index.json (experience/projects only)
- `pnpm ingest:vectors` -> chunks + embeddings + indexing/upserts (all types)
- `pnpm ingest:all`     -> export + vectors

---

## Chunking strategy (MVP)
Goal: stable, readable chunks for retrieval.

Rules:
1) Strip frontmatter from body.
2) Normalize whitespace, keep bullet points.
3) Prefer splitting by headings first:
   - Split on Markdown headings `^#{1,3} `
4) Within each section, split further by paragraph boundaries to target:
   - chunk size ~ 600–900 characters (MVP) OR
   - chunk size ~ 250–450 tokens (later)
5) Add a small overlap:
   - last 1 paragraph overlaps into next chunk (MVP)

Stored per chunk:
- `type`, `slug`, `chunkId`, `section` (heading text), `text`
- plus repeated metadata for filtering/debug:
  - `title`, `tags`, and for experience/projects also `company`, `role`

Special note for `background`:
- headings are often less structured; paragraph-based splitting is fine.
- keep chunks small enough to fit alongside experience chunks in the answer prompt.

---

## Embeddings step (OpenAI)
For each chunk:
- Call OpenAI embeddings with:
  - model = `text-embedding-3-small`
  - input = chunk text
  - optional prefix:
    - for experience/projects: `${title} — ${company} — ${role}\n\n`
    - for background: `${title}\n\n`

Also embed user queries at runtime in the chat API service (not part of ingestion).

---

## Indexing step (Qdrant)
Use point upserts:
- Upsert `content_items_v1` by deterministic point ID (see `_specs/qdrant-index-design.md`)
- Upsert `content_chunks_v1` by deterministic point ID (see `_specs/qdrant-index-design.md`)

Idempotency:
- Compute a hash for each source file (frontmatter + body).
- Store `updatedAt` and optionally `sourceHash`.
- Skip re-embedding unchanged chunks when possible (optional optimization).

---

## Verification checklist (MVP)
After ingesting 3–5 experience entries (+ optional background docs):

1) `content_items_v1` count matches total ingested files across all types.
2) `content_chunks_v1` contains multiple chunks per slug.
3) Run a manual vector query:
   - embed a test query text
   - search `content_chunks_v1`
   - confirm top hits include expected experience slugs
   - confirm background appears for “principles / beliefs / books” queries
4) Confirm UI can render cards from `content-index.json` and link to pages.
   - verify that background does NOT appear anywhere in browse/cards.

---

## Failure modes to handle
- Missing required frontmatter fields -> fail fast with a clear error.
- Oversized chunks -> split further.
- OpenAI transient errors -> retry with backoff (max 3).
- Qdrant connectivity failures -> print the Qdrant URL and exit.

---

## Local dev (optional)
Provide a `docker-compose.yml` for local Qdrant testing.
Local dev is recommended for iterating on payload schema and end-to-end retrieval behavior.

---

## DEPRECATED: OpenSearch indexing references
If you still need the legacy OpenSearch pipeline during migration/cleanup, see:
- `_specs/opensearch-index-design.md`
