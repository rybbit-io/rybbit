import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { memberRoleInput, organizationIdInput } from "../inputs.js";
import {
  destructiveTool,
  idempotentWrite,
  looseRows,
  ok,
  readOnly,
  successOutput,
  writeTool,
  type ScopeCheck, type ToolGuard,
} from "./shared.js";

const membersOutput = z.object({ success: z.boolean(), data: looseRows.optional() }).partial().passthrough();

const addMemberOutput = z.object({ message: z.string() }).partial().passthrough();

const memberSiteAccessOutput = z
  .object({ memberId: z.string(), hasRestrictedSiteAccess: z.boolean(), siteAccess: looseRows.optional() })
  .partial()
  .passthrough();

const teamsOutput = z.object({ teams: looseRows.optional() }).passthrough();

const teamOutput = z.object({ id: z.string(), name: z.string() }).partial().passthrough();

const teamIdInput = z.string().min(1).describe("Team ID from list_teams");

export function registerOrganizationTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  if (allowed("org", "read"))
  server.registerTool(
    "list_members",
    {
      title: "List organization members",
      description:
        "Members of an organization with their role, restricted-site access, and team memberships. member_id (the membership record) is what update_member_site_access takes; userId is what team tools take.",
      inputSchema: { organization_id: organizationIdInput },
      outputSchema: membersOutput,
      annotations: readOnly,
    },
    guard(async ({ organization_id }) =>
      ok(await api.call("GET", `/organizations/${encodeURIComponent(organization_id)}/members`))
    )
  );

  if (allowed("org", "write"))
  server.registerTool(
    "add_member",
    {
      title: "Add organization member",
      description:
        "Add an existing Rybbit user to the organization by email. The user must already have a Rybbit account. Requires an org admin/owner key; only an owner key can grant the owner role.",
      inputSchema: {
        organization_id: organizationIdInput,
        email: z.string().email().describe("Email of an existing Rybbit user"),
        role: memberRoleInput,
      },
      outputSchema: addMemberOutput,
      annotations: writeTool,
    },
    guard(async ({ organization_id, email, role }) =>
      ok(await api.call("POST", `/organizations/${encodeURIComponent(organization_id)}/members`, { body: { email, role } }))
    )
  );

  if (allowed("org", "write"))
  server.registerTool(
    "update_member_site_access",
    {
      title: "Update member site access",
      description:
        "Restrict a member to specific sites, or lift the restriction. Applies to member-role users only (admins/owners always see all sites). Requires an org admin/owner key.",
      inputSchema: {
        organization_id: organizationIdInput,
        member_id: z.string().min(1).describe("Membership record id from list_members (not the user id)"),
        has_restricted_site_access: z.boolean().describe("true = member sees only site_ids; false = member sees all org sites"),
        site_ids: z.array(z.number().int().positive()).describe("Sites the member may access when restricted"),
      },
      outputSchema: memberSiteAccessOutput,
      annotations: idempotentWrite,
    },
    guard(async ({ organization_id, member_id, has_restricted_site_access, site_ids }) =>
      ok(
        await api.call(
          "PUT",
          `/organizations/${encodeURIComponent(organization_id)}/members/${encodeURIComponent(member_id)}/sites`,
          { body: { hasRestrictedSiteAccess: has_restricted_site_access, siteIds: site_ids } }
        )
      )
    )
  );

  if (allowed("org", "read"))
  server.registerTool(
    "list_teams",
    {
      title: "List teams",
      description: "Teams in the organization with their members and site access.",
      inputSchema: { organization_id: organizationIdInput },
      outputSchema: teamsOutput,
      annotations: readOnly,
    },
    guard(async ({ organization_id }) =>
      ok(await api.call("GET", `/organizations/${encodeURIComponent(organization_id)}/teams`))
    )
  );

  if (allowed("org", "write"))
  server.registerTool(
    "create_team",
    {
      title: "Create team",
      description: "Create a team, optionally with initial members (user ids from list_members) and site access. Requires an org admin/owner key.",
      inputSchema: {
        organization_id: organizationIdInput,
        name: z.string().min(1),
        member_user_ids: z.array(z.string()).optional().describe("userId values from list_members"),
        site_ids: z.array(z.number().int().positive()).optional(),
      },
      outputSchema: teamOutput,
      annotations: writeTool,
    },
    guard(async ({ organization_id, name, member_user_ids, site_ids }) =>
      ok(
        await api.call("POST", `/organizations/${encodeURIComponent(organization_id)}/teams`, {
          body: { name, memberUserIds: member_user_ids, siteIds: site_ids },
        })
      )
    )
  );

  if (allowed("org", "write"))
  server.registerTool(
    "update_team",
    {
      title: "Update team",
      description:
        "Rename a team and/or replace its member and site lists. Member and site arrays are replaced wholesale when provided — fetch current state with list_teams first. Requires an org admin/owner key.",
      inputSchema: {
        organization_id: organizationIdInput,
        team_id: teamIdInput,
        name: z.string().min(1).optional(),
        member_user_ids: z.array(z.string()).optional(),
        site_ids: z.array(z.number().int().positive()).optional(),
      },
      outputSchema: successOutput,
      annotations: idempotentWrite,
    },
    guard(async ({ organization_id, team_id, name, member_user_ids, site_ids }) =>
      ok(
        await api.call(
          "PUT",
          `/organizations/${encodeURIComponent(organization_id)}/teams/${encodeURIComponent(team_id)}`,
          { body: { name, memberUserIds: member_user_ids, siteIds: site_ids } }
        )
      )
    )
  );

  if (allowed("org", "write"))
  server.registerTool(
    "delete_team",
    {
      title: "Delete team",
      description: "Permanently delete a team (members keep their org membership). Requires an org admin/owner key. Confirm with the user before calling.",
      inputSchema: { organization_id: organizationIdInput, team_id: teamIdInput },
      outputSchema: successOutput,
      annotations: destructiveTool,
    },
    guard(async ({ organization_id, team_id }) =>
      ok(
        await api.call(
          "DELETE",
          `/organizations/${encodeURIComponent(organization_id)}/teams/${encodeURIComponent(team_id)}`
        )
      )
    )
  );
}
