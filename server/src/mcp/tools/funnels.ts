import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { filtersInput, funnelStepInput, siteIdInput, timeInputs } from "../inputs.js";
import {
  destructiveTool,
  looseRows,
  ok,
  readOnly,
  siteQuery,
  successOutput,
  writeTool,
  type ScopeCheck, type ToolGuard,
} from "./shared.js";

const funnelsOutput = z.object({ data: looseRows.optional() }).passthrough();

const funnelStepResult = z
  .object({
    step_number: z.number(),
    step_name: z.string(),
    visitors: z.number(),
    conversion_rate: z.number(),
    dropoff_rate: z.number(),
  })
  .partial()
  .passthrough();

const analyzeFunnelOutput = z.object({ data: z.array(funnelStepResult).optional() }).passthrough();

const saveFunnelOutput = z.object({ success: z.boolean(), funnelId: z.number() }).partial().passthrough();

export function registerFunnelTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  if (allowed("funnels", "read"))
  server.registerTool(
    "get_funnels",
    {
      title: "List saved funnels",
      description: "Saved funnel definitions for a site (name, steps, last known conversion rate). Use analyze_funnel to compute fresh results.",
      inputSchema: { site_id: siteIdInput },
      outputSchema: funnelsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id }) => ok(await api.call("GET", `/sites/${site_id}/funnels`)))
  );

  if (allowed("funnels", "read"))
  server.registerTool(
    "analyze_funnel",
    {
      title: "Analyze funnel",
      description:
        "Compute a conversion funnel over ordered steps (pages, custom events, or autocaptured interactions). Returns per-step visitors, conversion_rate, and dropoff_rate. Does not save anything; use save_funnel to persist a definition.",
      inputSchema: {
        site_id: siteIdInput,
        steps: z.array(funnelStepInput).min(2).max(10).describe("Ordered funnel steps, first to last"),
        ...timeInputs,
        filters: filtersInput,
      },
      outputSchema: analyzeFunnelOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, steps, ...rest }) =>
      ok(await api.call("POST", `/sites/${site_id}/funnels/analyze`, { query: siteQuery(rest), body: { steps } }))
    )
  );

  if (allowed("funnels", "write"))
  server.registerTool(
    "save_funnel",
    {
      title: "Save funnel",
      description:
        "Save a funnel definition so it appears in the dashboard, or update an existing one by passing funnel_id (from get_funnels). Omitting funnel_id always creates a new funnel.",
      inputSchema: {
        site_id: siteIdInput,
        name: z.string().min(1).describe("Display name for the saved funnel"),
        steps: z.array(funnelStepInput).min(2).describe("Ordered funnel steps, first to last"),
        funnel_id: z.number().int().positive().optional().describe("Pass a funnel id from get_funnels to update it in place"),
      },
      outputSchema: saveFunnelOutput,
      annotations: writeTool,
    },
    guard(async ({ site_id, name, steps, funnel_id }) =>
      ok(await api.call("POST", `/sites/${site_id}/funnels`, { body: { name, steps, reportId: funnel_id } }))
    )
  );

  if (allowed("funnels", "write"))
  server.registerTool(
    "delete_funnel",
    {
      title: "Delete funnel",
      description: "Permanently delete a saved funnel definition. Irreversible; confirm with the user before calling.",
      inputSchema: {
        site_id: siteIdInput,
        funnel_id: z.number().int().positive().describe("Funnel ID from get_funnels"),
      },
      outputSchema: successOutput,
      annotations: destructiveTool,
    },
    guard(async ({ site_id, funnel_id }) => ok(await api.call("DELETE", `/sites/${site_id}/funnels/${funnel_id}`)))
  );
}
