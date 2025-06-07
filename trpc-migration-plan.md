# tRPC Migration Plan: getOverview Endpoint

This document provides a step-by-step implementation guide for converting the `getOverview` endpoint from REST to tRPC as a proof of concept.

## Step 1: Install Dependencies

### Backend Dependencies

Add to `server/package.json`:

```json
{
  "dependencies": {
    "@trpc/server": "^10.45.0"
  }
}
```

### Frontend Dependencies

Add to `client/package.json`:

```json
{
  "dependencies": {
    "@trpc/client": "^10.45.0",
    "@trpc/react-query": "^10.45.0",
    "@trpc/next": "^10.45.0"
  }
}
```

### Installation Commands

```bash
# Backend
cd server && npm install @trpc/server

# Frontend
cd client && npm install @trpc/client @trpc/react-query @trpc/next
```

## Step 2: Create Shared Schema

Create `shared/schemas/analytics.ts`:

```typescript
import { z } from "zod";

// Filter schemas
export const filterParameterSchema = z.enum([
  "browser",
  "os",
  "device",
  "country",
  "region",
  "city",
  "language",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "pathname",
]);

export const filterTypeSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
]);

export const filterSchema = z.object({
  parameter: filterParameterSchema,
  type: filterTypeSchema,
  value: z.string(),
});

// GetOverview schemas
export const getOverviewInputSchema = z.object({
  site: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timeZone: z.string(),
  filters: z.array(filterSchema).default([]),
  pastMinutesStart: z.number().optional(),
  pastMinutesEnd: z.number().optional(),
});

export const getOverviewOutputSchema = z.object({
  sessions: z.number(),
  pageviews: z.number(),
  users: z.number(),
  pages_per_session: z.number(),
  bounce_rate: z.number(),
  session_duration: z.number(),
});

// Export TypeScript types
export type FilterParameter = z.infer<typeof filterParameterSchema>;
export type FilterType = z.infer<typeof filterTypeSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type GetOverviewInput = z.infer<typeof getOverviewInputSchema>;
export type GetOverviewOutput = z.infer<typeof getOverviewOutputSchema>;
```

## Step 3: Setup tRPC Backend Infrastructure

### Create `server/src/trpc/context.ts`:

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { getSessionFromReq } from "../lib/auth-utils.js";

export async function createContext({
  req,
  res,
}: {
  req: FastifyRequest;
  res: FastifyReply;
}) {
  const session = await getSessionFromReq(req).catch(() => null);

  return {
    req,
    res,
    user: session?.user || null,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### Create `server/src/trpc/trpc.ts`:

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

// Auth middleware
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
```

### Create `server/src/trpc/routers/analytics.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  getOverviewInputSchema,
  getOverviewOutputSchema,
} from "../../../../shared/schemas/analytics.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "../../api/analytics/utils.js";

// Reuse the existing query function from getOverview.ts
const getQuery = ({
  startDate,
  endDate,
  timeZone,
  filters,
  pastMinutesRange,
}: {
  startDate: string;
  endDate: string;
  timeZone: string;
  filters: string;
  pastMinutesRange?: { start: number; end: number };
}) => {
  const timeParams = pastMinutesRange
    ? { pastMinutesRange }
    : { date: { startDate, endDate, timeZone } };

  const filterStatement = getFilterStatement(filters);

  return `SELECT   
      session_stats.sessions,
      session_stats.pages_per_session,
      session_stats.bounce_rate * 100 AS bounce_rate,
      session_stats.session_duration,
      page_stats.pageviews,
      page_stats.users  
    FROM
    (
        -- Session-level metrics
        SELECT
            COUNT() AS sessions,
            AVG(pages_in_session) AS pages_per_session,
            sumIf(1, pages_in_session = 1) / COUNT() AS bounce_rate,
            AVG(end_time - start_time) AS session_duration
        FROM
            (
                -- One row per session
                SELECT
                    session_id,
                    MIN(timestamp) AS start_time,
                    MAX(timestamp) AS end_time,
                    COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS pages_in_session
                FROM events
                WHERE
                    site_id = {siteId:Int32}
                    ${filterStatement}
                    ${getTimeStatement(timeParams)}
                GROUP BY session_id
            )
        ) AS session_stats
        CROSS JOIN
        (
            -- Page-level and user-level metrics
            SELECT
                COUNT(*)                   AS pageviews,
                COUNT(DISTINCT user_id)    AS users
            FROM events
            WHERE 
                site_id = {siteId:Int32}
                ${filterStatement}
                ${getTimeStatement(timeParams)}
                AND type = 'pageview'
        ) AS page_stats`;
};

export const analyticsRouter = router({
  getOverview: protectedProcedure
    .input(getOverviewInputSchema)
    .output(getOverviewOutputSchema)
    .query(async ({ input, ctx }) => {
      const {
        site,
        startDate,
        endDate,
        timeZone,
        filters,
        pastMinutesStart,
        pastMinutesEnd,
      } = input;

      // Reuse existing auth logic
      const userHasAccess = await getUserHasAccessToSitePublic(ctx.req, site);
      if (!userHasAccess) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const pastMinutesRange =
        pastMinutesStart && pastMinutesEnd
          ? { start: Number(pastMinutesStart), end: Number(pastMinutesEnd) }
          : undefined;

      // Convert filters array to string format expected by existing utils
      const filtersString = JSON.stringify(filters);

      const query = getQuery({
        startDate,
        endDate,
        timeZone,
        filters: filtersString,
        pastMinutesRange: pastMinutesRange,
      });

      try {
        const result = await clickhouse.query({
          query,
          format: "JSONEachRow",
          query_params: {
            siteId: Number(site),
          },
        });

        const data = await processResults<GetOverviewOutput>(result);
        return data[0];
      } catch (error) {
        console.error("Error fetching overview:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch overview",
        });
      }
    }),
});
```

### Create `server/src/trpc/router.ts`:

```typescript
import { router } from "./trpc.js";
import { analyticsRouter } from "./routers/analytics.js";

export const appRouter = router({
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
```

## Step 4: Integrate tRPC with Fastify

### Install Fastify adapter:

```bash
cd server && npm install @trpc/server
```

### Update `server/src/index.ts`:

Add these imports at the top:

```typescript
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
```

Add this registration after the existing middleware (around line 121):

```typescript
// Register tRPC
server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});
```

## Step 5: Setup Frontend tRPC Client

### Create `client/src/lib/trpc.ts`:

```typescript
import { createTRPCNext } from "@trpc/next";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../server/src/trpc/router";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    // In the browser, use relative URL
    return "";
  }
  // On server, use the backend URL
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          headers() {
            return {
              // Include credentials for auth
            };
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    };
  },
});
```

### Create `client/src/components/TRPCProvider.tsx`:

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "../lib/trpc";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => trpc.createClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Update `client/src/app/layout.tsx`:

Wrap your app with the TRPCProvider:

```typescript
import { TRPCProvider } from "../components/TRPCProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          {/* Your existing providers */}
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
```

## Step 6: Create tRPC Hook for getOverview

### Create `client/src/hooks/trpc/useGetOverview.ts`:

```typescript
import { trpc } from "../../lib/trpc";
import { useStore } from "../../lib/store";
import { getStartAndEndDate } from "../../api/utils";
import { timeZone } from "../../lib/dateTimeUtils";

export function useGetOverview({
  site,
  dynamicFilters = [],
}: {
  site: number | string;
  dynamicFilters?: any[];
}) {
  const { time, filters: globalFilters } = useStore();
  const { startDate, endDate } = getStartAndEndDate(time);

  const combinedFilters = [...globalFilters, ...dynamicFilters];

  return trpc.analytics.getOverview.useQuery({
    site: String(site),
    startDate: startDate || "",
    endDate: endDate || "",
    timeZone,
    filters: combinedFilters,
  });
}
```

## Step 7: Test the Implementation

### Testing Steps:

1. **Install dependencies:**

   ```bash
   cd server && npm install @trpc/server
   cd ../client && npm install @trpc/client @trpc/react-query @trpc/next
   ```

2. **Create the directory structure:**

   ```
   shared/
   └── schemas/
       └── analytics.ts

   server/src/trpc/
   ├── context.ts
   ├── trpc.ts
   ├── router.ts
   └── routers/
       └── analytics.ts

   client/src/
   ├── lib/
   │   └── trpc.ts
   ├── components/
   │   └── TRPCProvider.tsx
   └── hooks/
       └── trpc/
           └── useGetOverview.ts
   ```

3. **Update existing files as specified above**

4. **Test the endpoint:**
   - Start both server and client
   - Use the new `useGetOverview` hook in a component
   - Verify type safety and functionality

### Verification Checklist:

- [ ] tRPC endpoint responds correctly
- [ ] Types are properly inferred on frontend
- [ ] Authentication works
- [ ] Error handling functions properly
- [ ] Performance is comparable to REST endpoint

## Step 8: Migration Strategy

Once this proof of concept works:

1. **Parallel Operation:** Keep both REST and tRPC endpoints running
2. **Gradual Migration:** Convert other endpoints one by one
3. **Frontend Updates:** Replace REST hooks with tRPC hooks
4. **Testing:** Ensure feature parity
5. **Cleanup:** Remove REST endpoints after full migration

## Benefits Achieved

After implementing this single endpoint migration:

- **Type Safety:** Compile-time validation of API calls
- **Auto-completion:** Full IntelliSense for the getOverview API
- **Runtime Validation:** Zod schemas validate inputs/outputs
- **Error Handling:** Typed error responses
- **Developer Experience:** Self-documenting API contracts

This serves as a template for migrating the remaining endpoints in your analytics platform.
