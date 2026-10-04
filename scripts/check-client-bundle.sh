#!/usr/bin/env bash
# Fails if a server-only secret ended up in the browser bundle (security items 1 and 3).
# CI builds with random placeholder values for every server secret, then searches the
# client output for them.
set -euo pipefail

STATIC_DIR="${1:-.next/static}"
SENTINELS=(
  "${SUPABASE_SERVICE_ROLE_KEY:-}"
  "${IP_HASH_SALT:-}"
  "${TURNSTILE_SECRET_KEY:-}"
  "${HEALTH_DATA_ENCRYPTION_KEY:-}"
)

status=0
for value in "${SENTINELS[@]}"; do
  [ -z "$value" ] && continue
  if grep -rqF -- "$value" "$STATIC_DIR"; then
    echo "Secret value leaked into $STATIC_DIR" >&2
    status=1
  fi
done
for name in SUPABASE_SERVICE_ROLE_KEY IP_HASH_SALT TURNSTILE_SECRET_KEY HEALTH_DATA_ENCRYPTION_KEY; do
  if grep -rqF -- "$name" "$STATIC_DIR"; then
    echo "Server-only variable name $name found in $STATIC_DIR" >&2
    status=1
  fi
done
[ "$status" -eq 0 ] && echo "No server secrets in the client bundle."
exit "$status"
