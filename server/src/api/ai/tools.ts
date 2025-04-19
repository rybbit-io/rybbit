import { tool } from "@langchain/core/tools";
import {
  getLiveUserCountToolDescription,
  getOverviewBucketedToolDescription,
  getOverviewToolDescription,
  getParameterStatsToolDescription
} from "./toolDescriptions.js";
import {
  getLiveUserCountToolSchema,
  getOverviewBucketedToolSchema,
  getOverviewToolSchema,
  getParameterStatsToolSchema
} from "./toolSchemas.js";
import { fetchLiveUserCount } from "../analytics/getLiveUserCount.js";
import { fetchOverview } from "../analytics/getOverview.js";
import { fetchOverviewBucketed } from "../analytics/getOverviewBucketed.js";
import { fetchSingleCol } from "../analytics/getSingleCol.js";

export const getLiveUserCountToolName = "get_live_user_count";
export const getOverviewToolName = "get_overview";
export const getOverviewBucketedToolName = "get_overview_bucketed";
export const getParameterStatsToolName = "get_parameter_stats";

export function generateAnalyticsTools(timezone: string, site: string) {
  const getLiveUserCountTool = tool(
    async () => {
      try {
        const result = await fetchLiveUserCount(site, 5);
        return result.toString();
      } catch (error) {
        console.error(error);
        return "Failed to get live user count";
      }
    },
    {
      name: getLiveUserCountToolName,
      description: getLiveUserCountToolDescription,
      schema: getLiveUserCountToolSchema,
    }
  );
  const getOverviewTool = tool(
    async (input) => {
      try {
        const result = await fetchOverview({ ...input, timezone, site });
        return JSON.stringify(result);
      } catch (error) {
        console.error(error);
        return "Failed to get overview";
      }
    },
    {
      name: getOverviewToolName,
      description: getOverviewToolDescription,
      schema: getOverviewToolSchema,
    }
  );
  const getOverviewBucketedTool = tool(
    async (input) => {
      try {
        const result = await fetchOverviewBucketed({ ...input, timezone, site });
        return JSON.stringify(result);
      } catch (error) {
        console.error(error);
        return "Failed to get overview bucketed";
      }
    },
    {
      name: getOverviewBucketedToolName,
      description: getOverviewBucketedToolDescription,
      schema: getOverviewBucketedToolSchema,
    }
  );
  const getParameterStatsTool = tool(
    async (input) => {
      try {
        const minutes = NaN;
        const result = await fetchSingleCol({ ...input, timezone, site, minutes });
        return JSON.stringify(result);
      } catch (error) {
        console.error(error);
        return "Failed to get parameter stats";
      }
    },
    {
      name: getParameterStatsToolName,
      description: getParameterStatsToolDescription,
      schema: getParameterStatsToolSchema,
    }
  );

  return [getLiveUserCountTool, getOverviewTool, getOverviewBucketedTool, getParameterStatsTool];
}
