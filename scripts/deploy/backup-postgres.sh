#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${HIREFORGE_ENV_FILE:-$ROOT_DIR/deploy/.env.production}"
COMPOSE_FILE="$ROOT_DIR/compose.prod.yml"
BACKUP_DIR="${HIREFORGE_BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/hireforge-postgres-$STAMP.sql.gz"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c \
  'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$OUT_FILE"

echo "Wrote Postgres backup: $OUT_FILE"
