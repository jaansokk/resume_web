#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Docker on a fresh Ubuntu Lightsail instance.
# Run as a user with sudo (e.g., ubuntu).
#
# Usage (on the instance):
#   curl -fsSL https://get.docker.com | sh
# is convenient, but we keep this script explicit/repeatable.

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required" >&2
  exit 2
fi

echo "== Installing Docker Engine (Ubuntu) =="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

source /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "== Enabling Docker on boot =="
sudo systemctl enable docker
sudo systemctl start docker

echo "== Adding current user to docker group =="
sudo usermod -aG docker "$USER" || true

echo
echo "Docker installed. You may need to log out/in for group changes to apply."
docker --version || true
docker compose version || true


