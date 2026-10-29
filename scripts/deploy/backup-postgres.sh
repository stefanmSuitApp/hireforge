#!/usr/bin/env bash
set -euo pipefail

# Usage: backup-postgres.sh [production|staging] (default production).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
case "${1:-production}" in
  production)
    ENV_FILE="${HIREFORGE_ENV_FILE:-$ROOT_DIR/deploy/.env.production}"
    COMPOSE_FILE="$ROOT_DIR/compose.prod.yml"
    ;;
  staging)
    ENV_FILE="$ROOT_DIR/deploy/.env.staging"
    COMPOSE_FILE="$ROOT_DIR/compose.staging.yml"
    ;;
  *)
    echo "usage: backup-postgres.sh [production|staging]" >&2
    exit 1
    ;;
esac
BACKUP_DIR="${HIREFORGE_BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/hireforge-postgres-$STAMP.sql.gz"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c \
  'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$OUT_FILE"

# A failed pg_dump inside the pipe still leaves a tiny gzip; refuse to keep it.
if [[ "$(gzip -cd "$OUT_FILE" | head -c 4096 | wc -c)" -lt 100 ]]; then
  echo "Backup looks empty: $OUT_FILE" >&2
  rm -f "$OUT_FILE"
  exit 1
fi

echo "Wrote Postgres backup: $OUT_FILE"

# Retention: keep the last KEEP_DAYS days of dumps (default 14). Only files
# this script created are touched.
KEEP_DAYS="${HIREFORGE_BACKUP_KEEP_DAYS:-14}"
find "$BACKUP_DIR" -maxdepth 1 -name 'hireforge-postgres-*.sql.gz' -mtime "+$KEEP_DAYS" -print -delete

# Off-server copy when S3_BACKUP_BUCKET is set (scripts/db/backup-offsite.mjs,
# run with the api image). A failed upload keeps the local dump and exits 3:
# cron logs it, release.sh warns and carries on.
if grep -qE '^S3_BACKUP_BUCKET=.+' "$ENV_FILE"; then
  if ! docker compose -f "$COMPOSE_FILE" --profile tools run --rm --no-deps -T \
    -v "$BACKUP_DIR:/backups:ro" migrate \
    node scripts/db/backup-offsite.mjs upload "/backups/$(basename "$OUT_FILE")"; then
    echo "OFF-SERVER UPLOAD FAILED: $OUT_FILE exists only on this server" >&2
    exit 3
  fi
fi
