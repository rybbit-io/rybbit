#!/bin/sh
set -e

# Wait for PostgreSQL to be ready (postgresql-client is already in the image)
echo "Waiting for PostgreSQL..."
until pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-frog}" -d "${POSTGRES_DB:-analytics}" -q; do
  sleep 1
done
echo "PostgreSQL is ready."

# Run file-based migrations
echo "Running database migrations..."
npm run db:migrate

# Start the application
echo "Starting application..."
exec "$@"
