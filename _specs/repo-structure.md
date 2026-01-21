resume_web/                # This repo
  ui/                      # Astro + Tailwind + React chat widget (static + islands)
  chat-api-service/        # NEW baseline: long-lived chat API service (orchestrator) behind reverse proxy
  chat-api-lambda/         # DEPRECATED: legacy Lambda handlers (kept during migration/cleanup)
  infra-vps/               # NEW baseline: Lightsail (VM) deploy assets (docker-compose, proxy config, scripts)
  infra/                   # DEPRECATED: legacy Lambda/OpenSearch deployment scripts (kept during migration/cleanup)
  ingest/                  # ingestion CLI: parse markdown -> chunk -> embed -> index/upsert vectors
    exported-content/      # generated artifacts (content graph json, debug dumps, etc.)
  shared/                  # shared types + zod schemas + content model contracts

resume_web_content/
  ui/src/content/          # Source markdowns for Astro (in resume_web/ui)
  ui/public/               # Private static assets (e.g. CV PDF) synced into resume_web/ui/public at build/dev time