#!/bin/bash

# Deploy script for monitor agents
# Usage: ./deploy.sh [region] [action]
# Example: ./deploy.sh us-east deploy

set -e

REGION=${1:-us-east}
ACTION=${2:-deploy}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-docker.io}
DOCKER_IMAGE=${DOCKER_IMAGE:-rybbit/monitor-agent}
VERSION=${VERSION:-latest}

# Region configurations
declare -A REGIONS
REGIONS["us-east"]="user@us-east-monitor.example.com"
REGIONS["us-west"]="user@us-west-monitor.example.com"
REGIONS["europe"]="user@europe-monitor.example.com"
REGIONS["asia"]="user@asia-monitor.example.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if region exists
if [[ ! ${REGIONS[$REGION]} ]]; then
    log_error "Unknown region: $REGION"
    echo "Available regions: ${!REGIONS[@]}"
    exit 1
fi

SERVER=${REGIONS[$REGION]}

case $ACTION in
    build)
        log_info "Building Docker image for $REGION..."
        docker build -t $DOCKER_IMAGE:$REGION .
        docker tag $DOCKER_IMAGE:$REGION $DOCKER_REGISTRY/$DOCKER_IMAGE:$REGION
        docker tag $DOCKER_IMAGE:$REGION $DOCKER_REGISTRY/$DOCKER_IMAGE:$VERSION
        ;;
        
    push)
        log_info "Pushing Docker image for $REGION..."
        docker push $DOCKER_REGISTRY/$DOCKER_IMAGE:$REGION
        docker push $DOCKER_REGISTRY/$DOCKER_IMAGE:$VERSION
        ;;
        
    deploy)
        log_info "Deploying to $REGION ($SERVER)..."
        
        # Build and push first
        $0 $REGION build
        $0 $REGION push
        
        # Deploy to server
        ssh $SERVER << EOF
            set -e
            
            # Create directories
            mkdir -p /opt/rybbit-monitor-agent
            cd /opt/rybbit-monitor-agent
            
            # Create .env file if it doesn't exist
            if [ ! -f .env ]; then
                echo "Creating .env file..."
                cat > .env << 'ENVFILE'
PORT=3003
HOST=0.0.0.0
REGION=$REGION
ALLOWED_IPS=\${ALLOWED_IPS:-}
LOG_LEVEL=info
ENVFILE
                echo "Please edit /opt/rybbit-monitor-agent/.env with correct values"
            fi
            
            # Pull latest image
            docker pull $DOCKER_REGISTRY/$DOCKER_IMAGE:$REGION
            
            # Stop existing container
            docker stop rybbit-monitor-agent 2>/dev/null || true
            docker rm rybbit-monitor-agent 2>/dev/null || true
            
            # Start new container
            docker run -d \
                --name rybbit-monitor-agent \
                --restart always \
                -p 3003:3003 \
                --env-file .env \
                -e REGION=$REGION \
                $DOCKER_REGISTRY/$DOCKER_IMAGE:$REGION
                
            # Check if container is running
            sleep 5
            if docker ps | grep -q rybbit-monitor-agent; then
                echo "Container started successfully"
                docker logs --tail 20 rybbit-monitor-agent
            else
                echo "Container failed to start"
                docker logs rybbit-monitor-agent
                exit 1
            fi
EOF
        log_info "Deployment to $REGION completed!"
        ;;
        
    status)
        log_info "Checking status of $REGION ($SERVER)..."
        ssh $SERVER << EOF
            echo "=== Container Status ==="
            docker ps -a | grep rybbit-monitor-agent || echo "No container found"
            echo ""
            echo "=== Recent Logs ==="
            docker logs --tail 20 rybbit-monitor-agent 2>&1 || echo "No logs available"
            echo ""
            echo "=== Health Check ==="
            curl -s http://localhost:3003/health | jq . || echo "Health check failed"
EOF
        ;;
        
    logs)
        log_info "Fetching logs from $REGION ($SERVER)..."
        ssh $SERVER "docker logs --tail 100 -f rybbit-monitor-agent"
        ;;
        
    restart)
        log_info "Restarting $REGION ($SERVER)..."
        ssh $SERVER "docker restart rybbit-monitor-agent"
        ;;
        
    stop)
        log_info "Stopping $REGION ($SERVER)..."
        ssh $SERVER "docker stop rybbit-monitor-agent"
        ;;
        
    *)
        echo "Usage: $0 [region] [action]"
        echo "Regions: ${!REGIONS[@]}"
        echo "Actions: build, push, deploy, status, logs, restart, stop"
        exit 1
        ;;
esac