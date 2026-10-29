#!/usr/bin/env bash
# Runs ON THE SERVER: puts release <sha> live. Also the rollback command
# (pass an older sha that is still among the kept releases).
#
#   ./scripts/deploy/release.sh <sha>
#
# 1. The images hireforge-production-{api,worker,web}:<sha> must be loaded
#    (scripts/deploy/ship.sh does that from the build machine).
# 2. Postgres backup, then migrations with the new api image, in one
#    transaction. If they fail, nothing has been restarted.
# 3. <sha> becomes :latest, `compose up --wait`, then gates: every container
#    healthy, the worker logged `worker_started`, the site answers through
#    Caddy. Any failure puts the previous images back and exits non-zero.
#    Migrations are not undone (forward-only; restore a dump for that).
# 4. The release is recorded in backups/releases.log; images of all but the
#    last KEEP_RELEASES (3) releases are removed, so the disk doesn't fill.
set -euo pipefail

SHA=${1:?usage: release.sh <sha>}
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
ENV_FILE=${HIREFORGE_ENV_FILE:-$ROOT/deploy/.env.production}
RELEASES=$ROOT/backups/releases.log
KEEP_RELEASES=${KEEP_RELEASES:-3}
SERVICES=(api worker web)

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
PUBLIC_URL=${NEXT_PUBLIC_APP_URL:-https://sljakam.com}
PUBLIC_HOST=${PUBLIC_URL#*://}
PUBLIC_HOST=${PUBLIC_HOST%%/*}

compose() { docker compose -f compose.prod.yml "$@"; }
img() { echo "hireforge-production-$1:$2"; }
log() { echo "=== $*"; }

for s in "${SERVICES[@]}"; do
  docker image inspect "$(img "$s" "$SHA")" >/dev/null 2>&1 ||
    { echo "missing $(img "$s" "$SHA"): run scripts/deploy/ship.sh first" >&2; exit 1; }
done

# What runs now (by image id): the rollback target. Before the first
# recorded release it is kept as release "legacy" so pruning can't drop it.
mkdir -p "$(dirname "$RELEASES")"
declare -A PREV
for s in "${SERVICES[@]}"; do
  PREV[$s]=$(docker inspect --format '{{.Image}}' "hireforge-production-$s-1" 2>/dev/null || true)
done
if [[ ! -s "$RELEASES" && -n "${PREV[api]}" ]]; then
  for s in "${SERVICES[@]}"; do
    if [[ -n "${PREV[$s]}" ]]; then docker tag "${PREV[$s]}" "$(img "$s" legacy)"; fi
  done
  echo legacy >>"$RELEASES"
fi

log "backup"
./scripts/deploy/backup-postgres.sh

log "migrate with $(img api "$SHA")"
HIREFORGE_MIGRATE_IMAGE=$(img api "$SHA") compose --profile tools run --rm migrate

rollback() {
  echo "!!! release $SHA failed: $1; restoring the previous images" >&2
  for s in "${SERVICES[@]}"; do
    if [[ -n "${PREV[$s]}" ]]; then docker tag "${PREV[$s]}" "$(img "$s" latest)"; fi
  done
  if compose up -d --no-build --pull never --wait --wait-timeout 240; then
    echo "rollback ok: the previous images are live again" >&2
  else
    echo "ROLLBACK FAILED: check 'docker compose -f compose.prod.yml ps' now" >&2
  fi
  exit 1
}

log "start $SHA"
for s in "${SERVICES[@]}"; do docker tag "$(img "$s" "$SHA")" "$(img "$s" latest)"; done
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
compose up -d --no-build --pull never --remove-orphans --wait --wait-timeout 240 ||
  rollback "containers not healthy"

# Read the log into a variable: `docker logs | grep -q` can fail under
# pipefail (SIGPIPE) even when the line is there.
worker_started() {
  local out
  out=$(docker logs --since "$started" hireforge-production-worker-1 2>&1 || true)
  [[ $out == *worker_started* ]]
}
for _ in $(seq 1 30); do
  if worker_started; then break; fi
  sleep 2
done
worker_started || rollback "worker did not log worker_started"

ok=0
for _ in $(seq 1 10); do
  if curl -fsS -o /dev/null --max-time 15 --resolve "$PUBLIC_HOST:443:127.0.0.1" "$PUBLIC_URL/sr"; then
    ok=1
    break
  fi
  sleep 3
done
[[ $ok == 1 ]] || rollback "$PUBLIC_URL/sr does not answer through Caddy"

compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null

echo "$SHA" >>"$RELEASES"
log "live: $SHA"

# Keep the images of the last KEEP_RELEASES distinct releases (the one now
# live included); Docker refuses to remove an image a container uses.
kept=" $(awk -v n="$KEEP_RELEASES" '{ l[NR] = $0 }
  END { for (i = NR; i > 0 && k < n; i--) if (l[i] != "" && !seen[l[i]]++) { printf "%s ", l[i]; k++ } }' "$RELEASES")"
for repo in hireforge-production-api hireforge-production-worker hireforge-production-web hireforge-production-migrate; do
  docker image ls --format '{{.Repository}}:{{.Tag}}' "$repo" | while read -r ref; do
    tag=${ref##*:}
    # The old separate migrate image is unused (migrate runs the api image).
    if [[ $repo != hireforge-production-migrate ]]; then
      if [[ $tag == latest || $kept == *" $tag "* ]]; then continue; fi
    fi
    if docker image rm "$ref" >/dev/null 2>&1; then echo "pruned $ref"; fi
  done
done
docker image prune -f >/dev/null
log "kept releases:$kept"
df -h / | tail -1
compose ps --format '{{.Service}} {{.Status}}'
