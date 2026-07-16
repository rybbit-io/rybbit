# AGENTS.md - Rybbit Client

Guidance for agents working in the `client` package. Keep changes scoped to this package unless the task explicitly requires changes in `server` or `shared`.

## Commands

Run commands from `client/`.

- `npm run dev` - start the Next.js dev server on port 3002.
- `npm run build` - create a production build.
- `npm run lint` - run ESLint.
- `npx tsc --noEmit` - type-check without emitting files.
- `npm run format` - run Prettier over client source files.
- `npm run format:check` - check formatting.
- `npm run extract` - extract next-intl messages.

## Stack

- Next.js 16 App Router and React 19.
- Tailwind CSS v4, Shadcn UI primitives, and Lucide icons.
- TanStack React Query for server state.
- Zustand and Jotai for client state.
- Better Auth for authentication.
- React Hook Form and Zod for forms and validation.
- next-intl for translations.
- Nivo, D3, and Mapbox GL for visualizations.
- Luxon and date-fns for date/time work.
- Axios through the local `authedFetch<T>()` wrapper.

## Project Layout

- `src/app/` - App Router pages and layouts.
- `src/app/[site]/` - per-site analytics dashboard routes.
- `src/app/admin/` - admin UI.
- `src/app/settings/` - account, organization, billing, and team settings.
- `src/app/uptime/` - uptime monitoring UI.
- `src/api/` - endpoint functions and React Query hooks.
- `src/components/ui/` - Shadcn UI primitives.
- `src/components/` - shared feature components.
- `src/hooks/` - reusable React hooks.
- `src/lib/` - stores, auth client, URL state, date helpers, and utilities.
- `src/i18n/` - next-intl request configuration.
- `messages/` - locale JSON files.
- `src/proxy.ts` - Next.js middleware and redirects.

Do not edit `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, or other generated output.

## API And Data Patterns

Each API domain normally has two layers:

- `src/api/[domain]/endpoints/*.ts` - pure async endpoint functions with no React.
- `src/api/[domain]/hooks/*.ts` - React Query wrappers around endpoint functions.

Use `authedFetch<T>()` from `src/api/utils.ts` for backend calls. It handles `BACKEND_URL`, credentials, private key headers, array query params, and backend error extraction.

Use `buildApiParams()` for analytics requests that depend on time range, timezone, bucket, or filters. Keep React Query keys descriptive arrays and include every input that affects the response.

## UI And State

- Prefer existing Shadcn primitives and shared components before adding new UI abstractions.
- Use Lucide icons for icon buttons when an icon exists.
- Keep dark mode as the default assumption; styles use class-based theme variables.
- Use `"use client"` only for components that need client-side hooks, browser APIs, or interactivity.
- Keep `useEffect` use minimal and specific.
- Store global analytics UI state in `src/lib/store.ts`; user/session state lives in `src/lib/userStore.ts`.
- Use existing URL state helpers from `src/lib/urlParams.ts` where route query params are part of the feature.

## Internationalization

- Use `useTranslations()` from next-intl for user-facing strings.
- Keep locale keys consistent across `messages/*.json`.
- Run `npm run extract` when adding or changing translatable UI text.

## Conventions

- TypeScript strict mode is expected.
- Use `camelCase` for variables and functions, `PascalCase` for components and types, and `UPPER_SNAKE_CASE` for constants.
- Group imports by external dependencies first, then internal modules; keep each group alphabetized where practical.
- Follow existing folder patterns for feature placement instead of creating broad new shared folders.
- Do not add broad abstractions, defensive branches, or docstrings unless they solve a real problem in the change.

## Verification

For most client changes, run:

1. `npm run lint`
2. `npx tsc --noEmit`

Run `npm run build` for route, config, bundling, or Next.js behavior changes.
