## Runtime architecture (deployment + state)

This doc exists so the **API contract** (`_specs/chat-api-rag-contract.md`) can stay focused on request/response shapes and RAG behavior, while this doc captures the **runtime/infra decisions** (hosting, routing, state storage).

---

## High-level components

- **UI**: public website (serves the v2 flow and the shared conversation view at `/c/{shareId}`).
- **Reverse proxy**: same-origin routing for `/api/*` (avoids CORS).
- **Chat API service**: orchestrates RAG + response JSON for the UI via agent-based pipeline.
- **Vector store**: stores embeddings and content payloads (details in `_specs/qdrant-index-design.md`).
- **Snapshot store (DynamoDB)**: stores immutable share snapshots created via Share modal and CV download tracking.
- **Email notifications (SMTP)**: sends notifications when users provide contact information (conversation shares, CV downloads).

---

## Chat pipeline architecture (agent-based)

The chat service uses a modular agent-based pipeline for request handling:

```
Request → RouterAgent → RetrievalAgent → ResponseAgent → ValidatorAgent → Response
```

**Agents:**
- **RouterAgent**: Analyzes user intent, produces retrieval query and UI recommendations.
- **RetrievalAgent**: Embeds query, searches Qdrant, guards against split view without UI-visible items.
- **ResponseAgent**: Generates assistant response with optional extended thinking.
- **ValidatorAgent**: Sanitizes/validates output, enforces grounding rules, merges artifacts.

**Orchestration:**
- Currently sequential (via `ChatOrchestrator`).
- Designed for future LangGraph migration (agents as graph nodes for parallel execution).

**Extended thinking (optional):**
- See `_specs/thinking-mode.md` for end-to-end behavior and constraints.

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
- `snapshot`: object
  - `conversationId`: string
  - `createdAt`: ISO string
  - `messages`: array (bounded transcript)
  - `ui`: object (e.g., view/tab)
  - `artifacts`: object (Fit Brief + Relevant Experience) — optional, depends on shareType
  - `shareType`: string (`"conversation"` or `"cv_download"`)

Notes:
- Snapshots never expire (no TTL required for MVP).
- If you add “revoke” later, add `revokedAt` and treat revoked snapshots as 404.


- `shareType` distinguishes between conversation shares (full artifacts) and CV downloads (tracking only).

---

## Email notifications (SMTP)

The chat API service sends email notifications when users provide contact information.

### Notification types:
- **Conversation shared**: User provides LinkedIn/email in Share modal
- **CV downloaded**: User provides LinkedIn/email before downloading CV PDF

### Email content:
- Subject line includes notification type and truncated contact info
- Body includes:
  - Contact information (email or LinkedIn URL)
  - Share URL (for conversation shares)
  - Client metadata (IP address, user agent, origin)

### Configuration:
- SMTP settings via environment variables (host, port, credentials, SSL/TLS)
- Email sending is **best-effort** and non-blocking (failures don't prevent share creation)
- Email recipient configured via `CONTACT_TO_EMAIL` environment variable

### Implementation notes:
- Uses standard SMTP with optional SSL/STARTTLS
- Runs in threadpool to avoid blocking the event loop
- Failures are logged but don't affect the API response (200 OK is returned even if email fails)
