# Logging Guide for Frogstats Backend

## Overview

This Fastify backend uses Pino for structured JSON logging. In production, logs are formatted as single-line JSON for easy parsing. In development, logs are pretty-printed for readability.

## Configuration

Logging is configured in `src/index.ts` when creating the Fastify instance:

- **Production**: Uses `@fastify/one-line-logger` for compact JSON logs
- **Development**: Uses `pino-pretty` for colorized, human-readable output
- **Log Level**: Set via `LOG_LEVEL` env var (defaults to "debug" in dev, "info" in prod)

## Usage Patterns

### 1. Route Handlers

In route handlers, use `request.log`:

```typescript
export async function getUsers(request: FastifyRequest, reply: FastifyReply) {
  request.log.info("Fetching users");

  try {
    const users = await fetchUsers();
    request.log.debug({ userCount: users.length }, "Users fetched successfully");
    return users;
  } catch (error) {
    request.log.error(error, "Failed to fetch users");
    throw error;
  }
}
```

### 2. Services and Classes

Import the logger utility and create a child logger:

```typescript
import { createServiceLogger } from "../../lib/logger/logger.js";

export class MyService {
  private logger = createServiceLogger("my-service");

  async doSomething() {
    this.logger.info("Starting operation");
    // ...
  }
}
```

### 3. Server-level Logging

Use `server.log` for server-wide events:

```typescript
server.log.info("Server started on port 3001");
server.log.error(error, "Shutdown error");
```

## Log Levels

Use appropriate levels for different scenarios:

- `fatal`: Application is unusable, will exit
- `error`: Error conditions (exceptions, failures)
- `warn`: Warning conditions (deprecations, recoverable issues)
- `info`: Informational messages (startup, shutdown, major operations)
- `debug`: Debug information (detailed operation info)
- `trace`: Very detailed trace information

## Best Practices

1. **Structure your logs**: Pass objects as the first parameter for structured data

   ```typescript
   logger.info({ userId: 123, action: "login" }, "User logged in");
   ```

2. **Include context**: Add relevant data to help with debugging

   ```typescript
   request.log.info({ monitorId, region }, "Running health check");
   ```

3. **Log errors properly**: Pass error as first param for proper stack traces

   ```typescript
   logger.error(error, "Operation failed");
   ```

4. **Avoid sensitive data**: Never log passwords, tokens, or PII

   ```typescript
   logger.info({ userId: user.id }, "User authenticated"); // Good
   logger.info({ user }, "User authenticated"); // Bad - might contain password
   ```

5. **Use child loggers**: Create scoped loggers for services/modules
   ```typescript
   const logger = parentLogger.child({ service: "uptime" });
   ```

## Migration from console.log

Replace console statements with appropriate logger calls:

- `console.log()` → `logger.info()`
- `console.error()` → `logger.error()`
- `console.warn()` → `logger.warn()`
- `console.debug()` → `logger.debug()`

### Migration Progress

✅ **Completed Services:**

- All uptime monitoring services (monitorExecutor, monitorScheduler, regionHealthChecker, notificationService)
- Core services (usageService, telemetryService, sessionsService)
- Storage service (r2StorageService)
- Main server file (index.ts)

⏳ **Remaining:**

- API endpoints (stripe webhook, session replay, admin routes)
- Library files (auth, twilio, etc.)
- Request validation services

## Environment Variables

- `LOG_LEVEL`: Set the minimum log level (trace, debug, info, warn, error, fatal)
- `NODE_ENV`: Determines log format (production vs development)
- `AXIOM_DATASET`: Axiom dataset name for centralized logging (optional)
- `AXIOM_TOKEN`: Axiom API token for log ingestion (optional)

## Example Service Refactoring

Before:

```typescript
console.log("Service starting...");
console.error("Failed to connect:", error);
```

After:

```typescript
import { createServiceLogger } from "../../lib/logger/logger.js";

class MyService {
  private logger = createServiceLogger("my-service");

  start() {
    this.logger.info("Service starting...");
  }

  handleError(error: Error) {
    this.logger.error(error, "Failed to connect");
  }
}
```
