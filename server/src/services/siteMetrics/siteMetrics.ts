import { FilterParams } from "@rybbit/shared";
import { EFFECTIVE_SESSION_USER_ID } from "../../api/analytics/utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "../../api/analytics/utils/sessionFilters.js";
import { getTimeStatement } from "../../api/analytics/utils/timeWindow.js";

/**
 * The definition of a Site's headline metrics — sessions, pageviews, users,
 * pages per session, bounce rate, session duration — and of the single-dimension
 * breakdowns that sit beside them.
 *
 * Three surfaces report these numbers: the dashboard overview, the PDF report and
 * the weekly email. They used to carry three transcriptions of the same SQL, and
 * they had already drifted: the reports computed bounce rate and pages per session
 * against the *filtered* session's pageview count, while the dashboard used the
 * session's full pageview count, so a filtered PDF disagreed with the dashboard it
 * was exported from. The definition here is the dashboard's — the one users see
 * first, and the one with test coverage.
 *
 * Everything below is a pure string builder: no ClickHouse client, no Fastify. The
 * only axis that genuinely varies between callers is how the time window is
 * expressed, so that arrives pre-built in the spec.
 */

/** A Site's headline metrics for one time window. */
export interface OverviewRow {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number | null;
  bounce_rate: number | null;
  session_duration: number;
}

/** One row of a single-dimension breakdown, ranked by session count. */
export interface BreakdownRow {
  value: string;
  count: number;
  percentage: number | null;
}

export type ChartBucketFunction = "toStartOfHour" | "toStartOfDay" | "toStartOfWeek";

/**
 * The window and filters a metrics query runs over.
 *
 * Callers build the time statement however suits them — {@link buildMetricsSpec}
 * from HTTP query params, or `getTimeStatement` directly from a datetime range.
 * When filters are present, `filteredSessionsCTE` identifies the qualifying
 * sessions so every metric can use the session's complete activity.
 */
export interface SiteMetricsSpec {
  timeStatement: string;
  filteredSessionsCTE?: string;
}

/**
 * Pairs a set of filters with the window they apply to.
 *
 * The window is not optional here on purpose. Session-level filters
 * (`event_name`, `channel`, entry/exit page) compile to a `session_id IN (SELECT
 * … FROM events WHERE …)` subquery, and that subquery is bounded by the time
 * statement handed to `getFilterStatement`. Omit it and the subquery scans the
 * Site's entire history, so a session qualifies on an event fired years outside
 * the period being reported — and the scan is unbounded to boot. Building the
 * pair in one place is what stops a caller from scoping the two to different
 * windows.
 */
export function buildMetricsSpecForWindow(filters: string, siteId: number, timeStatement: string): SiteMetricsSpec {
  return {
    timeStatement,
    filteredSessionsCTE: buildFilteredSessionsCTE(filters, siteId, timeStatement) ?? undefined,
  };
}

/** Builds a spec from the shared HTTP filter params (dashboard-style callers). */
export function buildMetricsSpec(params: FilterParams, siteId: number): SiteMetricsSpec {
  return buildMetricsSpecForWindow(params.filters, siteId, getTimeStatement(params));
}

/**
 * Sessions, pageviews, users, pages per session, bounce rate and session duration
 * for one window. Binds `{siteId:Int32}`.
 *
 * Filters qualify session IDs first: a session that landed on three pages is not
 * a bounce, and does not lose duration or pageviews, because its acquisition
 * filter happened to match only the landing event.
 */
export function buildOverviewQuery(spec: SiteMetricsSpec): string {
  const { timeStatement, filteredSessionsCTE } = spec;
  const sessionJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";

  return `
    WITH
    ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
    FilteredSessionsWithStats AS (
        SELECT
            session_id,
            -- Aliased away from \`user_id\` on purpose: an alias that shadows a column
            -- referenced inside its own expression is a cyclic-alias error in ClickHouse.
            ${EFFECTIVE_SESSION_USER_ID} AS effective_user_id,
            MIN(timestamp) AS start_time,
            MAX(timestamp) AS end_time,
            countIf(type = 'pageview') AS pageviews
        FROM events
        ${sessionJoin}
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
        GROUP BY session_id
    )
    SELECT
        COUNT() AS sessions,
        AVG(f.pageviews) AS pages_per_session,
        sumIf(1, f.pageviews = 1) / COUNT() * 100 AS bounce_rate,
        AVG(f.end_time - f.start_time) AS session_duration,
        SUM(f.pageviews) AS pageviews,
        COUNT(DISTINCT f.effective_user_id) AS users
    FROM FilteredSessionsWithStats f`;
}

/** The dimensions a report can be broken down by. */
export type BreakdownDimension =
  "browser" | "city" | "country" | "device_type" | "operating_system" | "pathname" | "referrer" | "region";

interface DimensionDefinition {
  /** The expression rows are grouped by and reported as `value`. */
  expression: string;
  /** An extra predicate the rows must satisfy, already prefixed with `AND`. */
  restriction?: string;
}

const DIMENSIONS: Record<BreakdownDimension, DimensionDefinition> = {
  browser: { expression: "browser" },
  city: { expression: "city" },
  country: { expression: "country" },
  device_type: { expression: "device_type" },
  operating_system: { expression: "operating_system" },
  // A page counts where it was actually viewed; the other dimensions are session
  // properties carried on every event, so only this one restricts by type.
  pathname: { expression: "pathname", restriction: "AND type = 'pageview'" },
  referrer: { expression: "domainWithoutWWW(referrer)" },
  region: { expression: "region" },
};

/**
 * The top values of one dimension, ranked by the number of sessions that touched
 * them, with each value's share of the total. Binds `{siteId:Int32}` and
 * `{limit:Int32}`.
 *
 * Empty values are dropped for every dimension, `pathname` included. The report
 * copies this replaces guarded the other dimensions but not `pathname`, so a
 * malformed pageview stored with `pathname = ''` earned a blank row in the table
 * and a share of the percentages. `getMetric` has always dropped those rows; this
 * makes the reports agree.
 */
export function buildBreakdownQuery(dimension: BreakdownDimension, spec: SiteMetricsSpec): string {
  const { expression, restriction = "" } = DIMENSIONS[dimension];
  const { timeStatement, filteredSessionsCTE } = spec;
  const sessionJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";

  return `
    WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""} BreakdownStats AS (
      SELECT
        ${expression} AS value,
        COUNT(DISTINCT session_id) AS unique_sessions
      FROM events
      ${sessionJoin}
      WHERE
        site_id = {siteId:Int32}
        AND ${expression} IS NOT NULL
        AND ${expression} <> ''
        ${restriction}
        ${timeStatement}
      GROUP BY value
    )
    SELECT
      value,
      unique_sessions AS count,
      round((unique_sessions / SUM(unique_sessions) OVER ()) * 100, 2) AS percentage
    FROM BreakdownStats
    ORDER BY count DESC, value ASC
    LIMIT {limit:Int32}`;
}

/** Sessions bucketed by session start, alongside pageviews bucketed by event time. */
export function buildChartQuery(spec: SiteMetricsSpec, bucketFn: ChartBucketFunction): string {
  const { timeStatement, filteredSessionsCTE } = spec;
  const sessionJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const bucket = (column: string) =>
    `toString(toTimeZone(${bucketFn}(toTimeZone(${column}, {timeZone:String})), {timeZone:String}))`;

  return `
    WITH
    ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
    SessionStarts AS (
      SELECT
        session_id,
        min(timestamp) AS session_start
      FROM events
      ${sessionJoin}
      WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
      GROUP BY session_id
    ),
    SessionStats AS (
      SELECT
        ${bucket("session_start")} AS time,
        count() AS sessions
      FROM SessionStarts
      GROUP BY time
    ),
    PageStats AS (
      SELECT
        ${bucket("timestamp")} AS time,
        countIf(type = 'pageview') AS pageviews
      FROM events
      ${sessionJoin}
      WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
      GROUP BY time
    )
    SELECT
      time,
      coalesce(sessions, 0) AS sessions,
      coalesce(pageviews, 0) AS pageviews
    FROM SessionStats
    FULL JOIN PageStats USING (time)
    ORDER BY time`;
}
