# Architecture Notes

## Backend stack
- Server lives in `server/`, written in TypeScript and executed as ES modules.
- Fastify 5 powers the HTTP server (`src/index.ts`) with plugins for CORS, static assets, rate limiting, etc.
- Routes are organised per feature under `src/api/**`, each exporting a handler that `src/index.ts` wires directly on the Fastify instance.
- Shared helpers (auth, logging, validation, config) reside under `src/lib` and `src/services`.

## Data stores
- **Postgres**: Accessed via `drizzle-orm` (`src/db/postgres`). Existing schema contains auth tables, `sites`, legacy `funnels`, and operational data. Drizzle config is in `server/drizzle.config.ts`.
- **ClickHouse**: Primary event warehouse (`src/db/clickhouse`). Event ingestion happens through `services/tracker/pageviewQueue.ts`, which batches validated tracking payloads.
- **GeoLite2**: MaxMind database in `server/GeoLite2-City.mmdb` powers geolocation via `src/db/geolocation`.
- Redis/BullMQ are prepared for background jobs (queue definitions under `src/services`), though not central to the new API.

## Authentication & access control
- Based on `better-auth`, initialised in `src/lib/auth.ts` and exposed to Fastify via `toNodeHandler`.
- `src/lib/auth-utils.ts` offers helpers (session extraction, ACL checks) that current analytics routes rely on.
- Public vs protected routes handled in `src/index.ts` by checking allowlists plus site-level configuration from `siteConfig`.

## Existing analytics surface
- REST endpoints for analytics today live under `src/api/analytics` and operate on ClickHouse event data.
- Funnels currently map to legacy records stored in `postgres.funnels` with a JSON blob (`data` column).
- Session replay, goals, performance metrics, etc. follow the same pattern: thin request handlers delegating to small service/util modules.

## Hooking the new API module
- Create a dedicated module under `server/src/api/projects` (and sibling services if needed) to expose REST endpoints for projects, funnels, events, stats, and realtime tracking.
- New Postgres tables (`projects`, `funnels`, `funnel_steps`, `events` metadata, optional `page_agg_daily`) should be declared in `src/db/postgres/schema.ts`, keeping drizzle migrations in sync.
- Leverage existing auth helpers for API key validation and session-based access; integrate rate limiting / key validation alongside `services/tracker/requestValidation`.
- Wire endpoints in `src/index.ts`, following the existing pattern (`server.get("/api/...", handler)`), and group them logically (consider extracting a Fastify plugin to encapsulate the new API slice).
- For documentation, reuse the current docs toolchain (`docs/`, `docs-v2/`) and generate OpenAPI definitions co-located with the handlers for automated publication.

## API v1 skeleton (in progress)
- Postgres schema now includes `projects`, `project_events`, `project_funnels`, `project_funnel_steps`, and optional `page_agg_daily` aggregates for the new REST surface (`server/src/db/postgres/schema.ts:273` onwards).
- Fastify plugin registered at `/api/v1` (`server/src/api/v1/index.ts`) wraps route groups (`events`, `funnels`, `stats`, `realtime`) and enforces API-key auth via `X-API-Key`.
- Security layers: SHA-256 hashed API keys & identifiers (`server/src/services/projects/projectService.ts`), per-project rate limiting (`server/src/lib/projectRateLimiter.ts`), and strict Zod validation inside each handler.
- Event ingestion funnels into `project_events` with idempotency guarantees (`server/src/services/projects/eventService.ts`) and serves debugging reads via `GET /events`.
- Funnel CRUD + stats logic is encapsulated under `server/src/services/projects/funnelService.ts`, returning ordered steps and aggregated conversions.
- Stats endpoints (`server/src/api/v1/stats.ts`) hydrate from the daily aggregation tables with a short-lived in-memory cache to keep responses below the 300 ms target.
- Real-time updates exposed through SSE (`server/src/api/v1/realtime.ts`) leveraging the same stats service.
- Event-focused summary/time-series endpoints (`server/src/api/v1/events.ts`) reuse the aggregation layer while the visitors directory (`server/src/api/v1/users.ts`) groups over hashed identifiers for debugging.

## Next steps
1. Generate and apply a Drizzle migration for the aggregation tables (`project_overview_daily`, `project_visitors_daily`, `project_page_visitors_daily`) plus the updated `page_agg_daily` schema.
2. Backfill historical aggregates for existing projects so `/stats/*` endpoints return complete history immediately after deploy.
3. Add automated coverage for the aggregation + caching layers once dependencies are installed (unit tests and integration smoke tests).
4. Provide project lifecycle endpoints (create/list/rotate keys) if exposed via UI or CLI.
