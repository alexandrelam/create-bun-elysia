#!/usr/bin/env bash
# Pull the latest code and redeploy. Safe to run repeatedly.
#
#   ./update.sh              # pull the current branch, rebuild, restart
#   ./update.sh --no-pull    # redeploy the working tree as-is
#   ./update.sh --branch main

set -euo pipefail

cd "$(dirname "$0")"

CONTAINER=__APP_NAME__
BRANCH=""
PULL=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull) PULL=0; shift ;;
    --branch) BRANCH="${2:?--branch needs a value}"; shift 2 ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31merror: %s\033[0m\n' "$*" >&2; exit 1; }

# docker compose v2, falling back to the standalone binary.
if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  die "docker compose is not installed"
fi

[[ -f .env ]] || die ".env is missing. Copy .env.example to .env and fill it in."

if [[ $PULL -eq 1 ]]; then
  log "Pulling latest code"
  [[ -z "$(git status --porcelain)" ]] || die "working tree is dirty; commit, stash, or use --no-pull"
  BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
  git fetch --prune origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

log "Deployed commit: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

log "Building image"
compose build --pull

log "Starting services"
compose up -d --remove-orphans

log "Waiting for health"
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo starting)"
  [[ "$status" == "healthy" ]] && break
  [[ "$status" == "unhealthy" ]] && { compose logs --tail=50 app; die "container is unhealthy"; }
  sleep 2
done
[[ "${status:-}" == "healthy" ]] || { compose logs --tail=50 app; die "timed out waiting for health"; }

log "Cleaning up old images"
docker image prune -f >/dev/null

log "Deployed. $(compose ps --format '{{.Service}} {{.Status}}' 2>/dev/null || compose ps)"
