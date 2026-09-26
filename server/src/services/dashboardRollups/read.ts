import { TimeBucket } from "@rybbit/shared";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { runAnalyticsQuery } from "../../api/analytics/utils/analyticsQuery.js";
import { TimeWindowParams } from "../../api/analytics/utils/timeWindow.js";
import { availableSessionRollups, invalidateSessionRollups } from "./availability.js";
import { buildSessionRollupQuery } from "./queries.js";
const logger = createServiceLogger("dashboard-rollups");

/** Optional accelerator: unavailable/unpopulated storage always uses the legacy query. */
export async function readSessionRollups<T>(
  siteId: number,
  params: TimeWindowParams,
  bucket?: TimeBucket
): Promise<T[] | null> {
  const config = await availableSessionRollups();
  if (!config) return null;
  const query = buildSessionRollupQuery(params, config, bucket);
  if (!query) return null;
  try {
    return await runAnalyticsQuery<T>({ query, params: { siteId } });
  } catch (error) {
    // A table can disappear between the readiness check and execution (rollback).
    invalidateSessionRollups();
    logger.warn({ err: error, table: config.table }, "Session rollup read failed; using legacy query");
    return null;
  }
}
