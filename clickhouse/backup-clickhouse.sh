#!/bin/bash
#
# ClickHouse Backup Script
# Backs up ClickHouse Docker volume to Hetzner Storage Box
#
# Usage: ./backup-clickhouse.sh
#

set -euo pipefail

# Configuration
CONTAINER_NAME="clickhouse"
VOLUME_NAME="clickhouse-data"
STORAGE_BOX_HOST="box"  # Uses ~/.ssh/config
BACKUP_BASE_DIR="/home/clickhouse-backups"
RETENTION_DAYS=14
LOG_FILE="/var/log/clickhouse-backup.log"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*"
    exit 1
}

# Get Docker volume path on host
get_volume_path() {
    docker volume inspect "$VOLUME_NAME" --format '{{ .Mountpoint }}' 2>/dev/null || error "Failed to find volume: $VOLUME_NAME"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi

    # Check if rsync is installed
    if ! command -v rsync &> /dev/null; then
        error "rsync is not installed. Install with: apt install rsync"
    fi

    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        error "Container '$CONTAINER_NAME' does not exist"
    fi

    # Check if volume exists
    if ! docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
        error "Volume '$VOLUME_NAME' does not exist"
    fi

    # Check SSH connectivity to storage box
    # Use 'pwd' command which is supported by Hetzner storage box's restricted shell
    if ! ssh -o ConnectTimeout=10 "$STORAGE_BOX_HOST" "pwd" &> /dev/null; then
        error "Cannot connect to storage box via SSH. Check ~/.ssh/config and keys."
    fi

    log "All prerequisites satisfied"
}

# Create backup directory on storage box
create_backup_dir() {
    local backup_date="$1"
    local backup_dir="${BACKUP_BASE_DIR}/${backup_date}"

    log "Creating backup directory on storage box: $backup_dir"
    ssh "$STORAGE_BOX_HOST" "mkdir -p $backup_dir" || error "Failed to create backup directory"

    echo "$backup_dir"
}

# Perform backup using rsync
perform_backup() {
    local volume_path="$1"
    local backup_dir="$2"

    log "Starting rsync backup..."
    log "Source: $volume_path"
    log "Destination: ${STORAGE_BOX_HOST}:${backup_dir}"

    # Use rsync with compression and progress
    # -a: archive mode (preserves permissions, timestamps, etc.)
    # -v: verbose
    # -z: compress during transfer
    # --delete: remove files in dest that don't exist in source
    # --stats: show transfer statistics
    # -e "ssh -s sftp": Use SFTP subsystem (required for Hetzner Storage Box restricted shell)

    if rsync -avz --delete --stats -e "ssh -s sftp" \
        "$volume_path/" \
        "${STORAGE_BOX_HOST}:${backup_dir}/" 2>&1 | tee -a "$LOG_FILE"; then
        log "Backup completed successfully"
        return 0
    else
        error "Backup failed with exit code: ${PIPESTATUS[0]}"
    fi
}

# Rotate old backups (keep last N days)
rotate_backups() {
    log "Rotating old backups (keeping last $RETENTION_DAYS backups)..."

    # List all backup directories, sort, and delete old ones
    ssh "$STORAGE_BOX_HOST" "
        cd $BACKUP_BASE_DIR 2>/dev/null || exit 0
        ls -1d 20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r | tail -n +$((RETENTION_DAYS + 1)) | while read dir; do
            echo \"Removing old backup: \$dir\"
            rm -rf \"\$dir\"
        done
    " || log "Warning: Failed to rotate some backups"

    log "Backup rotation completed"
}

# Main execution
main() {
    local backup_date
    backup_date=$(date '+%Y-%m-%d')

    log "========================================="
    log "Starting ClickHouse backup for $backup_date"
    log "========================================="

    # Check prerequisites
    check_prerequisites

    # Get volume path
    local volume_path
    volume_path=$(get_volume_path)
    log "Found volume path: $volume_path"

    # Create backup directory
    local backup_dir
    backup_dir=$(create_backup_dir "$backup_date")

    # Perform backup
    perform_backup "$volume_path" "$backup_dir"

    # Rotate old backups
    rotate_backups

    log "========================================="
    log "Backup completed successfully!"
    log "========================================="
}

# Run main function
main "$@"
