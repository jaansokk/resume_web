root/
  ui/                      # Astro + Tailwind + React chat widget (static + islands)
  chat-api-service/        # NEW baseline: long-lived chat API service (orchestrator) behind reverse proxy
  chat-api-lambda/         # DEPRECATED: legacy Lambda handlers (kept during migration/cleanup)
  infra-vps/               # NEW baseline: Lightsail (VM) deploy assets (docker-compose, proxy config, scripts)
  infra/                   # DEPRECATED: legacy Lambda/OpenSearch deployment scripts (kept during migration/cleanup)
  ingest/                  # ingestion CLI: parse markdown -> chunk -> embed -> index/upsert vectors
    exported-content/      # generated artifacts (content graph json, debug dumps, etc.)
  shared/                  # shared types + zod schemas + content model contracts