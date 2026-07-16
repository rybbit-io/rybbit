# AGENTS.md - Rybbit Server

Guidance for agents working in the `server` package. Keep changes scoped to this package unless the task explicitly requires changes in `client` or `shared`.

## Commands

Run commands from `server/`.

- `npm run dev` - compile TypeScript and start `dist/index.js`.
- `npm run dev:cluster` - compile TypeScript and start the cluster entrypoint.
- `npm run build` - compile TypeScript and rebuild the analytics script.
- `npm run start` - run the compiled single-process server.
- `npm run start:cluster` - run the compiled cluster server.
- `npm run test:run` - run Vitest once.
- `npm run test:watch` - run Vitest in watch mode.
- `npm run test` - run Vitest.
- `npm run db:check` - check Drizzle migrations.
- `npm run format` - run Prettier over server source files.
- `npm run format:check` - check formatting.

Do not run database migration, push, pull, or drop commands unless the user explicitly asks for them. Avoid editing `dist/`; make source changes in `src/` and rebuild when needed.

## Stack

- Fastify 5 for HTTP routing.
- TypeScript ESM; source imports use `.js` specifiers for compiled output.
- Better Auth for authentication.
- Drizzle ORM with Postgres for relational data.
- ClickHouse for analytics event storage and querying.
- Zod for request validation.
- BullMQ, cron jobs, and service classes for background work.
- Vitest for tests.
- Pino via Fastify logger for logging.

## Project Layout

- `src/index.ts` - Fastify server setup, middleware, static files, and route registration.
- `src/cluster.ts` - cluster entrypoint.
- `src/api/` - route handlers grouped by domain.
- `src/api/analytics/` - analytics query endpoints.
- `src/api/sites/` - site management, imports, tracking config, and script verification.
- `src/api/uptime/` - uptime monitor endpoints.
- `src/api/user/`, `src/api/teams/`, `src/api/memberAccess/` - account, organization, team, and access APIs.
- `src/api/stripe/` - billing and Stripe webhook handlers.
- `src/db/postgres/` - Drizzle schema, client setup, and Postgres helpers.
- `src/db/clickhouse/` - ClickHouse client, migrations, and analytics storage helpers.
- `src/lib/` - auth middleware, auth utilities, constants, logger helpers, and shared server utilities.
- `src/services/` - domain services for tracking, sessions, replay, uptime, imports, reporting, storage, and email.
- `src/analytics-script/` - browser analytics script source and build tooling.
- `drizzle/` - generated SQL migration files.
- `public/` - served browser assets such as tracking and replay scripts.

## Routing And Handlers

- Register routes in `src/index.ts` with the existing Fastify plugin/grouping style.
- Put domain handler implementations in `src/api/[domain]/`.
- Export handlers through that domain's `index.ts` barrel when one exists.
- Use the existing auth pre-handler chains in `src/index.ts` where possible: `publicSite`, `authSite`, `adminSite`, `authOnly`, `adminOnly`, `orgMember`, and `orgAdminParams`.
- Type Fastify requests with explicit `Params`, `Querystring`, and `Body` shapes.
- Validate untrusted request bodies and query params with Zod before using them.

## Data Access

- Use Drizzle helpers and schema objects from `src/db/postgres/` for Postgres access.
- Keep Postgres schema changes in `src/db/postgres/schema.ts`; generate migrations only when the user asks for migration files.
- Use ClickHouse helpers for analytics event queries instead of hand-building duplicate client code.
- Be careful with analytics query filters and timezones; reuse existing utilities in `src/api/analytics/utils/` and related modules.
- Never interpolate untrusted input directly into SQL. Use query builders, parameterization, or existing escaping helpers.

## Services

- Keep business logic that is reused or long-running in `src/services/`.
- Keep route handlers thin when a service already exists for the domain.
- For tracking endpoints, preserve performance-sensitive behavior and avoid adding synchronous work to hot paths.
- For background services, ensure startup side effects remain intentional and compatible with both single-process and cluster modes.

## Conventions

- TypeScript strict mode is expected.
- Use `camelCase` for variables and functions, `PascalCase` for types and classes, and `UPPER_SNAKE_CASE` for constants.
- Group imports by external dependencies first, then internal modules; keep each group alphabetized where practical.
- Preserve ESM import style with `.js` extensions for local TypeScript modules.
- Prefer specific error responses with appropriate status codes over generic throws in request handlers.
- Avoid broad abstractions, unrelated refactors, or comments that merely repeat the code.

## Verification

For most server changes, run:

1. `npm run build`
2. `npm run test:run`

Run targeted Vitest files while iterating, for example `npx vitest run src/utils.test.ts`.
