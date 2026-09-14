import { processResults } from "../../../api/analytics/utils/utils.js";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { redis } from "../../../db/redis/redis.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";

/**
 * Per-site traffic baseline for the site-flood rules in `anomalyScorer.ts`.
 *
 * Every rate rule elsewhere in the layer uses an absolute threshold, so a site
 * that normally sees four events an hour can be hit at a thousand times that
 * rate by traffic that is individually well-behaved and trip nothing. The flood
 * rules compare the site's current 10-minute volume against *its own* normal,
 * and this module is where that normal comes from.
 *
 * The baseline is the median of the site's 10-minute event counts over the
 * trailing seven days, with the empty buckets counted as zero (1,008 buckets in
 * a week). The padding matters: a quiet site's non-zero buckets are exactly the
 * busy ones, and a median over only those overstates its normal. The padded
 * median is also immune to the site's own previous floods — a 20-hour flood is
 * 120 buckets out of 1,008 and cannot move the median.
 *
 * A site whose first event in the window is less than six and a half days old
 * is marked not-yet-eligible: an onboarding site's baseline is zero because it
 * did not exist, and its first real day of traffic would otherwise read as a
 * flood. A site with no row at all — new, or a cold self-host install, or the
 * refresh failed — has no baseline, and the flood rules stay off for it. Every
 * failure mode here fails towards not accusing.
 *
 * Refresh is one ClickHouse aggregate every 15 minutes, written to a Redis hash
 * so every worker shares it, and mirrored into a process-local map that the hot
 * path reads. The hot path never touches Redis or ClickHouse for this.
 */

const logger = createServiceLogger("site-baseline");

const TEN_MINUTES_PER_WEEK = 7 * 24 * 6;
const MIN_SITE_AGE_HOURS = 6 * 24 + 12;
export const SITE_BASELINE_REFRESH_MS = 15 * 60 * 1000;
export const SITE_BASELINE_MIRROR_MS = 5 * 60 * 1000;
const REDIS_HASH_KEY = "bot:sb";
const REDIS_HASH_TTL_MS = 2 * 60 * 60 * 1000;
// Refresh election: only the worker that wins this lock runs the ClickHouse
// query; the rest read the hash it writes.
const REFRESH_LOCK_KEY = "bot:sb:lock";
const REFRESH_LOCK_TTL_MS = SITE_BASELINE_REFRESH_MS - 30_000;

export interface SiteBaseline {
  /** Median events per 10-minute bucket over the trailing week, zero-padded. */
  events10m: number;
  /** Whether the site has enough history for a baseline to mean anything. */
  eligible: boolean;
}

const baselines = new Map<number, SiteBaseline>();
let refreshTimer: NodeJS.Timeout | null = null;
let mirrorTimer: NodeJS.Timeout | null = null;

export function getSiteBaseline(siteId: number): SiteBaseline | undefined {
  return baselines.get(siteId);
}

function encode(baseline: SiteBaseline): string {
  return `${baseline.events10m}:${baseline.eligible ? 1 : 0}`;
}

function decode(value: string): SiteBaseline | null {
  const [events, eligible] = value.split(":");
  const events10m = Number(events);
  if (!Number.isFinite(events10m)) return null;
  return { events10m, eligible: eligible === "1" };
}

export async function computeSiteBaselines(): Promise<Map<number, SiteBaseline>> {
  const result = await clickhouse.query({
    query: `
      SELECT
        site_id,
        arraySort(arrayResize(groupArray(c), {buckets:UInt32}, 0))[{median:UInt32}] AS baseline_10m,
        min(b) <= now() - INTERVAL {minAgeHours:UInt32} HOUR AS eligible
      FROM (
        SELECT site_id, toStartOfInterval(timestamp, INTERVAL 10 MINUTE) AS b, count() AS c
        FROM events
        WHERE timestamp >= now() - INTERVAL 7 DAY
        GROUP BY site_id, b
      )
      GROUP BY site_id
    `,
    format: "JSONEachRow",
    query_params: {
      buckets: TEN_MINUTES_PER_WEEK,
      median: Math.floor(TEN_MINUTES_PER_WEEK / 2),
      minAgeHours: MIN_SITE_AGE_HOURS,
    },
  });
  const rows = await processResults<{ site_id: number; baseline_10m: number | string; eligible: number | boolean }>(
    result
  );

  const next = new Map<number, SiteBaseline>();
  for (const row of rows) {
    next.set(Number(row.site_id), {
      events10m: Number(row.baseline_10m),
      eligible: row.eligible === true || Number(row.eligible) === 1,
    });
  }
  return next;
}

async function refreshFromClickhouse(): Promise<void> {
  try {
    const won = await redis.set(REFRESH_LOCK_KEY, String(process.pid), "PX", REFRESH_LOCK_TTL_MS, "NX");
    if (won !== "OK") return;
  } catch (error) {
    // Without Redis there is no sharing anyway; refresh locally.
    logger.warn({ err: error }, "Site baseline refresh lock unavailable; refreshing locally");
  }

  try {
    const next = await computeSiteBaselines();
    replaceBaselines(next);

    if (next.size > 0) {
      const flat: string[] = [];
      for (const [siteId, baseline] of next) {
        flat.push(String(siteId), encode(baseline));
      }
      await redis
        .multi()
        .del(REDIS_HASH_KEY)
        .hset(REDIS_HASH_KEY, ...flat)
        .pexpire(REDIS_HASH_KEY, REDIS_HASH_TTL_MS)
        .exec();
    }
    logger.info({ sites: next.size }, "Site baselines refreshed");
  } catch (error) {
    logger.error({ err: error }, "Site baseline refresh failed");
  }
}

async function mirrorFromRedis(): Promise<void> {
  try {
    const entries = await redis.hgetall(REDIS_HASH_KEY);
    const keys = Object.keys(entries);
    if (keys.length === 0) return;
    const next = new Map<number, SiteBaseline>();
    for (const key of keys) {
      const decoded = decode(entries[key]);
      if (decoded) next.set(Number(key), decoded);
    }
    replaceBaselines(next);
  } catch (error) {
    logger.warn({ err: error }, "Site baseline mirror from Redis failed");
  }
}

function replaceBaselines(next: Map<number, SiteBaseline>) {
  baselines.clear();
  for (const [siteId, baseline] of next) {
    baselines.set(siteId, baseline);
  }
}

/**
 * Start the refresh loop. Safe to call from every worker: the ClickHouse query
 * is elected through Redis, and the others pick up its result on the mirror
 * interval. The first mirror runs immediately so a restarted worker is not blind
 * until the next refresh.
 */
export function startSiteBaselineRefresh(): void {
  if (refreshTimer) return;
  void mirrorFromRedis().then(() => refreshFromClickhouse());
  refreshTimer = setInterval(() => void refreshFromClickhouse(), SITE_BASELINE_REFRESH_MS);
  mirrorTimer = setInterval(() => void mirrorFromRedis(), SITE_BASELINE_MIRROR_MS);
  refreshTimer.unref();
  mirrorTimer.unref();
}

export function stopSiteBaselineRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  if (mirrorTimer) clearInterval(mirrorTimer);
  refreshTimer = null;
  mirrorTimer = null;
}

export function setSiteBaselineForTests(siteId: number, baseline: SiteBaseline | null): void {
  if (baseline) {
    baselines.set(siteId, baseline);
  } else {
    baselines.delete(siteId);
  }
}

export function resetSiteBaselinesForTests(): void {
  baselines.clear();
}
