## Implementation plan

### Current state
- Static HTML prototypes exist in repo root:
  - `concept-4-stark.html`
  - `concept-5-mono.html`
  - `concept-6-contrast.html`
  - `index.html` links to concepts

### Next steps (recommended order)
1. **Choose a single direction** (base the build on one concept)
2. **Normalize content**
   - Create a single source of truth for experience entries and project highlights (JSON or TS module later)
3. **Improve routing**
   - Home → Split view → Browse mode
   - Ensure “Browse” works without any chat interaction
4. **Refine classification**
   - From keyword regex → lightweight intent router (still deterministic if desired)
5. **Astro + Tailwind migration (later)**
   - Pages: `index` (home), `browse`, `chat` (split)
   - Shared components: ChatWidget, ExperiencePanel, ExperienceCard

### Acceptance criteria (for next milestone)
- Visitor can:
  - Land on a dark home screen with photo background + PM/PO positioning + chat input
  - Click “Browse” and see experience/projects without chatting
  - Type a message and see split view with:
    - Chat on right
    - Relevant experience on left based on classification/routing
  - Receive follow-ups and email capture within 2–3 assistant responses


