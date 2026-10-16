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

    # Check if tar is installed
    if ! command -v tar &> /dev/null; then
        error "tar is not installed"
    fi

    # Check if scp is installed
    if ! command -v scp &> /dev/null; then
        error "scp is not installed"
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

# Perform backup using tar + scp
perform_backup() {
    local volume_path="$1"
    local backup_date="$2"
    local backup_file="clickhouse-backup-${backup_date}.tar"
    local temp_backup="/tmp/${backup_file}"

    log "Starting backup..."
    log "Source: $volume_path"
    log "Destination: ${STORAGE_BOX_HOST}:${BACKUP_BASE_DIR}/${backup_file}"

    # Create tar archive (no compression - ClickHouse data is already compressed)
    # --ignore-failed-read: Continue even if files are deleted/changed during backup (normal for live DB)
    log "Creating tar archive..."
    if tar -cf "$temp_backup" --ignore-failed-read -C "$volume_path" . 2>&1 | tee -a "$LOG_FILE"; then
        local archive_size=$(du -h "$temp_backup" | cut -f1)
        log "Archive created successfully (size: $archive_size)"
    else
        local tar_exit=$?
        # Exit code 1 means "some files differ" which is normal for live databases
        if [ $tar_exit -eq 1 ]; then
            local archive_size=$(du -h "$temp_backup" | cut -f1)
            log "Archive created with warnings (size: $archive_size) - this is normal for live databases"
        else
            rm -f "$temp_backup"
            error "Failed to create archive (exit code: $tar_exit)"
        fi
    fi

    # Upload to storage box using scp
    log "Uploading to storage box..."
    if scp "$temp_backup" "${STORAGE_BOX_HOST}:${BACKUP_BASE_DIR}/${backup_file}" 2>&1 | tee -a "$LOG_FILE"; then
        log "Upload completed successfully"
        rm -f "$temp_backup"
        return 0
    else
        rm -f "$temp_backup"
        error "Upload failed with exit code: ${PIPESTATUS[0]}"
    fi
}

# Rotate old backups (delete backups older than RETENTION_DAYS days)
# The storage box's restricted shell has no pipes/sort/while, so list via sftp,
# pick old files locally by the date in the filename, and delete via sftp batch.
rotate_backups() {
    log "Rotating old backups (deleting backups older than $RETENTION_DAYS days)..."

    local cutoff_date
    cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
    log "Cutoff date: $cutoff_date (backups dated before this will be deleted)"

    local backups
    backups=$(echo "ls ${BACKUP_BASE_DIR}/clickhouse-backup-*.tar" | sftp -b - "$STORAGE_BOX_HOST" 2>/dev/null \
        | grep -o 'clickhouse-backup-[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\.tar' | sort -u) || true

    if [ -z "$backups" ]; then
        log "No backups found on storage box, nothing to rotate"
        return 0
    fi

    # ISO dates compare correctly as strings; "-rm" keeps the batch going on failure
    local delete_batch=""
    local file file_date
    while read -r file; do
        file_date="${file#clickhouse-backup-}"
        file_date="${file_date%.tar}"
        if [[ "$file_date" < "$cutoff_date" ]]; then
            log "Deleting old backup: $file"
            delete_batch+="-rm ${BACKUP_BASE_DIR}/${file}"$'\n'
        fi
    done <<< "$backups"

    if [ -z "$delete_batch" ]; then
        log "No backups older than $RETENTION_DAYS days"
        return 0
    fi

    if echo "$delete_batch" | sftp -b - "$STORAGE_BOX_HOST" 2>&1 | tee -a "$LOG_FILE"; then
        log "Backup rotation completed"
    else
        log "Warning: Failed to delete some old backups"
    fi
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

    # Ensure backup directory exists on storage box
    log "Ensuring backup directory exists on storage box..."
    ssh "$STORAGE_BOX_HOST" "mkdir -p $BACKUP_BASE_DIR" || error "Failed to create backup directory"

    # Perform backup
    perform_backup "$volume_path" "$backup_date"

    # Rotate old backups
    rotate_backups

    log "========================================="
    log "Backup completed successfully!"
    log "========================================="
}

# Run main function
main "$@"
