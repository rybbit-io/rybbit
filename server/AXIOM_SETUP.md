# Axiom Logging Setup

This guide explains how to configure Axiom for centralized logging in the Rybbit server.

## Prerequisites

1. Create an Axiom account at https://axiom.co
2. Create a new dataset for your logs (e.g., "rybbit-logs")
3. Generate an API token with ingest permissions

## Configuration

Add the following environment variables to your `.env` file:

```env
# Axiom logging
AXIOM_DATASET=your-dataset-name
AXIOM_TOKEN=xaat-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## How It Works

### Development Mode
When both `AXIOM_DATASET` and `AXIOM_TOKEN` are set in development:
- Logs are sent directly to Axiom using the Pino transport
- This is useful for testing your Axiom integration

Without Axiom credentials in development:
- Logs use pino-pretty for readable console output

### Production Mode
In production with Axiom configured:
- Logs are sent to both Axiom AND stdout simultaneously
- You can view logs in Axiom for powerful searching and analytics
- You can still use `docker logs` to see logs locally
- No additional piping or configuration needed

## Production Setup

For production, you have several options:

### Option 1: Using Axiom's log forwarder
```bash
# Install axiom CLI
curl -fsSL https://install.axiom.co/install.sh | sh

# Run your app and pipe to Axiom
npm start | axiom ingest $AXIOM_DATASET -t $AXIOM_TOKEN
```

### Option 2: Docker Compose
```yaml
services:
  app:
    image: your-app
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
  
  log-forwarder:
    image: axiomhq/axiom-forwarder
    environment:
      - AXIOM_DATASET=${AXIOM_DATASET}
      - AXIOM_TOKEN=${AXIOM_TOKEN}
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
```

### Option 3: Direct in Development
Set your environment variables and logs will be sent directly to Axiom:
```bash
AXIOM_DATASET=your-dataset AXIOM_TOKEN=your-token npm run dev
```

## Log Structure

All logs include:
- Service name (e.g., "monitor-scheduler", "notification-service")
- Structured data as the first parameter
- Log level (info, warn, error, debug)
- Timestamp and other metadata

Example:
```javascript
logger.info({ monitorId: 123, region: "us-east-1" }, "Health check completed");
```

## Viewing Logs in Axiom

1. Go to your Axiom dashboard
2. Select your dataset
3. Use APL (Axiom Processing Language) to query logs:

```apl
// View all errors
| where level == "error"

// View logs from a specific service
| where service == "notification-service"

// View logs for a specific monitor
| where monitorId == 123
```

## Benefits

- Centralized logging across all services
- Powerful search and analytics
- Real-time log streaming
- Alerts and dashboards
- No log rotation needed
- Cost-effective for high volume

## Troubleshooting

If logs aren't appearing in Axiom:
1. Check that environment variables are set correctly
2. Verify the API token has ingest permissions
3. Check the dataset name matches exactly
4. Look for connection errors in stdout logs