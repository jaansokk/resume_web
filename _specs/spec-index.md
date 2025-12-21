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

> These docs become relevant once you start building `chat-api-lambda/`, `ingest/`, `infra/`, and `shared/` from `_specs/repo-structure.md`. Until then, only consult them when you’re designing interfaces or preparing the upcoming restructure.

#### `_specs/repo-structure.md`
- **Use when**: creating the monorepo folders, moving code, setting up packages, or wiring boundaries between UI / API / ingest / infra / shared.
- **Answers**: “Where does this code live?” and “How is the repo organized?”

#### `_specs/chat-api-rag-contract.md`
- **Use when**: implementing the `/chat` API, request/response JSON shape, UI directives, retrieval + generation steps, and validation rules.
- **Answers**: “What does the chat API return and how should RAG behave?”
- **Depends on**: `_specs/opensearch-index-design.md` for index fields and retrieval constraints.

#### `_specs/opensearch-index-design.md`
- **Use when**: defining OpenSearch indexes/mappings, embedding dimensions, retrieval rules, and “related items” selection constraints (never surface background in UI).
- **Answers**: “How do we store/search content for RAG safely?”

#### `_specs/ingestion-pipeline.md`
- **Use when**: building the ingestion CLI, chunking/embedding, exporting UI content index JSON, and bulk indexing to OpenSearch.
- **Answers**: “How do we turn markdown into searchable chunks + UI artifacts?”
- **Depends on**: `_specs/opensearch-index-design.md` for mappings/dimensions and indexing rules.

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


