import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { FILTER_PARAMETERS, TIME_BUCKETS, filtersInput, siteIdInput, timeInputs } from "../inputs.js";
import { looseRow, ok, readOnly, siteQuery, type ScopeCheck, type ToolGuard } from "./shared.js";

const overviewMetrics = z
  .object({
    sessions: z.number(),
    pageviews: z.number(),
    users: z.number(),
    pages_per_session: z.number(),
    bounce_rate: z.number(),
    session_duration: z.number(),
  })
  .partial()
  .passthrough();

const overviewOutput = z.object({ data: overviewMetrics.optional() }).passthrough();

const timeseriesOutput = z
  .object({ data: z.array(overviewMetrics.extend({ time: z.string() }).partial().passthrough()).optional() })
  .passthrough();

const breakdownItem = z
  .object({ value: z.string(), count: z.number(), percentage: z.number() })
  .partial()
  .passthrough();

const breakdownOutput = z
  .object({
    data: z
      .object({ data: z.array(breakdownItem).optional(), totalCount: z.number().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const liveStatsOutput = z.object({ count: z.number().optional() }).passthrough();

const eventNamesOutput = z
  .object({
    data: z.array(z.object({ eventName: z.string(), count: z.number() }).partial().passthrough()).optional(),
  })
  .passthrough();

const errorItem = z
  .object({
    value: z.string(),
    errorName: z.string(),
    count: z.number(),
    sessionCount: z.number(),
    percentage: z.number(),
  })
  .partial()
  .passthrough();

// Unpaged requests return { data: [...] }; paged requests nest as
// { data: { data: [...], totalCount } }.
const errorsOutput = z
  .object({
    data: z
      .union([
        z.array(errorItem),
        z.object({ data: z.array(errorItem).optional(), totalCount: z.number().optional() }).passthrough(),
      ])
      .optional(),
  })
  .passthrough();

const webVitalsOutput = z.object({ data: looseRow.optional() }).passthrough();

const retentionOutput = z
  .object({
    data: z
      .object({
        cohorts: z
          .record(
            z
              .object({ size: z.number(), percentages: z.array(z.number().nullable()) })
              .partial()
              .passthrough()
          )
          .optional(),
        maxPeriods: z.number().optional(),
        mode: z.string().optional(),
        range: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const journeysOutput = z
  .object({
    journeys: z
      .array(
        z
          .object({ path: z.array(z.string()), count: z.number(), percentage: z.number() })
          .partial()
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export function registerAnalyticsTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  if (allowed("analytics", "read"))
  server.registerTool(
    "get_overview",
    {
      title: "Traffic overview",
      description:
        "Headline KPIs for a site over a time range: sessions, pageviews, unique users, pages per session, bounce rate, and average session duration (seconds).",
      inputSchema: { site_id: siteIdInput, ...timeInputs, filters: filtersInput },
      outputSchema: overviewOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, ...rest }) => ok(await api.call("GET", `/sites/${site_id}/overview`, { query: siteQuery(rest) })))
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_overview_timeseries",
    {
      title: "Traffic time series",
      description:
        "Overview KPIs bucketed over time (sessions, pageviews, users per bucket). Use for trends like 'traffic per day this month'.",
      inputSchema: {
        site_id: siteIdInput,
        bucket: z.enum(TIME_BUCKETS).default("day").describe("Time bucket size"),
        ...timeInputs,
        filters: filtersInput,
      },
      outputSchema: timeseriesOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, bucket, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/overview/time-series`, { query: { bucket, ...siteQuery(rest) } }))
    )
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_breakdown",
    {
      title: "Breakdown by dimension",
      description:
        "Break sessions down by a single dimension (top pages, referrers, countries, devices, browsers, UTM params, channels, entry/exit pages...). Returns { data: { data, totalCount } }; each row has value, count (sessions) and percentage.",
      inputSchema: {
        site_id: siteIdInput,
        dimension: z.enum(FILTER_PARAMETERS).describe("The dimension to break down by, e.g. pathname, referrer, country, channel"),
        limit: z.number().int().min(1).max(500).default(25).describe("Rows to return"),
        page: z.number().int().min(1).optional().describe("1-based page for paging past the first `limit` rows"),
        ...timeInputs,
        filters: filtersInput,
      },
      outputSchema: breakdownOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, dimension, limit, page, ...rest }) =>
      ok(
        await api.call("GET", `/sites/${site_id}/metric`, {
          query: { parameter: dimension, limit, page, ...siteQuery(rest) },
        })
      )
    )
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_live_stats",
    {
      title: "Live visitor count",
      description: "Number of visitors active on the site right now (distinct sessions in the trailing window).",
      inputSchema: {
        site_id: siteIdInput,
        minutes: z.number().int().min(1).max(1440).default(5).describe("Size of the trailing window in minutes"),
      },
      outputSchema: liveStatsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, minutes }) => ok(await api.call("GET", `/sites/${site_id}/live-user-count`, { query: { minutes } })))
  );

  if (allowed("events", "read"))
  server.registerTool(
    "get_event_names",
    {
      title: "Custom event names",
      description: "Custom event names tracked on the site with their counts. Use to discover what events exist before filtering on event_name.",
      inputSchema: { site_id: siteIdInput, ...timeInputs, filters: filtersInput },
      outputSchema: eventNamesOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, ...rest }) => ok(await api.call("GET", `/sites/${site_id}/events/names`, { query: siteQuery(rest) })))
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_errors",
    {
      title: "Top errors",
      description: "JavaScript errors captured on the site, grouped by error name/message with occurrence counts.",
      inputSchema: {
        site_id: siteIdInput,
        limit: z.number().int().min(1).max(100).default(25),
        page: z.number().int().min(1).optional(),
        ...timeInputs,
        filters: filtersInput,
      },
      outputSchema: errorsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, limit, page, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/errors/names`, { query: { limit, page, ...siteQuery(rest) } }))
    )
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_web_vitals",
    {
      title: "Web vitals",
      description: "Core Web Vitals performance overview (LCP, CLS, INP, FCP, TTFB percentiles) for a site.",
      inputSchema: { site_id: siteIdInput, ...timeInputs, filters: filtersInput },
      outputSchema: webVitalsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/performance/overview`, { query: siteQuery(rest) }))
    )
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_retention",
    {
      title: "Retention cohorts",
      description:
        "User retention cohort table: for each cohort period, how many users returned in subsequent periods (retention_percentage per period offset).",
      inputSchema: {
        site_id: siteIdInput,
        mode: z.enum(["day", "week"]).default("week").describe("Cohort granularity"),
        // The endpoint clamps to a 7-day floor, so reject smaller ranges here
        // rather than silently returning a wider window than requested.
        range: z.number().int().min(7).max(365).default(90).describe("How many trailing days of data to include (min 7)"),
      },
      outputSchema: retentionOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, mode, range }) => ok(await api.call("GET", `/sites/${site_id}/retention`, { query: { mode, range } })))
  );

  if (allowed("analytics", "read"))
  server.registerTool(
    "get_journeys",
    {
      title: "User journeys",
      description: "Most common page-to-page navigation paths through the site (sequences of pathnames and how many users followed each).",
      inputSchema: {
        site_id: siteIdInput,
        steps: z.number().int().min(2).max(10).default(3).describe("Journey length in pages"),
        limit: z.number().int().min(1).max(500).default(25).describe("Number of journeys to return"),
        ...timeInputs,
        filters: filtersInput,
      },
      outputSchema: journeysOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, steps, limit, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/journeys`, { query: { steps, limit, ...siteQuery(rest) } }))
    )
  );
}
