## Specs index (what to use when)

This repo contains multiple specs, but **not every spec is relevant for every task**. Use this index to pick the **minimum set of spec(s)** needed to do the work correctly.

### How to use specs (selection rule)
- Start from the **task prompt** and identify which area it touches: UI/product, chat UX behavior, content, or future backend/RAG/ingest/infra.
- Pull in **only the spec(s)** listed for that area, plus any direct dependencies called out below.
- If a requirement is unclear or conflicting, **ask a clarifying question** or propose a small decision and document it.
- **Specs are the source of truth** for scope and acceptance criteria.

---

### Product & UI (current Astro app)

#### `_specs/01-product-brief.md`
- **Use when**: defining the product goal, primary users, and the “2-screen model” (home → split-view response).
- **Answers**: “What are we building and for whom?”

#### `_specs/02-requirements.md`
- **Use when**: implementing/changing features; deciding MVP vs nice-to-have; checking acceptance criteria.
- **Answers**: “What must work right now?” and “What’s out of scope?”

#### `_specs/03-ia-content.md`
- **Use when**: creating/changing pages, content blocks, navigation, tone/voice, or what appears in the left “related experience” area.
- **Answers**: “What pages/content exist and how should they read?”

#### `_specs/04-chat-flow.md`
- **Use when**: any work touching chat behavior (classification, split-view triggers, follow-up prompts, widget availability/placement).
- **Answers**: “How should the conversation and UI state evolve?”
- **Depends on**: `_specs/02-requirements.md` for MVP constraints.

#### `_specs/05-ui-style.md`
- **Use when**: styling/layout/interaction decisions (dark UI, square buttons, typography, focus/hover, motion).
- **Answers**: “What should it look/feel like?”

---

### Backend/RAG/Indexing (planned monorepo work)

> **Current baseline (source of truth):** self-hosted Chat API service + Qdrant on a single AWS Lightsail instance, fronted by a reverse proxy (Caddy or Nginx).
>
> Legacy architecture (Lambda + OpenSearch Serverless) is still documented for reference, but is marked **DEPRECATED** in the relevant specs.

#### `_specs/repo-structure.md`
- **Use when**: creating the monorepo folders, moving code, setting up packages, or wiring boundaries between UI / API / ingest / infra / shared.
- **Answers**: “Where does this code live?” and “How is the repo organized?”

#### `_specs/chat-api-rag-contract.md`
- **Use when**: implementing the `/chat` API, request/response JSON shape, UI directives, retrieval + generation steps, and validation rules.
- **Answers**: “What does the chat API return and how should RAG behave?”
- **Depends on**: `_specs/qdrant-index-design.md` for vector store schema and retrieval constraints.

#### `_specs/qdrant-index-design.md`
- **Use when**: defining Qdrant collections, payload schema, vector dimensions, and retrieval/validation rules.
- **Answers**: “How do we store/search content for RAG safely in Qdrant?”

#### `_specs/opensearch-index-design.md`
- **Status**: **DEPRECATED** (legacy OpenSearch Serverless architecture).
- **Use when**: referencing the legacy OpenSearch indexes/mappings and retrieval rules during migration/cleanup.
- **Answers**: “How did the OpenSearch-based RAG store/search content?”

#### `_specs/ingestion-pipeline.md`
- **Use when**: building the ingestion CLI, chunking/embedding, exporting UI content index JSON, and indexing/upserting vectors into Qdrant.
- **Answers**: “How do we turn markdown into searchable chunks + UI artifacts?”
- **Depends on**: `_specs/qdrant-index-design.md` for payload schema, vector dimensions, and indexing rules.

---

### Engineering quality guidelines (apply to all work)

- **Prefer durable fixes over hacks**: address root causes, avoid brittle special-cases, don’t “just make it work” if it creates future traps.
- **Keep changes scoped**: smallest coherent diff that satisfies the spec; avoid unrelated refactors.
- **Maintain consistency**: match existing patterns (Astro/React/Tailwind conventions, naming, file organization).
- **Type safety & validation**: use TypeScript types; validate external inputs/JSON boundaries (especially for planned `/chat` contract).
- **Accessibility & UX**: preserve keyboard UX, focus states, contrast; avoid regressions to the chat flow.
- **Performance & correctness**: avoid unnecessary rerenders, large bundles, and unbounded loops; keep chat UI responsive.
- **Testing/verification**: add/adjust lightweight checks where practical; at minimum, verify against the spec’s acceptance criteria and key user flows.
- **Document decisions**: when making tradeoffs (MVP vs nice-to-have), note it briefly in code comments or the relevant spec.


