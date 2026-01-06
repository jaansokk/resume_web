## Specs index (v2)

This repo has multiple specs. **Start here.**

Goal: include the **minimum necessary** spec(s) based on the task. If anything conflicts, defer to:
- `_specs/user-flow-v2.md` (product/UX flow source of truth)
- the relevant API contract (`_specs/chat-api-rag-contract.md`) for request/response shapes

---

## Selection rule (how to pick specs)

- Identify what you’re changing: **UX flow**, **UI**, **chat API**, **RAG**, **ingestion/content**, or **runtime/infra**.
- Pull **only** the specs listed for that category (plus any explicitly listed dependencies).
- Don’t load archived specs unless you’re doing migration/cleanup archaeology.

---

## v2 UX / UI (primary flow)

Use these when working on the v2 experience (handshake → chat → split view → share):

- `_specs/user-flow-v2.md`
  - **Use when**: anything about the user journey or what appears on each screen.
  - **Answers**: “What is the v2 flow and what should it feel like?”

- `_specs/ia-content.md`
  - **Use when**: information architecture, artifacts (Fit Brief / Relevant Experience), share semantics, routes like `/c/{shareId}`.
  - **Answers**: “What exists and what’s visible?”

- `_specs/chat-flow.md`
  - **Use when**: conversational stages, chip behavior, server-driven UI transitions, tab focus policy, share suggestion behavior.
  - **Answers**: “How should the conversation evolve and drive the UI?”

---

## Chat API + artifacts (contract)

Use these when implementing/changing `/api/chat` and artifact generation:

- `_specs/chat-api-rag-contract.md`
  - **Use when**: request/response JSON (including `ui.view`, `activeTab`, `chips`, `hints.suggestShare`) and artifact shapes.
  - **Answers**: “What does the API return and what must be validated?”
  - **Depends on**: `_specs/qdrant-index-design.md` for payload/schema rules.

---

## Retrieval schema + ingestion (content → RAG)

Use these when adjusting what gets stored, retrieved, and how content is authored/chunked:

- `_specs/qdrant-index-design.md`
  - **Use when**: collection payload schema (metadata + chunks) and retrieval constraints (e.g., background never becomes UI-visible experience).
  - **Answers**: “What fields exist in the vector store and what are the retrieval rules?”

- `_specs/ingestion-pipeline.md`
  - **Use when**: markdown frontmatter expectations, chunking strategy, what gets embedded, and how to improve proof-sheet style retrieval.
  - **Answers**: “How do we turn markdown into chunks + metadata for RAG?”

---

## Runtime / infra (deployment + state)

Use these when changing deployment, routing, or persisted state:

- `_specs/runtime-architecture.md`
  - **Use when**: reverse proxy routing, deployment topology, and share snapshot storage (DynamoDB).
  - **Answers**: “Where does state live and how is traffic routed?”

- `_specs/repo-structure.md`
  - **Use when**: repo layout boundaries (ui vs api vs ingest vs infra vs shared).
  - **Answers**: “Where does this code live?”

---

## Archived / legacy specs (do not include by default)

Archived specs live under `_specs/_archive/`:
- Legacy v1 product/UI docs (`01-05`)
- Legacy OpenSearch design (`opensearch-index-design.md`)

Only use these if explicitly asked to reference or migrate legacy behavior.


