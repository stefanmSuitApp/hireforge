#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${HIREFORGE_ENV_FILE:-$ROOT_DIR/deploy/.env.production}"
COMPOSE_FILE="$ROOT_DIR/compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  echo "Copy deploy/env.production.example to deploy/.env.production and fill in secrets." >&2
  exit 1
fi

cd "$ROOT_DIR"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d postgres redis
docker compose -f "$COMPOSE_FILE" --profile tools run --rm migrate
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker compose -f "$COMPOSE_FILE" ps
