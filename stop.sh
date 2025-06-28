#!/bin/ah

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Stopping services..."
docker compose stop

echo "Services stopped."
