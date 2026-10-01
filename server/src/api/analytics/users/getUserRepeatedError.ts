import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildUserEventScope } from "./userEventScope.js";

export interface GetUserRepeatedErrorRequest {
  Params: {
    siteId: string;
    userId: string;
  };
  Querystring: FilterParams;
}

export interface UserRepeatedError {
  message: string;
  session_id: string;
  /** Times the same message was thrown in that one session. Always 2 or more. */
  occurrences: number;
  /** Page the first of them was thrown on. */
  pathname: string;
  first_seen: string;
  last_seen: string;
  has_replay: boolean;
}

interface RepeatedErrorRow {
  error_message: string | number;
  session_id: string;
  occurrences: number;
  pathname: string | number | null;
  first_seen: string;
  last_seen: string;
}

/**
 * The profile's one insight: the most recent session in the window in which
 * this user hit the same error message more than once. A rule, not a
 * judgement: one message, one session, a count of at least two.
 */
export const buildUserRepeatedErrorQuery = (query: GetUserRepeatedErrorRequest["Querystring"], siteId: number) => {
  const { withFilteredSessions, scopedEvents } = buildUserEventScope(query, siteId);

  return `
    ${withFilteredSessions}
    SELECT
        JSONExtractString(toString(props), 'message') AS error_message,
        session_id,
        count() AS occurrences,
        argMin(pathname, timestamp) AS pathname,
        MIN(timestamp) AS first_seen,
        MAX(timestamp) AS last_seen
    FROM ${scopedEvents}
    WHERE
        type = 'error'
        AND JSONExtractString(toString(props), 'message') <> ''
    GROUP BY
        error_message,
        session_id
    HAVING
        occurrences >= 2
    ORDER BY
        last_seen DESC
    LIMIT 1
  `;
};

// Same definition of "has a replay" as the session list: a recording with at
// least two events. The table is keyed by (site_id, session_id).
export const SESSION_HAS_REPLAY_QUERY = `
    SELECT count() AS replays
    FROM session_replay_metadata_v2
    FINAL
    WHERE site_id = {site:Int32}
      AND session_id = {sessionId:String}
      AND event_count >= 2
  `;

export const getUserRepeatedError = analyticsRoute<GetUserRepeatedErrorRequest>(
  "user repeated error",
  async (req: FastifyRequest<GetUserRepeatedErrorRequest>, res: FastifyReply) => {
    const { siteId, userId } = req.params;
    const site = Number(siteId);

    const rows = await runAnalyticsQuery<RepeatedErrorRow>({
      query: buildUserRepeatedErrorQuery(req.query, site),
      params: { userId, site },
    });

    const repeated = rows[0];
    if (!repeated) {
      return res.send({ data: null });
    }

    const replayRows = await runAnalyticsQuery<{ replays: number }>({
      query: SESSION_HAS_REPLAY_QUERY,
      params: { site, sessionId: repeated.session_id },
    });

    const data: UserRepeatedError = {
      // processResults turns a numeric-looking message ("404") into a number.
      message: String(repeated.error_message),
      session_id: repeated.session_id,
      occurrences: Number(repeated.occurrences),
      pathname: String(repeated.pathname ?? ""),
      first_seen: repeated.first_seen,
      last_seen: repeated.last_seen,
      has_replay: Number(replayRows[0]?.replays ?? 0) > 0,
    };

    return res.send({ data });
  }
);
