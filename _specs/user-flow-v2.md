I am building a resume website. The role I am looking for should be in a forward thinking, possibly growth stage company that is eager to utilize AI, has a good agile culture, and empowers product teams. No politics, the flatter the org, the better. Role: product manager, PO, even product engineer / AI engineer.I have built a chat driven resume site, but am thinking the UX might be a bit on the boring side currently.
See the attached screenshots and some specs docs. These specs just reflect the current state, not the new expected UX/UI.

**What am I looking to improve?**
It currently may strike as "ok, some cool LLM tech has been used here, possibly RAG too..."
What I want it to strike as for recruiters and hiring managers:
- this looks and feels sooo good! I would want a resume site like this!
- smth to resemble when Steve Jobs presented the first iPhone. No-one knew they wanted one before (there were big screen phones already), but they did want one when they saw the iPhone.

### Where am I posting the link?
I will be adding it to a linkedin post, it will be available publicly.Goal: gather leads/connections that are discussing hiring internally, but may not have posted a job ad yet.

## The task
- create 2 design concepts for this new user flow.
- treat any existing code / design as "current", can be redone if it makes sense according to this spec doc.
- create temporary routes for these design concepts. there is a React setup under /ui already, so you can use that.

---

## New UI (v2)
This should be the user flow of the new version

### Screen 1: “Handshake” (chat-first, but zero clutter)
**Visible elements**
- Centered chat bubble (not a full chat window yet) with a single opening line:**“Hey — I’m Jaan. What kind of product are you building?”**
- Subline, fades in, smaller: “In 60 seconds we'll produce a fit brief you can forward internally to your team.”
- Under it: 4 big quick-reply buttons (square):
	1. “Hiring for Product / PO”
	2. “Hiring for Product Engineer / AI Engineer”
	3. “Just browsing”
	4. “Something else”
    
### Screen 2: First Interaction
- User clicks a button on Screen 1 → the interface expands into full chat.
- Still single column.
- "Got it, what kind of product are you lookin a PO for?"
- 3-4 prewritten chips to answer (LLM driven) + freeform message box.

### Screen 3: Live brief generation (split screen) 
After 2-4 messages the view transforms (not a route) into a split screen.
Right: chat
Left, tabs for: Fit Brief   ||    Relevant expereience 

**Left side Fit Brief (auto-assembling in real time based on chat)**
Sections animate in one by one (first display):
- “What I think you need” (inferred)
- “Where I’ve done this before” (3 matching proofs)
- “Risks I’d watch” (shows judgment)
- “First 30/60/90 days” (instant credibility)
- “Questions I’d ask in interview” (power move)
**Button: "Share"**
- Share button sits in the same row as the tabs, **aligned right** (to the right of “Fit Brief / Relevant Experience”).
- Share is **not specific to a single tab**; it shares/exports the workspace (both artifacts).
Opens modal with 2 steps
- Great! Let's swap LinkedIn's to stay in touch!Single line input field.
- Buttons:
  - Copy link to this conversation (creates a share snapshot at `/c/{shareId}` that includes both artifacts)
  - Download PDF (generated from the same snapshot; PDF includes **Fit Brief + Relevant Experience**)
**Right: chat: **
chat is short, surgical
- “Two quick checks so I don’t hallucinate the fit: …”
- User answers → artifact updates instantly (like a live doc, typing animation)

**Tab focus (LLM-driven)**
- Split view always has both tabs (Fit Brief + Relevant Experience).
- The AI can recommend focusing the user on one tab per turn (e.g., start on Relevant Experience when evidence is the best persuasion).
- The user can always switch tabs manually.

**Share link semantics**
- The shareable link is created **only on request** (via the Share modal).
- The link points to a public route: `/c/{shareId}`.
- The shared view is an **immutable snapshot** (no writebacks).
- If someone continues chatting from a shared view, it creates a **new conversation (fork)** with a new conversation ID.

---

### Aesthetic + interaction notes to get that “premium reveal” feel
These are the small choices that make it feel “designed,” not “assembled”:
- **One strong action per screen.** Avoid “nav + sections + chat + buttons” all at once.
- **Motion with purpose:** transitions that *reframe* the interface (handshake/first screen → chat → artifact).
- **Typography hierarchy that’s ruthless:** giant headline, tiny supporting line, no mid-sized mush.
- **Evidence as cards/sheets, not paragraphs:** every claim links to a proof “sheet” with outcomes + constraints + your role.


---

### Styling guideline

- Overall vibe: premium Apple-like product page + “operator UI” (calm, confident, zero clutter). Designed-first, AI-second.
- Theme: near-black monochrome with subtle depth (no “gamer neon”). Background should feel like matte glass / studio black.

Palette:
- Base: true monochrome (black → charcoal → graphite), high contrast for primary text.
- Accent: one restrained teal, if anything non-neutral needed at all (used sparingly, or focus/active states, links, progress highlights, and “artifact is updating” moments).

Buttons: Pill, rounded ends

No-go list: neon gradients, heavy glows, busy backgrounds, too many accent colors, “terminal hacker” aesthetic, emoji-heavy UI.

Imagery: keep the background image on first screen, as currently. can reposition and make slightly more visible if needed.