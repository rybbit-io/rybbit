#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting services..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please run setup.sh first."
  echo "Usage: ./setup.sh <domain_name>"
  exit 1
fi

# Load environment variables
source .env

if [ "$USE_WEBSERVER" = "false" ]; then
  # Start without the caddy service when using --no-webserver
  docker compose start backend client clickhouse postgres
else
  # Start all services including caddy
  docker compose start
fi

echo "Services started. You can monitor logs with: docker compose logs -f" 