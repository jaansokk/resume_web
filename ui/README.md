# Resume Website — Astro + Tailwind

A resume website with chat capability, built with Astro, Tailwind CSS, and React.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:4321` to see the site.

## Local chat API wiring (dev)

The UI defaults to calling **same-origin** `POST /api/chat`.

During local dev, Astro proxies `/api/chat` to the FastAPI service:
- `/api/chat` → `${CHAT_API_PROXY_TARGET:-http://127.0.0.1:8000}/chat`

### `ui/.env`

Create `ui/.env` with:

```bash
# Where Astro should proxy /api/chat during `npm run dev`
CHAT_API_PROXY_TARGET=http://127.0.0.1:8000
```

Notes:
- `CHAT_API_PROXY_TARGET` is **server-side** (Astro dev server), so it does **not** need a `PUBLIC_` prefix.
- You generally do **not** need `PUBLIC_CHAT_API_URL` for local dev anymore (the default `/api/chat` is recommended).

### Common “chat unavailable” cause

If the UI shows a 500 from the chat service, check the FastAPI logs first. A common cause is an **invalid** `OPENAI_API_KEY` in the environment where you run Uvicorn.

## Project Structure

- `/src/pages/` - Astro routes
  - `/` - Home page with hero image and chat entry
  - `/chat` - Split view with related experience and chat
  - `/browse` - Timeline view of all experience
- `/src/components/` - React components for interactive features
- `/src/content/config.ts` - Content collections schema (public)
- `/src/content/experience/` - Experience content (Markdown). This is typically a **symlink** to a sibling private repo.
- `/src/utils/` - Utility functions for keyword matching

## Keeping Markdown content out of the public repo

If you plan to make `resume_web/` public, you can keep the Markdown source in a sibling directory:

- Public repo: `resume_web/`
- Private content: `resume_web_content/ui/src/content/experience/*.md` (and optionally `projects/`, `background/`)

This repo expects `ui/src/content/experience` to be a symlink to:
`../../../../resume_web_content/ui/src/content/experience`

Notes:
- The UI build still renders the content on the website, so **site scraping is still possible**. This only prevents scraping the content via the public git repo.
- If you previously committed Markdown files, removing them now does **not** remove them from git history. To truly purge, you’ll need a history rewrite before going public.

## Features

- **Static-first architecture** - Astro generates static HTML
- **React islands** - Interactive chat components are React islands
- **Content Collections** - Experience entries stored as Markdown files
- **Keyword matching** - Chat messages trigger relevant experience filtering


## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```
