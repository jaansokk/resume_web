# Multi-stage: build UI (Astro) -> serve via Caddy + proxy /api/* to FastAPI

FROM node:20-alpine AS ui_build
WORKDIR /app

COPY ui/package.json ui/package-lock.json /app/ui/
RUN cd /app/ui && npm ci

COPY ui /app/ui
RUN cd /app/ui && npm run build


FROM caddy:2.8

# UI static output (Astro build)
COPY --from=ui_build /app/ui/dist /srv/ui

# Caddy config (uses DOMAIN + ACME_EMAIL env vars)
COPY infra-vps/Caddyfile /etc/caddy/Caddyfile


