#!/usr/bin/env bash
# Local dev helper for the n8n Telegram Job-Fit Bot.
# Usage: ./n8n/dev.sh [tunnel|n8n|ngrok|both]
#
# Prerequisites:
#   - Docker installed
#   - SSH access to jaan.sokkphoto.com
#   - Telegram bot token (from @BotFather)
#   - ngrok installed (brew install ngrok) + authenticated
#
# Typical workflow:
#   Terminal 1: ./n8n/dev.sh tunnel
#   Terminal 2: ./n8n/dev.sh ngrok
#   Terminal 3: ./n8n/dev.sh n8n   (after copying ngrok URL)

set -euo pipefail

CMD="${1:-both}"

start_tunnel() {
  echo "→ Opening SSH tunnel to Qdrant (localhost:6333)..."
  ssh -N -L 6333:127.0.0.1:6333 ubuntu@jaan.sokkphoto.com &
  TUNNEL_PID=$!
  echo "  Tunnel PID: $TUNNEL_PID"
}

start_ngrok() {
  echo "→ Starting ngrok tunnel to localhost:5678..."
  echo "  Copy the https URL and pass it to: ./n8n/dev.sh n8n <ngrok-url>"
  ngrok http 5678
}

start_n8n() {
  local webhook_url="${1:-}"
  echo "→ Starting n8n on http://localhost:5678 ..."
  echo "  Qdrant reachable inside container at http://host.docker.internal:6333"

  local env_args=()
  if [ -n "$webhook_url" ]; then
    echo "  Webhook URL: $webhook_url"
    env_args+=(-e "WEBHOOK_URL=${webhook_url}")
  else
    echo "  ⚠ No WEBHOOK_URL set — Telegram triggers won't work."
    echo "    Run: ./n8n/dev.sh ngrok   then restart with: ./n8n/dev.sh n8n <ngrok-url>"
  fi

  docker run -it --rm \
    --name n8n \
    -p 5678:5678 \
    -v n8n_data:/home/node/.n8n \
    "${env_args[@]}" \
    n8nio/n8n
}

case "$CMD" in
  tunnel)
    start_tunnel
    wait
    ;;
  ngrok)
    start_ngrok
    ;;
  n8n)
    start_n8n "${2:-}"
    ;;
  both)
    start_tunnel
    sleep 1
    start_n8n "${2:-}"
    # Clean up tunnel when n8n exits
    kill "$TUNNEL_PID" 2>/dev/null || true
    ;;
  *)
    echo "Usage: $0 [tunnel|n8n|ngrok|both] [ngrok-url]"
    exit 1
    ;;
esac
