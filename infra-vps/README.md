# infra-vps (Lightsail VM deployment)

This folder contains the **baseline production deployment** for `resume_web` on a **single AWS Lightsail instance**:

- **Caddy**: TLS termination + reverse proxy for `/api/*` (same-origin)
- **UI**: Astro static build served by Caddy (`/`)
- **chat-api-service**: FastAPI app (`/chat`, `/contact`, `/healthz`)
- **Qdrant**: vector DB (private on the Docker network)

The UI expects:
- `POST /api/chat` (same-origin) → proxied to the API container `/chat`
- `POST /api/contact` (same-origin) → proxied to the API container `/contact`

## What you need from the AWS console (one-time)

You’ll likely need to do some of these in the console depending on your setup:

- **Domain DNS**: create an `A` record pointing to the instance static IP (Lightsail DNS or Route53)
- **Open ports**: allow inbound **80/443** (and **22** for SSH)
- (Optional) **Static IP**: allocate + attach a static IP

If you tell me your desired domain (e.g. `jaan.example.com`) and whether you use **Lightsail DNS** or **Route53**, I can tailor the exact steps/commands.

## Files

- `docker-compose.yml`: production stack
- `Caddyfile`: reverse proxy rules for `/api/*`
- `caddy/Dockerfile`: builds the UI and bakes it into the Caddy image
- `.env.example`: environment variables to copy into `.env`
- `iam/lightsail-deploy-policy.json`: minimal policy for a deploy IAM user
- `scripts/`: CLI helpers (permission check + provisioning skeleton)

## Deploy flow (high-level)

1. Create a Lightsail instance (Ubuntu).
2. SSH into the instance and install Docker + Compose (see `scripts/bootstrap-ubuntu-docker.sh`).
3. Get the code onto the instance:
   - clone **this repo** (`resume_web`)
   - clone the **content repo** (`resume_web_content`) *next to it* (same parent folder)
4. Create `infra-vps/.env` with secrets (copy from `.env.example`).
5. Start the stack:

```bash
cd infra-vps
docker compose up -d --build
```

## Health check

After deploy:

- `GET https://<domain>/api/healthz` → `{"status":"ok"}`

## Minimal instance steps (copy/paste friendly)

On your laptop (AWS CLI, as `cli` user), create instance + open ports:

```bash
# Example:
# AWS_REGION=eu-west-1 INSTANCE_NAME=resume-web ./infra-vps/scripts/provision-lightsail.sh
```

On the instance (SSH):

```bash
# Install Docker/Compose (Ubuntu)
chmod +x infra-vps/scripts/bootstrap-ubuntu-docker.sh
./infra-vps/scripts/bootstrap-ubuntu-docker.sh

# Configure env
cp infra-vps/.env.example infra-vps/.env
nano infra-vps/.env

# Run
cd infra-vps
docker compose up -d --build
docker compose ps
```


