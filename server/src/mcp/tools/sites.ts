import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { organizationIdInput, siteFeatureInputs, siteIdInput } from "../inputs.js";
import { destructiveTool, idempotentWrite, looseRow, ok, readOnly, writeTool, type ScopeCheck, type ToolGuard } from "./shared.js";

const listSitesOutput = z.object({
  organizations: z.array(
    z.object({
      organization_id: z.string(),
      name: z.string(),
      slug: z.string(),
      role: z.string(),
      sites: z.array(
        z.object({
          site_id: z.union([z.number(), z.string()]),
          name: z.string(),
          domain: z.string(),
          public: z.boolean(),
        })
      ),
    })
  ),
});

const siteOutput = z
  .object({
    siteId: z.number(),
    name: z.string(),
    domain: z.string(),
    type: z.string().nullable(),
    public: z.boolean(),
  })
  .partial()
  .passthrough();

const updateSiteConfigOutput = z
  .object({ success: z.boolean(), message: z.string(), config: looseRow.optional() })
  .partial()
  .passthrough();

export function registerSiteTools(server: McpServer, api: RybbitApiClient, guard: ToolGuard, allowed: ScopeCheck): void {
  server.registerTool(
    "list_sites",
    {
      title: "List sites",
      description:
        "List the organizations and sites this API key can access. Call this first: it resolves the numeric site_id used by site tools and the organization_id used by organization tools, and its role field shows the key's role per organization (write tools need member access; site/org management needs admin or owner).",
      inputSchema: {},
      outputSchema: listSitesOutput,
      annotations: readOnly,
    },
    guard(async () => {
      const orgs = await api.call<
        {
          id: string;
          name: string;
          slug: string;
          role: string;
          sites?: { id: string; name: string; domain: string; public: boolean }[];
        }[]
      >("GET", "/organizations");
      return ok({
        organizations: orgs.map(org => ({
          organization_id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.role,
          sites: (org.sites ?? []).map(site => ({
            site_id: Number.isNaN(Number(site.id)) ? site.id : Number(site.id),
            name: site.name,
            domain: site.domain,
            // The column is nullable; coalesce so the strict boolean output
            // schema never throws and breaks this entry-point tool.
            public: site.public ?? false,
          })),
        })),
      });
    })
  );

  if (allowed("sites", "read"))
  server.registerTool(
    "get_site",
    {
      title: "Get site configuration",
      description:
        "Full configuration of one site: name, domain, type, visibility, and which tracking features (session replay, web vitals, error tracking, ...) are enabled.",
      inputSchema: { site_id: siteIdInput },
      outputSchema: siteOutput,
      annotations: readOnly,
    },
    guard(async ({ site_id }) => ok(await api.call("GET", `/sites/${site_id}`)))
  );

  if (allowed("sites", "write"))
  server.registerTool(
    "create_site",
    {
      title: "Create site",
      description:
        "Add a new site to an organization. Requires the API key's user to be an org admin or owner. Returns the created site including its numeric siteId.",
      inputSchema: {
        organization_id: organizationIdInput,
        domain: z.string().min(1).describe("The site's domain (example.com), or a bundle id like com.example.app for mobile"),
        name: z.string().min(1).describe("Display name"),
        type: z.enum(["web", "mobile"]).optional(),
        excludedIPs: z.array(z.string()).optional().describe("IPs or CIDR ranges to exclude from tracking"),
        excludedCountries: z.array(z.string()).optional().describe("Two-letter ISO country codes to exclude"),
        tags: z.array(z.string()).optional(),
        ...siteFeatureInputs,
      },
      outputSchema: z
        .object({ siteId: z.number(), name: z.string(), domain: z.string(), organizationId: z.string().nullable() })
        .partial()
        .passthrough(),
      annotations: writeTool,
    },
    guard(async ({ organization_id, ...body }) =>
      ok(await api.call("POST", `/organizations/${encodeURIComponent(organization_id)}/sites`, { body }))
    )
  );

  if (allowed("sites", "write"))
  server.registerTool(
    "update_site_config",
    {
      title: "Update site configuration",
      description:
        "Update a site's settings; only the fields you pass are changed. Requires the API key's user to be an org admin or owner. Use get_site first to see current values.",
      inputSchema: {
        site_id: siteIdInput,
        name: z.string().optional(),
        domain: z.string().optional(),
        type: z.enum(["web", "mobile"]).optional(),
        embedEnabled: z.boolean().optional().describe("Allow embedding the stats widget"),
        excludedIPs: z.array(z.string()).optional().describe("Replaces the exclusion list wholesale"),
        excludedCountries: z.array(z.string()).optional(),
        excludedPaths: z.array(z.string()).optional(),
        excludedHostnames: z.array(z.string()).optional(),
        excludedUserAgents: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        ...siteFeatureInputs,
      },
      outputSchema: updateSiteConfigOutput,
      annotations: idempotentWrite,
    },
    guard(async ({ site_id, ...body }) => ok(await api.call("PUT", `/sites/${site_id}/config`, { body })))
  );

  if (allowed("sites", "write"))
  server.registerTool(
    "delete_site",
    {
      title: "Delete site",
      description:
        "Permanently delete a site, its configuration, and its recorded data. Irreversible; data erasure completes asynchronously. Requires the API key's user to be an org admin or owner. Confirm with the user before calling.",
      inputSchema: { site_id: siteIdInput },
      outputSchema: z.object({ success: z.boolean() }).partial().passthrough(),
      annotations: destructiveTool,
    },
    guard(async ({ site_id }) => ok(await api.call("DELETE", `/sites/${site_id}`)))
  );
}
