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

# Build one image at a time: parallel Next/Nx builds exhaust the VM's RAM
# (3.8 GB, no swap) and starve the running site.
for service in api worker web; do
  docker compose -f "$COMPOSE_FILE" build "$service"
done
docker compose -f "$COMPOSE_FILE" up -d postgres redis
docker compose -f "$COMPOSE_FILE" --profile tools run --rm migrate
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
# Caddyfile is bind-mounted; config changes need an explicit reload.
docker compose -f "$COMPOSE_FILE" exec -T caddy caddy reload --config /etc/caddy/Caddyfile
docker compose -f "$COMPOSE_FILE" ps
