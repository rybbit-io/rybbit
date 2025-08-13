# Rybbit Monitor Agent

Regional monitoring agent for Rybbit uptime monitoring system. This lightweight service runs on VPS instances in different regions to execute monitoring checks.

## Features

- HTTP/HTTPS monitoring with detailed timing information
- TCP port monitoring
- DNS monitoring (coming soon)
- SMTP monitoring (coming soon)
- PING monitoring (coming soon)
- Authentication via API key
- Health check endpoint
- Prometheus metrics (coming soon)

## Deployment

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration:
- `REGION`: Unique identifier for this region (e.g., 'us-east', 'europe')
- `API_KEY`: Shared secret with main server
- `ALLOWED_IPS`: Optional IP whitelist for main server

### 2. Docker Deployment

Build and run with Docker:

```bash
# Build
docker build -t monitor-agent .

# Run
docker run -d \
  --name monitor-agent \
  -p 3003:3003 \
  --env-file .env \
  --restart always \
  monitor-agent
```

### 3. Docker Compose

```yaml
version: '3.8'
services:
  monitor-agent:
    build: .
    ports:
      - "3003:3003"
    env_file:
      - .env
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 4. Direct Node.js

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## API Endpoints

### POST /execute
Execute a monitoring check.

Request:
```json
{
  "jobId": "unique-job-id",
  "monitorId": 123,
  "monitorType": "http",
  "config": {
    "url": "https://example.com",
    "method": "GET",
    "timeoutMs": 30000
  },
  "validationRules": []
}
```

Response:
```json
{
  "jobId": "unique-job-id",
  "region": "us-east",
  "status": "success",
  "responseTimeMs": 234,
  "statusCode": 200,
  "headers": {},
  "timing": {
    "dnsMs": 12,
    "tcpMs": 45,
    "tlsMs": 67,
    "ttfbMs": 123,
    "transferMs": 111
  }
}
```

### GET /health
Health check endpoint.

### GET /metrics
Prometheus metrics endpoint (coming soon).

## Regional Deployment

### Recommended VPS Providers

1. **US-East**: DigitalOcean NYC, Vultr New Jersey
2. **US-West**: Vultr Los Angeles, Linode Fremont
3. **Europe**: Hetzner Frankfurt, DigitalOcean Amsterdam
4. **Asia**: Vultr Singapore, Linode Tokyo

### Deployment Script

```bash
#!/bin/bash
REGION=$1
DOCKER_IMAGE="your-registry.com/monitor-agent:$REGION"

# Build and push
docker build -t $DOCKER_IMAGE .
docker push $DOCKER_IMAGE

# Deploy to VPS
ssh $REGION_HOST << EOF
  docker pull $DOCKER_IMAGE
  docker stop monitor-agent || true
  docker rm monitor-agent || true
  docker run -d \
    --name monitor-agent \
    -p 443:3003 \
    --env-file /etc/monitor-agent/.env \
    --restart always \
    $DOCKER_IMAGE
EOF
```

## Security Considerations

1. Always use HTTPS in production (reverse proxy with Caddy)
2. Keep API keys secure and rotate regularly
3. Use IP whitelisting when possible
4. Monitor agent logs for suspicious activity
5. Keep the agent updated with security patches

## Monitoring the Monitor

The main server should health check each agent:
- Check `/health` endpoint every 30 seconds
- Alert if agent is down
- Automatic failover to other regions if needed