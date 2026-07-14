import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EVENT_SCHEMA } from "../api/analytics/generateCustomQuery.js";
import { RybbitApiClient, RybbitApiError } from "./apiClient.js";
import {
  FILTER_PARAMETERS,
  TIME_BUCKETS,
  filtersInput,
  siteIdInput,
  timeInputs,
  toFiltersQuery,
  toTimeQuery,
  type FilterArgs,
  type TimeArgs,
} from "./inputs.js";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

const ERROR_HINTS: Record<number, string> = {
  401: "The API key is missing or invalid. Create one under Settings > Account > API Keys and send it as 'Authorization: Bearer <key>'.",
  403: "The API key's user does not have access to this site or organization. Check the site_id with list_sites.",
  429: "Rate limited. Wait before retrying, and prefer fewer, more aggregated queries.",
};

function withErrors<Args>(handler: (args: Args) => Promise<ToolResult>): (args: Args) => Promise<ToolResult> {
  return async (args: Args) => {
    try {
      return await handler(args);
    } catch (error) {
      if (error instanceof RybbitApiError) {
        const hint = ERROR_HINTS[error.status];
        return fail(`Rybbit API error ${error.status}: ${error.message}${hint ? ` — ${hint}` : ""}`);
      }
      return fail(error instanceof Error ? error.message : "Unexpected error");
    }
  };
}

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

function siteQuery(args: TimeArgs & { filters?: FilterArgs }) {
  return { ...toTimeQuery(args), ...toFiltersQuery(args.filters) };
}

export function registerTools(server: McpServer, api: RybbitApiClient): void {
  server.registerTool(
    "list_sites",
    {
      title: "List sites",
      description:
        "List the organizations and sites this API key can access. Call this first: it resolves the numeric site_id used by every other tool and the organization_id used by run_query.",
      inputSchema: {},
      annotations: readOnly,
    },
    withErrors(async () => {
      const orgs = await api.call<
        {
          id: string;
          name: string;
          slug: string;
          role: string;
          sites?: { id: string; name: string; domain: string; public: boolean }[];
        }[]
      >("GET", "/organizations");
      return ok(
        orgs.map(org => ({
          organization_id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.role,
          sites: (org.sites ?? []).map(site => ({
            site_id: Number.isNaN(Number(site.id)) ? site.id : Number(site.id),
            name: site.name,
            domain: site.domain,
            public: site.public,
          })),
        }))
      );
    })
  );

  server.registerTool(
    "get_overview",
    {
      title: "Traffic overview",
      description:
        "Headline KPIs for a site over a time range: sessions, pageviews, unique users, pages per session, bounce rate, and average session duration (seconds).",
      inputSchema: { site_id: siteIdInput, ...timeInputs, filters: filtersInput },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, ...rest }) => ok(await api.call("GET", `/sites/${site_id}/overview`, { query: siteQuery(rest) })))
  );

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
      annotations: readOnly,
    },
    withErrors(async ({ site_id, bucket, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/overview/time-series`, { query: { bucket, ...siteQuery(rest) } }))
    )
  );

  server.registerTool(
    "get_breakdown",
    {
      title: "Breakdown by dimension",
      description:
        "Break sessions down by a single dimension (top pages, referrers, countries, devices, browsers, UTM params, channels, entry/exit pages...). Returns { data, totalCount }; each row has value, count (sessions) and percentage.",
      inputSchema: {
        site_id: siteIdInput,
        dimension: z.enum(FILTER_PARAMETERS).describe("The dimension to break down by, e.g. pathname, referrer, country, channel"),
        limit: z.number().int().min(1).max(500).default(25).describe("Rows to return"),
        page: z.number().int().min(1).optional().describe("1-based page for paging past the first `limit` rows"),
        ...timeInputs,
        filters: filtersInput,
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, dimension, limit, page, ...rest }) =>
      ok(
        await api.call("GET", `/sites/${site_id}/metric`, {
          query: { parameter: dimension, limit, page, ...siteQuery(rest) },
        })
      )
    )
  );

  server.registerTool(
    "get_live_stats",
    {
      title: "Live visitor count",
      description: "Number of visitors active on the site right now (distinct sessions in the trailing window).",
      inputSchema: {
        site_id: siteIdInput,
        minutes: z.number().int().min(1).max(1440).default(5).describe("Size of the trailing window in minutes"),
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, minutes }) => ok(await api.call("GET", `/sites/${site_id}/live-user-count`, { query: { minutes } })))
  );

  server.registerTool(
    "get_sessions",
    {
      title: "List sessions",
      description:
        "Recent visitor sessions with full attribution (entry/exit page, referrer, channel, UTM, device, geo, duration, pageview/event counts). Filterable by user.",
      inputSchema: {
        site_id: siteIdInput,
        limit: z.number().int().min(1).max(100).default(20),
        page: z.number().int().min(1).default(1),
        user_id: z.string().optional().describe("Only sessions for this user (device fingerprint id or identified user id)"),
        ...timeInputs,
        filters: filtersInput,
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, limit, page, user_id, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/sessions`, { query: { limit, page, user_id, ...siteQuery(rest) } }))
    )
  );

  server.registerTool(
    "get_events",
    {
      title: "Recent events",
      description: "Raw recent events (pageviews, custom events, errors, outbound clicks...) for a site, newest first.",
      inputSchema: {
        site_id: siteIdInput,
        page_size: z.number().int().min(1).max(100).default(20),
        ...timeInputs,
        filters: filtersInput,
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, page_size, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/events`, { query: { page_size, ...siteQuery(rest) } }))
    )
  );

  server.registerTool(
    "get_event_names",
    {
      title: "Custom event names",
      description: "Custom event names tracked on the site with their counts. Use to discover what events exist before filtering on event_name.",
      inputSchema: { site_id: siteIdInput, ...timeInputs, filters: filtersInput },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, ...rest }) => ok(await api.call("GET", `/sites/${site_id}/events/names`, { query: siteQuery(rest) })))
  );

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
      annotations: readOnly,
    },
    withErrors(async ({ site_id, limit, page, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/errors/names`, { query: { limit, page, ...siteQuery(rest) } }))
    )
  );

  server.registerTool(
    "get_web_vitals",
    {
      title: "Web vitals",
      description: "Core Web Vitals performance overview (LCP, CLS, INP, FCP, TTFB percentiles) for a site.",
      inputSchema: { site_id: siteIdInput, ...timeInputs, filters: filtersInput },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/performance/overview`, { query: siteQuery(rest) }))
    )
  );

  server.registerTool(
    "get_retention",
    {
      title: "Retention cohorts",
      description:
        "User retention cohort table: for each cohort period, how many users returned in subsequent periods (retention_percentage per period offset).",
      inputSchema: {
        site_id: siteIdInput,
        mode: z.enum(["day", "week"]).default("week").describe("Cohort granularity"),
        range: z.number().int().min(1).max(365).default(90).describe("How many trailing days of data to include"),
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, mode, range }) => ok(await api.call("GET", `/sites/${site_id}/retention`, { query: { mode, range } })))
  );

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
      annotations: readOnly,
    },
    withErrors(async ({ site_id, steps, limit, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/journeys`, { query: { steps, limit, ...siteQuery(rest) } }))
    )
  );

  server.registerTool(
    "get_goals",
    {
      title: "Goal conversions",
      description: "Configured conversion goals with total conversions, total sessions, and conversion rate over the time range.",
      inputSchema: {
        site_id: siteIdInput,
        page: z.number().int().min(1).default(1),
        page_size: z.number().int().min(1).max(100).default(25),
        ...timeInputs,
        filters: filtersInput,
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, page, page_size, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/goals`, { query: { page, page_size, ...siteQuery(rest) } }))
    )
  );

  server.registerTool(
    "get_funnels",
    {
      title: "List saved funnels",
      description: "Saved funnel definitions for a site (name, steps, last known conversion rate). Use analyze_funnel to compute fresh results.",
      inputSchema: { site_id: siteIdInput },
      annotations: readOnly,
    },
    withErrors(async ({ site_id }) => ok(await api.call("GET", `/sites/${site_id}/funnels`)))
  );

  server.registerTool(
    "analyze_funnel",
    {
      title: "Analyze funnel",
      description:
        "Compute a conversion funnel over ordered steps (pages and/or custom events). Returns per-step visitors, conversion_rate, and dropoff_rate. Steps do not need to be saved first.",
      inputSchema: {
        site_id: siteIdInput,
        steps: z
          .array(
            z.object({
              type: z.enum(["page", "event"]).describe("'page' matches a pathname, 'event' matches a custom event name"),
              value: z.string().describe("The pathname (e.g. /pricing) or custom event name (e.g. signup)"),
              name: z.string().optional().describe("Optional label for the step"),
            })
          )
          .min(2)
          .max(10)
          .describe("Ordered funnel steps, first to last"),
        ...timeInputs,
        filters: filtersInput,
      },
      annotations: readOnly,
    },
    withErrors(async ({ site_id, steps, ...rest }) =>
      ok(await api.call("POST", `/sites/${site_id}/funnels/analyze`, { query: siteQuery(rest), body: { steps } }))
    )
  );

  server.registerTool(
    "get_query_schema",
    {
      title: "Custom query schema",
      description:
        "The ClickHouse table schema and rules for run_query. Always read this before writing SQL for run_query.",
      inputSchema: {},
      annotations: readOnly,
    },
    withErrors(async () =>
      ok(
        [
          "Rules for run_query SQL:",
          "- The only readable table is scoped_events (pre-filtered to sites the API key can access).",
          "- SELECT or WITH ... SELECT only; ClickHouse syntax; no semicolon.",
          "- Results are capped at 1000 rows and 10s execution time — aggregate instead of selecting raw rows.",
          "- Filter to one site with WHERE site_id = <id>, or pass site_id in the tool call.",
          EVENT_SCHEMA,
        ].join("\n")
      )
    )
  );

  server.registerTool(
    "run_query",
    {
      title: "Run custom SQL query",
      description:
        "Escape hatch for questions the other tools cannot answer: run a read-only ClickHouse SQL query against the scoped_events table. Call get_query_schema first for the schema and rules. Prefer aggregated queries (GROUP BY + LIMIT) — results are capped at 1000 rows.",
      inputSchema: {
        organization_id: z.string().describe("Organization ID from list_sites"),
        query: z.string().min(1).describe("ClickHouse SELECT over scoped_events"),
        site_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Restrict the query to one site. Omit to span every accessible site in the organization."),
      },
      annotations: readOnly,
    },
    withErrors(async ({ organization_id, query, site_id }) =>
      ok(
        await api.call("POST", `/organizations/${encodeURIComponent(organization_id)}/analytics/query`, {
          body: { query, siteId: site_id },
        })
      )
    )
  );
}
