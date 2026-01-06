## Runtime architecture (deployment + state)

This doc exists so the **API contract** (`_specs/chat-api-rag-contract.md`) can stay focused on request/response shapes and RAG behavior, while this doc captures the **runtime/infra decisions** (hosting, routing, state storage).

---

## High-level components

- **UI**: public website (serves the v2 flow and the shared conversation view at `/c/{shareId}`).
- **Reverse proxy**: same-origin routing for `/api/*` (avoids CORS).
- **Chat API service**: orchestrates RAG + response JSON for the UI.
- **Vector store**: stores embeddings and content payloads (details in `_specs/qdrant-index-design.md`).
- **Snapshot store (DynamoDB)**: stores immutable share snapshots created via Share modal.

---

## Networking / routing (conceptual)

Recommended:
- Serve UI and `/api/*` from the **same domain**.
- Route `POST /api/chat` to the chat service’s internal `/chat`.
- Route share endpoints similarly (see below).

---

## Conversation state model

### Live conversation (not persisted server-side in MVP by default)
- The UI holds recent `messages[]` and sends them with each `POST /api/chat`.
- The server is stateless with respect to live chat (client-managed memory).

### Share snapshot (persisted, immutable)
Share snapshots are created **only** when the user initiates Share and provides LinkedIn/email.

- **Public URL**: `/c/{shareId}`
- **Never expires**
- **Read-only**
- **No writebacks**

Forking:
- If someone chats from `/c/{shareId}`, the UI starts a new conversation ID and calls `/api/chat` normally.
- The fork does **not** inherit the LinkedIn/email captured during share creation.

---

## DynamoDB share snapshot storage (MVP)

Store **rendered artifacts only** (not raw retrieval citations).

### Table: `conversation_share_snapshots_v1` (suggested)

Partition key:
- `shareId` (opaque, guess-resistant string)

Attributes (suggested):
- `shareId`: string
- `createdAt`: ISO string
- `createdByContact`: string (LinkedIn URL or email)
- `conversation`: object
  - `messages`: array (bounded transcript)
  - `ui`: object (e.g., view/tab)
  - `artifacts`: object (Fit Brief + Relevant Experience)

Notes:
- Snapshots never expire (no TTL required for MVP).
- If you add “revoke” later, add `revokedAt` and treat revoked snapshots as 404.


