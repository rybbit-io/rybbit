# Analytics Backend

Self-hosted analytics backend using ClickHouse.

## Dashboard response cache

Dashboard aggregates share a Redis cache across users and backend workers. This
applies to both standard queries and the lite endpoints backed by materialized
views. No ClickHouse schema changes are required.

`DASHBOARD_CACHE_TTL_SECONDS` defaults to `30`, is capped at 30 seconds, and can be
set to `0` to disable caching and request coalescing. Successful JSON responses up
to 256 KiB expire based on when their query started; reading a cached response
does not extend its lifetime. Identical requests arriving while a query is running
share that query, including across workers. Redis failures fall back to the
original handler.

Cached endpoints under `/api/sites/:siteId/`:

- `overview`, `overview/time-series`, `overview-lite`, `overview-bucketed-lite`
- `metric`, `metric-lite`, `page-titles`
- `events/names`, `events/autocapture`, `events/outbound`

Live user counts, sessions, user details, custom SQL, and all other endpoints
remain uncached. Every request still runs access checks, time validation, and
saved-segment expansion before looking up a cached result. Cache keys include the
ClickHouse host/database, resolved Site, endpoint, and complete expanded query,
so different time ranges, filters, timezones, and pagination cannot share results.

For diagnostics, inspect the `X-Rybbit-Cache` response header: `MISS` ran the
handler, `HIT` reused a response, and `COALESCED` shared work with an earlier
request. Send `Cache-Control: no-cache` to bypass both caching and coalescing for
a fresh read. Errors are only shared with requests already waiting for that
query; later requests can retry immediately.

This improves repeat loads and reduces database contention from simultaneous
viewers. The first request for a new selection still pays the underlying query
cost, so measure cold and warm loads separately when evaluating performance.

## Development

### Prerequisites

- Node.js (v22.1.0 or higher)
- npm

### Installation

```bash
npm install
```

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Testing

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test
```

### Database Operations

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes
npm run db:push

# Pull schema from database
npm run db:pull

# Drop database
npm run db:drop

# Check migrations
npm run db:check
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Test files should be placed alongside source files with the `.test.ts` extension.

### Current Test Coverage

- `normalizeOrigin` function: Comprehensive tests covering subdomain removal, multi-level TLD handling, URL parsing, edge cases, and error handling.

### Running Specific Tests

```bash
# Run a specific test file
npx vitest src/utils.test.ts

# Run tests matching a pattern
npx vitest --grep "normalizeOrigin"
```
