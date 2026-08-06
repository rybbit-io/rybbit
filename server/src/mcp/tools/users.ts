import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { filtersInput, siteIdInput, timeInputs, traitsInput } from "../inputs.js";
import {
  destructiveTool,
  idempotentWrite,
  looseRow,
  looseRows,
  ok,
  readOnly,
  siteQuery,
  successOutput,
  writeTool,
  type ScopeCheck, type ToolGuard,
} from "./shared.js";

const usersOutput = z
  .object({
    data: looseRows.optional(),
    totalCount: z.number().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
  })
  .passthrough();

const userOutput = z.object({ data: looseRow.optional() }).passthrough();

const userIdInput = z.string().min(1).describe("The user's id from get_users (device fingerprint id or identified user id)");

export function registerUserTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  if (allowed("users", "read"))
  server.registerTool(
    "get_users",
    {
      title: "List users",
      description:
        "The people behind the analytics: per-user aggregates (first/last seen, sessions, pageviews, events) with traits. Sortable, searchable, and filterable to identified users only.",
      inputSchema: {
        site_id: siteIdInput,
        page: z.number().int().min(1).default(1),
        page_size: z.number().int().min(1).max(100).default(25),
        sort_by: z.enum(["first_seen", "last_seen", "pageviews", "sessions", "events"]).default("last_seen"),
        sort_order: z.enum(["asc", "desc"]).default("desc"),
        identified_only: z.boolean().default(false).describe("Only users identified via identify()"),
        search: z.string().optional(),
        search_field: z.enum(["username", "name", "email", "user_id"]).optional().describe("Trait/id field the search matches against"),
        ...timeInputs,
        filters: filtersInput,
      },
      outputSchema: usersOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, page, page_size, sort_by, sort_order, identified_only, search, search_field, ...rest }) =>
      ok(
        await api.call("GET", `/sites/${site_id}/users`, {
          query: { page, page_size, sort_by, sort_order, identified_only, search, search_field, ...siteQuery(rest) },
        })
      )
    )
  );

  if (allowed("users", "read"))
  server.registerTool(
    "get_user",
    {
      title: "User profile",
      description:
        "One person's profile: activity aggregates, traits, linked devices, web-vitals percentiles, and location/device breakdowns.",
      inputSchema: { site_id: siteIdInput, user_id: userIdInput },
      outputSchema: userOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id, user_id }) =>
      ok(await api.call("GET", `/sites/${site_id}/users/${encodeURIComponent(user_id)}`))
    )
  );

  if (allowed("users", "write"))
  server.registerTool(
    "identify_user",
    {
      title: "Identify user",
      description:
        "Link an anonymous device id to your own user id and merge traits — the server-side equivalent of the SDK's identify() call. Event aggregates may take a moment to reflect the merge.",
      inputSchema: {
        site_id: siteIdInput,
        anonymous_id: z.string().min(1).describe("The anonymous device/user id recorded by the tracker"),
        user_id: z.string().min(1).describe("Your application's id for this user"),
        traits: traitsInput.optional(),
      },
      outputSchema: successOutput,
      annotations: writeTool,
    },
    guard(async ({ site_id, anonymous_id, user_id, traits }) =>
      ok(await api.call("POST", `/sites/${site_id}/users/identify`, { body: { anonymous_id, user_id, traits } }))
    )
  );

  if (allowed("users", "write"))
  server.registerTool(
    "update_user_traits",
    {
      title: "Update user traits",
      description:
        "Replace a person's traits wholesale (max 2KB serialized). Unlike identify_user, this does not merge — fetch current traits with get_user first and resend everything you want to keep.",
      inputSchema: { site_id: siteIdInput, user_id: userIdInput, traits: traitsInput },
      outputSchema: successOutput,
      annotations: idempotentWrite,
    },
    guard(async ({ site_id, user_id, traits }) =>
      ok(await api.call("PUT", `/sites/${site_id}/users/${encodeURIComponent(user_id)}/traits`, { body: { traits } }))
    )
  );

  if (allowed("users", "write"))
  server.registerTool(
    "delete_user",
    {
      title: "Delete user (GDPR erasure)",
      description:
        "Permanently delete one person's analytics data: events, session replays, profile, and device aliases. Irreversible; erasure completes asynchronously. Requires the API key's user to be an org admin or owner. Confirm with the user before calling.",
      inputSchema: { site_id: siteIdInput, user_id: userIdInput },
      outputSchema: successOutput,
      annotations: destructiveTool,
    },
    guard(async ({ site_id, user_id }) =>
      ok(await api.call("DELETE", `/sites/${site_id}/users/${encodeURIComponent(user_id)}`))
    )
  );
}
