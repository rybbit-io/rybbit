import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getMetric } from "../getMetric.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { getLiteSessionFilter, getLiteTimeStatement, hasLiteFilters } from "./utils.js";

// Lite metric supports only dimensions backed by MVs:
//   - pathname → pathname_hourly_mv_target
//   - country → country_hourly_mv_target
//   - device_type → device_type_hourly_mv_target
// Other parameters return 400 — the simplified dashboard hides those sections.
type LiteMetricParameter = "pathname" | "country" | "device_type";

type LiteMetricItem = {
  value: string;
  hostname?: string;
  count: number; // sessions
  percentage: number;
  pageviews: number;
  pageviews_percentage: number;
  // count() OVER () — total distinct values across all pages, computed before
  // LIMIT/OFFSET so it's stable per page. Stripped from the response items.
  total_count?: number;
};

interface GetMetricLiteRequest {
  Params: { siteId: string };
  Querystring: FilterParams<{ parameter: LiteMetricParameter; limit?: number; page?: number }>;
}

// Lite pagination clamps rather than validates (default 250, max 500), so it
// keeps its own logic instead of getPaginationStatements.
const getLitePagination = (query: GetMetricLiteRequest["Querystring"]) => {
  const limit = Math.min(Number(query.limit) || 250, 500);
  const page = Math.max(Number(query.page) || 1, 1);
  const offsetStatement = page > 1 ? `OFFSET ${(page - 1) * limit}` : "";
  return { limit, offsetStatement };
};

// Filtered country/device_type lists can be served from sessions_mv_target
// (it carries both columns per session), as long as every active filter
// targets a session column.
export const buildMetricLiteSessionQuery = (query: GetMetricLiteRequest["Querystring"], filterSql: string) => {
  const { parameter } = query;
  const { limit, offsetStatement } = getLitePagination(query);
  const sessionsTime = getLiteTimeStatement(query, "start_time");
  const nonEmpty = parameter === "device_type" ? `AND ${parameter} <> ''` : "";
  return `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          ${parameter} AS value,
          sum(session_pageviews) AS pageviews,
          count() AS count
        FROM (
          SELECT
            session_id,
            any(${parameter}) AS ${parameter},
            sum(pageviews) AS session_pageviews
          FROM sessions_mv_target
          WHERE site_id = {siteId:Int32}
            ${sessionsTime}
            ${nonEmpty}
            ${filterSql}
          GROUP BY session_id
        )
        GROUP BY ${parameter}
      )
      ORDER BY count DESC, value ASC
      LIMIT ${limit}
      ${offsetStatement}
    `;
};

// Unfiltered lists read the dimensioned hourly MVs directly. Returns null for
// parameters lite mode doesn't support — the handler responds 400.
export const buildMetricLiteQuery = (query: GetMetricLiteRequest["Querystring"]): string | null => {
  const { parameter } = query;
  const { limit, offsetStatement } = getLitePagination(query);
  const timeStatement = getLiteTimeStatement(query, "event_hour");

  // Percentages are computed in an outer pass so the window function
  // operates on already-grouped rows. `sum(sum(...)) OVER ()` is illegal
  // in ClickHouse — aggregates can't nest.
  if (parameter === "pathname") {
    return `
      SELECT
        value,
        hostname,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          pathname AS value,
          any(hostname) AS hostname,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM pathname_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
        GROUP BY pathname
      )
      ORDER BY count DESC, value ASC
      LIMIT ${limit}
      ${offsetStatement}
    `;
  }
  if (parameter === "country") {
    return `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          country AS value,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM country_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
        GROUP BY country
      )
      ORDER BY count DESC, value ASC
      LIMIT ${limit}
      ${offsetStatement}
    `;
  }
  if (parameter === "device_type") {
    return `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage,
        count() OVER () AS total_count
      FROM (
        SELECT
          device_type AS value,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM device_type_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          AND device_type <> ''
          ${timeStatement}
        GROUP BY device_type
      )
      ORDER BY count DESC, value ASC
      LIMIT ${limit}
      ${offsetStatement}
    `;
  }
  return null;
};

export const getMetricLite = analyticsRoute<GetMetricLiteRequest>(
  "metric",
  async (req: FastifyRequest<GetMetricLiteRequest>, res: FastifyReply) => {
    const site = Number(req.params.siteId);
    const filtersPresent = hasLiteFilters(req.query.filters);

    // Pull totalCount off the window column and drop it from the returned rows so
    // items match the standard /metric shape.
    const sendMetric = (data: LiteMetricItem[]) => {
      const totalCount = data.length > 0 ? (data[0].total_count ?? data.length) : 0;
      const items = data.map(({ total_count, ...rest }) => rest);
      return res.send({ data: { data: items, totalCount } });
    };

    // Filtered country/device_type lists can be served from sessions_mv_target,
    // as long as every active filter targets a session column. pathname isn't
    // on the session rollup — and no dimensioned MV pairs pathname with another
    // dimension — so any filtered pathname list falls back to the raw-events
    // query.
    if (filtersPresent) {
      const filter = getLiteSessionFilter(req.query.filters);
      const sessionFastPath =
        filter.supported && (req.query.parameter === "country" || req.query.parameter === "device_type");
      if (!sessionFastPath) {
        return getMetric(req as unknown as Parameters<typeof getMetric>[0], res);
      }

      const data = await runAnalyticsQuery<LiteMetricItem>({
        query: buildMetricLiteSessionQuery(req.query, filter.sql),
        params: { siteId: site },
      });
      return sendMetric(data);
    }

    const query = buildMetricLiteQuery(req.query);
    if (query === null) {
      return res.status(400).send({ error: "Lite mode does not support this parameter" });
    }

    const data = await runAnalyticsQuery<LiteMetricItem>({
      query,
      params: { siteId: site },
    });
    return sendMetric(data);
  }
);
