#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

STAGING_DIR=""

finish() {
  local status=$?
  trap - EXIT

  if [[ -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
    safe_delete_staging_dir "$POSTGRES_STAGING_ROOT" "$STAGING_DIR" || true
  fi

  if ((status == 0)); then
    log "PostgreSQL backup completed successfully"
    notify_url "${POSTGRES_SUCCESS_URL:-${BACKUP_SUCCESS_URL:-}}"
  else
    log "PostgreSQL backup failed with exit status ${status}" >&2
    notify_url "${POSTGRES_FAILURE_URL:-${BACKUP_FAILURE_URL:-}}"
  fi

  exit "$status"
}
trap finish EXIT

load_backup_config

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-analytics}"
POSTGRES_STAGING_ROOT="${POSTGRES_STAGING_ROOT:-/var/backups/rybbit/postgres}"
POSTGRES_LOCK_FILE="${POSTGRES_LOCK_FILE:-/run/lock/rybbit-postgres-backup.lock}"
BACKUP_HOST="${BACKUP_HOST:-$(hostname -s)}"
DRY_RUN="${DRY_RUN:-false}"

require_value POSTGRES_RCLONE_REMOTES
validate_simple_name BACKUP_HOST "$BACKUP_HOST"
validate_simple_name POSTGRES_CONTAINER "$POSTGRES_CONTAINER"
validate_identifier POSTGRES_DATABASE "$POSTGRES_DATABASE"

BACKUP_NAME="${BACKUP_HOST}-postgres-${POSTGRES_DATABASE}-$(date -u '+%Y%m%dT%H%M%SZ')"

if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY RUN: would create ${BACKUP_NAME} from container ${POSTGRES_CONTAINER}"
  log "DRY RUN: would upload to ${POSTGRES_RCLONE_REMOTES}"
  exit 0
fi

require_command docker
require_command flock
require_command rclone
require_command sha256sum
acquire_lock "$POSTGRES_LOCK_FILE"

mkdir -p "$POSTGRES_STAGING_ROOT"
STAGING_DIR="${POSTGRES_STAGING_ROOT%/}/${BACKUP_NAME}"
mkdir "$STAGING_DIR"

log "Creating consistent PostgreSQL dump for ${POSTGRES_DATABASE}"
docker exec "$POSTGRES_CONTAINER" sh -ec \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump --username "$POSTGRES_USER" --dbname "$1" --format=custom --compress=zstd:3' \
  sh "$POSTGRES_DATABASE" >"${STAGING_DIR}/database.dump.partial"
mv "${STAGING_DIR}/database.dump.partial" "${STAGING_DIR}/database.dump"

log "Dumping PostgreSQL roles and cluster globals"
docker exec "$POSTGRES_CONTAINER" sh -ec \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dumpall --username "$POSTGRES_USER" --globals-only' \
  >"${STAGING_DIR}/globals.sql.partial"
mv "${STAGING_DIR}/globals.sql.partial" "${STAGING_DIR}/globals.sql"

[[ -s "${STAGING_DIR}/database.dump" ]] || fatal "PostgreSQL dump is empty"
[[ -s "${STAGING_DIR}/globals.sql" ]] || fatal "PostgreSQL globals dump is empty"

log "Validating PostgreSQL archive"
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list <"${STAGING_DIR}/database.dump" >/dev/null

(
  cd "$STAGING_DIR"
  sha256sum database.dump globals.sql >SHA256SUMS
)

upload_directory "$STAGING_DIR" "$BACKUP_NAME" "$POSTGRES_RCLONE_REMOTES"

