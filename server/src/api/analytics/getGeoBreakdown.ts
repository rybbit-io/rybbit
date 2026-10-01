import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { EFFECTIVE_SESSION_USER_ID } from "./utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "./utils/sessionFilters.js";
import { getTimeStatement } from "./utils/timeWindow.js";

export const GEO_LEVELS = ["country", "region", "city"] as const;
export type GeoLevel = (typeof GEO_LEVELS)[number];

const DEFAULT_LIMIT = 250;
// Enough for every ISO 3166-2 subdivision, which the region choropleth needs in one response.
const MAX_LIMIT = 5000;

const geoBreakdownSchema = z.object({
  level: z.enum(GEO_LEVELS),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export interface GetGeoBreakdownRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    level: GeoLevel;
    limit?: number | string;
  }>;
}

export interface GeoBreakdownRow {
  /** Country code, ISO 3166-2 region code, or "<region>-<city>": the value the matching filter takes. */
  value: string;
  sessions: number;
  users: number;
  pageviews: number;
  /** Share of the place's sessions with exactly one pageview, 0-100. */
  bounce_rate: number;
  /** City level only. */
  lat?: number;
  lon?: number;
}

export interface GeoBreakdownTotals {
  sessions: number;
  users: number;
  pageviews: number;
  /** Null when no session has a place at this level. */
  bounce_rate: number | null;
  /** Distinct places with at least one session, before the row limit. */
  places: number;
}

// A session belongs to the first place it was seen in, the rule /metric uses for
// session-attributed dimensions. Cities share names across regions, so the city
// value is the region-qualified one the `city` filter expects.
const LEVEL_SQL: Record<GeoLevel, { value: string; present: string }> = {
  country: { value: "country", present: "country <> ''" },
  region: { value: "region", present: "region <> ''" },
  city: { value: "concat(toString(region), '-', toString(city))", present: "city <> ''" },
};

/**
 * One row per session inside the window: where it was first seen, who it
 * belongs to, and how many pageviews it had. Both queries below read it, so
 * rows and totals cannot disagree.
 */
const buildSessionDataCTE = (query: GetGeoBreakdownRequest["Querystring"], siteId: number, level: GeoLevel) => {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const { value, present } = LEVEL_SQL[level];
  const coordinates =
    level === "city"
      ? `,
        argMinIf(lat, timestamp, ${present}) AS lat,
        argMinIf(lon, timestamp, ${present}) AS lon`
      : "";

  return `
WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
SessionData AS (
    SELECT
        session_id,
        argMinIf(${value}, timestamp, ${present}) AS value,
        ${EFFECTIVE_SESSION_USER_ID} AS session_user_id,
        countIf(type = 'pageview') AS session_pageviews${coordinates}
    FROM events
    ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
    WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
    GROUP BY session_id
)`;
};

export const buildGeoBreakdownQuery = (
  query: GetGeoBreakdownRequest["Querystring"],
  siteId: number,
  level: GeoLevel,
  limit: number
) => `${buildSessionDataCTE(query, siteId, level)}
SELECT
    value,
    count() AS sessions,
    uniqExact(session_user_id) AS users,
    sum(session_pageviews) AS pageviews,
    round(countIf(session_pageviews = 1) * 100 / count(), 2) AS bounce_rate${
      level === "city"
        ? `,
    any(lat) AS lat,
    any(lon) AS lon`
        : ""
    }
FROM SessionData
WHERE value <> ''
GROUP BY value
ORDER BY sessions DESC, value ASC
LIMIT ${limit}`;

export const buildGeoBreakdownTotalsQuery = (
  query: GetGeoBreakdownRequest["Querystring"],
  siteId: number,
  level: GeoLevel
) => `${buildSessionDataCTE(query, siteId, level)}
SELECT
    count() AS sessions,
    uniqExact(session_user_id) AS users,
    sum(session_pageviews) AS pageviews,
    round(countIf(session_pageviews = 1) * 100 / nullIf(count(), 0), 2) AS bounce_rate,
    uniqExact(value) AS places
FROM SessionData
WHERE value <> ''`;

/**
 * Sessions, users, pageviews and bounce rate per country, region or city for
 * the globe page, with totals across every place (not only the returned rows)
 * so the client can state shares and what the row limit left out.
 */
export const getGeoBreakdown = analyticsRoute<GetGeoBreakdownRequest>(
  "geo breakdown",
  async (req: FastifyRequest<GetGeoBreakdownRequest>, res: FastifyReply) => {
    const parsed = geoBreakdownSchema.safeParse({ level: req.query.level, limit: req.query.limit });
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    }
    const { level, limit } = parsed.data;
    const siteId = Number(req.params.siteId);
    const params = { siteId };

    const [rows, totals] = await Promise.all([
      runAnalyticsQuery<GeoBreakdownRow>({ query: buildGeoBreakdownQuery(req.query, siteId, level, limit), params }),
      runAnalyticsQuery<GeoBreakdownTotals>({ query: buildGeoBreakdownTotalsQuery(req.query, siteId, level), params }),
    ]);

    return res.send({
      data: {
        rows,
        totals: totals[0] ?? { sessions: 0, users: 0, pageviews: 0, bounce_rate: null, places: 0 },
      },
    });
  }
);
