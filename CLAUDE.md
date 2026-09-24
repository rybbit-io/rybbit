# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The root pnpm workspace contains `client`, `server`, and `shared`; docs is separate.
Run `pnpm install` at the root. Root `pnpm dev`, `pnpm build`, `pnpm test`, and
`pnpm typecheck` build shared code before running the apps.

- Client: `pnpm dev:client` (NextJS with Turbopack on port 3002)
- Server: `pnpm dev:server` (TypeScript backend)
- Lint: `cd client && pnpm run lint` or `pnpm build:server`
- TypeCheck: `pnpm --filter client typecheck` or `pnpm --filter rybbit-backend typecheck`
- Database: `cd server && pnpm run db:generate` (generate migration files after schema changes; applied with `pnpm run db:migrate`)

## Code Conventions

- TypeScript with strict typing throughout both client and server
- Client: React functional components with minimal useEffect and inline functions
- Frontend: Next.js, Tailwind CSS, Shadcn UI, Tanstack Query, Zustand, Luxon, Nivo, react-hook-form
- Backend: Fastify, Drizzle ORM (Postgres), ClickHouse, Zod
- Error handling: Use try/catch blocks with specific error types
- Naming: camelCase for variables/functions, PascalCase for components/types
- Imports: Group by external, then internal (alphabetical within groups)
- File organization: Related functionality in same directory
- Dark mode is default theme
- Never run any database migration scripts

## Design Context

- `PRODUCT.md` (repo root) — strategic design context: register (`product`), users, purpose, brand personality, anti-references, and design principles. Read it before frontend/design work.
- `DESIGN.md` (repo root) — visual system: color tokens, typography, components, layout. The source of truth for visual decisions.
- The `/impeccable` skill reads both files before any design task.
