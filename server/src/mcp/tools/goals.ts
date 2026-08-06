import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { filtersInput, goalConfigInput, goalTypeInput, siteIdInput, timeInputs } from "../inputs.js";
import {
  destructiveTool,
  idempotentWrite,
  looseRows,
  ok,
  readOnly,
  siteQuery,
  successOutput,
  writeTool,
  type ScopeCheck, type ToolGuard,
} from "./shared.js";

const goalsOutput = z
  .object({
    data: looseRows.optional(),
    meta: z
      .object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() })
      .partial()
      .passthrough()
      .optional(),
  })
  .passthrough();

const goalWriteOutput = z.object({ success: z.boolean(), goalId: z.number() }).partial().passthrough();

const goalIdInput = z.number().int().positive().describe("Goal ID from get_goals");

export function registerGoalTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  if (allowed("goals", "read"))
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
      outputSchema: goalsOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, page, page_size, ...rest }) =>
      ok(await api.call("GET", `/sites/${site_id}/goals`, { query: { page, page_size, ...siteQuery(rest) } }))
    )
  );

  if (allowed("goals", "write"))
  server.registerTool(
    "create_goal",
    {
      title: "Create goal",
      description:
        "Create a conversion goal. Path goals need config.pathPattern; event goals need config.eventName; autocapture goals (outbound, button_click, form_submit, copy) can match a value pattern.",
      inputSchema: {
        site_id: siteIdInput,
        name: z.string().optional().describe("Display name; defaults to the pattern/event"),
        goal_type: goalTypeInput,
        config: goalConfigInput,
      },
      outputSchema: goalWriteOutput,
      annotations: writeTool,
    },
    guard(async ({ site_id, name, goal_type, config }) =>
      ok(await api.call("POST", `/sites/${site_id}/goals`, { body: { name, goalType: goal_type, config } }))
    )
  );

  if (allowed("goals", "write"))
  server.registerTool(
    "update_goal",
    {
      title: "Update goal",
      description:
        "Replace a goal's name, type, and config. This is a full replacement, not a patch — fetch current values with get_goals first and resend every field you want to keep.",
      inputSchema: {
        site_id: siteIdInput,
        goal_id: goalIdInput,
        name: z.string().optional(),
        goal_type: goalTypeInput,
        config: goalConfigInput,
      },
      outputSchema: goalWriteOutput,
      annotations: idempotentWrite,
    },
    guard(async ({ site_id, goal_id, name, goal_type, config }) =>
      ok(await api.call("PUT", `/sites/${site_id}/goals/${goal_id}`, { body: { name, goalType: goal_type, config } }))
    )
  );

  if (allowed("goals", "write"))
  server.registerTool(
    "delete_goal",
    {
      title: "Delete goal",
      description: "Permanently delete a conversion goal. Irreversible; confirm with the user before calling.",
      inputSchema: { site_id: siteIdInput, goal_id: goalIdInput },
      outputSchema: successOutput,
      annotations: destructiveTool,
    },
    guard(async ({ site_id, goal_id }) => ok(await api.call("DELETE", `/sites/${site_id}/goals/${goal_id}`)))
  );
}
