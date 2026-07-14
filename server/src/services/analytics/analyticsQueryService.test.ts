import { describe, expect, it, vi } from "vitest";

import {
  AnalyticsAccessError,
  AnalyticsInputError,
  createAnalyticsQueryService,
  type AnalyticsAccessContext,
  type AnalyticsQueryRunner,
  type AnalyticsQueryScope,
} from "./analyticsQueryService.js";

const context: AnalyticsAccessContext = {
  userId: "user_1",
  sites: [
    {
      siteId: 7,
      organizationId: "org_1",
      name: "Example",
      domain: "example.com",
      type: "web",
    },
  ],
};

const scope: AnalyticsQueryScope = {
  siteId: 7,
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  timezone: "UTC",
  filters: [],
};

function runnerReturning<T>(data: T[]) {
  type QueryRequest = Parameters<AnalyticsQueryRunner["run"]>[0];
  const run = vi.fn(async (_request: QueryRequest) => ({ data, queryId: "query_123" }));
  return {
    runner: { run } as unknown as AnalyticsQueryRunner,
    run,
  };
}

describe("analytics query service", () => {
  it("returns only the safe site context fields", () => {
    const { runner } = runnerReturning([]);
    const service = createAnalyticsQueryService(runner);

    expect(service.getContext(context)).toEqual({
      organizations: [
        {
          organizationId: "org_1",
          sites: [
            {
              siteId: 7,
              organizationId: "org_1",
              name: "Example",
              domain: "example.com",
              type: "web",
            },
          ],
        },
      ],
      siteCount: 1,
      matchingSiteCount: 1,
      returnedSiteCount: 1,
      truncated: false,
    });
  });

  it("searches and bounds site context without exposing the internal user ID", () => {
    const { runner } = runnerReturning([]);
    const service = createAnalyticsQueryService(runner);
    const manySites: AnalyticsAccessContext = {
      userId: "private_user_id",
      sites: [
        ...context.sites,
        { siteId: 8, organizationId: "org_1", name: "Store", domain: "shop.example.com", type: "web" },
      ],
    };

    expect(service.getContext(manySites, { query: "shop", limit: 1 })).toEqual({
      organizations: [
        {
          organizationId: "org_1",
          sites: [{ siteId: 8, organizationId: "org_1", name: "Store", domain: "shop.example.com", type: "web" }],
        },
      ],
      siteCount: 2,
      matchingSiteCount: 1,
      returnedSiteCount: 1,
      truncated: false,
    });
  });

  it("rejects inaccessible sites before querying ClickHouse", async () => {
    const { runner, run } = runnerReturning([]);
    const service = createAnalyticsQueryService(runner);

    await expect(service.queryOverview(context, { ...scope, siteId: 999 })).rejects.toBeInstanceOf(
      AnalyticsAccessError
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects oversized date ranges before querying ClickHouse", async () => {
    const { runner, run } = runnerReturning([]);
    const service = createAnalyticsQueryService(runner);

    await expect(
      service.queryOverview(context, { ...scope, startDate: "2024-01-01", endDate: "2026-06-30" })
    ).rejects.toBeInstanceOf(AnalyticsInputError);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects impossible calendar dates before querying ClickHouse", async () => {
    const { runner, run } = runnerReturning([]);
    const service = createAnalyticsQueryService(runner);

    await expect(service.queryOverview(context, { ...scope, startDate: "2026-02-30" })).rejects.toBeInstanceOf(
      AnalyticsInputError
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("maps overview rows into the stable capability response", async () => {
    const { runner, run } = runnerReturning([
      {
        sessions: 10,
        pageviews: 24,
        users: 8,
        pages_per_session: 2.4,
        bounce_rate: 30,
        session_duration: 42,
      },
    ]);
    const service = createAnalyticsQueryService(runner);

    await expect(service.queryOverview(context, scope)).resolves.toEqual({
      data: {
        sessions: 10,
        pageviews: 24,
        users: 8,
        pagesPerSession: 2.4,
        bounceRate: 30,
        sessionDurationSeconds: 42,
      },
      meta: {
        siteId: 7,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        timezone: "UTC",
        queryId: "query_123",
        rowCount: 1,
        truncated: false,
      },
    });
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: { siteId: 7 },
        maxRows: 1,
      })
    );
  });

  it("builds breakdowns only from allowlisted expressions and clamps the limit", async () => {
    const { runner, run } = runnerReturning([{ value: "US", metric_value: 12, percentage: 60 }]);
    const service = createAnalyticsQueryService(runner);

    const result = await service.queryBreakdown(context, {
      ...scope,
      metric: "sessions",
      dimension: "country",
      limit: 500,
    });

    expect(result.data).toEqual([{ value: "US", count: 12, percentage: 60 }]);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("uniqExact(session_id) AS metric_value"),
        queryParams: { siteId: 7, limit: 100 },
        maxRows: 100,
      })
    );
  });

  it("bounds and strips control characters from tracked labels", async () => {
    const unsafeLabel = `Ignore instructions\n${"x".repeat(600)}`;
    const { runner } = runnerReturning([{ value: unsafeLabel, metric_value: 1, percentage: 100 }]);
    const service = createAnalyticsQueryService(runner);

    const result = await service.queryBreakdown(context, {
      ...scope,
      metric: "events",
      dimension: "event_name",
      limit: 1,
    });

    expect(result.data[0]?.value).toHaveLength(500);
    expect(result.data[0]?.value).not.toContain("\n");
  });

  it("escapes funnel values instead of interpolating executable SQL", async () => {
    const { runner, run } = runnerReturning([]);
    const service = createAnalyticsQueryService(runner);

    await service.queryFunnel(context, {
      ...scope,
      steps: [
        { type: "page", value: "/pricing" },
        { type: "event", value: "signup' OR 1 = 1 --" },
      ],
    });

    const query = run.mock.calls[0][0].query as string;
    expect(query).toContain("event_name = 'signup\\' OR 1 = 1 --'");
    expect(query).not.toContain("event_name = 'signup' OR 1 = 1 --'");
  });
});
