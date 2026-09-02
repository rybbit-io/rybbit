import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitApiClient } from "../apiClient.js";
import { siteIdInput, timeInputs } from "../inputs.js";
import { looseRow, looseRows, ok, readOnly, siteQuery, type ScopeCheck, type ToolGuard } from "./shared.js";

const segmentIdInput = z.number().int().positive().describe("Segment ID from list_segments");

const segmentOutput = z
  .object({
    segmentId: z.number(),
    siteId: z.number().nullable(),
    name: z.string(),
    description: z.string().nullable(),
    filters: looseRows,
    isPublic: z.boolean(),
  })
  .partial()
  .passthrough();

export function registerSegmentTools(
  server: McpServer,
  api: RybbitApiClient,
  guard: ToolGuard,
  allowed: ScopeCheck
): void {
  if (allowed("segments", "read"))
    server.registerTool(
      "list_segments",
      {
        title: "Saved segments",
        description:
          "Saved segments for a site: named, reusable sets of analytics filters (for example \"Mobile organic from Germany\"). A segment with a null siteId is shared by every site in the organization. Apply one with apply_segment, or pass its filters to any analytics tool.",
        inputSchema: { site_id: siteIdInput },
        outputSchema: z.object({ data: z.array(segmentOutput) }),
        annotations: readOnly,
      },
      guard(async ({ site_id }) => ok({ data: await api.call("GET", `/sites/${site_id}/segments`) }))
    );

  if (allowed("segments", "read") && allowed("analytics", "read"))
    server.registerTool(
      "apply_segment",
      {
        title: "Overview for a segment",
        description:
          "Sessions, pageviews, users, bounce rate, and session duration over the time range for visitors matching a saved segment. Returns the segment's filters alongside the metrics so follow-up breakdowns can reuse them.",
        inputSchema: { site_id: siteIdInput, segment_id: segmentIdInput, ...timeInputs },
        outputSchema: z.object({ segment: segmentOutput, data: looseRow.optional() }).passthrough(),
        annotations: readOnly,
      },
      guard(async ({ site_id, segment_id, ...rest }) => {
        const [segment, overview] = await Promise.all([
          api.call("GET", `/sites/${site_id}/segments/${segment_id}`),
          api.call("GET", `/sites/${site_id}/overview`, { query: { ...siteQuery(rest), segment_id } }),
        ]);
        const data = (overview as { data?: unknown } | null)?.data;
        return ok({ segment, data });
      })
    );
}
