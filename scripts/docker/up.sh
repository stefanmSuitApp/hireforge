#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
echo "Starting PostgreSQL (:${POSTGRES_PORT:-5434}) and Redis (:${REDIS_PORT:-6382})..."
if [[ ! -f .env ]]; then
  echo "Create .env from .env.example (POSTGRES_PASSWORD and REDIS_PASSWORD are required)." >&2
  exit 1
fi
docker compose --env-file .env up -d "$@"
echo "Done. DATABASE_URL / REDIS_URL in .env must match the same passwords."
