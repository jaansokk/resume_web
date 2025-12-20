# Resume Website — Astro + Tailwind

A resume website with chat capability, built with Astro, Tailwind CSS, and React.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:4321` to see the site.

## Project Structure

- `/src/pages/` - Astro routes
  - `/` - Home page with hero image and chat entry
  - `/chat` - Split view with related experience and chat
  - `/browse` - Timeline view of all experience
- `/src/components/` - React components for interactive features
- `/src/content/experience/` - Content collections (Markdown files)
- `/src/utils/` - Utility functions for keyword matching

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
