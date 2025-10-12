#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Default values
USE_WEBSERVER="true"
GENERATE_PASSWORDS="true"
BACKEND_PORT="3001"
CLIENT_PORT="3002"
FORCE="false"

# Help function
show_help() {
  echo "Usage: $0 <domain_name> [options]"
  echo "Example: $0 myapp.example.com"
  echo "Example with no webserver: $0 myapp.example.com --no-webserver"
  echo ""
  echo "Options:"
  echo "  --no-webserver          Disable the built-in Caddy webserver"
  echo "  --backend-port <port>   Set custom host port for backend (default: 3001)"
  echo "  --client-port <port>    Set custom host port for client (default: 3002)"
  echo "  --insecure              Do not generate random password for database and clickhouse"
  echo "  --force                 Force override of the .env file"
  echo "  --help                  Show this help message"
}

generate_secret() {
  # Generate a secure random secret
  # Uses OpenSSL if available, otherwise falls back to /dev/urandom

  local length="$1"
  if [[ -z "$length" || ! "$length" =~ ^[0-9]+$ || "$length" -le 0 ]]; then
    echo "Usage: generate_secret <length>" >&2
    return 1
  fi

  if command -v openssl &> /dev/null; then
    openssl rand -hex $((length/2 + length%2)) | cut -c1-"$length"
  elif [ -e /dev/urandom ]; then
    head -c 512 /dev/urandom | tr -dc A-Za-z0-9 | head -c "$length"
  else
    echo "Error: Could not generate secure secret. Please install openssl or ensure /dev/urandom is available." >&2
    return 1
  fi
}


# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --no-webserver) 
      USE_WEBSERVER="false"
      shift
      ;;
    --insecure) 
      GENERATE_PASSWORDS="false"
      shift
      ;;
    --force) 
      FORCE="true"
      shift
      ;;         
    --backend-port)
      if [[ -z "$2" || "$2" =~ ^- ]]; then
        echo "Error: --backend-port requires a port number"
        show_help
        exit 1
      fi
      BACKEND_PORT="$2"
      shift 2
      ;;
    --client-port)
      if [[ -z "$2" || "$2" =~ ^- ]]; then
        echo "Error: --client-port requires a port number"
        show_help
        exit 1
      fi
      CLIENT_PORT="$2"
      shift 2
      ;;
    --help)
      show_help
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
    *)
      if [ -z "$DOMAIN_NAME" ]; then
        DOMAIN_NAME="$1"
      else
        echo "Error: Only one domain name can be specified"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# Check if domain name argument is provided
if [ -z "$DOMAIN_NAME" ]; then
  echo "Error: Domain name is required"
  show_help
  exit 1
fi

# Domain
BASE_URL="https://${DOMAIN_NAME}"

# Generate secret for better auth
BETTER_AUTH_SECRET=$(generate_secret 32)

# Check if .env exists
# We don't want to override the passwords by accident.
if [ -f ".env" ] && [ "$FORCE" != "true" ]; then
  echo "Error: setup already performed: .env file exists"
  echo "  Please use --force to override."
  echo "  CAUTION: This action will override the passwords. Make sure to back them up!"
  exit 1
fi

# Create or overwrite the .env file
echo "Creating .env file..."

# Start building the .env file with required variables
cat > .env << EOL
# Required variables configured by setup.sh
DOMAIN_NAME=${DOMAIN_NAME}
BASE_URL=${BASE_URL}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
DISABLE_SIGNUP=false
EOL

# Generate database and clickhouse passwords (by default).
# Omit this step if user passed --insecure
if [ "$GENERATE_PASSWORDS" = "true" ]; then
  echo "CLICKHOUSE_PASSWORD=$(generate_secret 16)" >> .env
  echo "POSTGRES_PASSWORD=$(generate_secret 16)" >> .env
fi

# Only add port variables if using custom ports or no webserver
if [ "$USE_WEBSERVER" = "false" ]; then
  # When not using the built-in webserver, expose ports to all interfaces
  if [ "$BACKEND_PORT" != "3001" ] || [ "$CLIENT_PORT" != "3002" ]; then
    # Custom ports specified
    echo "HOST_BACKEND_PORT=\"${BACKEND_PORT}:3001\"" >> .env
    echo "HOST_CLIENT_PORT=\"${CLIENT_PORT}:3002\"" >> .env
  else
    # Default ports, just expose them
    echo "HOST_BACKEND_PORT=\"3001:3001\"" >> .env
    echo "HOST_CLIENT_PORT=\"3002:3002\"" >> .env
  fi
elif [ "$BACKEND_PORT" != "3001" ] || [ "$CLIENT_PORT" != "3002" ]; then
  # Using webserver but with custom ports - bind to localhost only
  echo "HOST_BACKEND_PORT=\"127.0.0.1:${BACKEND_PORT}:3001\"" >> .env
  echo "HOST_CLIENT_PORT=\"127.0.0.1:${CLIENT_PORT}:3002\"" >> .env
fi

# Add USE_WEBSERVER only if it's false (since true is the default behavior)
if [ "$USE_WEBSERVER" = "false" ]; then
  echo "USE_WEBSERVER=false" >> .env
fi

echo ".env file created successfully with domain ${DOMAIN_NAME}."
if [ "$USE_WEBSERVER" = "false" ]; then
  echo "Caddy webserver is disabled. You'll need to set up your own webserver."
  if [ "$BACKEND_PORT" = "3001" ] && [ "$CLIENT_PORT" = "3002" ]; then
    echo "The backend service will be available on port 3001 and the client on port 3002."
  else 
    echo "The backend service will be available on port ${BACKEND_PORT} (mapped to container port 3001)"
    echo "The client service will be available on port ${CLIENT_PORT} (mapped to container port 3002)"
  fi
fi

# Build and start the Docker Compose stack
echo "Building and starting Docker services..."
if [ "$USE_WEBSERVER" = "false" ]; then
  # Start without the caddy service when using --no-webserver
  docker compose up -d backend client clickhouse postgres
else
  # Start all services including caddy
  docker compose up -d
fi

echo "Setup complete. Services are starting in the background."
echo "You can monitor logs with: docker compose logs -f" 
