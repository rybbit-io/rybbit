import { FilterParams } from "@rybbit/shared";
import { z } from "zod";
import { LITE_DASHBOARD } from "../../../lib/const.js";
import { projectedMetricGroups } from "../../../services/dashboardRollups/projections.js";
import {
  getRoutePatterns,
  routeExpression,
  routeGroupsEnabled,
  RoutePattern,
  routePatternsForSite,
} from "../../../services/dashboardRollups/routes.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildSessionAndRowFilterFragments } from "../utils/sessionFilters.js";
import { resolveTimeWindow } from "../utils/timeWindow.js";
import { hasLiteDatetimeRange, hasLiteFilters } from "./utils.js";

type RouteQuery = FilterParams<{ route_group?: string; limit?: number; page?: number }>;
type RouteItem = {
  value: string;
  hostname: string;
  pageviews: number;
  count: number;
  percentage: number;
  pageviews_percentage: number;
  total_count?: number;
};
const pagination = z.object({
  route_group: z.string().max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

export function buildRouteGroupsQuery(
  query: RouteQuery,
  siteId: number,
  patterns: RoutePattern[],
  lite: boolean,
  now = Date.now()
): string {
  const { route_group, limit, page } = pagination.parse(query);
  const route = routeExpression(routePatternsForSite(patterns, siteId));
  const drilldown = route_group !== undefined;
  const value = drilldown ? "pathname" : route;
  const routeFilter = drilldown ? `AND (${route}) = {routeGroup:String}` : "";
  const window = resolveTimeWindow(query, now);
  let grouped: string;
  if (lite && !hasLiteFilters(query.filters) && !hasLiteDatetimeRange(query)) {
    if (drilldown) {
      // Original URLs retain the streaming hourly source and the same grouping
      // expression, so drilldown includes exactly the URLs in the clicked row.
      grouped = `SELECT pathname AS value, any(hostname) AS hostname,
        sum(pageviews) AS pageviews, uniqMerge(sessions) AS count
        FROM pathname_hourly_mv_target WHERE site_id = {siteId:Int32}
          ${window.where("event_hour")} ${routeFilter} GROUP BY pathname`;
    } else {
      grouped = projectedMetricGroups(query, { table: "pathname_hourly_mv_target", value: route, hostname: true }, now);
    }
  } else {
    const { filteredSessionsCTE, rowFilterStatement } = buildSessionAndRowFilterFragments(
      query.filters,
      siteId,
      window.where(),
      []
    );
    grouped = `${filteredSessionsCTE ? `WITH ${filteredSessionsCTE}` : ""}
      SELECT ${value} AS value, any(hostname) AS hostname, count() AS pageviews, uniq(session_id) AS count
      FROM events ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
      WHERE site_id = {siteId:Int32} AND type = 'pageview'
        ${window.where()} ${rowFilterStatement} ${routeFilter} GROUP BY value`;
  }
  return `SELECT value, hostname, pageviews, count,
    round(count * 100.0 / nullIf(sum(count) OVER (), 0), 2) AS percentage,
    round(pageviews * 100.0 / nullIf(sum(pageviews) OVER (), 0), 2) AS pageviews_percentage,
    count() OVER () AS total_count
    FROM (${grouped}) ORDER BY count DESC, value ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
}

export const getRouteGroups = analyticsRoute<{ Params: { siteId: string }; Querystring: RouteQuery }>(
  "route groups",
  async (req, res) => {
    if (!routeGroupsEnabled()) return res.status(404).send({ error: "Route groups are not configured" });
    if (!pagination.safeParse(req.query).success)
      return res.status(400).send({ error: "Invalid route group pagination" });
    const siteId = Number(req.params.siteId);
    const data = await runAnalyticsQuery<RouteItem>({
      query: buildRouteGroupsQuery(req.query, siteId, getRoutePatterns(), LITE_DASHBOARD),
      params: { siteId, routeGroup: req.query.route_group ?? "" },
    });
    return res.send({
      data: {
        data: data.map(({ total_count, ...row }) => row),
        totalCount: data[0]?.total_count ?? 0,
      },
    });
  }
);
