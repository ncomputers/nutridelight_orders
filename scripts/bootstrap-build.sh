#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_EXAMPLE_FILE=".env.example"
ENV_FILE=".env"

if [[ ! -f "$ENV_EXAMPLE_FILE" ]]; then
  echo "Error: $ENV_EXAMPLE_FILE not found"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  echo "Created $ENV_FILE from $ENV_EXAMPLE_FILE"
else
  # Append only missing keys from .env.example; keep existing values untouched.
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    key="${line%%=*}"
    if ! grep -Eq "^${key}=" "$ENV_FILE"; then
      echo "$line" >> "$ENV_FILE"
      echo "Added missing key to $ENV_FILE: $key"
    fi
  done < "$ENV_EXAMPLE_FILE"
fi

echo "Using env file: $ENV_FILE"
echo "Required keys check:"
for key in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_ADMIN_PASSWORD VITE_ADMIN_POLL_INTERVAL_MS; do
  if grep -Eq "^${key}=" "$ENV_FILE"; then
    echo "  - $key: OK"
  else
    echo "  - $key: MISSING"
    exit 1
  fi
done

echo "Running build..."
npm run build

echo "Running tests..."
npm test

echo "Done. Build + tests passed."
