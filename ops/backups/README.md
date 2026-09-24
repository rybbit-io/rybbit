# Database backups

These scripts create database-consistent backups for the three production
hosts. They intentionally do not archive live Docker volumes.

## Host map

| Host | PostgreSQL | ClickHouse |
| --- | --- | --- |
| FrogStats | Native `pg_dump` to B2 | Native `BACKUP` directly to B2 |
| Rybbit | Native `pg_dump` to B2 | Not backed up here; production uses the standalone host |
| ClickHouse | None | Native `BACKUP` staged locally and copied to B2 |

PostgreSQL dumps include a custom-format database archive, cluster globals,
and SHA-256 checksums. ClickHouse backs up only the `analytics` database, not
the large and regenerable `system` log tables.

The ClickHouse client receive timeout is raised to six hours because native
backups can produce no client-visible data for longer than the client's
five-minute default while the server is still making progress.

## Prerequisites

All hosts need Bash, Docker, `flock`, `curl`, and `rclone`. The `clickhouse`
container must provide `clickhouse-client`; the PostgreSQL container already
provides `pg_dump`, `pg_dumpall`, and `pg_restore`.

Create a private B2 bucket, enable server-side encryption, and optionally
enable a 7-14 day Object Lock. Give each host a separate application key
restricted to that host's prefix. Configure lifecycle rules in B2 rather than
giving the server credentials permission to delete old remote backups.

For PostgreSQL and locally staged ClickHouse backups, configure rclone as root:

```bash
sudo rclone config
sudo chmod 600 /root/.config/rclone/rclone.conf
```

The examples use a Backblaze remote named `backblaze`. Data is protected in
transit by TLS and at rest by B2 server-side encryption. The direct FrogStats
ClickHouse backup is written through ClickHouse's S3-compatible client. Its B2
credentials live in a ClickHouse named collection rather than the backup SQL.

## Install on each host

From a checkout of this repository:

```bash
sudo install -d -m 0755 /opt/rybbit-backups/bin
sudo install -m 0755 ops/backups/bin/backup-postgres.sh /opt/rybbit-backups/bin/
sudo install -m 0755 ops/backups/bin/backup-clickhouse.sh /opt/rybbit-backups/bin/
sudo install -m 0644 ops/backups/bin/common.sh /opt/rybbit-backups/bin/
```

Install the appropriate configuration without committing secrets:

```bash
# Choose frogstats.env.example, rybbit.env.example, or clickhouse.env.example.
sudo install -m 0600 ops/backups/config/HOST.env.example /etc/rybbit-backup.env
sudoedit /etc/rybbit-backup.env
```

The configuration file is sourced by Bash. Quote values containing `$`, spaces,
single quotes, or other shell metacharacters.

Validate configuration without touching either database or remote storage:

```bash
sudo env BACKUP_CONFIG=/etc/rybbit-backup.env DRY_RUN=true \
  /opt/rybbit-backups/bin/backup-postgres.sh
sudo env BACKUP_CONFIG=/etc/rybbit-backup.env DRY_RUN=true \
  /opt/rybbit-backups/bin/backup-clickhouse.sh
```

Only run the script relevant to the host. The Rybbit application host does not
have ClickHouse backup settings.

## FrogStats ClickHouse named collection

The direct S3 backup requires a named collection containing its B2 endpoint
and restricted application key. Install the template outside the repository:

```bash
sudo install -d -m 0750 /etc/rybbit-backup
sudo install -m 0640 -o root -g 101 \
  ops/backups/clickhouse/s3-named-collection.xml.example \
  /etc/rybbit-backup/clickhouse-s3.xml
sudoedit /etc/rybbit-backup/clickhouse-s3.xml
```

Create a dedicated backup-user password, store its hash in the user XML, and
store only the plaintext password in the root-readable backup environment:

```bash
backup_password="$(openssl rand -hex 32)"
backup_password_hash="$(printf '%s' "$backup_password" | sha256sum | cut -d' ' -f1)"

sudo install -m 0640 -o root -g 101 \
  ops/backups/clickhouse/backup-user.xml \
  /etc/rybbit-backup/clickhouse-backup-user.xml
sudo sed -i \
  "s/REPLACE_WITH_SHA256_PASSWORD/${backup_password_hash}/" \
  /etc/rybbit-backup/clickhouse-backup-user.xml
sudo sed -i \
  "s/^CLICKHOUSE_BACKUP_PASSWORD=.*/CLICKHOUSE_BACKUP_PASSWORD=${backup_password}/" \
  /etc/rybbit-backup.env
unset backup_password backup_password_hash
```

Then mount it into the FrogStats ClickHouse container:

```yaml
services:
  clickhouse:
    volumes:
      - /etc/rybbit-backup/clickhouse-s3.xml:/etc/clickhouse-server/config.d/backup-s3.xml:ro
      - /etc/rybbit-backup/clickhouse-backup-user.xml:/etc/clickhouse-server/users.d/backup-user.xml:ro
```

UID/GID 101 is the default ClickHouse user in the official image; confirm it
before installation if the image changes. Recreate ClickHouse and verify the
dedicated user's grants without printing the named collection contents:

```bash
docker exec clickhouse clickhouse-client \
  --user backup --query "SHOW GRANTS FOR backup"
```

The `backup` user is restricted to connections originating inside the
ClickHouse container. It can back up `analytics`, use the B2 named collection,
and access S3; it cannot read or mutate application data through ordinary SQL.
The FrogStats environment example selects this user for backups.

## Standalone ClickHouse staging disk

The standalone host creates one native backup and uploads the completed
snapshot to B2. Install the disk configuration outside the repository and
prepare the host staging directory:

```bash
sudo install -d -m 0750 /etc/rybbit-backup
sudo install -m 0640 -o root -g 101 \
  ops/backups/clickhouse/backup-disk.xml \
  /etc/rybbit-backup/clickhouse-backup-disk.xml
sudo install -d -m 0750 -o 101 -g 101 /var/backups/rybbit/clickhouse
```

Then add these mounts to its ClickHouse service:

```yaml
services:
  clickhouse:
    volumes:
      - /var/backups/rybbit/clickhouse:/var/lib/clickhouse/backups
      - /etc/rybbit-backup/clickhouse-backup-disk.xml:/etc/clickhouse-server/config.d/backup-disk.xml:ro
```

UID/GID 101 is the default ClickHouse user in the official image; confirm it if
the image changes. Restart ClickHouse after adding the disk configuration, then
confirm it exists:

```bash
docker exec clickhouse clickhouse-client \
  --query "SELECT name, path FROM system.disks WHERE name = 'backups'"
```

FrogStats uses direct S3 mode and does not need this staging disk.

## Test manually, then enable timers

Run the relevant service manually before enabling its timer:

```bash
sudo install -m 0644 ops/backups/systemd/*.service ops/backups/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload

sudo systemctl start rybbit-postgres-backup.service
sudo journalctl -u rybbit-postgres-backup.service -n 100 --no-pager

# FrogStats and the standalone ClickHouse host only:
sudo systemctl start rybbit-clickhouse-backup.service
sudo journalctl -u rybbit-clickhouse-backup.service -n 100 --no-pager
```

After verifying objects at every configured destination:

```bash
sudo systemctl enable --now rybbit-postgres-backup.timer
# FrogStats and the standalone ClickHouse host only:
sudo systemctl enable --now rybbit-clickhouse-backup.timer
```

The PostgreSQL timer runs every six hours. The ClickHouse timer runs daily with
a randomized delay. Use systemd timer overrides if the two ClickHouse hosts
should run in different windows.

B2 retention should be implemented with bucket lifecycle rules, especially
when Object Lock is enabled. Never add an Object-Locked B2 remote to
`CLICKHOUSE_PRUNE_REMOTES`.

## Restore drills

Always restore into a disposable container or a differently named database
first. Never test a restore against production.

For PostgreSQL, download one backup directory through the B2 remote, verify it,
restore globals, and then restore the custom archive:

```bash
cd /var/tmp/postgres-restore
sha256sum --check SHA256SUMS
docker exec -i postgres sh -ec \
  'exec psql -U "$POSTGRES_USER" -d postgres' < globals.sql
docker exec postgres sh -ec \
  'exec createdb -U "$POSTGRES_USER" analytics_restore'
docker exec -i postgres sh -ec \
  'exec pg_restore -U "$POSTGRES_USER" --dbname analytics_restore --clean --if-exists' \
  < database.dump
```

Review the globals SQL before applying it when restoring into a shared
PostgreSQL cluster.

For a direct S3 ClickHouse backup, use the installed named collection and a
different destination database name:

```sql
SET log_queries = 0;
RESTORE DATABASE analytics AS analytics_restore
FROM S3(b2_backups, 'BACKUP_DIRECTORY');
```

For a locally staged ClickHouse backup, download the complete backup directory
to the configured host staging root and restore it from the backup disk:

```sql
RESTORE DATABASE analytics AS analytics_restore
FROM Disk('backups', 'BACKUP_DIRECTORY');
```

Perform and record a restore drill at least monthly. A successful upload is not
proof that the backup can be restored.
