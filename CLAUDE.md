# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Client: `cd client && npm run dev` (NextJS with Turbopack on port 3002)
- Server: `cd server && npm run dev` (TypeScript backend)
- Lint: `cd client && npm run lint` or `cd server && npm run build`
- TypeCheck: `cd client && tsc --noEmit` or `cd server && tsc`
- Database: `cd server && npm run db:push` (update DB schema)

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
