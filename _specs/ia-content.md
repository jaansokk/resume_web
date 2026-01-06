## Information architecture & content (v2)

**Source of truth for the user journey**: `_specs/user-flow-v2.md`.

This doc defines **what exists** (views/states, artifacts, share objects) and **what is visible**. It avoids implementation details (frameworks, hosting, vector DB internals).

---

## Primary experience (single flow, in-place transforms)

This product is a **single, self-contained flow**. No floating widget on other pages.

The UI transforms in-place:

1) **Handshake** (initial state)
2) **Chat** (expanded single-column)
3) **Split view** (chat + artifact workspace)

There is no “browse mode” as a separate experience in this v2.
Browsing happens via:
- **CV link** in the header (PDF download initially; may become web CV later)
- **Relevant Experience tab** in split view (LLM/RAG-driven content, visible alongside chat)

---

## Views / states

### A) Handshake (initial)
**Purpose**: one strong action; zero clutter.

**Visible**
- Opening prompt: “Hey — I’m Jaan. What kind of product are you building?”
- Supporting subline: “In 60 seconds we’ll produce a fit brief you can forward internally to your team.”
- Quick replies (large buttons)
- Optional freeform input
- Header: name + links (CV / LinkedIn / Contact)

**Notes**
- Handshake is an initial presentation of the same conversation. It can be modeled as `ui.view="chat"` with special UI layout.

### B) Chat (expanded)
**Purpose**: 2–4 short turns to gather constraints and intent.

**Visible**
- Chat transcript (short, surgical)
- Suggested chips (prewritten) + freeform message box

**Not visible**
- No artifact workspace yet.

### C) Split view (workspace)
**Purpose**: generate a shareable “fit brief” and evidence-backed experience highlights while the chat continues.

**Layout**
- Right: chat
- Left: tabbed workspace (always 2 tabs)
  - **Fit Brief**
  - **Relevant Experience**

**Tab focus**
- The assistant may recommend a focus (Fit Brief vs Relevant Experience) per turn.
- The user can always switch tabs manually.

---

## Artifacts (left workspace)

### 1) Fit Brief (structured artifact)
**Concept**: a living doc (Canvas-like) that can update after each user turn.

**Sections (initial template)**
The assistant may omit sections when confidence/evidence is insufficient (do not hallucinate).

- What I think you need
- Where I’ve done this before
- Risks I’d watch
- First 30/60/90 days
- Questions I’d ask in interview

**UI behavior**
- Sections can appear progressively.
- Updates may be displayed with subtle “updating” affordance (implementation detail; not required in spec).

### 2) Relevant Experience (evidence workspace)
**Concept**: RAG-driven, grouped highlights that relate to the role/product described in chat.

**Shape**
- Grouped sections (not just a flat list), e.g.:
  - “Most relevant”
  - “Also relevant”
  - “If you’re hiring for X…”

Within each section:
- Items (experience/project) with:
  - title/company/role/period (if applicable)
  - 2–4 grounded bullets (metrics/achievements)
  - optional “why this is relevant” line

**Grounding**
- Content should be supported by retrieved text from the corpus.
- If evidence is weak, the assistant should ask clarifying questions or omit claims.

---

## Share flow (modal, 2-step)

Share is **optional** and initiated by the user (e.g., clicking “Share” in split view).

### Step 1: Capture contact (required to proceed)
Capture **LinkedIn OR email**.

**Gating**
- User may close the modal at any time.
- Share actions (copy link / download PDF) are disabled until contact is provided.

### Step 2: Share actions
When contact is provided, the system creates an **immutable share snapshot** and reveals:
- **Copy link**: permalink to the shared conversation at `/c/{shareId}`
- **Download PDF**: optional (planned)

**Immutability + forking**
- Share links never expire.
- Shared view is a snapshot (no writebacks).
- If someone continues chatting from a shared link, it creates a **new conversation** (“fork”) with a new `conversationId`.
- The fork does **not** inherit the captured LinkedIn/email.

---

## Routes (user-facing)

Minimum routes implied by the product:
- Primary v2 route (exact path can change during implementation)
- Shared conversation route: `/c/{shareId}`


