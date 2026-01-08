## Chat flow & conversation policy (v2)

**Source of truth for the user journey**: `_specs/user-flow-v2.md`.

This doc defines:
- conversational stages
- server-driven UI transitions (`ui.view`, tab focus)
- policies that keep the experience premium and grounded (no hallucinations)

---

## Core principles

- **Short, surgical turns**: ask only what’s needed to assemble a high-signal brief.
- **One strong action per state**: don’t clutter the initial screen.
- **Grounded outputs**: experience claims should be supported by retrieved text; when uncertain, ask or omit.
- **Server-driven UI**: the backend decides when to switch to split view and which tab is focused.

---

## Conversation stages

### Stage 0: Entry (Handshake)
**UI**: handshake layout (but it’s the same conversation as chat).

**Assistant opening line**
“Hey — I’m Jaan. What kind of product are you building?”

**User input options**
- Quick replies (role intent)
- Freeform message

**Server directive**
- `ui.view = "chat"` (handshake is treated as chat with a special layout)

### Stage 1: Clarify (Chat)
**Goal**: in 1–3 turns, capture enough context to:
- decide whether to transition to split view
- start producing an initial Fit Brief and Relevant Experience scaffold

**Assistant behavior**
- Ask 1–2 clarifying questions max per turn.
- Prefer concrete details:
  - product type (B2B/consumer/platform)
  - maturity (new vs existing)
  - team size / constraints
  - what “good” looks like / success metric

**Chips**
- Chips are **LLM-generated** (not hardcoded).
- Default: server returns suggested chips for speed; user can always free-type.
- If the assistant intentionally wants an open-ended answer, the server may return **no chips** (LLM-driven decision).

### Stage 2: Workspace (Split view)
**When to enter**
- LLM/server decides there is enough context to start producing meaningful artifacts.
- It can happen immediately after the first user message, or after a few turns (not deterministic).

**Server directive**
- `ui.view = "split"`
- `ui.split.activeTab = "brief" | "experience"` (LLM can recommend focus each turn)

**Assistant behavior (right chat panel)**
- Keep prompts “two quick checks…” style: verify high-impact unknowns, prevent hallucinations.
- If user context changes materially, acknowledge and update the artifacts.

**Artifact updates (left workspace)**
- Fit Brief and Relevant Experience can update after each turn.
- The assistant may:
  - add new sections
  - refine/shorten existing content
  - omit sections if confidence/evidence is insufficient

---

## Tab focus policy (LLM-driven)

The assistant may recommend focusing the left panel on:
- **Fit Brief** when summarizing inferred needs / risks / plan.
- **Relevant Experience** when the user asks “have you done this before?” or when evidence is more persuasive than inference.

Rules:
- The UI always renders both tabs.
- The user can always switch tabs manually.
- The server returns a suggestion hint (e.g., `hints.suggestTab = "brief" | "experience"`) so the UI can highlight a tab without auto-switching.
- The client should include the current active tab in the request context (so the model can be tactful and consistent).

---

## Grounding & non-hallucination rules

### Fit Brief
- It is allowed to be partially inferred, but:
  - do not invent company-specific facts
  - do not claim you’ve done something unless it is supported by retrieved experience/project text
- Sections can be omitted if not confident.

### Relevant Experience
- Must be grounded in retrieved content.
- Prefer quoting/deriving metrics and outcomes from the corpus.
- If evidence is weak:
  - ask a clarifying question to improve retrieval, OR
  - omit the claim rather than “best-guessing”.

---

## Share flow (UI-initiated, LLM may suggest)

The Share modal opens only when the **user clicks “Share”** (the assistant never clicks it).

The assistant may *suggest* sharing by returning a response hint (e.g., `suggestShare: true`) so the UI can subtly draw attention to the Share button.

When Share is initiated:
- UI collects LinkedIn OR email (required to unlock share actions).
- Server creates an immutable share snapshot and returns `shareId`.
- UI shows a permalink: `/c/{shareId}`.
- Share actions should operate on the **workspace snapshot** (both artifacts), not just the currently active tab:
  - Copy link points to a snapshot containing Fit Brief + Relevant Experience.
  - Download PDF generates a PDF that includes Fit Brief + Relevant Experience.

Shared link behavior:
- Read-only snapshot.
- Continuing chat from a shared view creates a fork (new conversation).


