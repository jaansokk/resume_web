## ARCHIVED
Archived during v2 spec consolidation. Active v2 IA lives in:
- `_specs/user-flow-v2.md`
- `_specs/ia-content.md`
- `_specs/chat-flow.md`

---

## Requirements

### Must-haves (MVP)
- **Home screen**
  - Full-bleed background photo (use `20221211-SBW_0367.jpg` for now)
  - Positioning copy (PM/PO oriented) + prompt (“What do you have in mind today?”)
  - **Chat input**
  - **Browse** entry (“Browse my experience & past projects”)
- **Split response screen**
  - Layout splits into 2 panels:
    - Left: related experience/projects.
    - Right: chat (continues conversation)

  
- **Every prompt classification**
  - Classify the incoming user message as:
    - **New opportunity** (job/role/hiring/project engagement)
    - **General talk** (everything else)
  - The classification influences what appears on the left panel. 
  If classified as New Opportunity, the split response screen opens.
  If General Talk, single col chat view opens. In General Talk, reclassification should be done with each prompt.

- **Follow-up flow**
  - Around the **2nd–3rd assistant response**:
    - Ask: “Do you want to see more examples of my past experience that would relate to this?”
  - Then:
    - Ask: “Can I get your LinkedIn profile? … so we can continue the conversation.”

- **Style**
  - **Dark UI** (light text on dark)
  - **Sans fonts**
  - **Prefer no rounded corners on buttons** (square/straight edges)


