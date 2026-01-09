# Deploy `chat-api-service` to AWS Lightsail (VM baseline)

Baseline target: **one Lightsail Ubuntu instance** running Docker Compose (`infra-vps/docker-compose.yml`).

## 0) Decide your domain strategy (needed for TLS)

Pick one:

- **Same domain (recommended by specs)**: `https://<domain>/api/*` proxies to the API container
  - Example: `https://jaan.example.com/api/chat`
- **Dedicated API subdomain**: `https://api.<domain>/chat` (UI can use `PUBLIC_CHAT_API_BASE_URL`)
  - You *can* do this, but same-origin is simplest (no CORS headaches).

This stack assumes **same-origin** routing on `/api/*`.

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

## 6) Validate

Once DNS is propagated and containers are up:

- `https://<domain>/api/healthz` should return `{"status":"ok"}`

If TLS fails:
- confirm ports 80/443 are open in Lightsail networking
- confirm DNS A record points to the correct static IP
- check Caddy logs: `docker compose logs -f caddy`


