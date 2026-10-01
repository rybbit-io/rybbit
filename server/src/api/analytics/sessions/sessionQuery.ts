import { z } from "zod";
import { matchesUser } from "../utils/effectiveUserId.js";
import {
  SESSION_CHANNEL_AGG,
  SESSION_REFERRER_AGG,
  SESSION_UTM_CAMPAIGN_AGG,
  SESSION_UTM_CONTENT_AGG,
  SESSION_UTM_MEDIUM_AGG,
  SESSION_UTM_SOURCE_AGG,
  SESSION_UTM_TERM_AGG,
} from "../utils/sessionAttribution.js";
import { getTimeStatement, TimeWindowParams } from "../utils/timeWindow.js";
import { SessionGoalMatcher } from "./sessionGoals.js";

/**
 * The pieces the session list and the session summary share, so the two can
 * only ever describe the same set of sessions: the per-session aggregation,
 * the saved views, and the pageview/event/duration ranges.
 */

/** The saved views of the Sessions page. `all` applies no condition. */
export const SESSION_VIEWS = ["all", "identified", "replay", "converted", "bounced", "errors"] as const;
export type SessionView = (typeof SESSION_VIEWS)[number];

/**
 * What a session's "events" figure counts: custom events plus the
 * autocaptured interactions. The dashboard row has always shown this sum
 * while `min_events` compared custom events alone, so a row showing 5 events
 * could disappear under "at least 3". Filter and sort use the sum too.
 * Outbound clicks and errors are reported on their own.
 */
export const SESSION_EVENT_TOTAL = "(events + button_clicks + copies + form_submits + input_changes)";

// Sort keys the API accepts, mapped to the aggregated column they order by.
// Only these strings ever reach the ORDER BY.
const SESSION_SORT_COLUMNS = {
  started: "session_start",
  ended: "session_end",
  duration: "session_duration",
  pageviews: "pageviews",
  events: SESSION_EVENT_TOTAL,
  errors: "errors",
} as const;
export type SessionSort = keyof typeof SESSION_SORT_COLUMNS;

const INT32_MAX = 2_147_483_647;

// An empty value means "no bound", as the unset inputs have always sent it.
const bound = z.preprocess(
  value => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(0).max(INT32_MAX).optional()
);

export const sessionListParamsSchema = z.object({
  view: z.enum(SESSION_VIEWS).optional(),
  sort_by: z.enum(Object.keys(SESSION_SORT_COLUMNS) as [SessionSort, ...SessionSort[]]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  // Report each session's completed goals. Opt-in: matching every goal against
  // every event is work the callers that never show goals should not pay for.
  include_goals: z.enum(["true", "false"]).optional(),
  min_pageviews: bound,
  max_pageviews: bound,
  min_events: bound,
  max_events: bound,
  min_duration: bound,
  max_duration: bound,
});
export type SessionListParams = z.infer<typeof sessionListParamsSchema>;

/** The validated params, or the message for a 400. */
export function parseSessionListParams(
  query: unknown
): { ok: true; params: SessionListParams } | { ok: false; error: string } {
  const parsed = sessionListParamsSchema.safeParse(query);
  if (parsed.success) return { ok: true, params: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, error: `Invalid ${issue?.path.join(".") || "query"}: ${issue?.message ?? "invalid value"}` };
}

/**
 * One row per session over the request's window, with everything the list
 * shows and every column a session filter can name. `converted_goal_ids` is
 * every goal the session completed; `last_goal_ids` the goals completed by its
 * most recent converting event.
 */
export function buildAggregatedSessionsCTE(
  query: TimeWindowParams & { user_id?: string; session_id?: string },
  matcher: SessionGoalMatcher
): string {
  const goalColumns = matcher.goals.length
    ? `groupUniqArrayArray(${matcher.expression}) AS converted_goal_ids,
          argMaxIf(${matcher.expression}, timestamp_ms, notEmpty(${matcher.expression})) AS last_goal_ids`
    : `emptyArrayUInt32() AS converted_goal_ids,
          emptyArrayUInt32() AS last_goal_ids`;

  return `AggregatedSessions AS (
      SELECT
          session_id,
          argMax(user_id, timestamp) AS user_id,
          argMax(identified_user_id, timestamp) AS identified_user_id,
          argMax(country, timestamp) AS country,
          argMax(region, timestamp) AS region,
          argMax(city, timestamp) AS city,
          argMax(language, timestamp) AS language,
          argMax(device_type, timestamp) AS device_type,
          argMax(browser, timestamp) AS browser,
          argMax(browser_version, timestamp) AS browser_version,
          argMax(operating_system, timestamp) AS operating_system,
          argMax(operating_system_version, timestamp) AS operating_system_version,
          argMax(screen_width, timestamp) AS screen_width,
          argMax(screen_height, timestamp) AS screen_height,
          ${SESSION_REFERRER_AGG} AS referrer,
          ${SESSION_CHANNEL_AGG} AS channel,
          argMin(hostname, timestamp) AS hostname,
          ${SESSION_UTM_SOURCE_AGG} AS utm_source,
          ${SESSION_UTM_MEDIUM_AGG} AS utm_medium,
          ${SESSION_UTM_CAMPAIGN_AGG} AS utm_campaign,
          ${SESSION_UTM_TERM_AGG} AS utm_term,
          ${SESSION_UTM_CONTENT_AGG} AS utm_content,
          MAX(timestamp) AS session_end,
          MIN(timestamp) AS session_start,
          dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration,
          argMinIf(pathname, timestamp_ms, type = 'pageview') AS entry_page,
          argMaxIf(pathname, timestamp_ms, type = 'pageview') AS exit_page,
          countIf(type = 'pageview') AS pageviews,
          countIf(type = 'custom_event') AS events,
          countIf(type = 'error') AS errors,
          countIf(type = 'outbound') AS outbound,
          countIf(type = 'button_click') AS button_clicks,
          countIf(type = 'copy') AS copies,
          countIf(type = 'form_submit') AS form_submits,
          countIf(type = 'input_change') AS input_changes,
          argMax(ip, timestamp) AS ip,
          argMax(lat, timestamp) AS lat,
          argMax(lon, timestamp) AS lon,
          argMax(tag, timestamp) AS tag,
          argMax(timezone, timestamp) AS timezone,
          ${goalColumns}
      FROM events
      WHERE
          site_id = {siteId:Int32}
          ${query.user_id ? ` AND ${matchesUser("{user_id:String}", "events")}` : ""}
          ${query.session_id ? ` AND events.session_id = {session_id:String}` : ""}
          ${getTimeStatement(query)}
      GROUP BY
          session_id
  )`;
}

/**
 * Sessions that have a replay worth opening, as a subquery for `IN`.
 *
 * Bounded by the request's window on the replay's own start time, which is
 * also how the Replay page decides what belongs to a period. The table is
 * keyed by (site, session) and partitioned by month of start time; without
 * the bound every list request read all of the site's replay metadata.
 */
export const buildReplaySessionsSubquery = (query: TimeWindowParams) => `
      SELECT session_id
      FROM session_replay_metadata_v2
      FINAL
      WHERE site_id = {siteId:Int32}
        AND event_count >= 2
        ${getTimeStatement(query, "start_time")}`;

/** Which of these session ids have a replay: a key lookup, no window needed. */
export const REPLAY_LOOKUP_QUERY = `
      SELECT session_id
      FROM session_replay_metadata_v2
      FINAL
      WHERE site_id = {siteId:Int32}
        AND session_id IN ({sessionIds:Array(String)})
        AND event_count >= 2`;

/** The condition a view adds over the aggregated sessions, or null for `all`. */
export function buildViewCondition(view: SessionView | undefined, query: TimeWindowParams): string | null {
  switch (view) {
    case "identified":
      return "identified_user_id != ''";
    case "replay":
      return `session_id IN (${buildReplaySessionsSubquery(query)})`;
    case "converted":
      return "notEmpty(converted_goal_ids)";
    case "bounced":
      // The dashboard's definition of a bounce (see siteMetrics): exactly one pageview.
      return "pageviews = 1";
    case "errors":
      return "errors > 0";
    default:
      return null;
  }
}

/** Min/max conditions over the aggregated sessions, with their bound values. */
export function buildRangeConditions(params: SessionListParams): {
  conditions: string[];
  queryParams: Record<string, number>;
} {
  const ranges: [name: string, column: string, value: number | undefined, operator: ">=" | "<="][] = [
    ["minPageviews", "pageviews", params.min_pageviews, ">="],
    ["maxPageviews", "pageviews", params.max_pageviews, "<="],
    ["minEvents", SESSION_EVENT_TOTAL, params.min_events, ">="],
    ["maxEvents", SESSION_EVENT_TOTAL, params.max_events, "<="],
    ["minDuration", "session_duration", params.min_duration, ">="],
    ["maxDuration", "session_duration", params.max_duration, "<="],
  ];

  const conditions: string[] = [];
  const queryParams: Record<string, number> = {};
  for (const [name, column, value, operator] of ranges) {
    if (value === undefined) continue;
    conditions.push(`${column} ${operator} {${name}:Int32}`);
    queryParams[name] = value;
  }
  return { conditions, queryParams };
}

/**
 * The outer ORDER BY. Rows that tie on the sort column fall back to the
 * session start and then the id, so two pages of one request never share or
 * skip a row.
 */
export function buildSessionOrder(sortBy: SessionSort = "ended", sortOrder: "asc" | "desc" = "desc"): string {
  const direction = sortOrder === "asc" ? "ASC" : "DESC";
  const column = SESSION_SORT_COLUMNS[sortBy];
  const tieBreak = sortBy === "started" ? "" : `, session_start ${direction}`;
  return `ORDER BY ${column} ${direction}${tieBreak}, session_id ${direction}`;
}
