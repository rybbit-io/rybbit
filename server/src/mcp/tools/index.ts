import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RybbitApiClient } from "../apiClient.js";
import { registerAnalyticsTools } from "./analytics.js";
import { registerFunnelTools } from "./funnels.js";
import { registerGoalTools } from "./goals.js";
import { registerOrganizationTools } from "./organizations.js";
import { registerRawDataTools } from "./rawData.js";
import { createGuard, type ToolRegistrationConfig } from "./shared.js";
import { registerSiteTools } from "./sites.js";
import { registerUserTools } from "./users.js";

export type { ToolRegistrationConfig } from "./shared.js";

export function registerTools(server: McpServer, api: RybbitApiClient, config: ToolRegistrationConfig = {}): void {
  const guard = createGuard(config.log);
  registerSiteTools(server, api, guard);
  registerAnalyticsTools(server, api, guard);
  registerGoalTools(server, api, guard);
  registerFunnelTools(server, api, guard);
  registerUserTools(server, api, guard);
  registerOrganizationTools(server, api, guard);
  registerRawDataTools(server, api, guard);
}
