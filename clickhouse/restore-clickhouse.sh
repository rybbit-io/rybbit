#!/bin/bash
#
# ClickHouse Restore Script
# Restores ClickHouse Docker volume from Hetzner Storage Box backup
#
# Usage: ./restore-clickhouse.sh [YYYY-MM-DD]
#        If no date is provided, lists available backups
#

set -euo pipefail

# Configuration
CONTAINER_NAME="clickhouse"
VOLUME_NAME="clickhouse-data"
STORAGE_BOX_HOST="box"  # Uses ~/.ssh/config
BACKUP_BASE_DIR="/home/clickhouse-backups"
LOG_FILE="/var/log/clickhouse-restore.log"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $*"
    exit 1
}

# List available backups
list_backups() {
    log "Listing available backups on storage box..."
    echo ""
    echo "Available backups:"
    echo "=================="

    ssh "$STORAGE_BOX_HOST" "
        cd $BACKUP_BASE_DIR 2>/dev/null || { echo 'No backups found'; exit 1; }
        ls -1d 20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r | while read dir; do
            size=\$(du -sh \"\$dir\" 2>/dev/null | cut -f1)
            echo \"  \$dir  (\$size)\"
        done
    " || error "Failed to list backups"

    echo ""
    echo "Usage: $0 YYYY-MM-DD"
    exit 0
}

# Get Docker volume path on host
get_volume_path() {
    docker volume inspect "$VOLUME_NAME" --format '{{ .Mountpoint }}' 2>/dev/null || error "Failed to find volume: $VOLUME_NAME"
}

# Check if backup exists
check_backup_exists() {
    local backup_date="$1"
    local backup_dir="${BACKUP_BASE_DIR}/${backup_date}"

    log "Checking if backup exists: $backup_dir"
    if ! ssh "$STORAGE_BOX_HOST" "test -d $backup_dir"; then
        error "Backup not found: $backup_dir"
    fi

    log "Backup found: $backup_dir"
}

# Stop ClickHouse container
stop_container() {
    log "Stopping ClickHouse container..."

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop "$CONTAINER_NAME" || error "Failed to stop container"
        log "Container stopped successfully"
    else
        log "Container is not running"
    fi
}

# Start ClickHouse container
start_container() {
    log "Starting ClickHouse container..."

    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker start "$CONTAINER_NAME" || error "Failed to start container"
        log "Container started successfully"

        # Wait for container to be healthy
        log "Waiting for container to become healthy..."
        local max_wait=60
        local waited=0
        while [ $waited -lt $max_wait ]; do
            if docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "healthy"; then
                log "Container is healthy"
                return 0
            fi
            sleep 2
            waited=$((waited + 2))
        done

        log "Warning: Container did not become healthy within ${max_wait}s"
    else
        log "Container is already running"
    fi
}

# Perform restore using rsync
perform_restore() {
    local volume_path="$1"
    local backup_date="$2"
    local backup_dir="${BACKUP_BASE_DIR}/${backup_date}"

    log "Starting restore from backup..."
    log "Source: ${STORAGE_BOX_HOST}:${backup_dir}"
    log "Destination: $volume_path"

    # Create a backup of current data (just in case)
    local current_backup="${volume_path}.pre-restore-$(date '+%Y%m%d-%H%M%S')"
    log "Creating safety backup of current data: $current_backup"
    cp -r "$volume_path" "$current_backup" || log "Warning: Failed to create safety backup"

    # Clear existing data
    log "Clearing existing data in volume..."
    rm -rf "${volume_path:?}"/* || error "Failed to clear existing data"

    # Restore from storage box
    log "Restoring data from storage box..."
    if rsync -avz --stats \
        "${STORAGE_BOX_HOST}:${backup_dir}/" \
        "$volume_path/" 2>&1 | tee -a "$LOG_FILE"; then
        log "Restore completed successfully"
        log "Safety backup retained at: $current_backup"
        return 0
    else
        error "Restore failed with exit code: ${PIPESTATUS[0]}"
    fi
}

# Confirm restore operation
confirm_restore() {
    local backup_date="$1"

    echo ""
    echo "WARNING: This will REPLACE all current ClickHouse data!"
    echo "Backup date: $backup_date"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
}

# Main execution
main() {
    local backup_date="${1:-}"

    log "========================================="
    log "ClickHouse Restore Script"
    log "========================================="

    # If no date provided, list available backups
    if [ -z "$backup_date" ]; then
        list_backups
    fi

    # Validate date format
    if ! [[ "$backup_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        error "Invalid date format. Use YYYY-MM-DD"
    fi

    log "Restore date: $backup_date"

    # Check if backup exists
    check_backup_exists "$backup_date"

    # Confirm restore
    confirm_restore "$backup_date"

    # Get volume path
    local volume_path
    volume_path=$(get_volume_path)
    log "Volume path: $volume_path"

    # Stop container
    stop_container

    # Perform restore
    perform_restore "$volume_path" "$backup_date"

    # Start container
    start_container

    log "========================================="
    log "Restore completed successfully!"
    log "========================================="
    echo ""
    echo "ClickHouse has been restored from backup: $backup_date"
    echo "Check the container logs to verify everything is working:"
    echo "  docker logs -f $CONTAINER_NAME"
}

# Run main function
main "$@"
