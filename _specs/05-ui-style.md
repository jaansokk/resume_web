## UI style (v2 direction)

### Design constraints (must)
- **Dark UI**: light text on dark
- **Sans only** (no serif)
- **Square buttons**: no rounded corners (inputs can be slightly rounded only if you want; otherwise keep square everywhere)
- Clean neutral design, one accent color max

### Recommended palette (example)
- Background: `#000000`–`#0B0B0B`
- Surface: `#111111`–`#161616`
- Border: `#222222`–`#2A2A2A`
- Text: `#FFFFFF`
- Secondary text: `#B0B0B0`
- Muted text: `#666666`
- Accent (pick one): `#FFCC00` (or `#22C55E` or `#FF4D00`)

### Typography
- Use one sans family site-wide (variable weights preferred)
  - Suggestions: Manrope, Inter, Archivo, Plus Jakarta Sans
- Hierarchy:
  - H1: 48–64px, 700–800 weight
  - Body: 16–18px, 400–500
  - UI labels: 11–12px uppercase w/ letter-spacing

### Layout rules
- Home hero: full-bleed photo with strong gradient overlay for readability
- Chat box: aligned to a clear column; avoid rounded corners; keep borders crisp
- Split view: left = relevant experience, right = chat
- Always keep a visible “Browse” path (nav item or link)

### Interaction notes
- Hover: border changes + subtle translate; no soft “material” shadows
- Focus: strong focus ring using accent color
- Motion: short (200–400ms), optional reduced motion support later


