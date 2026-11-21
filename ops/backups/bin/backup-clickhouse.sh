#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

finish() {
  local status=$?
  trap - EXIT

  if ((status == 0)); then
    log "ClickHouse backup completed successfully"
    notify_url "${CLICKHOUSE_SUCCESS_URL:-${BACKUP_SUCCESS_URL:-}}"
  else
    log "ClickHouse backup failed with exit status ${status}" >&2
    notify_url "${CLICKHOUSE_FAILURE_URL:-${BACKUP_FAILURE_URL:-}}"
  fi

  exit "$status"
}
trap finish EXIT

run_clickhouse_query() {
  local query="$1"

  # Feed SQL over stdin so it does not appear in the host process list. When a
  # dedicated backup user is configured, pass its credentials only to this
  # short-lived exec process. Otherwise use the container's application user.
  printf '%s\n' "$query" | docker exec -i \
    -e RYBBIT_BACKUP_USER="${CLICKHOUSE_BACKUP_USER:-}" \
    -e RYBBIT_BACKUP_PASSWORD="${CLICKHOUSE_BACKUP_PASSWORD:-}" \
    -e RYBBIT_BACKUP_RECEIVE_TIMEOUT="$CLICKHOUSE_BACKUP_RECEIVE_TIMEOUT" \
    "$CLICKHOUSE_CONTAINER" sh -ec '
      if [ -n "$RYBBIT_BACKUP_USER" ]; then
        exec clickhouse-client --user "$RYBBIT_BACKUP_USER" --password "$RYBBIT_BACKUP_PASSWORD" --receive_timeout "$RYBBIT_BACKUP_RECEIVE_TIMEOUT" --multiquery
      fi
      exec clickhouse-client --user "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD" --receive_timeout "$RYBBIT_BACKUP_RECEIVE_TIMEOUT" --multiquery
    '
}

load_backup_config

CLICKHOUSE_CONTAINER="${CLICKHOUSE_CONTAINER:-clickhouse}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-analytics}"
CLICKHOUSE_BACKUP_MODE="${CLICKHOUSE_BACKUP_MODE:-s3}"
CLICKHOUSE_BACKUP_RECEIVE_TIMEOUT="${CLICKHOUSE_BACKUP_RECEIVE_TIMEOUT:-21600}"
CLICKHOUSE_LOCK_FILE="${CLICKHOUSE_LOCK_FILE:-/run/lock/rybbit-clickhouse-backup.lock}"
BACKUP_HOST="${BACKUP_HOST:-$(hostname -s)}"
DRY_RUN="${DRY_RUN:-false}"

validate_simple_name BACKUP_HOST "$BACKUP_HOST"
validate_simple_name CLICKHOUSE_CONTAINER "$CLICKHOUSE_CONTAINER"
validate_identifier CLICKHOUSE_DATABASE "$CLICKHOUSE_DATABASE"
[[ "$CLICKHOUSE_BACKUP_MODE" == "s3" || "$CLICKHOUSE_BACKUP_MODE" == "local" ]] || \
  fatal "CLICKHOUSE_BACKUP_MODE must be 's3' or 'local'"
[[ "$CLICKHOUSE_BACKUP_RECEIVE_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || \
  fatal "CLICKHOUSE_BACKUP_RECEIVE_TIMEOUT must be a positive integer"

BACKUP_NAME="${BACKUP_HOST}-clickhouse-${CLICKHOUSE_DATABASE}-$(date -u '+%Y%m%dT%H%M%SZ')"

if [[ "$CLICKHOUSE_BACKUP_MODE" == "s3" ]]; then
  require_value CLICKHOUSE_S3_NAMED_COLLECTION
  validate_identifier CLICKHOUSE_S3_NAMED_COLLECTION "$CLICKHOUSE_S3_NAMED_COLLECTION"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN: would create native ClickHouse backup ${BACKUP_NAME}"
    log "DRY RUN: destination named collection ${CLICKHOUSE_S3_NAMED_COLLECTION}"
    exit 0
  fi

  require_command docker
  require_command flock
  acquire_lock "$CLICKHOUSE_LOCK_FILE"

  log "Creating native ClickHouse backup of ${CLICKHOUSE_DATABASE} directly in object storage"
  QUERY="SET log_queries = 0; BACKUP DATABASE \`${CLICKHOUSE_DATABASE}\` TO S3(${CLICKHOUSE_S3_NAMED_COLLECTION}, $(sql_string "$BACKUP_NAME")) SETTINGS compression_method = 'zstd', compression_level = 1;"
  run_clickhouse_query "$QUERY"
else
  CLICKHOUSE_BACKUP_DISK="${CLICKHOUSE_BACKUP_DISK:-backups}"
  CLICKHOUSE_LOCAL_BACKUP_ROOT="${CLICKHOUSE_LOCAL_BACKUP_ROOT:-/var/backups/rybbit/clickhouse}"
  CLICKHOUSE_KEEP_LOCAL_BACKUP="${CLICKHOUSE_KEEP_LOCAL_BACKUP:-false}"

  require_value CLICKHOUSE_RCLONE_REMOTES
  validate_simple_name CLICKHOUSE_BACKUP_DISK "$CLICKHOUSE_BACKUP_DISK"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN: would create native ClickHouse backup ${BACKUP_NAME} on disk ${CLICKHOUSE_BACKUP_DISK}"
    log "DRY RUN: would upload to ${CLICKHOUSE_RCLONE_REMOTES}"
    exit 0
  fi

  require_command docker
  require_command flock
  require_command rclone
  acquire_lock "$CLICKHOUSE_LOCK_FILE"

  mkdir -p "$CLICKHOUSE_LOCAL_BACKUP_ROOT"
  LOCAL_BACKUP_DIR="${CLICKHOUSE_LOCAL_BACKUP_ROOT%/}/${BACKUP_NAME}"
  [[ ! -e "$LOCAL_BACKUP_DIR" ]] || fatal "Local backup path already exists: $LOCAL_BACKUP_DIR"

  log "Creating native ClickHouse backup of ${CLICKHOUSE_DATABASE} on disk ${CLICKHOUSE_BACKUP_DISK}"
  QUERY="SET log_queries = 0; BACKUP DATABASE \`${CLICKHOUSE_DATABASE}\` TO Disk($(sql_string "$CLICKHOUSE_BACKUP_DISK"), $(sql_string "$BACKUP_NAME")) SETTINGS compression_method = 'zstd', compression_level = 1;"
  run_clickhouse_query "$QUERY"

  [[ -d "$LOCAL_BACKUP_DIR" ]] || fatal "ClickHouse reported success but local backup was not found: $LOCAL_BACKUP_DIR"
  [[ -n "$(find "$LOCAL_BACKUP_DIR" -mindepth 1 -print -quit)" ]] || fatal "ClickHouse local backup is empty"

  upload_directory "$LOCAL_BACKUP_DIR" "$BACKUP_NAME" "$CLICKHOUSE_RCLONE_REMOTES"

  if [[ -n "${CLICKHOUSE_PRUNE_REMOTES:-}" ]]; then
    CLICKHOUSE_REMOTE_RETENTION_DAYS="${CLICKHOUSE_REMOTE_RETENTION_DAYS:-14}"
    prune_remote_backup_directories \
      "$CLICKHOUSE_PRUNE_REMOTES" \
      "$CLICKHOUSE_REMOTE_RETENTION_DAYS" \
      "${BACKUP_HOST}-clickhouse-${CLICKHOUSE_DATABASE}-"
  fi

  if [[ "$CLICKHOUSE_KEEP_LOCAL_BACKUP" != "true" ]]; then
    log "Removing completed local staging backup"
    safe_delete_staging_dir "$CLICKHOUSE_LOCAL_BACKUP_ROOT" "$LOCAL_BACKUP_DIR"
  fi
fi
