#!/usr/bin/env bash
set -euo pipefail

# Provision a baseline Lightsail instance for resume-web.
#
# Usage:
#   AWS_REGION=eu-west-1 \
#   INSTANCE_NAME=resume-web \
#   BLUEPRINT=ubuntu_22_04 \
#   BUNDLE=micro_2_0 \
#   STATIC_IP_NAME=resume-web-ip \
#   ./infra-vps/scripts/provision-lightsail.sh
#
# Notes:
# - This only provisions instance + networking. App deployment is done over SSH (docker compose).
# - You may prefer doing this in the console; this script exists for repeatability.

REGION="${AWS_REGION:-}"
INSTANCE_NAME="${INSTANCE_NAME:-resume-web}"
BLUEPRINT="${BLUEPRINT:-ubuntu_22_04}"
BUNDLE="${BUNDLE:-micro_2_0}"
STATIC_IP_NAME="${STATIC_IP_NAME:-${INSTANCE_NAME}-ip}"

if [[ -z "${REGION}" ]]; then
  echo "AWS_REGION is required (e.g. eu-west-1)" >&2
  exit 2
fi

echo "== Creating instance: ${INSTANCE_NAME} (${REGION}) =="
aws lightsail create-instances \
  --region "${REGION}" \
  --instance-names "${INSTANCE_NAME}" \
  --availability-zone "${REGION}a" \
  --blueprint-id "${BLUEPRINT}" \
  --bundle-id "${BUNDLE}" \
  --output json

echo "== Opening public ports (HTTP/HTTPS) =="
aws lightsail open-instance-public-ports \
  --region "${REGION}" \
  --instance-name "${INSTANCE_NAME}" \
  --port-info fromPort=80,toPort=80,protocol=tcp \
  --output json

aws lightsail open-instance-public-ports \
  --region "${REGION}" \
  --instance-name "${INSTANCE_NAME}" \
  --port-info fromPort=443,toPort=443,protocol=tcp \
  --output json

echo "== Allocating + attaching static IP: ${STATIC_IP_NAME} =="
aws lightsail allocate-static-ip \
  --region "${REGION}" \
  --static-ip-name "${STATIC_IP_NAME}" \
  --output json || true

aws lightsail attach-static-ip \
  --region "${REGION}" \
  --static-ip-name "${STATIC_IP_NAME}" \
  --instance-name "${INSTANCE_NAME}" \
  --output json

echo
echo "Done. Next:"
echo "- Create DNS A record to the static IP (aws lightsail get-static-ips)"
echo "- SSH in, install Docker, and run infra-vps/docker-compose.yml"


