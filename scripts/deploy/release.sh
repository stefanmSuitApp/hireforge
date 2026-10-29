#!/usr/bin/env bash
# Runs ON THE SERVER: puts release <sha> live in production (default) or
# staging. Also the rollback command (pass an older sha that is still among
# the kept releases).
#
#   ./scripts/deploy/release.sh <sha> [production|staging]
#
# Production runs from /opt/hireforge, staging from its own checkout
# /opt/hireforge-staging (so a staging deploy never changes production's
# compose or Caddy files). The release logs and the lock live in production's
# backups/: one release at a time on this server, whichever environment.
#
# 1. The images hireforge-production-{api,worker,web}:<sha> must be loaded
#    (scripts/deploy/ship.sh or the deploy-staging workflow does that).
#    Staging runs the same images as production.
# 2. Postgres backup first (off-server too when the env has a bucket). Then
#    migrations with the new api image, in one transaction; if they fail,
#    nothing has been restarted. Staging: an empty database also gets the RS
#    and dev seed.
# 3. <sha> becomes :latest (production) / :staging, `compose up --wait`, then
#    gates: every container healthy, the worker logged `worker_started`, the
#    site answers. Any failure puts the previous images back and exits
#    non-zero. Migrations are not undone (forward-only; restore a dump).
# 4. The release is recorded in backups/releases[-staging].log; images that
#    are in neither environment's last KEEP_RELEASES (3) releases are removed,
#    so the disk doesn't fill.
set -euo pipefail

SHA=${1:?usage: release.sh <sha> [production|staging]}
TARGET=${2:-production}
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
KEEP_RELEASES=${KEEP_RELEASES:-3}
SERVICES=(api worker web)

case $TARGET in
  production)
    PROD_ROOT=$ROOT
    COMPOSE_FILE=compose.prod.yml
    ENV_FILE=${HIREFORGE_ENV_FILE:-$ROOT/deploy/.env.production}
    PROJECT=hireforge-production
    LIVE_TAG=latest
    ;;
  staging)
    PROD_ROOT=${HIREFORGE_PROD_ROOT:-/opt/hireforge}
    COMPOSE_FILE=compose.staging.yml
    ENV_FILE=$ROOT/deploy/.env.staging
    PROJECT=hireforge-staging
    LIVE_TAG=staging
    ;;
  *)
    echo "unknown target '$TARGET' (production|staging)" >&2
    exit 1
    ;;
esac
PROD_RELEASES=$PROD_ROOT/backups/releases.log
STAGING_RELEASES=$PROD_ROOT/backups/releases-staging.log
RELEASES=$PROD_RELEASES
[[ $TARGET == production ]] || RELEASES=$STAGING_RELEASES

# One release at a time on this server: a staging deploy from CI waits for a
# production deploy started by hand, and the other way round.
mkdir -p "$PROD_ROOT/backups"
exec 9>"$PROD_ROOT/backups/.release.lock"
flock -w 1800 9 || { echo "another release still holds the lock after 30 min" >&2; exit 1; }

# Staging takes the keys it shares with production fresh from production's env.
if [[ $TARGET == staging ]]; then ./scripts/deploy/staging-init.sh --env-only; fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

# Staging may share production's Resend key only with every email redirected
# (libs/server/email: EMAIL_REDIRECT_TO); it has copies of real accounts.
if [[ $TARGET == staging && -n ${RESEND_API_KEY:-} && -z ${EMAIL_REDIRECT_TO:-} ]]; then
  echo "staging has RESEND_API_KEY but no EMAIL_REDIRECT_TO: refusing to start" >&2
  exit 1
fi

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }
img() { echo "hireforge-production-$1:$2"; }
log() { echo "=== [$TARGET] $*"; }

for s in "${SERVICES[@]}"; do
  docker image inspect "$(img "$s" "$SHA")" >/dev/null 2>&1 ||
    { echo "missing $(img "$s" "$SHA"): run scripts/deploy/ship.sh first" >&2; exit 1; }
done

# Production's Caddy reaches staging over this network; both stacks need it.
docker network inspect hireforge-edge >/dev/null 2>&1 || docker network create hireforge-edge >/dev/null
# Created here, not by Docker's bind mount (that would make it root-owned).
mkdir -p "$PROD_ROOT/deploy/caddy-sites"

# What runs now (by image id): the rollback target. Before production's first
# recorded release it is kept as release "legacy" so pruning can't drop it.
declare -A PREV
for s in "${SERVICES[@]}"; do
  PREV[$s]=$(docker inspect --format '{{.Image}}' "$PROJECT-$s-1" 2>/dev/null || true)
done
if [[ $TARGET == production && ! -s $RELEASES && -n "${PREV[api]}" ]]; then
  for s in "${SERVICES[@]}"; do
    if [[ -n "${PREV[$s]}" ]]; then docker tag "${PREV[$s]}" "$(img "$s" legacy)"; fi
  done
  echo legacy >>"$RELEASES"
fi

# Backup upload and migrations run the api image being released.
export HIREFORGE_MIGRATE_IMAGE
HIREFORGE_MIGRATE_IMAGE=$(img api "$SHA")

# Staging's first release has no database yet: nothing to back up.
running=$(compose ps --status running --services 2>/dev/null || true)
if [[ $TARGET == production || $'\n'$running$'\n' == *$'\n'postgres$'\n'* ]]; then
  log "backup"
  ./scripts/deploy/backup-postgres.sh "$TARGET" || {
    rc=$?
    [[ $rc == 3 ]] || exit "$rc"
    echo "warning: the off-server copy failed; the local dump exists, carrying on" >&2
  }
fi

log "migrate with $HIREFORGE_MIGRATE_IMAGE"
compose --profile tools run --rm migrate

if [[ $TARGET == staging ]]; then
  users=$(compose exec -T postgres sh -c 'psql -qtA -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM users"')
  if [[ $users == 0 ]]; then
    log "empty database: RS locations + dev seed (staging only)"
    compose --profile tools run --rm migrate node scripts/db/seed-rs-locations.mjs
    # The dev seed is not in the image; run the checkout's copy. Its guard
    # refuses NODE_ENV=production unless told this is intended (staging).
    compose --profile tools run --rm -e ALLOW_DEV_SEED=1 \
      -v "$ROOT/scripts/db:/app/scripts/dev-db:ro" migrate \
      node scripts/dev-db/seed-domain-baseline.mjs
  fi
fi

rollback() {
  echo "!!! [$TARGET] release $SHA failed: $1; restoring the previous images" >&2
  for s in "${SERVICES[@]}"; do
    if [[ -n "${PREV[$s]}" ]]; then docker tag "${PREV[$s]}" "$(img "$s" "$LIVE_TAG")"; fi
  done
  if [[ -z "${PREV[api]}" ]]; then
    echo "nothing ran before; leaving $TARGET stopped" >&2
    compose stop >/dev/null 2>&1 || true
  elif compose up -d --no-build --pull never --wait --wait-timeout 240; then
    echo "rollback ok: the previous images are live again" >&2
  else
    echo "ROLLBACK FAILED: check 'docker compose -f $COMPOSE_FILE ps' now" >&2
  fi
  exit 1
}

log "start $SHA"
for s in "${SERVICES[@]}"; do docker tag "$(img "$s" "$SHA")" "$(img "$s" "$LIVE_TAG")"; done
compose up -d --no-build --pull never --remove-orphans --wait --wait-timeout 240 ||
  rollback "containers not healthy"

# Since the container's own start: compose leaves an unchanged worker image
# running, and then there is no new line since the deploy began. Read the log
# into a variable: `docker logs | grep -q` can fail under pipefail (SIGPIPE).
worker_started() {
  local since out
  since=$(docker inspect -f '{{.State.StartedAt}}' "$PROJECT-worker-1" 2>/dev/null) || return 1
  out=$(docker logs --since "${since%%.*}Z" "$PROJECT-worker-1" 2>&1 || true)
  [[ $out == *worker_started* ]]
}
for _ in $(seq 1 30); do
  if worker_started; then break; fi
  sleep 2
done
worker_started || rollback "worker did not log worker_started"

# The site answers: production through Caddy; staging inside its web
# container (Caddy only serves it once staging-init.sh wrote the site).
site_answers() {
  if [[ $TARGET == production ]]; then
    local url=${NEXT_PUBLIC_APP_URL:-https://sljakam.com} host
    host=${url#*://}
    host=${host%%/*}
    curl -fsS -o /dev/null --max-time 15 --resolve "$host:443:127.0.0.1" "$url/sr"
  else
    docker exec "$PROJECT-web-1" node -e \
      "fetch('http://127.0.0.1:3000/sr').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
  fi
}
ok=0
for _ in $(seq 1 10); do
  if site_answers; then
    ok=1
    break
  fi
  sleep 3
done
[[ $ok == 1 ]] || rollback "/sr does not answer"

if [[ $TARGET == production ]]; then
  compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null
fi

echo "$SHA" >>"$RELEASES"
log "live: $SHA"

# Keep the images of each environment's last KEEP_RELEASES distinct releases
# (what runs now included). Docker refuses to remove an image a container uses.
last_releases() {
  [[ -f $1 ]] || return 0
  awk -v n="$KEEP_RELEASES" '{ l[NR] = $0 }
    END { for (i = NR; i > 0 && k < n; i--) if (l[i] != "" && !seen[l[i]]++) { printf "%s ", l[i]; k++ } }' "$1"
}
kept=" $(last_releases "$PROD_RELEASES")$(last_releases "$STAGING_RELEASES")"
for repo in hireforge-production-api hireforge-production-worker hireforge-production-web hireforge-production-migrate; do
  docker image ls --format '{{.Repository}}:{{.Tag}}' "$repo" | while read -r ref; do
    tag=${ref##*:}
    # The old separate migrate image is unused (migrate runs the api image).
    if [[ $repo != hireforge-production-migrate ]]; then
      if [[ $tag == latest || $tag == staging || $kept == *" $tag "* ]]; then continue; fi
    fi
    if docker image rm "$ref" >/dev/null 2>&1; then echo "pruned $ref"; fi
  done
done
docker image prune -f >/dev/null
log "kept releases:$kept"
df -h / | tail -1
compose ps --format '{{.Service}} {{.Status}}'
