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

- Node.js 24 (see the root `.nvmrc`)
- pnpm (the version pinned in the root `package.json`)

### Installation

```bash
# From the repository root
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @rybbit/shared build
```

### Running the Application

Run the following commands from `server/`, or use `pnpm dev:server` and
`pnpm build:server` from the repository root to build shared code automatically.
See [workspace development](../CONTRIBUTE.md#local-development).

```bash
# Development mode
pnpm run dev

# Production build
pnpm run build
pnpm start
```

### Testing

```bash
# Run tests once
pnpm run test:run

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test
```

### Database Operations

```bash
# Generate migrations
pnpm run db:generate

# Run migrations
pnpm run db:migrate

# Push schema changes
pnpm run db:push

# Pull schema from database
pnpm run db:pull

# Drop database
pnpm run db:drop

# Check migrations
pnpm run db:check
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Test files should be placed alongside source files with the `.test.ts` extension.

### Current Test Coverage

- `normalizeOrigin` function: Comprehensive tests covering subdomain removal, multi-level TLD handling, URL parsing, edge cases, and error handling.

### Running Specific Tests

```bash
# Run a specific test file
pnpm exec vitest src/utils.test.ts

# Run tests matching a pattern
pnpm exec vitest --grep "normalizeOrigin"
```
