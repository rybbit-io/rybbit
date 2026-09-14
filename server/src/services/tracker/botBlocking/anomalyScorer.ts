import { anomalyObserve, type AnomalyCounterSpec } from "../../../db/redis/redis.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import {
  ENUMERATION_BUCKET_MS,
  observeEnumeration,
  resetEnumerationObserverForTests,
  type EnumerationObservation,
} from "./enumerationObserver.js";
import { getSiteBaseline, type SiteBaseline } from "./siteBaseline.js";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const ANOMALY_SCORE_THRESHOLD = 4;
const CLEANUP_INTERVAL_MS = 60 * SECOND;
const MAX_COUNTER_BUCKET_SIZE = 512;
const MAX_DISTINCT_BUCKET_SIZE = 512;
const MAX_DISTRIBUTION_FIELDS = 128;
// Only bounds the in-process fallback's distinct sets; Redis uses HyperLogLog,
// which has no equivalent limit.
const MAX_LOCAL_DISTINCT_VALUES = 4096;
// Bounds how many keys the in-process fallback's plain counters hold at once.
// Redis needs no equivalent, since it expires each key on its own window.
const MAX_LOCAL_COUNTER_KEYS = 100_000;

/**
 * Cohort-uniformity rule. A cohort is one exact device fingerprint on a site —
 * (screen, language, browser) — and the rule measures how its traffic is spread
 * across browser major versions inside a fixed one-hour bucket.
 *
 * An organic cohort is steeply peaked: browsers auto-update, so one current
 * version holds most of it (measured 0.52-0.98 modal share, and >=0.74 for every
 * cohort large enough to reach the volume gate). A fleet that rotates a fixed
 * list of user agents to mint fresh identities is flat instead — each version
 * takes an equal slice — which no real population produces. The bot that
 * motivated this rule sat at 0.09-0.15 across 16 versions.
 *
 * This is the only shape that catches a paced distributed crawler: such a
 * crawler stays under every per-identity rate threshold by design (one event per
 * several minutes per identity), so rate rules never see it, and it is invisible
 * to any single-visitor view because the evidence only exists in aggregate.
 * Thresholds are set with a wide margin — over 24h of production traffic across
 * every site, only the crawler's own cohort satisfied all three.
 *
 * The bucket is an hour, not a minute. The crawler paces itself: its busiest
 * cohort peaked at 19 events in any one minute against a 300-event gate, and
 * over 14 days of production the minute-bucket version never fired once. Over
 * an hour the same cohort holds 3,000+ events with a modal share of 0.1, and
 * with a 100-event gate it was the only cohort platform-wide to qualify in 22
 * of 24 hours. The window was wrong; the shape test was not.
 */
const COHORT_MIN_EVENTS_1H = 100;
const COHORT_MIN_DISTINCT_VERSIONS = 8;
const COHORT_MAX_MODAL_SHARE = 0.25;

/**
 * Long-window per-actor volume. Every other rate rule here works in 10- and
 * 60-second windows, which a crawler paced at one hit every few seconds slips
 * under indefinitely: 4,000 pageviews a day from a single datacenter address
 * never trips any of them. Measured over production, events per (site, actor,
 * day) has p99.99 = 303 and only 69 actors out of 1.03M exceed 1,000.
 *
 * It is supporting-only, and permanently so. The actor is the exact request IP —
 * note this is NOT the identity actor, which buckets datacenter egress to a /24
 * and would merge far more aggressively. Even at exact-IP granularity an office
 * or a carrier NAT is one address shared by hundreds of people, and a four-figure
 * daily count from one is unremarkable. A rule that convicts on this number
 * convicts an office.
 *
 * The guard below drops it for actors showing many user agents, which is what
 * shared egress usually looks like. It is a weak test, deliberately: a managed
 * fleet where everyone runs the same browser build defeats it, which is another
 * reason the score is 1 and the rule can only ever corroborate. Scoring it
 * higher would let it combine with `missing_client_score_60s` and one crowd rule
 * to reach the threshold on evidence that is entirely shared-dimension.
 */
const ACTOR_EVENTS_1D_THRESHOLD = 1000;
const ACTOR_EVENTS_1D_SCORE = 1;
const PROXY_MERGE_MAX_USER_AGENTS = 3;
const DAY = 24 * 60 * MINUTE;

/**
 * Site-flood rules. The failure these exist for: a fleet of disposable
 * identities — one event each, a fresh IP and user agent per hit, spread over
 * thousands of residential ASNs, running a real browser — lands on a site that
 * normally sees four events an hour and pushes it to four thousand. Every rule
 * above is keyed on an actor and sees one well-behaved event per actor; nothing
 * fires. Measured across production, detection caught 14% of traffic in such
 * hours against 48% at rest — worst exactly where the site owner is looking.
 *
 * What the fleet cannot hide is the site's aggregate: the rate against the
 * site's own baseline (`siteBaseline.ts`), and, within the flood, a single
 * device cohort that is nearly all distinct actors, nearly all direct, and a
 * large share of the site's traffic. A launch or a press bump is the mirror
 * image — many devices, several events per visitor, referrers set — so the
 * flood gate alone never convicts; a cohort or an actor still has to show a
 * shape no organic audience produces.
 *
 * The actor rule inside a flood is hosting-only. On the first day in
 * production a residential version of it (1,000 events a day) convicted two
 * real people: power users of small internal tools, clicking and typing
 * through edit pages at a few events a minute, who *were* their site's whole
 * "flood" against a near-zero baseline. A human at a keyboard can produce a
 * thousand events a day on a site they work in; a datacenter address cannot
 * be one.
 *
 * The gate is the site's 10-minute volume at twenty times its padded weekly
 * median and at least 100 events. Sites without a baseline, or younger than a
 * week, never pass it.
 */
const FLOOD_MULTIPLE = 20;
const FLOOD_MIN_EVENTS_10M = 100;
const FLOOD_COHORT_MIN_EVENTS_10M = 50;
const FLOOD_COHORT_MIN_ACTOR_RATIO = 0.6;
const FLOOD_COHORT_MIN_DIRECT_SHARE = 0.95;
const FLOOD_COHORT_MIN_SITE_SHARE = 0.25;
const FLOOD_ACTOR_EVENTS_1D_HOSTING = 200;
const TEN_MINUTES = 10 * MINUTE;

/**
 * Long-window volume from a hosting address convicts on its own. The
 * supporting-only `actor_events_1d` above exists because one residential or
 * office address can be hundreds of people; a datacenter address is not. The
 * Azure-hosted fleet this targets ran ~300 events per address per day across
 * 3,000 sites and was caught under half the time, because the hosting ASN is
 * only ever corroborating and nothing corroborated it.
 *
 * SASE egress is the exception a hosting flag cannot see — Cato, Zscaler and
 * Netskope route whole companies through cloud addresses — so those are
 * exempt outright, in addition to the many-user-agents guard.
 */
const HOSTING_ACTOR_EVENTS_1D_THRESHOLD = 1000;
const SASE_EGRESS_ASNS: ReadonlySet<number> = new Set([
  13150, // Cato Networks
  22616, // Zscaler
  55256, // Netskope
]);

const logger = createServiceLogger("anomaly-scorer");

// Counters live in Redis so every worker/replica shares one view; an in-process
// Map only sees 1/N of the traffic behind a load balancer, diluting the rate
// thresholds by the worker count. The in-process counters below remain as a
// fallback for when Redis is unavailable. Set DISABLE_REDIS_ANOMALY=true to pin
// scoring to the in-process counters (e.g. single-process deployments).
let redisAnomalyEnabled = process.env.DISABLE_REDIS_ANOMALY !== "true";

interface AnomalyReason {
  rule: string;
  score: number;
  value: number;
  threshold: number;
  windowSeconds: number;
}

export interface AnomalyCounters {
  tupleEvents10s: number;
  tupleEvents60s: number;
  tupleInteractionEvents10s: number;
  tupleDistinctPaths60s: number;
  ipEvents60s: number;
  ipDistinctUserAgents5m: number;
  ipDistinctHosts60s: number;
  siteUserAgentEvents60s: number;
  missingClientScore60s: number;
  cohortEvents1h: number;
  cohortTopVersionEvents1h: number;
  cohortDistinctVersions1h: number;
  actorEvents1d: number;
  siteEvents10m: number;
  siteDistinctActors10m: number;
  cohortEvents10m: number;
  cohortDistinctActors10m: number;
  cohortDirectEvents10m: number;
  enumerationEvents15m: number;
  enumerationDistinctPaths15m: number;
  enumerationDistinctActors15m: number;
  enumerationDirectEvents15m: number;
}

/**
 * Auto-captured interaction events fire in rapid, legitimate bursts — a human on
 * a configurator, slider, or spinner can exceed crawler-tuned event rates (the
 * Verge /order/ incident: engaged customers blocked as bots). These types are
 * excluded from the general tuple event counters and policed by a dedicated
 * burst rule with a beyond-human threshold instead.
 */
const INTERACTION_EVENT_TYPES = new Set(["button_click", "input_change", "copy"]);

export interface AnomalyInput {
  /**
   * Numeric Site id. Counters are namespaced by it, so it must be the id the
   * rest of ingestion uses — a Site addressed by its text id in one request and
   * its legacy numeric id in another would otherwise occupy two namespaces and
   * each would see half the traffic.
   */
  siteId: number;
  ipAddress: string;
  userAgent: string;
  hostname?: string;
  pathname?: string;
  eventType?: string;
  /**
   * The referrer as it arrived, NOT the stored value. Self-referrers are cleared
   * before storage, so a stored empty referrer means "direct or internal
   * navigation" — two very different populations. The enumeration observer needs
   * the raw distinction.
   */
  referrer?: string;
  hasClientBotScore: boolean;
  /** Cohort dimensions; the cohort rule is skipped unless all three resolve. */
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  /** Whether the request address resolved to hosting/datacenter or bot-provider space. */
  isHostingAsn?: boolean;
  asn?: number;
  /** Overrides the site baseline lookup; tests only. */
  siteBaseline?: SiteBaseline | null;
  nowMs?: number;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  score: number;
  /**
   * Rules describing a single actor. Only these can open a conviction, and the
   * split is the point: keeping the two kinds of evidence in one list left the
   * invariant resting on how the scores happened to add up, one threshold edit
   * away from letting shared-dimension evidence convict on its own.
   */
  convictingReasons: AnomalyReason[];
  /**
   * Rules keyed on dimensions real visitors share — an IP, a popular browser on
   * a busy site — plus long-window volume, where the actor may be an entire
   * office behind one egress. These raise a score that convicting evidence has
   * already opened, and can never open one themselves.
   */
  supportingReasons: AnomalyReason[];
  /** Both lists, in that order, for the audit record written to ClickHouse. */
  reasons: AnomalyReason[];
  counters: AnomalyCounters;
  /**
   * Shadow-mode enumeration reading. Recorded, never scored — nothing in this
   * module reads it back into `score`.
   */
  enumeration?: EnumerationObservation;
}

class RollingCounter {
  private buckets = new Map<string, number[]>();

  observe(key: string, nowMs: number, windowMs: number): number {
    const bucket = this.buckets.get(key) ?? [];
    bucket.push(nowMs);
    const count = pruneTimestamps(bucket, nowMs, windowMs);
    this.buckets.set(key, bucket);
    return count;
  }

  cleanup(nowMs: number, maxWindowMs: number) {
    for (const [key, bucket] of this.buckets) {
      if (pruneTimestamps(bucket, nowMs, maxWindowMs) === 0) {
        this.buckets.delete(key);
      }
    }
  }

  clear() {
    this.buckets.clear();
  }
}

class RollingDistinctCounter {
  private buckets = new Map<string, Map<string, number>>();

  observe(key: string, value: string, nowMs: number, windowMs: number): number {
    const bucket = this.buckets.get(key) ?? new Map<string, number>();
    bucket.set(value, nowMs);
    const count = pruneDistinct(bucket, nowMs, windowMs);
    this.buckets.set(key, bucket);
    return count;
  }

  cleanup(nowMs: number, maxWindowMs: number) {
    for (const [key, bucket] of this.buckets) {
      if (pruneDistinct(bucket, nowMs, maxWindowMs) === 0) {
        this.buckets.delete(key);
      }
    }
  }

  clear() {
    this.buckets.clear();
  }
}

/**
 * Value -> count within a fixed time bucket, mirroring the Redis distribution
 * counter. Tumbling rather than sliding: the bucket resets wholesale once its
 * window elapses, which is exactly the statistic the cohort thresholds were
 * measured against.
 */
class BucketedDistributionCounter {
  private buckets = new Map<string, { startMs: number; counts: Map<string, number> }>();

  observe(key: string, value: string, nowMs: number, windowMs: number, maxFields: number): AnomalyDistributionReading {
    const bucketStartMs = Math.floor(nowMs / windowMs) * windowMs;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.startMs !== bucketStartMs) {
      bucket = { startMs: bucketStartMs, counts: new Map<string, number>() };
      this.buckets.set(key, bucket);
    }

    const existing = bucket.counts.get(value);
    if (existing !== undefined) {
      bucket.counts.set(value, existing + 1);
    } else if (bucket.counts.size < maxFields) {
      bucket.counts.set(value, 1);
    }

    let total = 0;
    let top = 0;
    for (const count of bucket.counts.values()) {
      total += count;
      if (count > top) top = count;
    }
    return { total, top, distinct: bucket.counts.size };
  }

  cleanup(nowMs: number, windowMs: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.startMs + windowMs < nowMs) {
        this.buckets.delete(key);
      }
    }
  }

  clear() {
    this.buckets.clear();
  }
}

/**
 * Plain count inside a fixed time bucket, mirroring the Redis `counter` kind.
 * Tumbling like the distribution counter above: the bucket index is part of the
 * caller's key, so a new bucket simply starts a new entry.
 *
 * Bounded by key count, which is the dimension that actually runs away here.
 * `cleanup` only frees an entry once its window has passed, and `actorEvents1d`
 * is keyed per actor address on a one-day window — so during a Redis outage an
 * unbounded map would hold an entry for every address seen all day.
 *
 * Past the cap a new key counts as zero rather than evicting an existing one.
 * Both halves of that are deliberate: eviction would let a heavy actor clear its
 * own count by cycling keys, and zero keeps the fallback failing towards saying
 * nothing, the same direction as the distinct-value cap below.
 */
export class BucketedCounter {
  private buckets = new Map<string, { startMs: number; count: number }>();

  observe(key: string, nowMs: number, windowMs: number, maxKeys: number): number {
    const bucketStartMs = Math.floor(nowMs / windowMs) * windowMs;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.startMs !== bucketStartMs) {
      // A key already present is being rolled over, not added, so it is let
      // through at capacity — only a genuinely new key can grow the map.
      if (!bucket && this.buckets.size >= maxKeys) {
        return 0;
      }
      bucket = { startMs: bucketStartMs, count: 0 };
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    return bucket.count;
  }

  cleanup(nowMs: number, windowMs: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.startMs + windowMs < nowMs) {
        this.buckets.delete(key);
      }
    }
  }

  clear() {
    this.buckets.clear();
  }
}

/**
 * Distinct-value count inside a fixed time bucket, mirroring the Redis
 * `cardinality` kind. Where Redis uses a HyperLogLog, this holds the values, so
 * it is capped — above the cap it undercounts. That direction is deliberate: a
 * suppressed distinct count lowers path novelty, so the fallback can only fail
 * towards saying nothing, never towards a false accusation.
 */
class BucketedDistinctCounter {
  private buckets = new Map<string, { startMs: number; values: Set<string> }>();

  observe(key: string, value: string, nowMs: number, windowMs: number, maxValues: number): number {
    const bucketStartMs = Math.floor(nowMs / windowMs) * windowMs;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.startMs !== bucketStartMs) {
      bucket = { startMs: bucketStartMs, values: new Set<string>() };
      this.buckets.set(key, bucket);
    }
    if (bucket.values.size < maxValues) {
      bucket.values.add(value);
    }
    return bucket.values.size;
  }

  cleanup(nowMs: number, windowMs: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.startMs + windowMs < nowMs) {
        this.buckets.delete(key);
      }
    }
  }

  clear() {
    this.buckets.clear();
  }
}

interface AnomalyDistributionReading {
  total: number;
  top: number;
  distinct: number;
}

const tupleEvents10s = new RollingCounter();
const tupleEvents60s = new RollingCounter();
const tupleInteractionEvents10s = new RollingCounter();
const ipEvents60s = new RollingCounter();
const siteUserAgentEvents60s = new RollingCounter();
const missingClientScore60s = new RollingCounter();

const tupleDistinctPaths60s = new RollingDistinctCounter();
const ipDistinctUserAgents5m = new RollingDistinctCounter();
const ipDistinctHosts60s = new RollingDistinctCounter();

const cohortBrowserVersions1h = new BucketedDistributionCounter();

const actorEvents1d = new BucketedCounter();
const siteEvents10m = new BucketedCounter();
const cohortEvents10m = new BucketedCounter();
const cohortDirectEvents10m = new BucketedCounter();
const siteDistinctActors10m = new BucketedDistinctCounter();
const cohortDistinctActors10m = new BucketedDistinctCounter();
const enumerationEvents15m = new BucketedCounter();
const enumerationDirectEvents15m = new BucketedCounter();
const enumerationDistinctPaths15m = new BucketedDistinctCounter();
const enumerationDistinctActors15m = new BucketedDistinctCounter();

let lastCleanupMs = 0;

const BRANDED_BROWSER_PATTERN = /(Edg|EdgA|EdgiOS|OPR|SamsungBrowser|Firefox|FxiOS|CriOS|Chrome)\/(\d{1,4})/;
const GENERIC_VERSION_PATTERN = /Version\/(\d{1,4})/;

/**
 * The browser family and major version behind a user agent, used as the cohort
 * rule's grouping key and distribution dimension respectively. A deliberately
 * loose parse: the rule only cares that rotating user agents map to different
 * versions and stable ones map to the same version, so any token that moves with
 * the browser release works.
 *
 * Both come out of the same match, which is the point — a version number is only
 * comparable within its own family. Chrome 120 and Safari 17 are not two points
 * on one distribution, and pooling them is what made a mixed-browser cohort look
 * flat (see the cohort key below).
 *
 * Chromium derivatives that put their own token AFTER `Chrome/` — Edge (`Edg`)
 * and Opera (`OPR`) — resolve to `chrome`, because the leftmost match wins.
 * That is the behaviour we want and not an accident of the regex: their
 * `Chrome/` token carries the Chromium version they actually ship, so Edge 120
 * and Chrome 120 genuinely belong on one distribution and both peak together.
 * Derivatives whose token comes first — Samsung Internet, Chrome and Firefox on
 * iOS — get their own family, which is also right, since their version numbers
 * move independently. `anomalyScorer.test.ts` pins all of these against real
 * user agents.
 */
function getBrowserIdentity(userAgent: string): { family: string; majorVersion: string } {
  const branded = BRANDED_BROWSER_PATTERN.exec(userAgent);
  if (branded) {
    return { family: branded[1].toLowerCase(), majorVersion: branded[2] };
  }

  const generic = GENERIC_VERSION_PATTERN.exec(userAgent);
  if (generic) {
    return { family: "safari", majorVersion: generic[1] };
  }

  return { family: "", majorVersion: "" };
}

// Unique-per-event token so each observation is a distinct sorted-set member in
// the Redis rate counters. pid keeps it unique across workers; the sequence keeps
// it unique within a millisecond.
let eventSeq = 0;
function nextEventToken(nowMs: number): string {
  eventSeq = (eventSeq + 1) % Number.MAX_SAFE_INTEGER;
  return `${nowMs}-${process.pid}-${eventSeq}`;
}

function pruneTimestamps(bucket: number[], nowMs: number, windowMs: number): number {
  const oldestAllowed = nowMs - windowMs;
  let removeCount = 0;
  while (removeCount < bucket.length && bucket[removeCount] < oldestAllowed) {
    removeCount++;
  }
  if (removeCount > 0) {
    bucket.splice(0, removeCount);
  }
  if (bucket.length > MAX_COUNTER_BUCKET_SIZE) {
    bucket.splice(0, bucket.length - MAX_COUNTER_BUCKET_SIZE);
  }
  return bucket.length;
}

function pruneDistinct(bucket: Map<string, number>, nowMs: number, windowMs: number): number {
  const oldestAllowed = nowMs - windowMs;
  for (const [value, lastSeenMs] of bucket) {
    if (lastSeenMs < oldestAllowed) {
      bucket.delete(value);
    }
  }
  while (bucket.size > MAX_DISTINCT_BUCKET_SIZE) {
    const oldestKey = bucket.keys().next().value;
    if (oldestKey === undefined) break;
    bucket.delete(oldestKey);
  }
  return bucket.size;
}

function hashValue(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalizeDimension(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function addReason(
  reasons: AnomalyReason[],
  rule: string,
  score: number,
  value: number,
  threshold: number,
  windowSeconds: number
) {
  if (value <= threshold) return;
  reasons.push({ rule, score, value, threshold, windowSeconds });
}

function maybeCleanup(nowMs: number) {
  if (nowMs - lastCleanupMs < CLEANUP_INTERVAL_MS) return;
  lastCleanupMs = nowMs;

  tupleEvents10s.cleanup(nowMs, 10 * SECOND);
  tupleEvents60s.cleanup(nowMs, MINUTE);
  tupleInteractionEvents10s.cleanup(nowMs, 10 * SECOND);
  ipEvents60s.cleanup(nowMs, MINUTE);
  siteUserAgentEvents60s.cleanup(nowMs, MINUTE);
  missingClientScore60s.cleanup(nowMs, MINUTE);
  tupleDistinctPaths60s.cleanup(nowMs, MINUTE);
  ipDistinctUserAgents5m.cleanup(nowMs, 5 * MINUTE);
  ipDistinctHosts60s.cleanup(nowMs, MINUTE);
  cohortBrowserVersions1h.cleanup(nowMs, HOUR);
  actorEvents1d.cleanup(nowMs, DAY);
  siteEvents10m.cleanup(nowMs, TEN_MINUTES);
  cohortEvents10m.cleanup(nowMs, TEN_MINUTES);
  cohortDirectEvents10m.cleanup(nowMs, TEN_MINUTES);
  siteDistinctActors10m.cleanup(nowMs, TEN_MINUTES);
  cohortDistinctActors10m.cleanup(nowMs, TEN_MINUTES);
  enumerationEvents15m.cleanup(nowMs, ENUMERATION_BUCKET_MS);
  enumerationDirectEvents15m.cleanup(nowMs, ENUMERATION_BUCKET_MS);
  enumerationDistinctPaths15m.cleanup(nowMs, ENUMERATION_BUCKET_MS);
  enumerationDistinctActors15m.cleanup(nowMs, ENUMERATION_BUCKET_MS);
}

// A single counter described once for both backends: its Redis key/member and an
// equivalent in-process observation. `enabled` is false for the conditional
// counters (no path/host, or a client score was supplied), which contribute 0.
interface CounterPlan {
  name: keyof AnomalyCounters;
  enabled: boolean;
  kind?: AnomalyCounterSpec["kind"];
  redisKey: string;
  member: string;
  windowMs: number;
  maxSize: number;
  observeLocal: (nowMs: number) => number;
  /**
   * Distribution counters yield three numbers from one observation; these name
   * the counters the `top` and `distinct` readings land in.
   */
  topCounterName?: keyof AnomalyCounters;
  distinctCounterName?: keyof AnomalyCounters;
  observeLocalDistribution?: (nowMs: number) => AnomalyDistributionReading;
}

/**
 * The cohort bucket the enumeration observer reads, carried out of the plan so
 * the observer does not have to re-derive the cohort key. Null when the event
 * has no cohort or no path, which is when there is nothing to measure.
 */
interface EnumerationPlan {
  cohortKey: string;
  bucket: number;
  /**
   * Whether this hit arrived with no referrer at all, judged on the raw value
   * before self-referrers are cleared for storage. Only a direct hit increments
   * the direct counter, so only a direct hit can read a meaningful share.
   */
  isDirect: boolean;
}

interface AnomalyPlan {
  counters: CounterPlan[];
  enumeration: EnumerationPlan | null;
}

function buildCounterPlan(input: AnomalyInput, nowMs: number): AnomalyPlan {
  const siteId = input.siteId;
  const ipAddress = normalizeDimension(input.ipAddress);
  const userAgentHash = hashValue(input.userAgent || "");
  const hostname = normalizeDimension(input.hostname);
  const pathname = normalizeDimension(input.pathname);

  const tupleKey = `${siteId}:${ipAddress}:${userAgentHash}`;
  const ipKey = `${siteId}:${ipAddress}`;
  const siteUserAgentKey = `${siteId}:${userAgentHash}`;
  const eventToken = nextEventToken(nowMs);
  const isInteraction = INTERACTION_EVENT_TYPES.has(input.eventType ?? "");

  // The cohort's time bucket lives in the key, so the Redis hash expires instead
  // of needing its own pruning. Skipped unless every dimension resolves —
  // a partial fingerprint would merge unrelated visitors into one cohort.
  //
  // The browser family is part of the key, not just the measured dimension.
  // Without it, one cohort pooled Chrome, Safari, Firefox and Edge version
  // numbers into a single distribution, which inflates the distinct-version
  // count and depresses the modal share — the exact two conditions this rule
  // convicts on. On a large site with a common screen and language that is a
  // false-positive path into a convicting rule, so the key must separate them.
  // Language is required for the same reason: an unset language would merge
  // every locale on the site into one cohort.
  const language = normalizeDimension(input.language);
  const { family: browserFamily, majorVersion: browserMajorVersion } = getBrowserIdentity(input.userAgent || "");
  const hasCohort =
    browserFamily !== "" &&
    browserMajorVersion !== "" &&
    language !== "" &&
    typeof input.screenWidth === "number" &&
    typeof input.screenHeight === "number" &&
    input.screenWidth > 0 &&
    input.screenHeight > 0;
  const cohortKey = `${siteId}:${input.screenWidth}x${input.screenHeight}:${language}:${browserFamily}`;
  const cohortBucket = Math.floor(nowMs / HOUR);
  const floodBucket = Math.floor(nowMs / TEN_MINUTES);
  const siteKey = String(siteId);

  // Enumeration shape is measured over the same cohort, on a much longer bucket:
  // a crawler paced at one hit per identity produces nothing legible in a
  // minute. It needs a path, since path novelty is the whole measurement.
  const hasEnumerationCohort = hasCohort && pathname !== "";
  const enumerationBucket = Math.floor(nowMs / ENUMERATION_BUCKET_MS);
  const isDirect = normalizeDimension(input.referrer) === "";
  const dayBucket = Math.floor(nowMs / DAY);

  const counters: CounterPlan[] = [
    {
      name: "tupleEvents10s",
      enabled: !isInteraction,
      redisKey: `bot:a:te10:${tupleKey}`,
      member: eventToken,
      windowMs: 10 * SECOND,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => tupleEvents10s.observe(tupleKey, now, 10 * SECOND),
    },
    {
      name: "tupleEvents60s",
      enabled: !isInteraction,
      redisKey: `bot:a:te60:${tupleKey}`,
      member: eventToken,
      windowMs: MINUTE,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => tupleEvents60s.observe(tupleKey, now, MINUTE),
    },
    {
      name: "tupleInteractionEvents10s",
      enabled: isInteraction,
      redisKey: `bot:a:ti10:${tupleKey}`,
      member: eventToken,
      windowMs: 10 * SECOND,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => tupleInteractionEvents10s.observe(tupleKey, now, 10 * SECOND),
    },
    {
      name: "tupleDistinctPaths60s",
      enabled: pathname !== "",
      redisKey: `bot:a:tdp:${tupleKey}`,
      member: pathname,
      windowMs: MINUTE,
      maxSize: MAX_DISTINCT_BUCKET_SIZE,
      observeLocal: now => tupleDistinctPaths60s.observe(tupleKey, pathname, now, MINUTE),
    },
    {
      name: "ipEvents60s",
      enabled: true,
      redisKey: `bot:a:ie60:${ipKey}`,
      member: eventToken,
      windowMs: MINUTE,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => ipEvents60s.observe(ipKey, now, MINUTE),
    },
    {
      name: "ipDistinctUserAgents5m",
      enabled: true,
      redisKey: `bot:a:idua:${ipKey}`,
      member: userAgentHash,
      windowMs: 5 * MINUTE,
      maxSize: MAX_DISTINCT_BUCKET_SIZE,
      observeLocal: now => ipDistinctUserAgents5m.observe(ipKey, userAgentHash, now, 5 * MINUTE),
    },
    {
      name: "ipDistinctHosts60s",
      enabled: hostname !== "",
      redisKey: `bot:a:idh:${ipKey}`,
      member: hostname,
      windowMs: MINUTE,
      maxSize: MAX_DISTINCT_BUCKET_SIZE,
      observeLocal: now => ipDistinctHosts60s.observe(ipKey, hostname, now, MINUTE),
    },
    {
      name: "siteUserAgentEvents60s",
      enabled: true,
      redisKey: `bot:a:sue:${siteUserAgentKey}`,
      member: eventToken,
      windowMs: MINUTE,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => siteUserAgentEvents60s.observe(siteUserAgentKey, now, MINUTE),
    },
    {
      name: "missingClientScore60s",
      enabled: !input.hasClientBotScore,
      redisKey: `bot:a:mcs:${tupleKey}`,
      member: eventToken,
      windowMs: MINUTE,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => missingClientScore60s.observe(tupleKey, now, MINUTE),
    },
    {
      name: "cohortEvents1h",
      enabled: hasCohort,
      kind: "distribution",
      redisKey: `bot:a:cbv:${cohortKey}:${cohortBucket}`,
      member: browserMajorVersion,
      windowMs: 2 * HOUR,
      maxSize: MAX_DISTRIBUTION_FIELDS,
      observeLocal: () => 0,
      topCounterName: "cohortTopVersionEvents1h",
      distinctCounterName: "cohortDistinctVersions1h",
      observeLocalDistribution: now =>
        cohortBrowserVersions1h.observe(cohortKey, browserMajorVersion, now, HOUR, MAX_DISTRIBUTION_FIELDS),
    },
    {
      name: "actorEvents1d",
      enabled: true,
      kind: "counter",
      redisKey: `bot:a:av:${ipKey}:${dayBucket}`,
      member: "",
      windowMs: DAY,
      maxSize: 0,
      observeLocal: now => actorEvents1d.observe(ipKey, now, DAY, MAX_LOCAL_COUNTER_KEYS),
    },
    // Site-flood counters, all on one fixed 10-minute bucket. The actor here is
    // the visitor tuple (ip + user agent), the identity a fleet mints per hit.
    {
      name: "siteEvents10m",
      enabled: true,
      kind: "counter",
      redisKey: `bot:f:se:${siteKey}:${floodBucket}`,
      member: "",
      windowMs: 2 * TEN_MINUTES,
      maxSize: 0,
      observeLocal: now => siteEvents10m.observe(siteKey, now, TEN_MINUTES, MAX_LOCAL_COUNTER_KEYS),
    },
    {
      name: "siteDistinctActors10m",
      enabled: true,
      kind: "cardinality",
      redisKey: `bot:f:sa:${siteKey}:${floodBucket}`,
      member: tupleKey,
      windowMs: 2 * TEN_MINUTES,
      maxSize: 0,
      observeLocal: now =>
        siteDistinctActors10m.observe(siteKey, tupleKey, now, TEN_MINUTES, MAX_LOCAL_DISTINCT_VALUES),
    },
    {
      name: "cohortEvents10m",
      enabled: hasCohort,
      kind: "counter",
      redisKey: `bot:f:ce:${cohortKey}:${floodBucket}`,
      member: "",
      windowMs: 2 * TEN_MINUTES,
      maxSize: 0,
      observeLocal: now => cohortEvents10m.observe(cohortKey, now, TEN_MINUTES, MAX_LOCAL_COUNTER_KEYS),
    },
    {
      name: "cohortDistinctActors10m",
      enabled: hasCohort,
      kind: "cardinality",
      redisKey: `bot:f:ca:${cohortKey}:${floodBucket}`,
      member: tupleKey,
      windowMs: 2 * TEN_MINUTES,
      maxSize: 0,
      observeLocal: now =>
        cohortDistinctActors10m.observe(cohortKey, tupleKey, now, TEN_MINUTES, MAX_LOCAL_DISTINCT_VALUES),
    },
    {
      name: "cohortDirectEvents10m",
      enabled: hasCohort && isDirect,
      kind: "counter",
      redisKey: `bot:f:cd:${cohortKey}:${floodBucket}`,
      member: "",
      windowMs: 2 * TEN_MINUTES,
      maxSize: 0,
      observeLocal: now => cohortDirectEvents10m.observe(cohortKey, now, TEN_MINUTES, MAX_LOCAL_COUNTER_KEYS),
    },
    {
      name: "enumerationEvents15m",
      enabled: hasEnumerationCohort,
      kind: "counter",
      redisKey: `bot:e:ev:${cohortKey}:${enumerationBucket}`,
      member: "",
      windowMs: ENUMERATION_BUCKET_MS,
      maxSize: 0,
      observeLocal: now => enumerationEvents15m.observe(cohortKey, now, ENUMERATION_BUCKET_MS, MAX_LOCAL_COUNTER_KEYS),
    },
    {
      // A sorted set cannot hold this: a crawler's cohort reaches tens of
      // thousands of distinct paths in a bucket, which is what HyperLogLog is
      // for. The count is approximate; every threshold reading it has margin.
      name: "enumerationDistinctPaths15m",
      enabled: hasEnumerationCohort,
      kind: "cardinality",
      redisKey: `bot:e:pa:${cohortKey}:${enumerationBucket}`,
      member: pathname,
      windowMs: ENUMERATION_BUCKET_MS,
      maxSize: 0,
      observeLocal: now =>
        enumerationDistinctPaths15m.observe(cohortKey, pathname, now, ENUMERATION_BUCKET_MS, MAX_LOCAL_DISTINCT_VALUES),
    },
    {
      name: "enumerationDistinctActors15m",
      enabled: hasEnumerationCohort,
      kind: "cardinality",
      redisKey: `bot:e:ac:${cohortKey}:${enumerationBucket}`,
      member: ipAddress,
      windowMs: ENUMERATION_BUCKET_MS,
      maxSize: 0,
      observeLocal: now =>
        enumerationDistinctActors15m.observe(
          cohortKey,
          ipAddress,
          now,
          ENUMERATION_BUCKET_MS,
          MAX_LOCAL_DISTINCT_VALUES
        ),
    },
    {
      name: "enumerationDirectEvents15m",
      enabled: hasEnumerationCohort && isDirect,
      kind: "counter",
      redisKey: `bot:e:di:${cohortKey}:${enumerationBucket}`,
      member: "",
      windowMs: ENUMERATION_BUCKET_MS,
      maxSize: 0,
      observeLocal: now =>
        enumerationDirectEvents15m.observe(cohortKey, now, ENUMERATION_BUCKET_MS, MAX_LOCAL_COUNTER_KEYS),
    },
  ];

  return {
    counters,
    enumeration: hasEnumerationCohort ? { cohortKey, bucket: enumerationBucket, isDirect } : null,
  };
}

function emptyCounters(): AnomalyCounters {
  return {
    tupleEvents10s: 0,
    tupleEvents60s: 0,
    tupleInteractionEvents10s: 0,
    tupleDistinctPaths60s: 0,
    ipEvents60s: 0,
    ipDistinctUserAgents5m: 0,
    ipDistinctHosts60s: 0,
    siteUserAgentEvents60s: 0,
    missingClientScore60s: 0,
    cohortEvents1h: 0,
    cohortTopVersionEvents1h: 0,
    cohortDistinctVersions1h: 0,
    actorEvents1d: 0,
    siteEvents10m: 0,
    siteDistinctActors10m: 0,
    cohortEvents10m: 0,
    cohortDistinctActors10m: 0,
    cohortDirectEvents10m: 0,
    enumerationEvents15m: 0,
    enumerationDistinctPaths15m: 0,
    enumerationDistinctActors15m: 0,
    enumerationDirectEvents15m: 0,
  };
}

async function observeViaRedis(plan: CounterPlan[], nowMs: number): Promise<AnomalyCounters> {
  const enabled = plan.filter(entry => entry.enabled);
  const specs: AnomalyCounterSpec[] = enabled.map(entry => ({
    key: entry.redisKey,
    kind: entry.kind,
    member: entry.member,
    windowMs: entry.windowMs,
    maxSize: entry.maxSize,
  }));

  const results = await anomalyObserve(nowMs, specs);

  const counters = emptyCounters();
  enabled.forEach((entry, index) => {
    const reading = results[index];
    counters[entry.name] = reading?.total ?? 0;
    if (entry.topCounterName) {
      counters[entry.topCounterName] = reading?.top ?? 0;
    }
    if (entry.distinctCounterName) {
      counters[entry.distinctCounterName] = reading?.distinct ?? 0;
    }
  });
  return counters;
}

function observeViaLocal(plan: CounterPlan[], nowMs: number): AnomalyCounters {
  maybeCleanup(nowMs);
  const counters = emptyCounters();
  for (const entry of plan) {
    if (!entry.enabled) continue;

    if (entry.observeLocalDistribution) {
      const reading = entry.observeLocalDistribution(nowMs);
      counters[entry.name] = reading.total;
      if (entry.topCounterName) {
        counters[entry.topCounterName] = reading.top;
      }
      if (entry.distinctCounterName) {
        counters[entry.distinctCounterName] = reading.distinct;
      }
      continue;
    }

    counters[entry.name] = entry.observeLocal(nowMs);
  }
  return counters;
}

interface AnomalyContext {
  siteBaseline: SiteBaseline | undefined;
  isHostingAsn: boolean;
  asn: number | undefined;
}

/**
 * Whether the site is currently in flood: its 10-minute volume is at least
 * FLOOD_MULTIPLE times its own padded weekly median and at least
 * FLOOD_MIN_EVENTS_10M. A site with no baseline, or one too young for its
 * baseline to mean anything, is never in flood.
 */
function isSiteInFlood(counters: AnomalyCounters, baseline: SiteBaseline | undefined): boolean {
  if (!baseline || !baseline.eligible) return false;
  const gate = Math.max(FLOOD_MULTIPLE * baseline.events10m, FLOOD_MIN_EVENTS_10M);
  return counters.siteEvents10m >= gate;
}

function computeAnomalyResult(counters: AnomalyCounters, context: AnomalyContext): AnomalyResult {
  // Convicting rules are keyed on (site, ip, ua) — they describe a single actor
  // and may convict on their own. The interaction-burst threshold is set beyond
  // human clicking speed (10/s sustained); ordinary widget bursts stay below it.
  const convictingReasons: AnomalyReason[] = [];
  addReason(convictingReasons, "tuple_events_10s", 4, counters.tupleEvents10s, 30, 10);
  addReason(convictingReasons, "tuple_events_60s", 4, counters.tupleEvents60s, 120, 60);
  addReason(convictingReasons, "tuple_interaction_events_10s", 4, counters.tupleInteractionEvents10s, 100, 10);
  addReason(convictingReasons, "tuple_distinct_paths_60s", 4, counters.tupleDistinctPaths60s, 25, 60);
  addReason(convictingReasons, "missing_client_score_60s", 1, counters.missingClientScore60s, 20, 60);

  // Cohort uniformity. Not a crowd rule: a crowd rule blames a visitor for a
  // dimension real people share (an IP, a popular browser), whereas this fires
  // only on a distribution no organic population produces — a busy fingerprint
  // spread evenly across many browser versions instead of peaked on the current
  // one. It convicts because the alternative is not convicting at all: a paced
  // distributed crawler leaves no per-identity evidence to corroborate.
  if (
    counters.cohortEvents1h >= COHORT_MIN_EVENTS_1H &&
    counters.cohortDistinctVersions1h >= COHORT_MIN_DISTINCT_VERSIONS &&
    counters.cohortTopVersionEvents1h < counters.cohortEvents1h * COHORT_MAX_MODAL_SHARE
  ) {
    convictingReasons.push({
      rule: "cohort_version_uniformity_1h",
      score: 4,
      value: Math.round((counters.cohortTopVersionEvents1h / counters.cohortEvents1h) * 100),
      threshold: COHORT_MAX_MODAL_SHARE * 100,
      windowSeconds: 3600,
    });
  }

  const sharedEgressGuard = counters.ipDistinctUserAgents5m <= PROXY_MERGE_MAX_USER_AGENTS;
  const saseExempt = context.asn !== undefined && SASE_EGRESS_ASNS.has(context.asn);

  // Site flood. See the constants' comment for the design; in short, the gate
  // is the site against its own baseline, and the conviction is a cohort or an
  // actor inside the flood showing a shape an organic surge does not.
  if (isSiteInFlood(counters, context.siteBaseline)) {
    const cohortEvents = counters.cohortEvents10m;
    if (
      cohortEvents >= FLOOD_COHORT_MIN_EVENTS_10M &&
      counters.cohortDistinctActors10m >= cohortEvents * FLOOD_COHORT_MIN_ACTOR_RATIO &&
      counters.cohortDirectEvents10m >= cohortEvents * FLOOD_COHORT_MIN_DIRECT_SHARE &&
      cohortEvents >= counters.siteEvents10m * FLOOD_COHORT_MIN_SITE_SHARE
    ) {
      convictingReasons.push({
        rule: "site_flood_oneshot_cohort_10m",
        score: 4,
        value: Math.round((counters.cohortDistinctActors10m / cohortEvents) * 100),
        threshold: FLOOD_COHORT_MIN_ACTOR_RATIO * 100,
        windowSeconds: 600,
      });
    }

    if (context.isHostingAsn && sharedEgressGuard && !saseExempt) {
      addReason(
        convictingReasons,
        "site_flood_actor_1d",
        4,
        counters.actorEvents1d,
        FLOOD_ACTOR_EVENTS_1D_HOSTING,
        86400
      );
    }
  }

  // Hosting-address volume convicts outside a flood too; see the constant.
  if (context.isHostingAsn && sharedEgressGuard && !saseExempt) {
    addReason(
      convictingReasons,
      "hosting_actor_events_1d",
      4,
      counters.actorEvents1d,
      HOSTING_ACTOR_EVENTS_1D_THRESHOLD,
      86400
    );
  }

  // Supporting rules are keyed on shared dimensions (ip, site+ua) that many real
  // visitors legitimately share — one busy CGNAT IP or a popular browser on a
  // busy site exceeds them with zero per-visitor evidence. Like generic hosting
  // ASNs in the layer above, they corroborate but never convict.
  const supportingReasons: AnomalyReason[] = [];
  addReason(supportingReasons, "ip_events_60s", 3, counters.ipEvents60s, 200, 60);
  addReason(supportingReasons, "ip_distinct_user_agents_5m", 3, counters.ipDistinctUserAgents5m, 10, 300);
  addReason(supportingReasons, "ip_distinct_hosts_60s", 2, counters.ipDistinctHosts60s, 6, 60);
  addReason(supportingReasons, "site_user_agent_events_60s", 1, counters.siteUserAgentEvents60s, 300, 60);

  // Long-window volume, skipped entirely for an actor showing many user agents.
  // That is the signature of shared egress — a corporate SASE or VPN gateway,
  // where one address is hundreds of real people and a four-figure daily count
  // is unremarkable. A single scraper presents one user agent, so the guard
  // costs nothing against the traffic this rule exists for.
  if (sharedEgressGuard) {
    addReason(
      supportingReasons,
      "actor_events_1d",
      ACTOR_EVENTS_1D_SCORE,
      counters.actorEvents1d,
      ACTOR_EVENTS_1D_THRESHOLD,
      86400
    );
  }

  // The invariant, stated once: supporting evidence is only ever added to a
  // score that convicting evidence has already opened. With the two lists
  // separate this cannot be broken by retuning a threshold — only by editing
  // this line, which is the point.
  const convictingScore = convictingReasons.reduce((total, reason) => total + reason.score, 0);
  const supportingScore = supportingReasons.reduce((total, reason) => total + reason.score, 0);
  const score = convictingReasons.length === 0 ? 0 : convictingScore + supportingScore;

  return {
    isAnomalous: score >= ANOMALY_SCORE_THRESHOLD,
    score,
    convictingReasons,
    supportingReasons,
    reasons: [...convictingReasons, ...supportingReasons],
    counters,
  };
}

export async function observeTrackingAnomaly(input: AnomalyInput): Promise<AnomalyResult> {
  const nowMs = input.nowMs ?? Date.now();
  const plan = buildCounterPlan(input, nowMs);

  let counters: AnomalyCounters;
  let usedLocalCounters = !redisAnomalyEnabled;
  if (redisAnomalyEnabled) {
    try {
      counters = await observeViaRedis(plan.counters, nowMs);
    } catch (error) {
      usedLocalCounters = true;
      // A Redis blip must never break ingestion. Fall back to the in-process
      // counters — accuracy degrades under clustering, but detection keeps working
      // and recovers automatically once Redis is back.
      logger.error({ err: error }, "Redis anomaly counters failed; using in-process fallback");
      counters = observeViaLocal(plan.counters, nowMs);
    }
  } else {
    counters = observeViaLocal(plan.counters, nowMs);
  }

  const result = computeAnomalyResult(counters, {
    siteBaseline: input.siteBaseline === undefined ? getSiteBaseline(input.siteId) : (input.siteBaseline ?? undefined),
    isHostingAsn: input.isHostingAsn === true,
    asn: input.asn,
  });

  // Only a direct hit can read a meaningful direct share, since only a direct
  // hit incremented that counter. The observation is attached to the result and
  // deliberately goes no further — it is evidence being gathered, not a verdict.
  if (plan.enumeration?.isDirect) {
    const enumeration = await observeEnumeration(
      plan.enumeration.cohortKey,
      plan.enumeration.bucket,
      {
        events: counters.enumerationEvents15m,
        distinctPaths: counters.enumerationDistinctPaths15m,
        distinctActors: counters.enumerationDistinctActors15m,
        directEvents: counters.enumerationDirectEvents15m,
      },
      // Follow the counters' own backend: reaching for Redis to mark a streak
      // while the counters are in-process would pay a connection timeout per
      // qualifying bucket during exactly the outage the fallback exists for.
      usedLocalCounters
    );

    if (enumeration) {
      result.enumeration = enumeration;
    }
  }

  return result;
}

export function resetAnomalyScorerForTests() {
  tupleEvents10s.clear();
  tupleEvents60s.clear();
  tupleInteractionEvents10s.clear();
  ipEvents60s.clear();
  siteUserAgentEvents60s.clear();
  missingClientScore60s.clear();
  tupleDistinctPaths60s.clear();
  ipDistinctUserAgents5m.clear();
  ipDistinctHosts60s.clear();
  cohortBrowserVersions1h.clear();
  actorEvents1d.clear();
  siteEvents10m.clear();
  cohortEvents10m.clear();
  cohortDirectEvents10m.clear();
  siteDistinctActors10m.clear();
  cohortDistinctActors10m.clear();
  enumerationEvents15m.clear();
  enumerationDirectEvents15m.clear();
  enumerationDistinctPaths15m.clear();
  enumerationDistinctActors15m.clear();
  resetEnumerationObserverForTests();
  lastCleanupMs = 0;
  eventSeq = 0;
}

/** Force the counter backend in tests (Redis vs. in-process fallback). */
export function setRedisAnomalyEnabledForTests(enabled: boolean) {
  redisAnomalyEnabled = enabled;
}
