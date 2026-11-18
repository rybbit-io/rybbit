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
 * Networks that are a crowd by construction — relays and SASE gateways. They
 * do not measure as low-engagement, and are excluded anyway so that a bad week
 * of data cannot list them.
 */
const NEVER_LISTED_ASNS: ReadonlySet<number> = new Set([...RELAY_EGRESS_ASNS, ...SASE_EGRESS_ASNS]);

export const ASN_ENGAGEMENT_REFRESH_MS = 6 * 60 * 60 * 1000;
export const ASN_ENGAGEMENT_MIRROR_MS = 15 * 60 * 1000;
const REDIS_KEY = "bot:ae";
const LIST_TTL_MS = 36 * 60 * 60 * 1000;
const REFRESH_LOCK_KEY = "bot:ae:lock";
const REFRESH_LOCK_TTL_MS = ASN_ENGAGEMENT_REFRESH_MS - 30_000;

let lowEngagementAsns: ReadonlySet<number> = new Set();
/** When the list above stops being trusted; published with it. */
let listExpiresAtMs = 0;
let refreshTimer: NodeJS.Timeout | null = null;
let mirrorTimer: NodeJS.Timeout | null = null;

export function isLowEngagementAsn(asn: number | null | undefined, nowMs: number = Date.now()): boolean {
  return typeof asn === "number" && nowMs < listExpiresAtMs && lowEngagementAsns.has(asn);
}

export interface AsnEngagementRow {
  asn: number;
  sessions: number;
  sites: number;
  lift: number;
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

export async function measureAsnEngagement(): Promise<AsnEngagementRow[]> {
  // Sites with blocking off keep every bot they receive, which drags their own
  // rate down and their networks' with it; they are left out. A shadow-only row
  // in bot_observations has no layer set, so this rule's own output does not
  // exclude the sites it is recorded on.
  const result = await clickhouse.query({
    query: `
      WITH sess AS (
        SELECT
          site_id,
          session_id,
          any(asn) AS session_asn,
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
      )
      SELECT
        sess.session_asn AS asn,
        count() AS sessions,
        uniq(sess.site_id) AS sites,
        sum(sess.engaged) / sum(site_rate.site_engagement_rate) AS lift
      FROM sess
      INNER JOIN site_rate ON sess.site_id = site_rate.site_id
      WHERE sess.session_asn IS NOT NULL
      GROUP BY asn
      HAVING sessions >= {minAsnSessions:UInt32} AND sites >= {minAsnSites:UInt32} AND lift < {maxLift:Float64}
    `,
    format: "JSONEachRow",
    query_params: {
      engagementTypes: ENGAGEMENT_EVENT_TYPES,
      days: WINDOW_DAYS,
      minSiteRate: MIN_SITE_ENGAGEMENT_RATE,
      minSiteSessions: MIN_SITE_SESSIONS,
      minAsnSessions: MIN_ASN_SESSIONS,
      minAsnSites: MIN_ASN_SITES,
      maxLift: Math.max(MAX_LIFT_HOSTING, MAX_LIFT_OTHER),
    },
    // Runs against the ingestion database for a rule that only records, so it
    // is kept small: a few threads, a memory ceiling, and a hard stop.
    clickhouse_settings: { max_execution_time: 180, max_threads: 4, max_memory_usage: "8000000000" },
  });
  const rows = await processResults<{
    asn: number | string;
    sessions: number | string;
    sites: number | string;
    lift: number | string;
  }>(result);

  return rows.map(row => ({
    asn: Number(row.asn),
    sessions: Number(row.sessions),
    sites: Number(row.sites),
    lift: Number(row.lift),
  }));
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
    const selected = selectLowEngagementAsns(await measureAsnEngagement());
    if (selected.length > MAX_LISTED_ASNS) {
      logger.error(
        { asns: selected.length },
        "ASN engagement refresh listed implausibly many networks; keeping the previous list"
      );
      return;
    }

    const expiresAtMs = Date.now() + LIST_TTL_MS;
    lowEngagementAsns = new Set(selected);
    listExpiresAtMs = expiresAtMs;
    await redis.set(REDIS_KEY, JSON.stringify({ asns: selected, expiresAtMs }), "PX", LIST_TTL_MS);
    // The list itself is the thing to read while this is in shadow mode.
    logger.info({ asns: selected }, "Low-engagement ASNs refreshed (shadow mode, not enforced)");
  } catch (error) {
    logger.error({ err: error }, "ASN engagement refresh failed");
  }
}

async function mirrorFromRedis(): Promise<void> {
  try {
    const stored = await redis.get(REDIS_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as { asns?: unknown; expiresAtMs?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.asns) || typeof parsed.expiresAtMs !== "number") return;
    lowEngagementAsns = new Set(parsed.asns.filter((asn): asn is number => Number.isInteger(asn)));
    listExpiresAtMs = parsed.expiresAtMs;
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
  void mirrorFromRedis().then(() => refreshFromClickhouse());
  refreshTimer = setInterval(() => void refreshFromClickhouse(), ASN_ENGAGEMENT_REFRESH_MS);
  mirrorTimer = setInterval(() => void mirrorFromRedis(), ASN_ENGAGEMENT_MIRROR_MS);
  refreshTimer.unref();
  mirrorTimer.unref();
}

export function stopAsnEngagementRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  if (mirrorTimer) clearInterval(mirrorTimer);
  refreshTimer = null;
  mirrorTimer = null;
}

export function setLowEngagementAsnsForTests(asns: readonly number[], expiresAtMs = Number.POSITIVE_INFINITY): void {
  lowEngagementAsns = new Set(asns);
  listExpiresAtMs = expiresAtMs;
}
