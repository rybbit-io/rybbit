import { FilterParams } from "@rybbit/shared";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../../api/analytics/utils/utils.js";

export interface HeatmapDataPoint {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  value: number; // click count
}

export interface ClickHeatmapResult {
  points: HeatmapDataPoint[];
  totalClicks: number;
  uniqueSessions: number;
}

export interface HeatmapPage {
  pathname: string;
  clickCount: number;
  sessionCount: number;
}

type ViewportBreakpoint = "mobile" | "tablet" | "desktop" | "all";

const VIEWPORT_BREAKPOINTS = {
  mobile: { max: 768 },
  tablet: { min: 769, max: 1024 },
  desktop: { min: 1025 },
} as const;

function getViewportCondition(breakpoint: ViewportBreakpoint): string {
  if (breakpoint === "all") return "";

  const bp = VIEWPORT_BREAKPOINTS[breakpoint];
  if ("max" in bp && !("min" in bp)) {
    return `AND viewport_width <= ${bp.max}`;
  }
  if ("min" in bp && "max" in bp) {
    return `AND viewport_width >= ${bp.min} AND viewport_width <= ${bp.max}`;
  }
  if ("min" in bp && !("max" in bp)) {
    return `AND viewport_width >= ${bp.min}`;
  }
  return "";
}

export class ClickHeatmapService {
  /**
   * Get aggregated click data for heatmap visualization
   * Queries the session_replay_clicks table and normalizes coordinates to percentages
   */
  async getClickHeatmap(
    siteId: number,
    pathname: string,
    options: FilterParams<{
      viewportBreakpoint?: ViewportBreakpoint;
      gridResolution?: number; // Number of grid cells (default 100 = 1% resolution)
    }>
  ): Promise<ClickHeatmapResult> {
    const { viewportBreakpoint = "all", gridResolution = 100 } = options;

    // Build time statement for filtering
    const timeStatement = getTimeStatement(options).replace(/timestamp/g, "src.timestamp");
    const viewportCondition = getViewportCondition(viewportBreakpoint).replace(/viewport_width/g, "src.viewport_width");

    // Build pathname pattern for LIKE query
    // Remove trailing slashes and handle exact match
    const cleanPathname = pathname.replace(/\/+$/, "") || "/";
    const pathnamePattern = cleanPathname === "/" ? "/" : `%${cleanPathname}%`;

    const query = `
      SELECT
        ROUND(src.x / src.viewport_width * {gridResolution:UInt16}, 0) as x,
        ROUND(src.y / src.viewport_height * {gridResolution:UInt16}, 0) as y,
        COUNT(*) as value
      FROM session_replay_clicks src
      INNER JOIN session_replay_metadata srm ON src.session_id = srm.session_id AND src.site_id = srm.site_id
      WHERE src.site_id = {siteId:UInt16}
        AND src.viewport_width > 0
        AND src.viewport_height > 0
        AND src.x >= 0 AND src.y >= 0
        AND src.x <= src.viewport_width
        AND src.y <= src.viewport_height
        AND srm.page_url LIKE {pathnamePattern:String}
        ${viewportCondition}
        ${timeStatement}
      GROUP BY x, y
      HAVING value >= 1
      ORDER BY value DESC
      LIMIT 10000
    `;

    const statsQuery = `
      SELECT
        COUNT(*) as totalClicks,
        COUNT(DISTINCT src.session_id) as uniqueSessions
      FROM session_replay_clicks src
      INNER JOIN session_replay_metadata srm ON src.session_id = srm.session_id AND src.site_id = srm.site_id
      WHERE src.site_id = {siteId:UInt16}
        AND src.viewport_width > 0
        AND src.viewport_height > 0
        AND srm.page_url LIKE {pathnamePattern:String}
        ${viewportCondition}
        ${timeStatement}
    `;

    const [pointsResult, statsResult] = await Promise.all([
      clickhouse.query({
        query,
        query_params: { siteId, pathnamePattern, gridResolution },
        format: "JSONEachRow",
      }),
      clickhouse.query({
        query: statsQuery,
        query_params: { siteId, pathnamePattern },
        format: "JSONEachRow",
      }),
    ]);

    const points = await processResults<HeatmapDataPoint>(pointsResult);
    const stats = await processResults<{ totalClicks: number; uniqueSessions: number }>(statsResult);

    return {
      points,
      totalClicks: stats[0]?.totalClicks ?? 0,
      uniqueSessions: stats[0]?.uniqueSessions ?? 0,
    };
  }

  /**
   * Get list of pages that have click data for heatmaps
   * Returns pages sorted by click count
   */
  async getHeatmapPages(
    siteId: number,
    options: FilterParams<{
      limit?: number;
    }>
  ): Promise<HeatmapPage[]> {
    const { limit = 100 } = options;

    const timeStatement = getTimeStatement(options).replace(/timestamp/g, "sre.timestamp");

    // Query the dedicated session_replay_clicks table
    // This table is populated during ingestion with click coordinates extracted from rrweb events
    const query = `
      SELECT
        path(srm.page_url) as pathname,
        COUNT(*) as clickCount,
        COUNT(DISTINCT src.session_id) as sessionCount
      FROM session_replay_clicks src
      INNER JOIN session_replay_metadata srm ON src.session_id = srm.session_id AND src.site_id = srm.site_id
      WHERE src.site_id = {siteId:UInt16}
        ${timeStatement}
      GROUP BY pathname
      ORDER BY clickCount DESC
      LIMIT {limit:UInt32}
    `;

    const result = await clickhouse.query({
      query,
      query_params: { siteId, limit },
      format: "JSONEachRow",
    });

    const pages = await processResults<HeatmapPage>(result);

    return pages;
  }
}

export const clickHeatmapService = new ClickHeatmapService();
