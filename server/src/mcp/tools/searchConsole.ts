import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// Leaf module (zod + country codes, no database imports), so MCP tests stay hermetic.
import {
  GSC_DATA_STATES,
  GSC_DIMENSIONS,
  GSC_FILTER_DIMENSIONS,
  GSC_FILTER_OPERATORS,
  GSC_MAX_DIMENSIONS,
  GSC_MAX_FILTERS,
  GSC_MAX_ROW_LIMIT,
  GSC_SEARCH_TYPES,
} from "../../api/gsc/searchAnalytics.js";
import { RybbitApiClient } from "../apiClient.js";
import { siteIdInput } from "../inputs.js";
import { looseRows, ok, readOnly, type ScopeCheck, type ToolGuard } from "./shared.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Search Console rows are cheap individually but numerous; keep the default small.
const DEFAULT_ROW_LIMIT = 100;

const statusOutput = z
  .object({ connected: z.boolean(), gscPropertyUrl: z.string().nullable() })
  .partial()
  .passthrough();

const dataOutput = z.object({ data: looseRows.optional() }).passthrough();

const filterInput = z.object({
  dimension: z.enum(GSC_FILTER_DIMENSIONS),
  operator: z.enum(GSC_FILTER_OPERATORS).optional().describe("Defaults to equals"),
  expression: z.string().min(1),
});

export function registerSearchConsoleTools(
  server: McpServer,
  api: RybbitApiClient,
  guard: ToolGuard,
  allowed: ScopeCheck
): void {
  if (!allowed("gsc", "read")) {
    return;
  }

  server.registerTool(
    "get_search_console_status",
    {
      title: "Search Console connection",
      description:
        "Whether Google Search Console is connected to the site in Rybbit, and which property (e.g. sc-domain:example.com). Search Console data is only available after a site admin connects it in the Rybbit dashboard under Site settings > Integrations.",
      inputSchema: { site_id: siteIdInput },
      outputSchema: statusOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id }) => ok(await api.call("GET", `/sites/${site_id}/gsc/status`)))
  );

  server.registerTool(
    "get_search_console_data",
    {
      title: "Search Console performance",
      description:
        "Google Search Console performance for the site: clicks, impressions, ctr (a 0-1 fraction), and average position (1 = top result), grouped by up to three dimensions. Requires Search Console to be connected (see get_search_console_status). Data comes from Google, covers the last 16 months, and lags about two days unless data_state is 'all'. Rows are sorted by clicks, highest first. Page values are full URLs, e.g. https://example.com/pricing. Examples: top queries → dimensions ['query']; queries a page ranks for → ['query'] with a page contains filter; daily trend → ['date']; which page ranks for which query → ['query', 'page']. To compare periods, call once per date range.",
      inputSchema: {
        site_id: siteIdInput,
        start_date: z.string().regex(dateRegex, "Use YYYY-MM-DD").describe("Start date (YYYY-MM-DD, inclusive)."),
        end_date: z.string().regex(dateRegex, "Use YYYY-MM-DD").describe("End date (YYYY-MM-DD, inclusive)."),
        dimensions: z
          .array(z.enum(GSC_DIMENSIONS))
          .min(1)
          .max(GSC_MAX_DIMENSIONS)
          .default(["query"])
          .describe("Group rows by these dimensions, in order. Defaults to ['query']."),
        filters: z
          .array(filterInput)
          .max(GSC_MAX_FILTERS)
          .optional()
          .describe(
            'Optional filters, ANDed together. country takes ISO alpha-2 codes (US) with equals/notEquals; device takes DESKTOP, MOBILE, or TABLET. Example: [{"dimension":"page","operator":"contains","expression":"/pricing"}]'
          ),
        search_type: z
          .enum(GSC_SEARCH_TYPES)
          .optional()
          .describe(
            "Which Google surface to report on. Defaults to web. discover and googleNews don't support the query dimension."
          ),
        data_state: z
          .enum(GSC_DATA_STATES)
          .optional()
          .describe("'final' (default) excludes the last ~2 days; 'all' includes fresh, still-changing data."),
        row_limit: z
          .number()
          .int()
          .min(1)
          .max(GSC_MAX_ROW_LIMIT)
          .optional()
          .describe(
            `Rows to return, default ${DEFAULT_ROW_LIMIT}, max ${GSC_MAX_ROW_LIMIT}. If you get exactly this many, page with start_row.`
          ),
        start_row: z.number().int().min(0).optional().describe("Zero-based offset for paging. Default 0."),
      },
      outputSchema: dataOutput,
      annotations: readOnly,
    },
    guard(
      async ({ site_id, start_date, end_date, dimensions, filters, search_type, data_state, row_limit, start_row }) =>
        ok(
          await api.call("GET", `/sites/${site_id}/gsc/data`, {
            query: {
              start_date,
              end_date,
              dimensions: dimensions.join(","),
              filters: filters && filters.length > 0 ? JSON.stringify(filters) : undefined,
              search_type,
              data_state,
              row_limit: row_limit ?? DEFAULT_ROW_LIMIT,
              start_row,
            },
          })
        )
    )
  );
}
