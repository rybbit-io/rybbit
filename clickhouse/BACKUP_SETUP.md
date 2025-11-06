# ClickHouse Backup Setup Guide

This guide walks you through setting up automated daily backups of your ClickHouse data to a Hetzner Storage Box.

## Overview

- **Backup Method**: Compressed tar archives transferred via SCP
- **Schedule**: Daily at midnight
- **Retention**: Last 14 backups
- **Destination**: Hetzner Storage Box (`u506048.your-storagebox.de`)

## Prerequisites

✅ SSH key authentication configured for storage box (already done via `~/.ssh/config`)
✅ Docker and ClickHouse container running
✅ Sufficient storage space on storage box (recommend 1TB+ for session replay data)
✅ tar and scp installed (usually pre-installed on Linux)

## Installation Steps

### 1. Set up files

Since you're already on the ClickHouse server with the git repo:

```bash
# Navigate to the repo
cd /home/rybbit

# Make scripts executable
chmod +x clickhouse/backup-clickhouse.sh
chmod +x clickhouse/restore-clickhouse.sh

# Copy systemd files to /etc/systemd/system
# (scripts will run directly from /home/rybbit/clickhouse/)
cp clickhouse/clickhouse-backup.service /etc/systemd/system/
cp clickhouse/clickhouse-backup.timer /etc/systemd/system/
chmod 644 /etc/systemd/system/clickhouse-backup.service
chmod 644 /etc/systemd/system/clickhouse-backup.timer
```

### 2. Test SSH connection to storage box

```bash
ssh box "pwd"
```

You should see `/home` output.

### 3. Enable and start the backup timer

```bash
# Reload systemd to recognize new files
systemctl daemon-reload

# Enable the timer (starts automatically on boot)
systemctl enable clickhouse-backup.timer

# Start the timer now
systemctl start clickhouse-backup.timer

# Verify the timer is active
systemctl status clickhouse-backup.timer
```

### 4. Run your first backup (optional - test before waiting for midnight)

```bash
# Manually trigger a backup to test everything works
systemctl start clickhouse-backup.service

# Watch the backup progress
journalctl -u clickhouse-backup.service -f
```

## Monitoring & Management

### Check timer status

```bash
# See when the next backup will run
systemctl status clickhouse-backup.timer

# List all timers
systemctl list-timers
```

### View backup logs

```bash
# View recent backup logs
journalctl -u clickhouse-backup.service -n 100

# Follow logs in real-time
journalctl -u clickhouse-backup.service -f

# View logs from specific date
journalctl -u clickhouse-backup.service --since "2025-01-01"

# Check the backup log file
tail -f /var/log/clickhouse-backup.log
```

### Manual backup

```bash
# Trigger a backup anytime
systemctl start clickhouse-backup.service
```

### List available backups

```bash
# SSH into storage box and list backups
ssh box "ls -lh /home/clickhouse-backups/"

# Shows files like:
# clickhouse-backup-2025-11-06.tar.gz
# clickhouse-backup-2025-11-05.tar.gz
# etc.

# Or use the restore script (shows formatted list)
/home/rybbit/clickhouse/restore-clickhouse.sh
```

## Restore from Backup

The restore script works in two scenarios:

### Scenario 1: Restore to existing server (disaster recovery)
Container and volume already exist, you're restoring old data.

### Scenario 2: Restore to fresh server (new setup)
No container yet, you want to populate the volume before first run.

### List available backups

```bash
/home/rybbit/clickhouse/restore-clickhouse.sh
```

This will show all available backups with their sizes.

### Restore from specific date

```bash
# Restore from backup (e.g., 2025-11-04)
/home/rybbit/clickhouse/restore-clickhouse.sh 2025-11-04
```

**What happens:**
1. **Checks prerequisites** (Docker, tar, scp, SSH access)
2. **Creates volume if needed** (for fresh server scenario)
3. **Stops container if it exists** (skips if no container)
4. **Creates safety backup** of current data (if volume has data)
5. **Downloads compressed archive** from storage box to `/tmp`
6. **Extracts archive** to volume
7. **Starts container if it exists** (otherwise shows you how to start it)

You will be prompted to confirm before proceeding.

**Note**: The restore process downloads the entire backup archive before extracting, so ensure you have sufficient disk space in `/tmp`.

### Fresh server setup example

```bash
# On new server with git repo cloned
cd /home/rybbit

# Set up SSH access to storage box
cp ~/.ssh/id_rsa /root/.ssh/
cp ~/.ssh/config /root/.ssh/

# Restore data (creates volume automatically)
/home/rybbit/clickhouse/restore-clickhouse.sh 2025-11-05

# Now start the container with pre-populated data
docker compose -f clickhouse/docker-compose.clickhouse.yml up -d
```

## Troubleshooting

### Backup failing?

```bash
# Check service status
systemctl status clickhouse-backup.service

# View detailed logs
journalctl -u clickhouse-backup.service -n 200 --no-pager

# Check log file
cat /var/log/clickhouse-backup.log
```

### Common issues:

1. **"Cannot connect to storage box via SSH"**
   ```bash
   # Test SSH connection
   ssh box "pwd"

   # Check SSH config
   cat /root/.ssh/config

   # Verify systemd service runs as root and has access to /root/.ssh/
   ls -la /root/.ssh/

   # Test SCP
   echo "test" > /tmp/test.txt
   scp /tmp/test.txt box:/home/test.txt
   ssh box "rm /home/test.txt"
   ```

2. **"tar is not installed"** (unlikely)
   ```bash
   apt install tar -y
   ```

3. **"Failed to find volume: clickhouse-data"**
   ```bash
   # Check volume exists
   docker volume ls | grep clickhouse

   # Check container name
   docker ps -a | grep clickhouse
   ```

4. **"Permission denied"**
   ```bash
   # Ensure scripts are executable
   chmod +x /home/rybbit/clickhouse/backup-clickhouse.sh
   chmod +x /home/rybbit/clickhouse/restore-clickhouse.sh
   ```

5. **"No space left on device"**
   ```bash
   # Check local disk space (for tar archive creation)
   df -h /tmp

   # Check storage box space
   ssh box "df -h"
   ```

6. **Timer not running**
   ```bash
   # Reload systemd
   systemctl daemon-reload

   # Re-enable timer
   systemctl enable clickhouse-backup.timer
   systemctl start clickhouse-backup.timer
   ```

### Check storage box disk space

```bash
ssh box "df -h"
```

### Manually test backup

```bash
# Test creating a tar archive
tar -czf /tmp/test-backup.tar.gz -C /var/lib/docker/volumes/clickhouse-data/_data .

# Check size
ls -lh /tmp/test-backup.tar.gz

# Test upload to storage box
scp /tmp/test-backup.tar.gz box:/home/test-backup.tar.gz

# Clean up
rm /tmp/test-backup.tar.gz
ssh box "rm /home/test-backup.tar.gz"
```

## Disk Space Estimates

ClickHouse data size depends heavily on:
- Number of events tracked
- Session replay usage (can be 1000x larger than analytics data)
- Retention period (currently 30 days)

**Recommendations**:
- Monitor initial backup size (compressed tar.gz archives)
- Compression typically reduces size by 50-70% (depends on data type)
- Ensure storage box has at least 2-3x your current uncompressed data size
- With 14-day retention, you need ~7-14x compressed backup size

**Example**:
- ClickHouse data: 50GB uncompressed
- Compressed archive: ~15-25GB (varies by data)
- 14 days retention: ~210-350GB storage box space needed

## Configuration Changes

All configuration is in the backup script `/home/rybbit/clickhouse/backup-clickhouse.sh`:

```bash
# Edit backup script
nano /home/rybbit/clickhouse/backup-clickhouse.sh
```

**Common changes**:

1. **Change retention period** (default: 14 days):
   ```bash
   RETENTION_DAYS=30  # Keep 30 backups instead
   ```

2. **Change backup directory** on storage box:
   ```bash
   BACKUP_BASE_DIR="/home/my-custom-backup-dir"
   ```

3. **Change log file location**:
   ```bash
   LOG_FILE="/var/log/my-custom-backup.log"
   ```

After making changes, test the backup:
```bash
systemctl start clickhouse-backup.service
journalctl -u clickhouse-backup.service -f
```

## Backup Schedule Changes

To change the backup time, edit the timer file:

```bash
nano /etc/systemd/system/clickhouse-backup.timer
```

**Examples**:

- **Run at 2:00 AM**:
  ```ini
  OnCalendar=*-*-* 02:00:00
  ```

- **Run every 12 hours**:
  ```ini
  OnCalendar=00/12:00:00
  ```

- **Run every 6 hours**:
  ```ini
  OnCalendar=00/6:00:00
  ```

After changes:
```bash
systemctl daemon-reload
systemctl restart clickhouse-backup.timer
systemctl status clickhouse-backup.timer
```

## Security Notes

- Backups are transmitted over SSH (encrypted)
- Storage box credentials are in `~/.ssh/config`
- Systemd service runs as root (required for Docker volume access)
- Consider setting up storage box sub-accounts for better security

## Performance Notes

- **Backup time**: Depends on data size and network speed
  - Compression phase: CPU-intensive (creates tar.gz archive)
  - Upload phase: Network-bound (SCP transfer)
  - Total time: Can take hours for large datasets (e.g., 100GB+ data)

- **Disk space**: Temporary archive stored in `/tmp` during backup
  - Requires free space equal to compressed archive size
  - Archive is deleted after successful upload

- **Network impact**:
  - Transfers compressed data only
  - SCP provides built-in compression and encryption

- **Server impact**:
  - CPU limited to 50% (CPUQuota in service file)
  - Memory limited to 2GB (MemoryLimit in service file)
  - Low I/O priority (IOWeight=100)

- **No downtime**: ClickHouse keeps running during backup

## Uninstall

To remove the backup system:

```bash
# Stop and disable timer
systemctl stop clickhouse-backup.timer
systemctl disable clickhouse-backup.timer

# Remove systemd files
rm /etc/systemd/system/clickhouse-backup.service
rm /etc/systemd/system/clickhouse-backup.timer

# Scripts remain in git repo at /home/rybbit/clickhouse/
# No need to delete them unless you're removing the entire repo

# Remove log file (optional)
rm /var/log/clickhouse-backup.log

# Reload systemd
systemctl daemon-reload
```

To remove backups from storage box:

```bash
ssh box "rm -rf /home/clickhouse-backups"
```

## Support

If you encounter issues:

1. Check logs: `journalctl -u clickhouse-backup.service -n 200`
2. Test SSH: `ssh box "echo test"`
3. Check disk space: `ssh box "df -h"`
4. Verify container: `docker ps | grep clickhouse`
5. Test manual backup: `/home/rybbit/clickhouse/backup-clickhouse.sh`

## Next Steps

✅ Verify first backup completed successfully
✅ Monitor storage box disk usage
✅ Set calendar reminder to test restore process (quarterly recommended)
✅ Document restore procedure in your runbook
✅ Consider setting up monitoring/alerting for failed backups
