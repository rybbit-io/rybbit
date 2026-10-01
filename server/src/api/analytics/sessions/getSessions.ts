import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getSessionFilterStatement } from "../utils/sessionFilters.js";
import { enrichWithTraits } from "../utils/utils.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { analyticsRoute, runAnalyticsQuery, QuerySpec } from "../utils/analyticsQuery.js";
import { getSessionGoalMatcher, resolveSessionGoals, SessionGoal, SessionGoalMatcher } from "./sessionGoals.js";
import {
  buildAggregatedSessionsCTE,
  buildRangeConditions,
  buildSessionOrder,
  buildViewCondition,
  parseSessionListParams,
  REPLAY_LOOKUP_QUERY,
  sessionListParamsSchema,
} from "./sessionQuery.js";

export type GetSessionsResponse = {
  session_id: string;
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  traits: Record<string, unknown> | null;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  channel: string;
  hostname: string;
  page_title: string;
  querystring: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  session_end: string;
  session_start: string;
  session_duration: number;
  entry_page: string;
  exit_page: string;
  pageviews: number;
  events: number;
  errors: number;
  outbound: number;
  button_clicks: number;
  copies: number;
  form_submits: number;
  input_changes: number;
  ip: string;
  lat: number;
  lon: number;
  has_replay: number;
  // Goals the session completed, the most recent conversion first. Present
  // when the request asked for goals (include_goals, or the converted view).
  converted_goals?: SessionGoal[];
}[];

export interface GetSessionsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    limit: number;
    page: number;
    user_id?: string;
    session_id?: string;
    identified_only?: string;
    view?: string;
    sort_by?: string;
    sort_order?: string;
    include_goals?: string;
    min_pageviews?: string;
    max_pageviews?: string;
    min_events?: string;
    max_events?: string;
    min_duration?: string;
    max_duration?: string;
  }>;
}

const DEFAULT_LIMIT = 100;
// The Globe timeline pages through sessions 10,000 at a time; nothing asks for more.
const MAX_LIMIT = 10_000;
// Session ids per replay lookup. Query parameters travel in the request URL,
// so a 10,000-row page is looked up in slices rather than as one long list.
const REPLAY_LOOKUP_CHUNK = 1000;

const NO_GOALS: SessionGoalMatcher = { goals: [], expression: "emptyArrayUInt32()" };

// Untrusted `limit`/`page`: anything unusable falls back to the defaults, and
// one request can never ask for more than MAX_LIMIT rows.
const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
};

export const buildSessionsQuery = (
  query: GetSessionsRequest["Querystring"],
  siteId: number,
  matcher: SessionGoalMatcher = NO_GOALS
): QuerySpec => {
  const { filters, user_id: userId, session_id: sessionId, identified_only: identifiedOnly = "false" } = query;
  const params = sessionListParamsSchema.parse(query);
  const limit = Math.min(toPositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const page = toPositiveInt(query.page, 1);

  const timeStatement = getTimeStatement(query);

  // Use composable filter options:
  // - sessionLevelParams: per-event fields filter at session level (finds sessions
  //   containing a matching event) — required for any parameter the aggregated CTE
  //   below doesn't project, otherwise the outer WHERE hits an unknown identifier
  // - fieldMappings: CTE extracts UTM params as separate columns, so we need to map the field names
  const filterStatement = getSessionFilterStatement(filters, siteId, timeStatement);

  const ranges = buildRangeConditions(params);
  const conditions = [
    identifiedOnly === "true" ? "identified_user_id != ''" : null,
    buildViewCondition(params.view, query),
    ...ranges.conditions,
  ].filter((condition): condition is string => !!condition);

  // The ORDER BY belongs to the statement that carries the LIMIT. It used to
  // sit inside the CTE, where the outer query was free to ignore it, so
  // consecutive pages could repeat or skip sessions.
  const querySQL = `
  WITH ${buildAggregatedSessionsCTE(query, matcher)}
  SELECT *
  FROM AggregatedSessions
  WHERE 1 = 1 ${filterStatement}
  ${conditions.map(condition => `AND ${condition}`).join("\n  ")}
  ${buildSessionOrder(params.sort_by, params.sort_order)}
  LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;

  return {
    query: querySQL,
    params: {
      siteId,
      user_id: userId,
      session_id: sessionId,
      limit,
      offset: (page - 1) * limit,
      ...ranges.queryParams,
    },
  };
};

type SessionRow = Omit<GetSessionsResponse[number], "traits" | "has_replay" | "converted_goals"> & {
  converted_goal_ids: number[];
  last_goal_ids: number[];
};

/** Slices of at most `size` ids, in order. */
export const chunkIds = (ids: string[], size: number): string[][] =>
  Array.from({ length: Math.ceil(ids.length / size) }, (_, index) => ids.slice(index * size, (index + 1) * size));

/**
 * Which of these sessions have a replay. A key lookup for the rows of one page,
 * instead of the join that used to read all of the site's replay metadata on
 * every list request.
 */
async function findSessionsWithReplay(siteId: number, sessionIds: string[]): Promise<Set<string>> {
  const found = await Promise.all(
    chunkIds(sessionIds, REPLAY_LOOKUP_CHUNK).map(ids =>
      runAnalyticsQuery<{ session_id: string }>({ query: REPLAY_LOOKUP_QUERY, params: { siteId, sessionIds: ids } })
    )
  );
  return new Set(found.flat().map(row => row.session_id));
}

export const getSessions = analyticsRoute<GetSessionsRequest>(
  "sessions",
  async (req: FastifyRequest<GetSessionsRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const parsed = parseSessionListParams(req.query);
    if (!parsed.ok) {
      return res.status(400).send({ error: parsed.error });
    }

    // Goals are matched only for a request that shows or filters on them.
    const wantsGoals = parsed.params.include_goals === "true" || parsed.params.view === "converted";
    const matcher = wantsGoals ? await getSessionGoalMatcher(siteId) : NO_GOALS;
    const rows = await runAnalyticsQuery<SessionRow>(buildSessionsQuery(req.query, siteId, matcher));

    const withReplay = await findSessionsWithReplay(
      siteId,
      rows.map(row => row.session_id)
    );

    const data = rows.map(({ converted_goal_ids, last_goal_ids, ...row }) => ({
      ...row,
      has_replay: withReplay.has(row.session_id) ? 1 : 0,
      ...(wantsGoals
        ? { converted_goals: resolveSessionGoals(matcher, last_goal_ids ?? [], converted_goal_ids ?? []) }
        : {}),
    }));

    // Enrich with traits from Postgres
    const dataWithTraits = await enrichWithTraits(data, siteId);

    return res.send({ data: dataWithTraits });
  }
);
