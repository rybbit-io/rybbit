# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Client: `cd client && npm run dev` (NextJS with Turbopack on port 3002)
- Server: `cd server && npm run dev` (TypeScript backend on port 3001)
- Lint: `cd client && npm run lint` or `cd server && npm run build`
- TypeCheck: `cd client && tsc --noEmit` or `cd server && tsc`
- Database: `cd server && npm run db:push` (update Postgres schema via Drizzle)
- Tests: `cd server && npm run test` (Vitest)
- Shared: `cd shared && npm run build` (build shared types package)

## Architecture

Rybbit is an open-source web analytics platform with a client-server architecture using dual databases.

### Data Flow
1. Tracking script (`server/src/analytics-script/`) is served to tracked websites
2. Events hit `/api/track` endpoint and are stored in ClickHouse (time-series analytics)
3. Site configuration, users, and organizations are stored in Postgres
4. Client fetches analytics via TanStack Query, state managed with Zustand

### Dual Database Architecture
- **ClickHouse** (`server/src/db/clickhouse/`): Time-series analytics events, session replays, performance metrics
- **Postgres** (`server/src/db/postgres/`): Users, organizations, sites, funnels, goals (Drizzle ORM)

### Key Directories
- `client/src/app/[site]/` - Site-specific analytics dashboards (main, journeys, funnels, replay, events)
- `client/src/components/` - Reusable UI components (Shadcn-based)
- `client/src/api/` - TanStack Query hooks for data fetching
- `client/src/lib/store.ts` - Zustand store for global state (time range, filters, selected site)
- `server/src/api/` - Fastify route handlers organized by feature
- `server/src/services/` - Business logic (tracker, replay, sessions, imports)
- `shared/src/` - Shared TypeScript types (filters, time params) used by both client and server

### Authentication
Uses `better-auth` library with organization-based multi-tenancy. Sites belong to organizations, users are members of organizations.

## Code Conventions

- TypeScript with strict typing throughout both client and server
- Client: React functional components with minimal useEffect and inline functions
- Frontend: Next.js App Router, Tailwind CSS, Shadcn UI, TanStack Query, Zustand, Luxon for dates, Nivo for charts
- Backend: Fastify, Drizzle ORM (Postgres), ClickHouse client, Zod for validation
- Error handling: Use try/catch blocks with specific error types
- Naming: camelCase for variables/functions, PascalCase for components/types
- Imports: Group by external, then internal (alphabetical within groups)
- File organization: Related functionality in same directory
- Dark mode is default theme
- Never run any database migration scripts
