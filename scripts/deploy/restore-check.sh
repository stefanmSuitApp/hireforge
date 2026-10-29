#!/usr/bin/env bash
# Runs ON THE SERVER: proves a backup restores. Takes the newest dump from the
# bucket (or the file given), restores it into a throwaway database in the
# production Postgres container, compares it with the live database and drops
# the throwaway database again. Live data is never touched.
#
#   ./scripts/deploy/restore-check.sh [backups/postgres/<file>.sql.gz]
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
CHECK_DB=hireforge_restore_check
compose() { docker compose -f compose.prod.yml "$@"; }
# psql in the postgres container against database $1, SQL on stdin.
pg() { compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -qtA -U "$POSTGRES_USER" -d "$0"' "$1"; }

if [[ $# -ge 1 ]]; then
  FILE=$1
else
  mkdir -p backups/restore-check
  name=$(compose --profile tools run --rm --no-deps -T -v "$ROOT/backups/restore-check:/out" \
    migrate node scripts/db/backup-offsite.mjs latest /out | tail -1)
  FILE=backups/restore-check/$(basename "$name")
fi
[[ -s $FILE ]] || { echo "no dump at $FILE" >&2; exit 1; }
echo "=== restoring $FILE into $CHECK_DB"

cleanup() { echo "DROP DATABASE IF EXISTS $CHECK_DB;" | pg postgres >/dev/null; }
trap cleanup EXIT
cleanup
echo "CREATE DATABASE $CHECK_DB;" | pg postgres >/dev/null
gunzip -c "$FILE" | pg "$CHECK_DB" >/dev/null

summary="SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public')
  || ' tables, ' || (SELECT count(*) FROM users) || ' users, '
  || (SELECT count(*) FROM companies) || ' companies, ' || (SELECT count(*) FROM jobs) || ' jobs, '
  || (SELECT count(*) FROM drizzle.__drizzle_migrations) || ' migrations';"
restored=$(echo "$summary" | pg "$CHECK_DB")
live=$(compose exec -T postgres sh -c 'echo "$0" | psql -qtA -U "$POSTGRES_USER" -d "$POSTGRES_DB"' "$summary")
echo "restored: $restored"
echo "live:     $live"
[[ ${restored%% tables*} == "${live%% tables*}" ]] || { echo "RESTORE CHECK FAILED: table count differs" >&2; exit 1; }
echo "=== restore check ok (rows can differ if data changed after the dump)"
