# CLAUDE.md – Rybbit Client

This file provides guidance to Claude Code when working in the `/client` directory.

## Commands

- `npm run dev` – Start dev server (Next.js + Turbopack, port 3002)
- `npm run build` – Production build
- `npm run lint` – ESLint
- `npm run format` – Prettier format
- `tsc --noEmit` – Type-check without emitting

## Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4, Shadcn UI (New York style), Lucide icons
- **State**: Zustand 5 (app/user stores), Jotai (atomic state)
- **Server state**: TanStack React Query 5
- **Auth**: Better-auth (admin, organization, emailOTP, apiKey plugins)
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl (10 locales: en, de, fr, zh, es, pl, it, ko, pt, ja)
- **Charts**: Nivo (bar, calendar, line), D3, Mapbox GL
- **Date/time**: Luxon, date-fns
- **URL state**: nuqs (query string), vaul (drawer)
- **HTTP**: Axios via `authedFetch<T>()` wrapper

## Project Structure

```
src/
├── api/                    # API layer
│   ├── analytics/          # Analytics endpoints + React Query hooks
│   ├── admin/              # Admin endpoints + hooks
│   ├── gsc/                # Google Search Console
│   ├── uptime/             # Uptime monitoring
│   ├── types.ts            # Shared types (CommonApiParams, Filter, etc.)
│   └── utils.ts            # authedFetch, buildApiParams
├── app/                    # Next.js App Router pages
│   ├── [site]/             # Per-site analytics dashboard
│   ├── admin/              # Admin panel
│   ├── auth/               # Auth flows
│   ├── settings/           # User settings
│   ├── uptime/             # Uptime dashboard
│   ├── layout.tsx          # Root layout
│   └── Providers.tsx       # Provider stack
├── components/
│   ├── ui/                 # Shadcn UI primitives (41 files)
│   ├── charts/             # Chart components
│   ├── DateSelector/       # Date/time picker
│   ├── Sessions/           # Session replay
│   ├── sidebar/            # Navigation sidebar
│   └── [feature components]
├── hooks/                  # Custom hooks
├── lib/
│   ├── store.ts            # Main Zustand store
│   ├── userStore.ts        # User/auth Zustand store
│   ├── auth.ts             # Better-auth client
│   ├── utils.ts            # cn(), formatters, helpers
│   ├── dateTimeUtils.ts    # Luxon-based date helpers
│   └── urlParams.ts        # URL param management
├── types/                  # TypeScript definitions
├── i18n/request.ts         # next-intl config
└── proxy.ts                # Next.js middleware (routing)

messages/                   # Translation files (en.json, de.json, etc.)
```

## API Layer Pattern

Every data domain has two layers:

**1. Endpoints** (`api/[domain]/endpoints/*.ts`) – pure async functions, no React:
```ts
export async function fetchSomething(siteId: string): Promise<SomeType> {
  return authedFetch<SomeType>(`/api/something?siteId=${siteId}`);
}
```

**2. Hooks** (`api/[domain]/hooks/*.ts`) – React Query wrappers:
```ts
export function useGetSomething(siteId?: string) {
  return useQuery({
    queryKey: ["get-something", siteId],
    queryFn: () => fetchSomething(siteId!),
    enabled: !!siteId,
  });
}
```

**`authedFetch<T>(url, options?)`** (`api/utils.ts`):
- Prepends `BACKEND_URL`
- Sends `credentials: "include"`
- Adds `x-private-key` header if present
- Converts array params to JSON strings
- Extracts and throws backend errors from `response.data.error`

**`buildApiParams(time, timezone, filters?)`** returns `CommonApiParams` with `.toQueryParams()` / `.toBucketedQueryParams()` helpers for converting the time store state into API-ready parameters.

## State Management

**Main store** (`lib/store.ts`) via Zustand:
- `site` – current site ID
- `time` – selected time range (modes: `day`, `range`, `week`, `month`, `year`, `past-minutes`, `all-time`)
- `previousTime` – comparison period
- `bucket` – time bucketing (`hour`, `day`, `week`, `month`)
- `selectedStat` – active metric (`pageviews`, `sessions`, `users`, `bounce_rate`, etc.)
- `filters` – active analytics filters
- `timezone` – IANA timezone (persisted to localStorage)
- Helpers: `resetStore()`, `goBack()`, `goForward()`, `addFilter()`, `removeFilter()`

**User store** (`lib/userStore.ts`) via Zustand:
- User session data and `isPending` flag

Only `timezone` is persisted; everything else is session-only.

## Routing

- `/[site]/main` – analytics dashboard (middleware redirects `/{siteId}` → `/{siteId}/main`)
- `/[site]/[privateKey]/main` – public/shared analytics
- `/admin` – admin panel
- `/login`, `/signup` – auth pages
- `/settings` – user settings
- `/uptime` – uptime monitoring

Middleware in `proxy.ts` handles redirects and OAuth callbacks (`/auth/callback/github`, `/auth/callback/google`).

## Code Conventions

- **TypeScript** strict mode throughout; use Zod for runtime validation
- **Components**: functional, `"use client"` where needed, minimal `useEffect`
- **Naming**: `camelCase` variables/functions, `PascalCase` components/types, `UPPER_SNAKE_CASE` constants
- **API hooks**: prefix with `use`, e.g. `useGetSites`; endpoint functions prefix with `fetch`/`create`/`update`/`delete`
- **Query keys**: descriptive arrays, e.g. `["get-site", siteId]`
- **Imports**: external first, then internal; alphabetical within groups
- **Dark mode**: default theme; class-based, CSS HSL variables
- **i18n**: use `useTranslations()` from next-intl; translation files in `messages/`
- **Error handling**: try/catch with specific error types; let React Query surface API errors
- **Do not** add unnecessary abstractions, extra error handling for impossible cases, or docstrings to unchanged code
