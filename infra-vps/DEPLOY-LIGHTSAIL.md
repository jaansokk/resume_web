# Deploy `chat-api-service` to AWS Lightsail (VM baseline)

Baseline target: **one Lightsail Ubuntu instance** running Docker Compose (`infra-vps/docker-compose.yml`).

## 0) Decide your domain strategy (needed for TLS)

Pick one:

- **Same domain (recommended by specs)**: `https://<domain>/api/*` proxies to the API container
  - Example: `https://jaan.example.com/api/chat`
- **No custom domain**: use the **Lightsail public hostname** (typically like `https://<name>.<region>.cs.amazonlightsail.com/api/chat`)
  - This works fine if you “don’t care” about the domain, but still want **HTTPS**
- **Dedicated API subdomain**: `https://api.<domain>/chat` (UI can use `PUBLIC_CHAT_API_BASE_URL`)
  - You *can* do this, but same-origin is simplest (no CORS headaches).

This stack assumes **same-origin** routing on `/api/*`.

Important TLS note:
- Public certificate issuers (incl. Let's Encrypt) generally **do not issue certs for bare IP addresses**.
- So if you want `https://...`, you need a **hostname** (custom domain or Lightsail hostname).

## 1) Ensure the `cli` AWS identity can manage Lightsail

From your laptop (as the `cli` AWS identity), run:

```bash
chmod +x infra-vps/scripts/check-aws-access.sh
./infra-vps/scripts/check-aws-access.sh
```

If you see `AccessDenied`, attach the policy:
- `infra-vps/iam/lightsail-deploy-policy.json`

> If you want the `cli` user to also be able to *inspect its own attached IAM policies* via CLI, you’d additionally need IAM permissions like `iam:GetUser` and `iam:ListAttachedUserPolicies`. I did **not** include those by default; the check script probes real Lightsail APIs instead.

## 2) Provision the instance

### Option A: AWS CLI (repeatable)

```bash
chmod +x infra-vps/scripts/provision-lightsail.sh

# Example (change region to yours):
AWS_REGION=eu-west-1 \
INSTANCE_NAME=resume-web \
./infra-vps/scripts/provision-lightsail.sh
```

Then fetch the public/static IP:

```bash
aws lightsail get-static-ips --region eu-west-1 --output table
```

### Option B: AWS Console (often faster)

In Lightsail:
- Create instance (Ubuntu)
- Networking: open **80**, **443**, **22**
- Create and attach a **Static IP**

## 3) DNS (console step in most setups)

You must point your domain to the instance static IP:

- Create an `A` record:
  - `@` → `<static-ip>` (for apex) or
  - `jaan` → `<static-ip>` (for subdomain `jaan.example.com`)

This is usually done in **Route53** or **Lightsail DNS**.

## 4) Bootstrap the instance (SSH + Docker)

SSH into the instance (Lightsail console has a web SSH, or use your key).

On the instance:

```bash
sudo apt-get update -y
sudo apt-get install -y git
git clone <your-repo-url>
cd resume_web

chmod +x infra-vps/scripts/bootstrap-ubuntu-docker.sh
./infra-vps/scripts/bootstrap-ubuntu-docker.sh
```

Log out/in (or reboot) if `docker` group permissions don’t apply yet.

## 5) Configure secrets + run the stack

On the instance:

```bash
cd resume_web
cp infra-vps/.env.example infra-vps/.env
nano infra-vps/.env

cd infra-vps
docker compose up -d --build
docker compose logs -f --tail=200
```

For your case (UI + API on the same host):
- Set `DOMAIN=jaan.sokkphoto.com`
- Create DNS `A` record `jaan` → `<lightsail-static-ip>` at zone.eu

## 6) Validate

Once DNS is propagated and containers are up:

- `https://<domain>/api/healthz` should return `{"status":"ok"}`

If TLS fails:
- confirm ports 80/443 are open in Lightsail networking
- confirm DNS A record points to the correct static IP
- check Caddy logs: `docker compose logs -f caddy`

## 7) Populate Qdrant (required for real RAG answers)

If you deploy before running ingestion, Qdrant will be empty. The API now auto-creates
collections so it won't crash, but results will be generic until you index content.

Recommended approach: **SSH tunnel** into Qdrant (Qdrant ports are bound to `127.0.0.1` on the VM).

1) From your laptop, open a tunnel:

```bash
ssh -L 6333:127.0.0.1:6333 ubuntu@jaan.sokkphoto.com
```

2) In another terminal on your laptop, run ingestion against the tunnel:

```bash
cd /path/to/resume_web
export QDRANT_URL=http://127.0.0.1:6333
export OPENAI_API_KEY=...   # required for embeddings

npm run ingest:all
```

This will create collections (if needed) and upsert items/chunks into:
- `content_items_v1`
- `content_chunks_v1`

## 8) Enable Share (DynamoDB)

Share requires DynamoDB access from the API container.

### A) Create the DynamoDB table (once)

Create `conversation_share_snapshots_v1` with:
- partition key: `shareId` (string)

You can do this via console or CLI.

### B) Create AWS credentials for runtime access

Lightsail instances don't have an EC2 instance role by default, so the simplest approach is:
- create an IAM user (or access keys for an existing deploy user) with DynamoDB permissions
- store `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `infra-vps/.env` on the server

Minimal policy template is in:
- `infra-vps/iam/dynamodb-share-runtime-policy.json`

### C) Configure env on the server

In `infra-vps/.env`:
- `AWS_REGION=eu-central-1`
- `AWS_ACCESS_KEY_ID=...`
- `AWS_SECRET_ACCESS_KEY=...`
- `DDB_TABLE_SHARE_SNAPSHOTS=conversation_share_snapshots_v1`

Then rebuild:

```bash
cd ~/resume_web/infra-vps
docker compose up -d --build
```


