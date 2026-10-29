#!/usr/bin/env bash
# Runs ON A BUILD MACHINE (a Mac with Docker/OrbStack or a CI runner, never
# the server): builds the current commit's linux/amd64 images unless the
# server or this machine has them already, sends the server the ones it lacks,
# moves the environment's checkout to this commit and runs
# scripts/deploy/release.sh there (backup, migrate, health gates, automatic
# rollback, image retention). CI does this on every merge to main (staging) and
# by hand (production): .github/workflows/deploy-*.yml. This script is the
# same path from a Mac.
#
#   ./scripts/deploy/ship.sh              # production, /opt/hireforge
#   ./scripts/deploy/ship.sh staging      # staging.sljakam.com, /opt/hireforge-staging
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
PROD_DIR=/opt/hireforge
REMOTE_DIR=$PROD_DIR
[[ $TARGET == production ]] || REMOTE_DIR=/opt/hireforge-staging
remote() { ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_TARGET" "$@"; }

[[ -z "$(git status --porcelain)" ]] || { echo "working tree is not clean" >&2; exit 1; }
git fetch -q origin main
git merge-base --is-ancestor HEAD origin/main ||
  { echo "HEAD is not on origin/main: merge it first" >&2; exit 1; }
FULL_SHA=$(git rev-parse HEAD)
SHA=${FULL_SHA:0:12}

missing=$(remote "for s in api worker web; do docker image inspect hireforge-production-\$s:$SHA >/dev/null 2>&1 || echo hireforge-production-\$s:$SHA; done")

for svc in api worker web; do
  ref="hireforge-production-$svc:$SHA"
  if [[ $missing != *"$ref"* ]]; then
    echo "=== $ref: the server has it"
    continue
  fi
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

if [[ -n $missing ]]; then
  echo "=== ship $(echo "$missing" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  docker save $missing | gzip -1 | remote 'gunzip | docker load'
else
  echo "=== server already has the images"
fi

echo "=== $REMOTE_DIR → $SHA"
if [[ $TARGET == production ]]; then
  remote "cd $REMOTE_DIR && git fetch -q origin && git merge -q --ff-only $FULL_SHA && git log --oneline -1"
else
  # Staging's checkout is a worktree of production's repository, detached at
  # the commit it runs; production's files are never touched.
  remote "cd $PROD_DIR && git fetch -q origin \
    && { [[ -e $REMOTE_DIR/.git ]] || git worktree add -q --detach $REMOTE_DIR $FULL_SHA; } \
    && cd $REMOTE_DIR && git checkout -q --detach $FULL_SHA && git log --oneline -1"
fi
remote "cd $REMOTE_DIR && ./scripts/deploy/release.sh $SHA $TARGET"
