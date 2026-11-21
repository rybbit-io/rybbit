import type { Filter, FilterParams } from "@rybbit/shared";
import { asc } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { segments } from "../../../db/postgres/schema.js";
import { hasScope, scopeToString } from "../../../lib/scopes.js";
import { mergeSegmentFilters } from "../segments/expandSegmentParam.js";
import {
  canReadSegment,
  getSiteOrganizationId,
  resolveSegmentActor,
  segmentsForSiteCondition,
} from "../segments/segmentAccess.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { matchesUser } from "../utils/effectiveUserId.js";
import { validateFilters } from "../utils/query-validation.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement } from "../utils/timeWindow.js";

const SEGMENTS_READ = { resource: "segments", action: "read" } as const;

// Each segment is one more pass over the user's events in the window, so the
// number evaluated per request is capped. Segments are taken in name order.
export const MAX_USER_SEGMENTS = 20;

export interface SegmentFilters {
  segmentId: number;
  filters: Filter[];
}

export interface UserSegmentMatch {
  segmentId: number;
  name: string;
  /** The segment's own filters, as the segment list returns them, for linking to its sessions. */
  filters: Filter[];
  /** Sessions of this user, in the window, that the segment's filters select. */
  sessions: number;
}

export interface UserSegmentsResponse {
  segments: UserSegmentMatch[];
  /** This user's sessions in the window: what each segment's count is out of. */
  total_sessions: number;
  /** True when the site has more segments than one request evaluates. */
  truncated: boolean;
}

export interface GetUserSegmentsRequest {
  Params: {
    siteId: string;
    userId: string;
  };
  Querystring: FilterParams;
}

/**
 * How many of one user's sessions each saved segment selects.
 *
 * A segment is a saved filter set, so each one is counted with the same
 * session-filter CTE every filtered report uses. The scan underneath is
 * narrowed to this user by passing the user predicate along with the time
 * window: the builders apply that fragment to the CTE's own scan and to every
 * session-level subquery they emit, so no part of the statement reads another
 * visitor's events. The page's own filters are ANDed into each segment, which
 * keeps every count a subset of `total_sessions`.
 *
 * Returns null when no segment has usable filters. Binds `{userId:String}` and
 * `{site:Int32}`.
 */
export const buildUserSegmentsQuery = (
  query: GetUserSegmentsRequest["Querystring"],
  siteId: number,
  segmentFilters: SegmentFilters[]
): { query: string; segmentIds: number[] } | null => {
  // Kept in the time statement's own shape (a fragment that opens with "AND"),
  // because the filter builders strip exactly that prefix for their subqueries.
  const timeStatement = getTimeStatement(query).trim();
  const userStatement = `AND ${matchesUser("{userId:String}")}`;
  const userWindow = timeStatement ? `${timeStatement} ${userStatement}` : userStatement;
  const pageFilters = query.filters ? validateFilters(query.filters) : [];

  const ctes: string[] = [];
  const segmentIds: number[] = [];
  for (const { segmentId, filters } of segmentFilters) {
    let cte: string | null = null;
    try {
      cte = buildFilteredSessionsCTE(
        JSON.stringify(mergeSegmentFilters(filters, pageFilters)),
        siteId,
        userWindow,
        `Segment_${segmentId}`
      );
    } catch {
      // A stored filter the builders reject (a regex saved before validation
      // tightened, say) drops that segment rather than the whole list.
      cte = null;
    }
    if (!cte) continue;
    ctes.push(cte);
    segmentIds.push(segmentId);
  }

  if (ctes.length === 0) return null;

  const pageSessionsCTE = pageFilters.length
    ? buildFilteredSessionsCTE(JSON.stringify(pageFilters), siteId, userWindow, "PageSessions")
    : null;
  if (pageSessionsCTE) ctes.push(pageSessionsCTE);

  const totalSessions = pageSessionsCTE
    ? "(SELECT count() FROM PageSessions)"
    : `(
        SELECT count(DISTINCT session_id)
        FROM events
        WHERE site_id = {site:Int32}
          ${userWindow}
      )`;

  return {
    segmentIds,
    query: `
    WITH ${ctes.join(",\n    ")}
    SELECT
        ${segmentIds.map(id => `(SELECT count() FROM Segment_${id}) AS segment_${id}`).join(",\n        ")},
        ${totalSessions} AS total_sessions
  `,
  };
};

export const getUserSegments = analyticsRoute<GetUserSegmentsRequest>(
  "user segments",
  async (req: FastifyRequest<GetUserSegmentsRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    // The route guard checked users:read. A scoped bearer credential must also
    // hold segments:read, or this would name segments it cannot list directly.
    if (req.bearerAuth && !hasScope(req.bearerStatements ?? null, SEGMENTS_READ)) {
      return res.status(403).send({ error: "Insufficient scope", required: scopeToString(SEGMENTS_READ) });
    }

    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return res.status(404).send({ error: "Site not found" });
    }

    const [actor, rows] = await Promise.all([
      resolveSegmentActor(req, siteId, organizationId),
      db.query.segments.findMany({
        where: segmentsForSiteCondition(siteId, organizationId),
        orderBy: [asc(segments.name)],
      }),
    ]);

    // Same visibility as the segment list: public and private-link viewers
    // only ever see public segments.
    const readable = rows.filter(row => canReadSegment(row, actor) && row.filters.length > 0);
    const evaluated = readable.slice(0, MAX_USER_SEGMENTS);
    const empty: UserSegmentsResponse = { segments: [], total_sessions: 0, truncated: false };

    const built = buildUserSegmentsQuery(
      req.query,
      siteId,
      evaluated.map(row => ({ segmentId: row.segmentId, filters: row.filters }))
    );
    if (!built) {
      return res.send({ data: empty });
    }

    const result = await runAnalyticsQuery<Record<string, number>>({
      query: built.query,
      params: { userId: req.params.userId, site: siteId },
    });
    const counts = result[0] ?? {};

    const matches: UserSegmentMatch[] = evaluated
      .filter(row => built.segmentIds.includes(row.segmentId))
      .map(row => ({
        segmentId: row.segmentId,
        name: row.name,
        filters: row.filters,
        sessions: Number(counts[`segment_${row.segmentId}`] ?? 0),
      }))
      .filter(match => match.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));

    const data: UserSegmentsResponse = {
      segments: matches,
      total_sessions: Number(counts.total_sessions ?? 0),
      truncated: readable.length > evaluated.length,
    };

    return res.send({ data });
  }
);
