import { processResults } from "../../../api/analytics/utils/utils.js";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { redis } from "../../../db/redis/redis.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import { classifyBotAsn } from "./botProviderAsns.js";
import { HUMAN_INTERACTION_EVENT_TYPES, RELAY_EGRESS_ASNS, SASE_EGRESS_ASNS } from "./sharedSignals.js";

/**
 * Networks whose visitors never engage — shadow mode.
 *
 * The hosting list says what a network *is*; this measures what its traffic
 * *does*. For every network, sessions that include a human interaction are
 * compared with how many there would have been had its visitors behaved like
 * each site's own audience. A network at a tenth of that or less, across many
 * sites, is not carrying people.
 *
 * It exists because the largest leak into `events` is on networks no list
 * covers. Audited twice, two months apart: around two dozen networks —
 * residential-proxy resellers registered as ordinary ISPs, and cloud ranges
 * renting browsers — produced about 120,000 events a day across 6,000 sites and
 * 0.2% of the platform's engaged sessions. The list was learned on one week and
 * tested on the next, and held both times.
 *
 * The comparison is site-relative on purpose. A site that does not capture
 * clicks shows no engagement from anyone, so only sites whose own audience
 * interacts are counted, and each session is weighed against its own site's
 * rate rather than a platform average.
 *
 * Nothing here convicts. A listed network is recorded on the hit as
 * `shadow:asn_low_engagement` and the event is tracked as normal, so what the
 * rule would catch, and who it would catch by mistake, can be read from
 * `bot_observations` before it is trusted with anything.
 *
 * Refresh follows `siteBaseline.ts`: one ClickHouse aggregate, elected through
 * Redis, shared as a single key and mirrored into a process-local set that the
 * hot path reads. A failed refresh keeps the previous list until it expires;
 * with no list at all the rule says nothing.
 *
 * Two things it does not do. It does not refresh when the election cannot be
 * held: without Redis every worker would run the aggregate against the
 * ingestion database at once, for a rule that only records. And it does not
 * trust its own copy past the list's expiry: the expiry travels with the list,
 * so a worker that has been up for days stops labelling at the same moment a
 * freshly started one would have nothing to label with.
 *
 * The same measurement also yields a second, narrower list: networks whose
 * country-only addresses are proxies. Some proxy resellers rent address blocks
 * announced by an ordinary residential ISP. The network as a whole is full of
 * subscribers, so it never lists, but the rented blocks geolocate only to a
 * country: MaxMind has no city or region for them, while the ISP's real
 * subscribers almost always get one. So each non-hosting network is also split
 * into its country-only sessions and the rest, and the country-only slice is
 * listed when it engages far below its own network's other slice and one
 * device (a known OS and real screen size) dominates it. Comparing a slice with
 * its sibling is what survives a fleet that clicks a cookie banner now and
 * then; an absolute ceiling on top keeps a well-engaged slice off the list just
 * because its sibling engages even more. Mobile carriers geolocate
 * country-only all the time, but both of their slices behave alike, so they do
 * not list. A session that changed network or slice mid-visit is left out of
 * both slices, so a click on one network cannot vouch for another.
 *
 * Once listed, every country-only hit on the network is recorded, including
 * devices other than the dominant one. That is deliberate while it is a shadow
 * rule, and the reason it must not be promoted without splitting its
 * `bot_observations` rows by device and site.
 *
 * The proxy list has its own Redis key and expiry. A worker still running the
 * code from before this list existed publishes only the whole-network key, so
 * during a rolling deploy it cannot clear the proxy list, and an oversized
 * proxy list cannot discard a healthy whole-network one.
 *
 * Found on a docs scraper in 2026-11: Cox (AS22773) addresses with no city,
 * one Linux 1920x1080 browser, about 92k sessions across 3,000 sites in two
 * weeks, with a forged Google referrer. It is recorded as
 * `shadow:asn_country_only_slice`. Calibration is in the README.
 */

const logger = createServiceLogger("asn-engagement");

/** The scorer's definition of a human interaction, so the two rules agree. */
const ENGAGEMENT_EVENT_TYPES = [...HUMAN_INTERACTION_EVENT_TYPES];

const WINDOW_DAYS = 7;
/** A site counts only if its own audience interacts, and it has enough sessions to say so. */
const MIN_SITE_ENGAGEMENT_RATE = 0.02;
const MIN_SITE_SESSIONS = 50;
const MIN_ASN_SESSIONS = 1000;
const MIN_ASN_SITES = 30;
/**
 * Ceiling on observed/expected engaged sessions. Hosting networks get the
 * looser one: a person on a hosting address is already the exception.
 */
const MAX_LIFT_HOSTING = 0.1;
const MAX_LIFT_OTHER = 0.05;
/** More networks than this is a broken query, not a finding; keep the old list. */
const MAX_LISTED_ASNS = 300;
/**
 * Ceiling on a country-only slice's lift as a share of the rest of the same
 * network's lift. Measured 2026-11: the proxy slice sat at 0.21, real networks
 * at 0.54 and above.
 */
const MAX_COUNTRY_ONLY_RELATIVE_LIFT = 0.35;
/**
 * Floor on the share of a country-only slice's sessions held by its single most
 * common device. A fleet runs one browser build; subscribers do not. Measured
 * 2026-11: the proxy slice at 0.73, real networks at 0.44 and below.
 */
const MIN_COUNTRY_ONLY_TOP_DEVICE_SHARE = 0.6;
/**
 * Ceiling on the country-only slice's own lift, whatever its sibling does: a
 * slice engaging at half of what its sites expect is carrying people.
 */
const MAX_COUNTRY_ONLY_LIFT = 0.5;

/**
 * Networks that are a crowd by construction — relays and SASE gateways. They
 * do not measure as low-engagement, and are excluded anyway so that a bad week
 * of data cannot list them.
 */
const NEVER_LISTED_ASNS: ReadonlySet<number> = new Set([...RELAY_EGRESS_ASNS, ...SASE_EGRESS_ASNS]);

export const ASN_ENGAGEMENT_REFRESH_MS = 6 * 60 * 60 * 1000;
export const ASN_ENGAGEMENT_MIRROR_MS = 15 * 60 * 1000;
const REDIS_KEY = "bot:ae";
const COUNTRY_ONLY_REDIS_KEY = "bot:ae:co";
const LIST_TTL_MS = 36 * 60 * 60 * 1000;
const REFRESH_LOCK_KEY = "bot:ae:lock";
const REFRESH_LOCK_TTL_MS = ASN_ENGAGEMENT_REFRESH_MS - 30_000;

let lowEngagementAsns: ReadonlySet<number> = new Set();
/** When the list above stops being trusted; published with it. */
let listExpiresAtMs = 0;
let countryOnlyProxyAsns: ReadonlySet<number> = new Set();
let countryOnlyExpiresAtMs = 0;
let refreshTimer: NodeJS.Timeout | null = null;
let mirrorTimer: NodeJS.Timeout | null = null;

export function isLowEngagementAsn(asn: number | null | undefined, nowMs: number = Date.now()): boolean {
  return typeof asn === "number" && nowMs < listExpiresAtMs && lowEngagementAsns.has(asn);
}

/**
 * Whether the hit is in a network's country-only slice that is on the proxy
 * list. `isCountryOnly` is asked only for a listed network, so the caller's
 * geolocation lookup runs on a handful of hits rather than on every one.
 */
export function isCountryOnlyProxySlice(
  asn: number | null | undefined,
  isCountryOnly: () => boolean,
  nowMs: number = Date.now()
): boolean {
  return typeof asn === "number" && nowMs < countryOnlyExpiresAtMs && countryOnlyProxyAsns.has(asn) && isCountryOnly();
}

export interface AsnEngagementRow {
  asn: number;
  sessions: number;
  sites: number;
  lift: number;
}

/**
 * One network's sessions, whole (`all`) or split by whether the address
 * geolocated only to a country. `other` is everything else: located to a city
 * or region, or not located at all.
 */
export interface AsnSliceRow extends AsnEngagementRow {
  slice: "all" | "country_only" | "other";
  /**
   * Share of the slice's sessions on its most common OS and screen size. Only
   * sessions with a known OS and a non-zero screen can be the most common
   * device; the rest still count in the denominator.
   */
  topDeviceShare: number;
}

/**
 * Which measured networks make the list. Split from the query so the
 * thresholds can be tested without ClickHouse.
 */
export function selectLowEngagementAsns(
  rows: readonly AsnEngagementRow[],
  isHostingAsn: (asn: number) => boolean = asn => classifyBotAsn(asn).isBotInfrastructure
): number[] {
  const selected: number[] = [];
  for (const row of rows) {
    if (!Number.isInteger(row.asn) || NEVER_LISTED_ASNS.has(row.asn)) continue;
    if (row.sessions < MIN_ASN_SESSIONS || row.sites < MIN_ASN_SITES) continue;
    if (!Number.isFinite(row.lift)) continue;
    if (row.lift < (isHostingAsn(row.asn) ? MAX_LIFT_HOSTING : MAX_LIFT_OTHER)) {
      selected.push(row.asn);
    }
  }
  return selected.sort((a, b) => a - b);
}

/**
 * Which networks' country-only slices make the proxy list. Hosting networks
 * are left to the whole-network list: a VPN exit is often country-only and
 * sees real people.
 */
export function selectCountryOnlyProxyAsns(
  rows: readonly AsnSliceRow[],
  isHostingAsn: (asn: number) => boolean = asn => classifyBotAsn(asn).isBotInfrastructure
): number[] {
  const slices = new Map<number, { countryOnly?: AsnSliceRow; other?: AsnSliceRow }>();
  for (const row of rows) {
    if (row.slice !== "country_only" && row.slice !== "other") continue;
    const pair = slices.get(row.asn) ?? {};
    if (row.slice === "country_only") pair.countryOnly = row;
    else pair.other = row;
    slices.set(row.asn, pair);
  }

  const selected: number[] = [];
  for (const [asn, { countryOnly, other }] of slices) {
    if (!countryOnly || !other) continue;
    if (!Number.isInteger(asn) || NEVER_LISTED_ASNS.has(asn) || isHostingAsn(asn)) continue;
    // Both slices need enough of their own to be compared.
    if (countryOnly.sessions < MIN_ASN_SESSIONS || countryOnly.sites < MIN_ASN_SITES) continue;
    if (other.sessions < MIN_ASN_SESSIONS || other.sites < MIN_ASN_SITES) continue;
    if (!Number.isFinite(countryOnly.lift) || !Number.isFinite(other.lift) || other.lift <= 0) continue;
    if (!Number.isFinite(countryOnly.topDeviceShare)) continue;
    if (
      countryOnly.lift < MAX_COUNTRY_ONLY_LIFT &&
      countryOnly.lift / other.lift < MAX_COUNTRY_ONLY_RELATIVE_LIFT &&
      countryOnly.topDeviceShare >= MIN_COUNTRY_ONLY_TOP_DEVICE_SHARE
    ) {
      selected.push(asn);
    }
  }
  return selected.sort((a, b) => a - b);
}

export async function measureAsnEngagement(): Promise<AsnSliceRow[]> {
  // Sites with blocking off keep every bot they receive, which drags their own
  // rate down and their networks' with it; they are left out. A shadow-only row
  // in bot_observations has no layer set, so this rule's own output does not
  // exclude the sites it is recorded on.
  //
  // Each network is measured whole and as its two geolocation slices in one
  // pass (GROUPING SETS); site counts merge as bitmaps so a network's total is
  // not the sum of its slices'. The device share is computed per slice and is
  // meaningless on the `all` row. The `all` row is the whole-network measure
  // exactly as before: every session, keyed on any one of its ASNs.
  const result = await clickhouse.query({
    query: `
      WITH sess AS (
        SELECT
          site_id,
          session_id,
          any(asn) AS session_asn,
          countIf(country != '' AND city = '' AND region = '') AS country_only_hits,
          -- 1 country-only, 0 located (or not located at all), 2 mixed: the
          -- session changed network or slice, so it belongs to neither slice.
          multiIf(uniqExact(asn) > 1, 2, country_only_hits = 0, 0, country_only_hits = count(), 1, 2) AS geo_slice,
          any((operating_system, screen_width, screen_height)) AS device_tuple,
          if(
            device_tuple.1 != '' AND device_tuple.2 > 0 AND device_tuple.3 > 0,
            concat(device_tuple.1, ' ', toString(device_tuple.2), 'x', toString(device_tuple.3)),
            ''
          ) AS device,
          max(type IN {engagementTypes:Array(String)}) AS engaged
        FROM events
        WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
          AND import_id IS NULL
          AND site_id NOT IN (
            SELECT DISTINCT site_id
            FROM bot_observations
            WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
              AND (detected_ua_pattern OR detected_header_heuristics OR detected_client_signals
                OR detected_bot_asn OR detected_rate_anomaly)
          )
        GROUP BY site_id, session_id
      ),
      site_rate AS (
        SELECT site_id, avg(engaged) AS site_engagement_rate
        FROM sess
        GROUP BY site_id
        HAVING site_engagement_rate > {minSiteRate:Float64} AND count() >= {minSiteSessions:UInt32}
      ),
      by_device AS (
        SELECT
          sess.session_asn AS asn,
          sess.geo_slice AS geo_slice,
          sess.device AS device,
          count() AS device_sessions,
          sum(sess.engaged) AS device_engaged,
          sum(site_rate.site_engagement_rate) AS device_expected,
          groupBitmapState(sess.site_id) AS device_sites
        FROM sess
        INNER JOIN site_rate ON sess.site_id = site_rate.site_id
        WHERE sess.session_asn IS NOT NULL
        GROUP BY asn, geo_slice, device
      )
      SELECT
        asn,
        if(grouping(geo_slice) = 1, 'all', multiIf(geo_slice = 1, 'country_only', geo_slice = 0, 'other', 'mixed')) AS slice,
        sum(device_sessions) AS sessions,
        groupBitmapMerge(device_sites) AS sites,
        sum(device_engaged) / sum(device_expected) AS lift,
        maxIf(device_sessions, device != '') / sum(device_sessions) AS top_device_share
      FROM by_device
      GROUP BY GROUPING SETS ((asn), (asn, geo_slice))
      HAVING sessions >= {minAsnSessions:UInt32} AND sites >= {minAsnSites:UInt32}
    `,
    format: "JSONEachRow",
    query_params: {
      engagementTypes: ENGAGEMENT_EVENT_TYPES,
      days: WINDOW_DAYS,
      minSiteRate: MIN_SITE_ENGAGEMENT_RATE,
      minSiteSessions: MIN_SITE_SESSIONS,
      minAsnSessions: MIN_ASN_SESSIONS,
      minAsnSites: MIN_ASN_SITES,
    },
    // Runs against the ingestion database for a rule that only records, so it
    // is kept small: a few threads, a memory ceiling, and a hard stop.
    clickhouse_settings: { max_execution_time: 180, max_threads: 4, max_memory_usage: "8000000000" },
  });
  const rows = await processResults<{
    asn: number | string;
    slice: string;
    sessions: number | string;
    sites: number | string;
    lift: number | string | null;
    top_device_share: number | string | null;
  }>(result);

  return rows.flatMap(row => {
    if (row.slice !== "all" && row.slice !== "country_only" && row.slice !== "other") return [];
    return [
      {
        asn: Number(row.asn),
        slice: row.slice,
        sessions: Number(row.sessions),
        sites: Number(row.sites),
        // A null ratio (no expected engagement) must not read as zero lift.
        lift: row.lift === null ? Number.NaN : Number(row.lift),
        topDeviceShare: row.top_device_share === null ? Number.NaN : Number(row.top_device_share),
      },
    ];
  });
}

async function refreshFromClickhouse(): Promise<void> {
  try {
    const won = await redis.set(REFRESH_LOCK_KEY, String(process.pid), "PX", REFRESH_LOCK_TTL_MS, "NX");
    if (won !== "OK") return;
  } catch (error) {
    // No election, no refresh: see the header. The list in hand runs to its
    // expiry and the next interval tries again.
    logger.warn({ err: error }, "ASN engagement refresh lock unavailable; skipping this refresh");
    return;
  }

  try {
    const rows = await measureAsnEngagement();
    const lists = decideAsnEngagementLists(rows);
    // Each list stands or falls on its own: an implausible proxy list must not
    // take a healthy whole-network list down with it, or the reverse.
    if (lists.lowEngagement) {
      const expiresAtMs = Date.now() + LIST_TTL_MS;
      lowEngagementAsns = new Set(lists.lowEngagement);
      listExpiresAtMs = expiresAtMs;
      await redis.set(REDIS_KEY, JSON.stringify({ asns: lists.lowEngagement, expiresAtMs }), "PX", LIST_TTL_MS);
    }
    if (lists.countryOnly) {
      const expiresAtMs = Date.now() + LIST_TTL_MS;
      countryOnlyProxyAsns = new Set(lists.countryOnly);
      countryOnlyExpiresAtMs = expiresAtMs;
      await redis.set(
        COUNTRY_ONLY_REDIS_KEY,
        JSON.stringify({ asns: lists.countryOnly, expiresAtMs }),
        "PX",
        LIST_TTL_MS
      );
    }
    // The lists themselves are the thing to read while this is in shadow mode.
    logger.info(
      { asns: lists.lowEngagement, countryOnlyAsns: lists.countryOnly },
      "Low-engagement ASNs refreshed (shadow mode, not enforced)"
    );
  } catch (error) {
    logger.error({ err: error }, "ASN engagement refresh failed");
  }
}

/**
 * Both lists from one measurement. A list comes back null when it is
 * implausibly long — a broken query, not a finding — so the caller keeps the
 * one it has.
 */
export function decideAsnEngagementLists(
  rows: readonly AsnSliceRow[],
  isHostingAsn?: (asn: number) => boolean
): { lowEngagement: number[] | null; countryOnly: number[] | null } {
  const lowEngagement = selectLowEngagementAsns(
    rows.filter(row => row.slice === "all"),
    isHostingAsn
  );
  const countryOnly = selectCountryOnlyProxyAsns(rows, isHostingAsn);
  if (lowEngagement.length > MAX_LISTED_ASNS) {
    logger.error(
      { asns: lowEngagement.length },
      "ASN engagement refresh listed implausibly many networks; keeping the previous list"
    );
  }
  if (countryOnly.length > MAX_LISTED_ASNS) {
    logger.error(
      { asns: countryOnly.length },
      "ASN country-only refresh listed implausibly many networks; keeping the previous list"
    );
  }
  return {
    lowEngagement: lowEngagement.length > MAX_LISTED_ASNS ? null : lowEngagement,
    countryOnly: countryOnly.length > MAX_LISTED_ASNS ? null : countryOnly,
  };
}

function parseStoredList(stored: string | null): { asns: Set<number>; expiresAtMs: number } | null {
  if (!stored) return null;
  const parsed = JSON.parse(stored) as { asns?: unknown; expiresAtMs?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.asns) || typeof parsed.expiresAtMs !== "number") return null;
  return {
    asns: new Set(parsed.asns.filter((asn): asn is number => Number.isInteger(asn))),
    expiresAtMs: parsed.expiresAtMs,
  };
}

export async function mirrorAsnEngagementFromRedis(): Promise<void> {
  try {
    const [stored, storedCountryOnly] = await Promise.all([redis.get(REDIS_KEY), redis.get(COUNTRY_ONLY_REDIS_KEY)]);
    const list = parseStoredList(stored);
    if (list) {
      lowEngagementAsns = list.asns;
      listExpiresAtMs = list.expiresAtMs;
    }
    const countryOnly = parseStoredList(storedCountryOnly);
    if (countryOnly) {
      countryOnlyProxyAsns = countryOnly.asns;
      countryOnlyExpiresAtMs = countryOnly.expiresAtMs;
    }
  } catch (error) {
    logger.warn({ err: error }, "ASN engagement mirror from Redis failed");
  }
}

/**
 * Start the refresh loop. Safe to call from every worker: the ClickHouse query
 * is elected through Redis, and the others pick up its result on the mirror
 * interval.
 */
export function startAsnEngagementRefresh(): void {
  if (refreshTimer) return;
  void mirrorAsnEngagementFromRedis().then(() => refreshFromClickhouse());
  refreshTimer = setInterval(() => void refreshFromClickhouse(), ASN_ENGAGEMENT_REFRESH_MS);
  mirrorTimer = setInterval(() => void mirrorAsnEngagementFromRedis(), ASN_ENGAGEMENT_MIRROR_MS);
  refreshTimer.unref();
  mirrorTimer.unref();
}

export function stopAsnEngagementRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  if (mirrorTimer) clearInterval(mirrorTimer);
  refreshTimer = null;
  mirrorTimer = null;
}

export function setLowEngagementAsnsForTests(
  asns: readonly number[],
  expiresAtMs = Number.POSITIVE_INFINITY,
  countryOnlyAsns: readonly number[] = []
): void {
  lowEngagementAsns = new Set(asns);
  listExpiresAtMs = expiresAtMs;
  countryOnlyProxyAsns = new Set(countryOnlyAsns);
  countryOnlyExpiresAtMs = expiresAtMs;
}
