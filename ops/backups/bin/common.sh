#!/usr/bin/env bash

# Shared functions for the database backup scripts. This file is sourced by
# the entrypoints and is not intended to be executed directly.

set -Eeuo pipefail
umask 077

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

fatal() {
  log "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fatal "Required command not found: $1"
}

require_value() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fatal "Required configuration value is empty: ${name}"
}

load_backup_config() {
  local config_path="${BACKUP_CONFIG:-/etc/rybbit-backup.env}"
  [[ -r "$config_path" ]] || fatal "Cannot read backup configuration: $config_path"

  # shellcheck disable=SC1090
  source "$config_path"
}

validate_simple_name() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[A-Za-z0-9._-]+$ ]] || fatal "$label contains unsupported characters: $value"
}

validate_identifier() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || fatal "$label is not a safe SQL identifier: $value"
}

sql_string() {
  local value=${1//\'/\'\'}
  printf "'%s'" "$value"
}

acquire_lock() {
  local lock_path="$1"
  mkdir -p "$(dirname "$lock_path")"
  exec {BACKUP_LOCK_FD}>"$lock_path"
  flock -n "$BACKUP_LOCK_FD" || fatal "Another backup is already running: $lock_path"
}

notify_url() {
  local url="${1:-}"
  [[ -n "$url" ]] || return 0

  if ! curl --fail --silent --show-error --retry 2 --max-time 15 "$url" >/dev/null; then
    log "WARNING: Could not send backup notification"
  fi
}

upload_directory() {
  local source_dir="$1"
  local backup_name="$2"
  local remotes_csv="$3"
  local -a remotes
  local remote_base
  local remote_path

  IFS=',' read -r -a remotes <<<"$remotes_csv"
  ((${#remotes[@]} > 0)) || fatal "No rclone destinations configured"

  for remote_base in "${remotes[@]}"; do
    remote_base="${remote_base#${remote_base%%[![:space:]]*}}"
    remote_base="${remote_base%${remote_base##*[![:space:]]}}"
    [[ -n "$remote_base" ]] || fatal "Empty destination in remote list"

    remote_path="${remote_base%/}/${backup_name}"
    log "Uploading ${backup_name} to ${remote_path}"
    rclone copy "${source_dir%/}/" "${remote_path}/" \
      --immutable \
      --transfers "${RCLONE_TRANSFERS:-4}" \
      --checkers "${RCLONE_CHECKERS:-8}" \
      --retries "${RCLONE_RETRIES:-5}" \
      --low-level-retries "${RCLONE_LOW_LEVEL_RETRIES:-10}" \
      --stats 30s

    log "Verifying ${remote_path}"
    rclone check "${source_dir%/}/" "${remote_path}/" --one-way
  done
}

prune_remote_backup_directories() {
  local remotes_csv="$1"
  local retention_days="$2"
  local backup_prefix="$3"
  local -a remotes
  local remote_base
  local listing
  local directory_name
  local timestamp
  local backup_epoch
  local cutoff_epoch

  [[ "$retention_days" =~ ^[1-9][0-9]*$ ]] || fatal "Retention days must be a positive integer"
  validate_simple_name "Backup prefix" "$backup_prefix"
  cutoff_epoch="$(date -u -d "${retention_days} days ago" '+%s')"
  IFS=',' read -r -a remotes <<<"$remotes_csv"

  for remote_base in "${remotes[@]}"; do
    remote_base="${remote_base#${remote_base%%[![:space:]]*}}"
    remote_base="${remote_base%${remote_base##*[![:space:]]}}"
    [[ -n "$remote_base" ]] || fatal "Empty destination in prune remote list"

    log "Looking for complete backups older than ${retention_days} days in ${remote_base}"
    listing="$(rclone lsf "${remote_base%/}/" --dirs-only --max-depth 1)"

    while IFS= read -r directory_name; do
      directory_name="${directory_name%/}"
      [[ "$directory_name" == "${backup_prefix}"* ]] || continue

      timestamp="${directory_name#"$backup_prefix"}"
      [[ "$timestamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
      backup_epoch="$(date -u -d "${timestamp:0:4}-${timestamp:4:2}-${timestamp:6:2} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2} UTC" '+%s')" || \
        fatal "Could not parse backup timestamp: $directory_name"

      if ((backup_epoch < cutoff_epoch)); then
        log "Purging expired complete backup ${remote_base%/}/${directory_name}"
        rclone purge "${remote_base%/}/${directory_name}"
      fi
    done <<<"$listing"
  done
}

safe_delete_staging_dir() {
  local staging_root="$1"
  local target="$2"

  [[ -n "$staging_root" && -n "$target" ]] || fatal "Refusing to delete an unresolved staging path"
  [[ "$target" == "${staging_root%/}/"* ]] || fatal "Refusing to delete path outside staging root: $target"
  [[ "$target" != "$staging_root" && "$target" != "${staging_root%/}/" ]] || fatal "Refusing to delete staging root"

  if [[ -d "$target" ]]; then
    find "$target" -depth -delete
  fi
}
