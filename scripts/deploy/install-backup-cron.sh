#!/usr/bin/env bash
# Installs a nightly Postgres backup for the current user (no sudo needed).
# Idempotent: replaces any previous hireforge backup line.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/backups"
mkdir -p "$LOG_DIR"

LINE="17 2 * * * cd $ROOT_DIR && ./scripts/deploy/backup-postgres.sh >> $LOG_DIR/backup-cron.log 2>&1 # hireforge-backup"

( crontab -l 2>/dev/null | grep -v '# hireforge-backup' || true; echo "$LINE" ) | crontab -
echo "Installed: $LINE"
crontab -l | grep '# hireforge-backup'
