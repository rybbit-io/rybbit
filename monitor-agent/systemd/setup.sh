#!/bin/bash

# Setup script for Rybbit Monitor Agent with systemd
# Run with sudo: sudo ./setup.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
INSTALL_DIR="/opt/rybbit-monitor-agent"
SERVICE_USER="rybbit"
SERVICE_NAME="rybbit-monitor-agent"
NODE_VERSION="20"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Create service user
if ! id "$SERVICE_USER" &>/dev/null; then
    log_info "Creating service user: $SERVICE_USER"
    useradd --system --shell /bin/false --home-dir "$INSTALL_DIR" "$SERVICE_USER"
else
    log_info "Service user already exists: $SERVICE_USER"
fi

# Create installation directory
log_info "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"/{logs,dist}

# Check Node.js installation
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js $NODE_VERSION or later"
    exit 1
fi

NODE_MAJOR_VERSION=$(node -v | cut -d. -f1 | sed 's/v//')
if [[ $NODE_MAJOR_VERSION -lt $NODE_VERSION ]]; then
    log_error "Node.js version $NODE_VERSION or later is required. Current version: $(node -v)"
    exit 1
fi

# Copy application files
log_info "Copying application files..."
cp -r ../dist/* "$INSTALL_DIR/dist/"
cp ../package.json "$INSTALL_DIR/"

# Install production dependencies
log_info "Installing production dependencies..."
cd "$INSTALL_DIR"
npm ci --production

# Create environment file if it doesn't exist
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
    log_info "Creating environment file..."
    cat > "$INSTALL_DIR/.env" << EOF
# Rybbit Monitor Agent Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Region Configuration
REGION=${REGION:-us-east}
REGION_NAME=${REGION_NAME:-US East}

# Main Server
MAIN_SERVER_URL=https://your-rybbit-server.com

# Security - IP Whitelist (comma-separated)
# Leave empty to allow all IPs (not recommended for production)
ALLOWED_IPS=

# Monitoring Settings
DEFAULT_TIMEOUT_MS=30000
MAX_TIMEOUT_MS=60000

# Logging
LOG_LEVEL=info

# Health Check
HEALTH_CHECK_INTERVAL_MS=30000
EOF
    log_warn "Please edit $INSTALL_DIR/.env with your configuration"
fi

# Set proper permissions
log_info "Setting permissions..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
chmod 600 "$INSTALL_DIR/.env"

# Install systemd service
log_info "Installing systemd service..."
cp rybbit-monitor-agent.service /etc/systemd/system/
systemctl daemon-reload

# Enable and start service
log_info "Enabling service..."
systemctl enable "$SERVICE_NAME"

log_info "Starting service..."
systemctl start "$SERVICE_NAME"

# Check service status
sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log_info "Service started successfully!"
    systemctl status "$SERVICE_NAME" --no-pager
else
    log_error "Service failed to start"
    journalctl -u "$SERVICE_NAME" -n 50 --no-pager
    exit 1
fi

# Setup log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/rybbit-monitor-agent << EOF
$INSTALL_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $SERVICE_USER $SERVICE_USER
    sharedscripts
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

# Setup firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    log_info "Configuring firewall..."
    ufw allow 3000/tcp comment "Rybbit Monitor Agent"
fi

log_info "Installation complete!"
log_info ""
log_info "Next steps:"
log_info "1. Edit the configuration file: $INSTALL_DIR/.env"
log_info "2. Add IP whitelist for your main server"
log_info "3. Restart the service: systemctl restart $SERVICE_NAME"
log_info "4. Check logs: journalctl -u $SERVICE_NAME -f"
log_info ""
log_info "Service management commands:"
log_info "  Start:   systemctl start $SERVICE_NAME"
log_info "  Stop:    systemctl stop $SERVICE_NAME"
log_info "  Restart: systemctl restart $SERVICE_NAME"
log_info "  Status:  systemctl status $SERVICE_NAME"
log_info "  Logs:    journalctl -u $SERVICE_NAME -f"