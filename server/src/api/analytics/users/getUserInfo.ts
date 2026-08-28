import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "../../../db/postgres/postgres.js";
import { userProfiles, userAliases } from "../../../db/postgres/schema.js";
import { SESSION_CHANNEL_AGG, SESSION_REFERRER_AGG } from "../utils/sessionAttribution.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { matchesUser } from "../utils/effectiveUserId.js";
import { runAnalyticsQuery } from "../utils/analyticsQuery.js";

interface UserPageviewData {
  sessions: number;
  duration: number;
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_height: number;
  screen_width: number;
  last_seen: string;
  first_seen: string;
  pageviews: number;
  events: number;
  ip: string;
  first_referrer: string;
  first_channel: string;
  first_entry_page: string;
  first_utm_source: string;
  first_utm_medium: string;
  first_utm_campaign: string;
  last_referrer: string;
  last_channel: string;
  timezone: string;
}

interface UserVitalsData {
  lcp_p75: number | null;
  cls_p75: number | null;
  inp_p75: number | null;
  fcp_p75: number | null;
  ttfb_p75: number | null;
  performance_events: number;
}

interface UserLocationBreakdown {
  country: string;
  region: string;
  city: string;
  sessions: number;
  last_seen: string;
}

interface UserDeviceBreakdown {
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  sessions: number;
  last_seen: string;
}

interface LinkedDevice {
  anonymous_id: string;
  created_at: string;
}

export interface UserInfoResponse {
  data: UserPageviewData & {
    traits: Record<string, unknown> | null;
    linked_devices: LinkedDevice[];
    vitals: UserVitalsData | null;
    locations: UserLocationBreakdown[];
    devices: UserDeviceBreakdown[];
  };
}

export const buildUserInfoQueries = (query: FilterParams, siteId: number) => {
  // Optional time range + dimension filters; both empty when the page is on
  // all-time with no filters, which keeps the original full-history behavior.
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const withFilteredSessions = filteredSessionsCTE ? `WITH ${filteredSessionsCTE}` : "";

  // Filters select sessions first. Every panel then reads all events in those
  // sessions, keeping the summary, vitals, locations, devices, and session list
  // on the same session-scoped semantics.
  const scopedEvents = `(
        SELECT source_events.*
        FROM events AS source_events
        ${filteredSessionsJoin}
        WHERE
            ${matchesUser("{userId:String}", "source_events")}
            AND source_events.site_id = {site:Int32}
            ${timeStatement}
    ) AS events`;

  const sessionsQuery = `
    WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
    sessions AS (
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
            argMinIf(url_parameters['utm_source'], timestamp, url_parameters['utm_source'] != '') AS utm_source,
            argMinIf(url_parameters['utm_medium'], timestamp, url_parameters['utm_medium'] != '') AS utm_medium,
            argMinIf(url_parameters['utm_campaign'], timestamp, url_parameters['utm_campaign'] != '') AS utm_campaign,
            argMaxIf(timezone, timestamp, timezone != '') AS user_timezone,
            MAX(timestamp) AS session_end,
            MIN(timestamp) AS session_start,
            dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration,
            argMinIf(pathname, timestamp, type = 'pageview') AS entry_page,
            argMaxIf(pathname, timestamp, type = 'pageview') AS exit_page,
            countIf(type = 'pageview') AS pageviews,
            countIf(type = 'custom_event') AS events,
            argMax(ip, timestamp) AS ip
        FROM ${scopedEvents}
        GROUP BY
            session_id
        ORDER BY
            session_end DESC
    )
    SELECT
        COUNT(DISTINCT session_id) AS sessions,
        ROUND(avg(session_duration)) AS duration,
        any(user_id) AS user_id,
        any(identified_user_id) AS identified_user_id,
        any(country) as country,
        any(region) AS region,
        any(city) AS city,
        any(language) AS language,
        any(device_type) AS device_type,
        any(browser) AS browser,
        any(browser_version) AS browser_version,
        any(operating_system) AS operating_system,
        any(operating_system_version) AS operating_system_version,
        any(screen_height) AS screen_height,
        any(screen_width) AS screen_width,
        MAX(session_end) AS last_seen,
        MIN(session_start) AS first_seen,
        SUM(pageviews) AS pageviews,
        SUM(events) AS events,
        any(ip) AS ip,
        argMin(referrer, session_start) AS first_referrer,
        argMin(channel, session_start) AS first_channel,
        argMinIf(entry_page, session_start, entry_page != '') AS first_entry_page,
        argMinIf(utm_source, session_start, utm_source != '') AS first_utm_source,
        argMinIf(utm_medium, session_start, utm_medium != '') AS first_utm_medium,
        argMinIf(utm_campaign, session_start, utm_campaign != '') AS first_utm_campaign,
        argMax(referrer, session_end) AS last_referrer,
        argMax(channel, session_end) AS last_channel,
        argMaxIf(user_timezone, session_end, user_timezone != '') AS timezone
    FROM
        sessions
      `;

  // p75 Web Vitals across every performance event this user produced.
  // Separate query: the sessions CTE collapses rows per session, which
  // would turn an event-level quantile into a quantile of session picks.
  const vitalsQuery = `
    ${withFilteredSessions}
    SELECT
        quantile(0.75)(lcp) AS lcp_p75,
        quantile(0.75)(cls) AS cls_p75,
        quantile(0.75)(inp) AS inp_p75,
        quantile(0.75)(fcp) AS fcp_p75,
        quantile(0.75)(ttfb) AS ttfb_p75,
        COUNT(*) AS performance_events
    FROM ${scopedEvents}
    WHERE type = 'performance'
      `;

  // Every location this user was seen in, by session share. A session that
  // moves between cities counts once per city, so shares are approximate.
  const locationsQuery = `
    ${withFilteredSessions}
    SELECT
        country,
        region,
        city,
        uniq(session_id) AS sessions,
        MAX(timestamp) AS last_seen
    FROM ${scopedEvents}
    WHERE country != ''
    GROUP BY
        country, region, city
    ORDER BY
        sessions DESC, last_seen DESC
    LIMIT 20
      `;

  // Every device this user was seen on. Grouped without versions so a
  // browser update doesn't split one physical device into many rows;
  // versions and screen are argMax'd to the latest sighting instead.
  const devicesQuery = `
    ${withFilteredSessions}
    SELECT
        device_type,
        browser,
        operating_system,
        argMax(browser_version, timestamp) AS browser_version,
        argMax(operating_system_version, timestamp) AS operating_system_version,
        argMax(screen_width, timestamp) AS screen_width,
        argMax(screen_height, timestamp) AS screen_height,
        uniq(session_id) AS sessions,
        MAX(timestamp) AS last_seen
    FROM ${scopedEvents}
    WHERE NOT (device_type = '' AND browser = '' AND operating_system = '')
    GROUP BY
        device_type, browser, operating_system
    ORDER BY
        sessions DESC, last_seen DESC
    LIMIT 20
      `;

  return { sessionsQuery, vitalsQuery, locationsQuery, devicesQuery };
};

export async function getUserInfo(
  req: FastifyRequest<{
    Params: {
      siteId: string;
      userId: string;
    };
    Querystring: FilterParams;
  }>,
  res: FastifyReply
) {
  const { userId, siteId } = req.params;

  const numericSiteId = Number(siteId);

  const { sessionsQuery, vitalsQuery, locationsQuery, devicesQuery } = buildUserInfoQueries(req.query, numericSiteId);

  const loadUser = (effectiveUserId: string) => {
    const chParams = { userId: effectiveUserId, site: siteId };
    return Promise.all([
      runAnalyticsQuery<UserPageviewData>({ query: sessionsQuery, params: chParams }),
      runAnalyticsQuery<UserVitalsData>({ query: vitalsQuery, params: chParams }),
      runAnalyticsQuery<UserLocationBreakdown>({ query: locationsQuery, params: chParams }),
      runAnalyticsQuery<UserDeviceBreakdown>({ query: devicesQuery, params: chParams }),
      // Get user profile traits from Postgres
      db
        .select()
        .from(userProfiles)
        .where(and(eq(userProfiles.siteId, numericSiteId), eq(userProfiles.userId, effectiveUserId)))
        .limit(1),
      // Get linked devices (all anonymous IDs for this user) from Postgres
      db
        .select({
          anonymous_id: userAliases.anonymousId,
          created_at: userAliases.createdAt,
        })
        .from(userAliases)
        .where(and(eq(userAliases.siteId, numericSiteId), eq(userAliases.userId, effectiveUserId))),
    ]);
  };

  try {
    let [data, vitalsData, locations, devices, profileResult, aliasesResult] = await loadUser(userId);

    // A device whose events have all been claimed by an identity — the dashboard's
    // "Identify User" action backfills the full history — no longer has anonymous
    // rows, so the anonymous branch of the query matches nothing. Follow the alias
    // rather than 404ing a route the operator was just looking at. Only on a miss:
    // while a shared fingerprint still has anonymous activity of its own, that
    // activity is what this route is about, and resolving early would put someone
    // else's identity on it.
    if (data.length === 0) {
      const alias = await db
        .select({ userId: userAliases.userId })
        .from(userAliases)
        .where(and(eq(userAliases.siteId, numericSiteId), eq(userAliases.anonymousId, userId)))
        .limit(1);
      if (alias.length > 0 && alias[0].userId !== userId) {
        [data, vitalsData, locations, devices, profileResult, aliasesResult] = await loadUser(alias[0].userId);
      }
    }

    // If no data found for user
    if (data.length === 0) {
      return res.status(404).send({
        error: "User not found",
      });
    }

    let identifiedUserId = data[0].identified_user_id;
    let traits = profileResult[0]?.traits || null;

    // The identify backfill mutation in ClickHouse is async, so a freshly
    // identified device can still have all-blank identified_user_id here.
    // Fall back to the alias table so identity and traits show immediately.
    if (!identifiedUserId) {
      const alias = await db
        .select({ userId: userAliases.userId })
        .from(userAliases)
        .where(and(eq(userAliases.siteId, numericSiteId), eq(userAliases.anonymousId, userId)))
        .limit(1);
      if (alias.length > 0) {
        identifiedUserId = alias[0].userId;
        const aliasProfile = await db
          .select()
          .from(userProfiles)
          .where(and(eq(userProfiles.siteId, numericSiteId), eq(userProfiles.userId, identifiedUserId)))
          .limit(1);
        traits = aliasProfile[0]?.traits || traits;
      }
    }

    const linked_devices = aliasesResult.map(alias => ({
      anonymous_id: alias.anonymous_id,
      created_at: alias.created_at,
    }));

    const vitals = vitalsData[0]?.performance_events > 0 ? vitalsData[0] : null;

    return res.send({
      data: {
        ...data[0],
        identified_user_id: identifiedUserId,
        traits,
        linked_devices,
        vitals,
        locations,
        devices,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching user info");
    return res.status(500).send({
      error: "Internal server error",
    });
  }
}
