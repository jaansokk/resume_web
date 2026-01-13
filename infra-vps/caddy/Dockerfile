# Multi-stage: build UI (Astro) -> serve via Caddy + proxy /api/* to FastAPI

FROM node:20-alpine AS ui_build
WORKDIR /app

# Accept build-time environment variables for PostHog
ARG PUBLIC_POSTHOG_KEY
ARG PUBLIC_POSTHOG_HOST
ENV PUBLIC_POSTHOG_KEY=${PUBLIC_POSTHOG_KEY}
ENV PUBLIC_POSTHOG_HOST=${PUBLIC_POSTHOG_HOST}

# UI build (Astro) lives in resume_web/ui, but content markdown lives
# in the separate repo resume_web_content/ui/src/content.
#
# This Dockerfile is built with context that includes BOTH repos
# (see infra-vps/docker-compose.yml).

COPY resume_web/ui/package.json resume_web/ui/package-lock.json /app/ui/
RUN cd /app/ui && npm ci

# Copy UI source (includes src/content/config.ts)
COPY resume_web/ui /app/ui

# In this repo, local dev uses symlinks under ui/src/content/* -> resume_web_content.
# Docker can't "merge" a directory on top of an existing symlink path, so remove them
# and replace with real directories from the content repo.
RUN rm -f /app/ui/src/content/background /app/ui/src/content/experience

# Copy markdown content from the content repo
COPY resume_web_content/ui/src/content/background /app/ui/src/content/background
COPY resume_web_content/ui/src/content/experience /app/ui/src/content/experience

RUN cd /app/ui && npm run build


FROM caddy:2.8

# UI static output (Astro build)
COPY --from=ui_build /app/ui/dist /srv/ui

# Caddy config (uses DOMAIN + ACME_EMAIL env vars)
COPY resume_web/infra-vps/Caddyfile /etc/caddy/Caddyfile


