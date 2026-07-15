import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EVENT_SCHEMA } from "../../api/analytics/utils/eventSchema.js";
import { RybbitApiClient } from "../apiClient.js";
import { filtersInput, organizationIdInput, siteIdInput, timeInputs } from "../inputs.js";
import { looseRow, looseRows, ok, readOnly, siteQuery, type ScopeCheck, type ToolGuard } from "./shared.js";

const sessionsOutput = z.object({ data: looseRows.optional() }).passthrough();

const sessionDetailOutput = z
  .object({
    session: looseRow.optional(),
    events: looseRows.optional(),
    pagination: z
      .object({ total: z.number(), limit: z.number(), offset: z.number(), hasMore: z.boolean() })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();

const eventsOutput = z
  .object({
    data: looseRows.optional(),
    cursor: z
      .object({ hasMore: z.boolean(), oldestTimestamp: z.string().nullable() })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();

const runQueryOutput = z.object({ data: looseRows.optional(), meta: looseRow.optional() }).passthrough();

export function registerRawDataTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  if (allowed("sessions", "read"))
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
      outputSchema: sessionsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, limit, page, user_id, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/sessions`, { query: { limit, page, user_id, ...siteQuery(rest) } }))
    )
  );

  if (allowed("sessions", "read"))
  server.registerTool(
    "get_session",
    {
      title: "Session detail",
      description:
        "One session's attribution plus its event timeline (pageviews, custom events, errors) in order. Use get_sessions to find session IDs.",
      inputSchema: {
        site_id: siteIdInput,
        session_id: z.string().min(1).describe("Session ID from get_sessions"),
        limit: z.number().int().min(1).max(200).default(50).describe("Events to return"),
        offset: z.number().int().min(0).optional().describe("Skip this many events (for paging long sessions)"),
      },
      outputSchema: sessionDetailOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, session_id, limit, offset }) =>
      ok(
        await api.call("GET", `/sites/${site_id}/sessions/${encodeURIComponent(session_id)}`, {
          query: { limit, offset },
        })
      )
    )
  );

  if (allowed("events", "read"))
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
      outputSchema: eventsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, page_size, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/events`, { query: { page_size, ...siteQuery(rest) } }))
    )
  );

  if (allowed("sql", "read"))
  server.registerTool(
    "get_query_schema",
    {
      title: "Custom query schema",
      description:
        "The ClickHouse table schema and rules for run_query. Always read this before writing SQL for run_query.",
      inputSchema: {},
      annotations: readOnly,
    },
    guard(async () =>
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

  if (allowed("sql", "read"))
  server.registerTool(
    "run_query",
    {
      title: "Run custom SQL query",
      description:
        "Escape hatch for questions the other tools cannot answer: run a read-only ClickHouse SQL query against the scoped_events table. Call get_query_schema first for the schema and rules. Prefer aggregated queries (GROUP BY + LIMIT) — results are capped at 1000 rows.",
      inputSchema: {
        organization_id: organizationIdInput,
        query: z.string().min(1).describe("ClickHouse SELECT over scoped_events"),
        site_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Restrict the query to one site. Omit to span every accessible site in the organization."),
      },
      outputSchema: runQueryOutput,
      annotations: readOnly,
    },
    guard(async ({ organization_id, query, site_id }) =>
      ok(
        await api.call("POST", `/organizations/${encodeURIComponent(organization_id)}/analytics/query`, {
          body: { query, siteId: site_id },
        })
      )
    )
  );
}
