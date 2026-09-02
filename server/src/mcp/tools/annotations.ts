import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { siteIdInput } from "../inputs.js";
import { looseRows, ok, readOnly, type ScopeCheck, type ToolGuard } from "./shared.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const annotationsOutput = z.object({ data: looseRows.optional() }).passthrough();

export function registerAnnotationTools(
  server: McpServer,
  api: RybbitApiClient,
  guard: ToolGuard,
  allowed: ScopeCheck
): void {
  if (allowed("annotations", "read"))
    server.registerTool(
      "get_annotations",
      {
        title: "Timeline annotations",
        description:
          "Notes pinned to dates on the site's traffic chart (launches, deploys, campaigns, outages), including organization-wide ones. Each has a title, optional description, date, optional endDate for ranges, and isPublic. Use these to explain spikes or dips before speculating about causes.",
        inputSchema: {
          site_id: siteIdInput,
          start_date: z
            .string()
            .regex(dateRegex, "Use YYYY-MM-DD")
            .optional()
            .describe("Only annotations on or after this date (YYYY-MM-DD, UTC). Omit for all."),
          end_date: z
            .string()
            .regex(dateRegex, "Use YYYY-MM-DD")
            .optional()
            .describe("Only annotations on or before this date (YYYY-MM-DD, UTC). Omit for all."),
        },
        outputSchema: annotationsOutput,
        annotations: readOnly,
      },
      guard(async ({ site_id, start_date, end_date }) =>
        ok(await api.call("GET", `/sites/${site_id}/annotations`, { query: { start_date, end_date } }))
      )
    );
}
