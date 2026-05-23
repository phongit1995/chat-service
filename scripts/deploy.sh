#!/usr/bin/env bash
set -euo pipefail

VERSION="${VERSION:-latest}"
SERVICES="${SERVICES:-all}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
HEALTH_URL="${HEALTH_URL:-http://localhost:5241/api/health}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

log()  { echo "[$(date +'%H:%M:%S')] $*"; }
die()  { echo "[$(date +'%H:%M:%S')] ERROR: $*" >&2; exit 1; }

[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found in $(pwd)"
[ -f "$ENV_FILE" ]     || die "$ENV_FILE not found in $(pwd)"
command -v docker >/dev/null || die "docker not installed"

BACKUP_DIR=".deploy-backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ENV="$BACKUP_DIR/.env.$STAMP"
cp "$ENV_FILE" "$BACKUP_ENV"
log "Backed up env to $BACKUP_ENV"

ls -1t "$BACKUP_DIR"/.env.* 2>/dev/null | tail -n +11 | xargs -r rm -f

update_var() {
  local key="$1" val="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    sed -i.bak -E "s|^${key}=.*|${key}=${val}|" "$file" && rm -f "${file}.bak"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

declare -A TARGETS=()
if [ "$SERVICES" = "all" ]; then
  TARGETS[api]=1; TARGETS[chat]=1; TARGETS[web]=1; TARGETS[migrate]=1
else
  IFS=',' read -ra arr <<< "$SERVICES"
  for s in "${arr[@]}"; do TARGETS["$(echo "$s" | xargs)"]=1; done
fi

log "Setting version=$VERSION for: ${!TARGETS[*]}"
[ -n "${TARGETS[api]:-}" ]     && update_var API_VERSION     "$VERSION" "$ENV_FILE"
[ -n "${TARGETS[chat]:-}" ]    && update_var CHAT_VERSION    "$VERSION" "$ENV_FILE"
[ -n "${TARGETS[web]:-}" ]     && update_var WEB_VERSION     "$VERSION" "$ENV_FILE"
[ -n "${TARGETS[migrate]:-}" ] && update_var MIGRATE_VERSION "$VERSION" "$ENV_FILE"

log "Pulling images..."
PULL_SVCS=()
for s in "${!TARGETS[@]}"; do PULL_SVCS+=("$s"); done
docker compose --env-file "$ENV_FILE" pull "${PULL_SVCS[@]}"

rollback() {
  log "Rolling back env from $BACKUP_ENV"
  cp "$BACKUP_ENV" "$ENV_FILE"
  log "Restarting previous version..."
  local svcs=()
  [ -n "${TARGETS[api]:-}" ]  && svcs+=(api)
  [ -n "${TARGETS[chat]:-}" ] && svcs+=(chat)
  [ -n "${TARGETS[web]:-}" ]  && svcs+=(web)
  if [ ${#svcs[@]} -gt 0 ]; then
    docker compose --env-file "$ENV_FILE" up -d --no-deps "${svcs[@]}" || true
  fi
}
trap 'rc=$?; [ $rc -ne 0 ] && rollback; exit $rc' EXIT

if [ -n "${TARGETS[migrate]:-}" ] && [ "$RUN_MIGRATIONS" = "true" ]; then
  log "Running migrations..."
  docker compose --env-file "$ENV_FILE" run --rm migrate
  log "Migrations OK"
else
  log "Skipping migrations"
fi

RESTART_SVCS=()
[ -n "${TARGETS[api]:-}" ]  && RESTART_SVCS+=(api)
[ -n "${TARGETS[chat]:-}" ] && RESTART_SVCS+=(chat)
[ -n "${TARGETS[web]:-}" ]  && RESTART_SVCS+=(web)

if [ ${#RESTART_SVCS[@]} -gt 0 ]; then
  log "Recreating services: ${RESTART_SVCS[*]}"
  docker compose --env-file "$ENV_FILE" up -d --no-deps --remove-orphans "${RESTART_SVCS[@]}"
fi

if [ -n "${TARGETS[api]:-}" ]; then
  log "Health check: $HEALTH_URL"
  elapsed=0
  until curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; do
    [ $elapsed -ge "$HEALTH_TIMEOUT" ] && die "Health check failed after ${HEALTH_TIMEOUT}s"
    sleep 5
    elapsed=$((elapsed + 5))
    log "  waiting... ${elapsed}/${HEALTH_TIMEOUT}s"
  done
  log "API healthy"
fi

docker image prune -f --filter "dangling=true" >/dev/null 2>&1 || true

trap - EXIT
log "Deploy complete (version=$VERSION)"
docker compose --env-file "$ENV_FILE" ps
