#!/usr/bin/env bash

set -Eeuo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-$REPO_ROOT/ops/backups/bin/backup-clickhouse.sh}"
TEST_ROOT="$(mktemp -d)"
trap 'find "$TEST_ROOT" -depth -delete' EXIT

mkdir -p "$TEST_ROOT/bin"

cat >"$TEST_ROOT/bin/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >"$DOCKER_ARGS_LOG"
cat >/dev/null
EOF
chmod +x "$TEST_ROOT/bin/docker"

cat >"$TEST_ROOT/bin/flock" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$TEST_ROOT/bin/flock"

cat >"$TEST_ROOT/config.env" <<'EOF'
BACKUP_HOST=test
CLICKHOUSE_CONTAINER=clickhouse
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_BACKUP_MODE=s3
CLICKHOUSE_BACKUP_USER=backup
CLICKHOUSE_BACKUP_PASSWORD=test-password
CLICKHOUSE_S3_NAMED_COLLECTION=b2_backups
CLICKHOUSE_BACKUP_RECEIVE_TIMEOUT=21600
EOF

export DOCKER_ARGS_LOG="$TEST_ROOT/docker-args"
PATH="$TEST_ROOT/bin:$PATH" \
  BACKUP_CONFIG="$TEST_ROOT/config.env" \
  CLICKHOUSE_LOCK_FILE="$TEST_ROOT/backup.lock" \
  "$BACKUP_SCRIPT" >/dev/null

grep -F -- '-e RYBBIT_BACKUP_RECEIVE_TIMEOUT=21600' "$DOCKER_ARGS_LOG" >/dev/null
grep -F -- '--receive_timeout "$RYBBIT_BACKUP_RECEIVE_TIMEOUT"' "$DOCKER_ARGS_LOG" >/dev/null

printf 'ClickHouse backup receive-timeout regression test passed\n'
