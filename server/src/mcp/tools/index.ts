import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RybbitApiClient } from "../apiClient.js";
import { registerAnalyticsTools } from "./analytics.js";
import { registerFunnelTools } from "./funnels.js";
import { registerGoalTools } from "./goals.js";
import { registerOrganizationTools } from "./organizations.js";
import { registerRawDataTools } from "./rawData.js";
import { createGuard, createScopeCheck, type ToolRegistrationConfig } from "./shared.js";
import { registerSiteTools } from "./sites.js";
import { registerUserTools } from "./users.js";

export type { ToolRegistrationConfig } from "./shared.js";

export function registerTools(server: McpServer, api: RybbitApiClient, config: ToolRegistrationConfig = {}): void {
  const guard = createGuard(config.log);
  const allowed = createScopeCheck(config.scopes);
  registerSiteTools(server, api, guard, allowed);
  registerAnalyticsTools(server, api, guard, allowed);
  registerGoalTools(server, api, guard, allowed);
  registerFunnelTools(server, api, guard, allowed);
  registerUserTools(server, api, guard, allowed);
  registerOrganizationTools(server, api, guard, allowed);
  registerRawDataTools(server, api, guard, allowed);
}
