root/
  ui/                      # Astro + Tailwind + React chat widget (static + islands)
  chat-api-lambda/         # Lambda handlers: /chat, /lead, shared middleware
  infra/                   # CDK (or Terraform) for OpenSearch, API GW, Lambda, IAM, S3/CF (optional)
  ingest/                  # ingestion CLI: parse markdown -> chunk -> embed -> bulk index
    exported-content/      # generated artifacts (content graph json, debug dumps, etc.)
  shared/                  # shared types + zod schemas + content model contracts