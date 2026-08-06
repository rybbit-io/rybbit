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
├── uptime/          # Uptime monitoring
├── types.ts         # Shared API types (APIResponse)
└── utils.ts         # Shared utilities (authedFetch, buildApiParams)
```

## Architecture Pattern

### Separation of Concerns

Each domain (admin, analytics) follows a two-layer pattern:

1. **endpoints/** - Pure async functions that call `authedFetch`
   - Contains TypeScript interfaces and types
   - No React dependencies
   - Reusable across different contexts
   - Exports via `index.ts` barrel file

2. **hooks/** - React Query hooks wrapping endpoints
   - Uses `useQuery` for data fetching
   - Uses `useMutation` for data mutations
   - Handles caching, invalidation, and React lifecycle

### Example

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

### `buildApiParams(time, options?)`

Converts a `Time` object to `CommonApiParams` for analytics endpoints.

### `useAnalyticsQuery` / `useAnalyticsInfiniteQuery` (`analytics/useAnalyticsQuery.ts`)

The standard base for analytics query hooks. Reads the store context (site,
time, previousTime, filters, timezone) once, derives the wire params, and
builds the queryKey from the same params object — key and request cannot
drift. Owns the same-site placeholder policy, `staleTime: 60_000`, and
`enabled: !!site`. A per-endpoint hook declares only:

- `key` — the historical key prefix (mutations invalidate by it)
- `extraParams` — endpoint params beyond time/filters (also keyed automatically)
- `keyExtras` — only for values that select the fetcher itself (e.g. `lite`)
- `fetch` — the endpoint function, plus any response reshaping

Do not hand-assemble queryKeys that list store inputs in analytics hooks.

## Conventions

- **Naming**: Endpoint functions use `fetch*`, `create*`, `update*`, `delete*` prefixes
- **Naming**: Hooks use `use*` prefix (e.g., `useGetSite`, `useCreateGoal`)
- **Types**: Export types alongside functions from endpoint files
- **Query Keys**: Use descriptive array keys like `["get-site", siteId]`
- **Error Handling**: Let errors propagate; hooks handle via React Query
- **Mutations**: Invalidate related queries in `onSuccess` callbacks
