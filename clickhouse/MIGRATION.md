Migration Steps

On Source Server (your current production):

# 1. Create a backup of the ClickHouse data volume

docker run --rm \
 -v rybbit_clickhouse-data:/source \
 -v /tmp:/backup \
 alpine tar czf /backup/clickhouse-data.tar.gz -C /source .

# 2. Copy to your local machine or transfer directly to new server

scp /tmp/clickhouse-data.tar.gz root@clickhouse:/tmp/

On New Server:

# 1. Upload the docker compose file and create .env

# Create .env file with your settings:

cat > .env << EOF
CLICKHOUSE_DB=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=frog
EOF

# 2. Create the volume and restore data (BEFORE starting ClickHouse)

docker volume create clickhouse-data

docker run --rm \
 -v clickhouse-data:/target \
 -v /tmp:/backup \
 alpine tar xzf /backup/clickhouse-data.tar.gz -C /target

# 3. Start ClickHouse

docker compose -f docker compose.clickhouse.yml up -d

# 4. Verify data

docker exec clickhouse clickhouse-client --password=frog --query="SHOW DATABASES"
docker exec clickhouse clickhouse-client --password=frog --query="SELECT count() FROM analytics.events"

✅ Yes, Volume Copy Works Because:

1. ClickHouse stores everything in /var/lib/clickhouse

   - Table definitions
   - Data files (compressed)
   - Metadata

2. Same ClickHouse version (25.4.2) - compatible format
3. Same configurations - copied from your cloud docker compose

Quick Test Locally First:

# On your Mac (if you want to test before remote server)

cd /Users/bill/Desktop/rybbit/server/src/db/clickhouse

# Start the standalone ClickHouse

docker compose -f docker compose.clickhouse.yml up -d

# Test connection

docker exec clickhouse clickhouse-client --password=frog --query="SELECT 1"

Time estimate: ~10-30 minutes depending on your data size and network speed between servers.
