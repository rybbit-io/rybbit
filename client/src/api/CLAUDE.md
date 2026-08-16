# API Layer

This directory contains all API-related code for the client application.

## Directory Structure

```
api/
├── admin/           # Admin/settings API (sites, orgs, users)
│   ├── endpoints/   # Pure fetch functions and types
│   └── hooks/       # React Query hooks
├── analytics/       # Analytics data API
│   ├── endpoints/   # Pure fetch functions and types
│   └── hooks/       # React Query hooks
├── gsc/             # Google Search Console integration
├── stripe/          # Stripe billing integration
├── types.ts         # Shared API types (APIResponse)
└── utils.ts         # Shared utilities (authedFetch, buildApiParams)
```

## Architecture Pattern

### Analytics reads: one descriptor, one query module

Analytics reads do **not** get a per-endpoint fetcher. A hook declares a
descriptor — what differs between endpoints — and `useAnalyticsQuery` does the
rest: resolves the store context, serialises the time window, builds the query
key from the same object it sends, unwraps the `{ data }` envelope.

```typescript
// analytics/hooks/useGetOverview.ts
export function useGetOverview({ lite }: { lite?: boolean } = {}) {
  return useAnalyticsQuery<GetOverviewResponse>({
    key: "overview",
    path: lite ? "overview-lite" : "overview",
  });
}
```

`analytics/endpoints/*.ts` still holds the response **types** (and the write
endpoints — create/update/delete, which are ordinary mutations). It no longer
holds read fetchers.

### Everything else: endpoints + hooks

Non-analytics domains (admin, gsc, stripe) keep the two-layer pattern:

1. **endpoints/** — pure async functions calling `authedFetch`, no React
2. **hooks/** — React Query wrappers

```typescript
// endpoints/sites.ts
export function fetchSite(siteId: string | number) {
  return authedFetch<SiteResponse>(`/sites/${siteId}`);
}

// hooks/useSites.ts
export function useGetSite(siteId?: string | number) {
  return useQuery({
    queryKey: ["get-site", siteId],
    queryFn: () => fetchSite(siteId!),
    enabled: !!siteId,
  });
}
```

## Key Utilities

### `authedFetch<T>(url, params?, config?)`

Wrapper around axios that:
- Prepends `BACKEND_URL` to relative URLs
- Sends credentials (cookies) with requests
- Converts array params to JSON strings
- Includes private key header when present
- Extracts and throws backend error messages

It knows nothing about the store or routing: the private key comes from
`requestContext.ts`, whose resolver is installed once by
`installRequestContext.ts` (side-effect imported in `app/Providers.tsx`).
Tests and non-browser callers can swap the resolver instead of faking a store.

### `buildApiParams(time, { timeZone, filters? })`

Pure function converting a `Time` object to `CommonApiParams`, covering every
time mode (date range, exact datetime range, past-minutes). The timezone is
injected, never read from the store.

### `buildAnalyticsRequest` / `fetchAnalytics` (`analytics/analyticsRequest.ts`)

The analytics read layer as a value. A descriptor is `{ path, params?, body?,
unwrap? }` — path under `/sites/:site`, params already named as the wire
expects them (undefined dropped), `body` for the POST reads, `unwrap: false`
when the response is not `{ data }`. `buildAnalyticsRequest(descriptor,
context)` returns the exact request; `fetchAnalytics(site, request)` sends it.
No React, so non-hook callers (CSV export, the globe timeline, rollup
`useQueries`) go through the same seam. Covered by `analyticsRequest.test.ts`.

### `useAnalyticsQuery` / `useAnalyticsInfiniteQuery` (`analytics/useAnalyticsQuery.ts`)

The standard base for analytics query hooks. `useAnalyticsContext` reads the
store through selectors (site, time, previousTime, filters, timezone) — so a
`selectedStat` change does not re-render every analytics hook — and the
queryKey is built from the same request object that gets sent, so key and
request cannot drift. Owns the same-site placeholder policy, `staleTime:
60_000`, and `enabled: !!site`. A hook declares:

- `key` — the historical key prefix (mutations invalidate by it)
- the descriptor fields (`path`, `params`, `body`, `unwrap`)
- context options where needed: `useTime: false` for endpoints not scoped to
  the selected period, `useFilters`, `periodTime`, `overrideTime`, `site`

Do not hand-assemble queryKeys that list store inputs in analytics hooks, and
do not call `authedFetch` directly for an analytics read.

## Conventions

- **Naming**: Endpoint functions use `fetch*`, `create*`, `update*`, `delete*` prefixes
- **Naming**: Hooks use `use*` prefix (e.g., `useGetSite`, `useCreateGoal`)
- **Analytics reads**: add a descriptor to a hook, not a new fetcher
- **Types**: Export types alongside functions from endpoint files
- **Query Keys**: Use descriptive array keys like `["get-site", siteId]`
- **Error Handling**: Let errors propagate; hooks handle via React Query
- **Mutations**: Invalidate related queries in `onSuccess` callbacks
