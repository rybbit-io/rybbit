#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Updating to the latest version..."

# Stash any local changes
echo "Stashing local changes, if any..."
git stash

# Pull latest changes from git repository
echo "Pulling latest code..."
git pull

# Stop running containers
echo "Stopping current services..."
docker compose down

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please run setup.sh first."
  echo "Usage: ./setup.sh <domain_name>"
  exit 1
fi

# Pull latest Docker images
echo "Pulling latest Docker images..."
docker compose pull

# Rebuild and start containers
echo "Rebuilding and starting updated services..."

# Load environment variables
source .env

if [ "$USE_WEBSERVER" = "false" ]; then
  # Start without the caddy service when using --no-webserver
  docker compose up -d --force-recreate
else
  # Start all services including caddy
  docker compose --profile with-webserver up -d --force-recreate
fi

echo "Update complete. Services are running with the latest version."
echo "You can monitor logs with: docker compose logs -f" 
