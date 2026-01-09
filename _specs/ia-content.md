## Information architecture & content (v2)

**Source of truth for the user journey**: `_specs/user-flow-v2.md`.

This doc defines **what exists** (views/states, artifacts, share objects) and **what is visible**. It avoids implementation details (frameworks, hosting, vector DB internals).

---

## Global header navigation (consistent across views)

The product has a **single, consistent header** across all views/routes.

### Brand (left side)
- **"Jaan Sokk"** — non-clickable branding (no home link).
- A separate "Start Over" action will be added later for explicit conversation reset.

### Main menu links (right side)

**Conditional "resume experience" link (first link in menu, always visible):**
- **If the user has reached Split view** at least once (stored in `localStorage`), show: **"Fit Brief & Experience"**
- **Else**, show: **"Chat"**
- Links to **`/`** (main experience route).
- Useful for returning to main experience from `/cv` or `/contact`.

**Base links (always visible, following the conditional link):**
- **CV** — links to `/cv`
- **LinkedIn** — external link
- **Contact** — links to `/contact`

**Notes**
- Split view takes precedence over Chat because it's the more advanced state.
- The conditional link is placed first so the positioning of **CV / LinkedIn / Contact** remains unchanged.
- **State persistence**: Conversation state (messages, artifacts, viewMode, hasSeenSplit) is stored in `localStorage` and persists across tabs, page reloads, and browser sessions.
- **Auto-restore**: On mount at any route, the app checks `localStorage` and restores the last conversation state if present.

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
Share applies to the **workspace** (both artifacts), not to a single active tab.

### Step 1: Capture contact (required to proceed)
Capture **LinkedIn OR email**.

**Gating**
- User may close the modal at any time.
- Share actions (copy link / download PDF) are disabled until contact is provided.

### Step 2: Share actions
When contact is provided, the system creates an **immutable share snapshot** and reveals:
- **Copy link**: permalink to the shared conversation at `/c/{shareId}`.
  - The snapshot includes **messages + rendered Fit Brief + rendered Relevant Experience** (independent of which tab is active).
- **Download PDF**: generates a PDF artifact from the same share snapshot.
  - PDF includes **Fit Brief + Relevant Experience**.

**Immutability + forking**
- Share links never expire.
- Shared view is a snapshot (no writebacks).
- If someone continues chatting from a shared link, it creates a **new conversation** (“fork”) with a new `conversationId`.
- The fork does **not** inherit the captured LinkedIn/email.

---

## Routes (user-facing)

The product uses **real routes** (not URL params) for clean navigation and browser back/forward support.

### Primary routes
- **`/`** — Main experience (Handshake → Chat → Split)
  - Auto-restores conversation state from `localStorage` on mount
  - If no saved state exists, shows Handshake (fresh conversation)
- **`/cv`** — CV page (separate route, static or React-based)
- **`/contact`** — Contact page (separate route, form with LinkedIn/email capture)
- **`/c/{shareId}`** — Shared conversation snapshot (immutable, read-only or fork)

### Navigation behavior
- All routes share the same global header.
- Browser back/forward buttons work naturally.
- No URL params needed for view state (`?resume=1`, `?view=contact` are removed).
- Conversation state persists across route changes via `localStorage`.


