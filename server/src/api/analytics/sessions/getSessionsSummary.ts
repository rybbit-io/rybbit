import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, QuerySpec, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { getSessionFilterStatement } from "../utils/sessionFilters.js";
import { getTimeStatement, isValidTimeZone } from "../utils/timeWindow.js";
import { getSessionGoalMatcher, SessionGoalMatcher } from "./sessionGoals.js";
import {
  buildAggregatedSessionsCTE,
  buildRangeConditions,
  buildViewCondition,
  parseSessionListParams,
  sessionListParamsSchema,
  SessionView,
} from "./sessionQuery.js";

/** How many sessions each saved view holds. `converted` is null on a site with no goals. */
export interface SessionViewCounts {
  all: number;
  identified: number;
  replay: number;
  converted: number | null;
  bounced: number;
  errors: number;
}

export interface SessionsSummary {
  // The period at a glance: every session the filters allow, whatever the
  // pageview/event/duration ranges are set to.
  sessions: number;
  session_duration: number;
  pages_per_session: number;
  bounce_rate: number;
  converted: number | null;
  with_errors: number;
  // The same sessions narrowed by the ranges, per view: the tab counts and the
  // list's total.
  matching: SessionViewCounts;
  // `matching` split by the day each session started, in the request's
  // timezone, newest first.
  days: ({ day: string } & SessionViewCounts)[];
}

export interface GetSessionsSummaryRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    min_pageviews?: string;
    max_pageviews?: string;
    min_events?: string;
    max_events?: string;
    min_duration?: string;
    max_duration?: string;
  }>;
}

// A day row per day of the window; ten years of days is far past any real range.
const MAX_DAYS = 3660;

const COUNTED_VIEWS: Exclude<SessionView, "all">[] = ["identified", "replay", "converted", "bounced", "errors"];

/**
 * One pass over the period's sessions, grouped by the day they started. The
 * rollup row (empty `day`) carries the period totals, so totals and day rows
 * cannot disagree and no second scan is needed for the list's total.
 */
export const buildSessionsSummaryQuery = (
  query: GetSessionsSummaryRequest["Querystring"],
  siteId: number,
  matcher: SessionGoalMatcher
): QuerySpec => {
  const params = sessionListParamsSchema.parse(query);
  const timeStatement = getTimeStatement(query);
  const filterStatement = getSessionFilterStatement(query.filters, siteId, timeStatement);
  const ranges = buildRangeConditions(params);
  const inRange = ranges.conditions.length ? ranges.conditions.join(" AND ") : "1";

  const viewCounts = COUNTED_VIEWS.map(
    view => `countIf(${inRange} AND ${buildViewCondition(view, query)}) AS matching_${view}`
  ).join(",\n      ");

  const querySQL = `
  WITH ${buildAggregatedSessionsCTE(query, matcher)}
  SELECT
      toString(toDate(session_start, {timeZone:String})) AS day,
      count() AS sessions,
      -- Not aliased to the column names: the ranges below read those columns,
      -- and an alias that shadows one turns them into nested aggregates.
      avg(session_duration) AS avg_duration,
      avg(pageviews) AS avg_pageviews,
      countIf(pageviews = 1) AS bounced,
      countIf(notEmpty(converted_goal_ids)) AS converted,
      countIf(errors > 0) AS with_errors,
      countIf(${inRange}) AS matching_all,
      ${viewCounts}
  FROM AggregatedSessions
  WHERE 1 = 1 ${filterStatement}
  GROUP BY day WITH ROLLUP
  ORDER BY day = '' DESC, day DESC
  LIMIT {maxRows:Int32}
  `;

  return {
    query: querySQL,
    params: {
      siteId,
      timeZone: query.time_zone && isValidTimeZone(query.time_zone) ? query.time_zone : "UTC",
      maxRows: MAX_DAYS + 1,
      ...ranges.queryParams,
    },
  };
};

type SummaryRow = {
  day: string;
  sessions: number;
  avg_duration: number | null;
  avg_pageviews: number | null;
  bounced: number;
  converted: number;
  with_errors: number;
  matching_all: number;
  matching_identified: number;
  matching_replay: number;
  matching_converted: number;
  matching_bounced: number;
  matching_errors: number;
};

const viewCounts = (row: SummaryRow | undefined, hasGoals: boolean): SessionViewCounts => ({
  all: row?.matching_all ?? 0,
  identified: row?.matching_identified ?? 0,
  replay: row?.matching_replay ?? 0,
  converted: hasGoals ? (row?.matching_converted ?? 0) : null,
  bounced: row?.matching_bounced ?? 0,
  errors: row?.matching_errors ?? 0,
});

/** Rollup row to period totals, day rows to `days`. An empty period has no rollup row. */
export function toSessionsSummary(rows: SummaryRow[], hasGoals: boolean): SessionsSummary {
  const total = rows.find(row => row.day === "");
  const sessions = total?.sessions ?? 0;

  return {
    sessions,
    session_duration: total?.avg_duration ?? 0,
    pages_per_session: total?.avg_pageviews ?? 0,
    bounce_rate: sessions > 0 ? ((total?.bounced ?? 0) / sessions) * 100 : 0,
    converted: hasGoals ? (total?.converted ?? 0) : null,
    with_errors: total?.with_errors ?? 0,
    matching: viewCounts(total, hasGoals),
    days: rows.filter(row => row.day !== "").map(row => ({ day: row.day, ...viewCounts(row, hasGoals) })),
  };
}

export const getSessionsSummary = analyticsRoute<GetSessionsSummaryRequest>(
  "sessions summary",
  async (req: FastifyRequest<GetSessionsSummaryRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const parsed = parseSessionListParams(req.query);
    if (!parsed.ok) {
      return res.status(400).send({ error: parsed.error });
    }

    const matcher = await getSessionGoalMatcher(siteId);
    const rows = await runAnalyticsQuery<SummaryRow>(buildSessionsSummaryQuery(req.query, siteId, matcher));

    return res.send({ data: toSessionsSummary(rows, matcher.goals.length > 0) });
  }
);
