#!/usr/bin/env bash
# Runs ON THE BUILD MACHINE (Mac with Docker/OrbStack, never the server):
# builds the current commit's linux/amd64 images, sends the server the ones it
# doesn't have yet, moves the server's checkout to this commit and runs
# scripts/deploy/release.sh there (backup, migrate, health gates, automatic
# rollback, image retention).
#
#   ./scripts/deploy/ship.sh              # production
#   ./scripts/deploy/ship.sh staging      # staging.sljakam.com, same images
#
# The commit must be on origin/main and the working tree clean.
# HIREFORGE_SSH (deploy@178.105.128.190) and HIREFORGE_SSH_KEY
# (~/.ssh/hetzner_hireforge) select the server.
set -euo pipefail

TARGET=${1:-production}
[[ $TARGET == production || $TARGET == staging ]] ||
  { echo "usage: ship.sh [production|staging]" >&2; exit 1; }
cd "$(git rev-parse --show-toplevel)"
SSH_TARGET=${HIREFORGE_SSH:-deploy@178.105.128.190}
SSH_KEY=${HIREFORGE_SSH_KEY:-$HOME/.ssh/hetzner_hireforge}
REMOTE_DIR=${HIREFORGE_REMOTE_DIR:-/opt/hireforge}
remote() { ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_TARGET" "$@"; }

[[ -z "$(git status --porcelain)" ]] || { echo "working tree is not clean" >&2; exit 1; }
git fetch -q origin main
git merge-base --is-ancestor HEAD origin/main ||
  { echo "HEAD is not on origin/main: merge it first" >&2; exit 1; }
FULL_SHA=$(git rev-parse HEAD)
SHA=${FULL_SHA:0:12}

for svc in api worker web; do
  ref="hireforge-production-$svc:$SHA"
  if docker image inspect "$ref" >/dev/null 2>&1; then
    echo "=== $ref already built"
    continue
  fi
  args=()
  if [[ $svc == web ]]; then
    args=(
      --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-https://sljakam.com}"
      --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://api:4000}"
      --build-arg "NEXT_PUBLIC_DEFAULT_LOCALE=${NEXT_PUBLIC_DEFAULT_LOCALE:-sr}"
      --build-arg "NEXT_PUBLIC_SUPPORTED_LOCALES=${NEXT_PUBLIC_SUPPORTED_LOCALES:-sr,en}"
      --build-arg "NEXT_PUBLIC_SANITY_PROJECT_ID=${NEXT_PUBLIC_SANITY_PROJECT_ID:-845zdl9k}"
      --build-arg "NEXT_PUBLIC_SANITY_DATASET=${NEXT_PUBLIC_SANITY_DATASET:-production}"
    )
  fi
  echo "=== build $ref"
  docker buildx build --platform linux/amd64 --load -f "Dockerfile.$svc" \
    ${args[@]+"${args[@]}"} -t "$ref" .
done

missing=$(remote "for s in api worker web; do docker image inspect hireforge-production-\$s:$SHA >/dev/null 2>&1 || echo hireforge-production-\$s:$SHA; done")
if [[ -n $missing ]]; then
  echo "=== ship $(echo "$missing" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  docker save $missing | gzip -1 | remote 'gunzip | docker load'
else
  echo "=== server already has the images"
fi

echo "=== server checkout → $SHA"
remote "cd $REMOTE_DIR && git fetch -q origin && git merge -q --ff-only $FULL_SHA && git log --oneline -1"
remote "cd $REMOTE_DIR && ./scripts/deploy/release.sh $SHA $TARGET"
