#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Restarting services..."

# Stop all services
docker compose down

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please run setup.sh first."
  echo "Usage: ./setup.sh <domain_name>"
  exit 1
fi

# Load environment variables
source .env

# Start the appropriate services with updated environment variables
if [ "$USE_WEBSERVER" = "false" ]; then
  # Start without the caddy service when using --no-webserver
  docker compose --profile essential up -d
else
  # Start all services including caddy
  docker compose up -d
fi

echo "Services restarted. You can monitor logs with: docker compose logs -f" 
