#!/usr/bin/env bash
set -euo pipefail

echo "== Identity =="
aws sts get-caller-identity
echo

echo "== Lightsail region probe =="
aws lightsail get-regions --include-availability-zones --output table | head -n 30 || true
echo

echo "== Lightsail permission probes (read-only) =="
aws lightsail get-instances --output table || true
aws lightsail get-static-ips --output table || true
echo

cat <<'EOF'
If any of the above returned AccessDenied:
- Attach the policy in infra-vps/iam/lightsail-deploy-policy.json to the IAM user "cli" (or its role/group).
- Re-run this script.

Note: verifying attached policies via CLI requires extra IAM permissions (iam:ListAttachedUserPolicies, iam:GetUser, etc.).
If you don't want to grant those to "cli", this script intentionally tests the real Lightsail APIs instead.
EOF


