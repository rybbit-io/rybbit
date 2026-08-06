import { anomalyObserve, type AnomalyCounterSpec } from "../../../db/redis/redis.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const ANOMALY_SCORE_THRESHOLD = 4;
const CLEANUP_INTERVAL_MS = 60 * SECOND;
const MAX_COUNTER_BUCKET_SIZE = 512;
const MAX_DISTINCT_BUCKET_SIZE = 512;
const MAX_DISTRIBUTION_FIELDS = 128;

/**
 * Cohort-uniformity rule. A cohort is one exact device fingerprint on a site —
 * (screen, language, browser) — and the rule measures how its traffic is spread
 * across browser major versions inside a fixed one-minute bucket.
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
 */
const COHORT_MIN_EVENTS_60S = 300;
const COHORT_MIN_DISTINCT_VERSIONS = 8;
const COHORT_MAX_MODAL_SHARE = 0.25;

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
  cohortEvents60s: number;
  cohortTopVersionEvents60s: number;
  cohortDistinctVersions60s: number;
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
  siteId: string;
  ipAddress: string;
  userAgent: string;
  hostname?: string;
  pathname?: string;
  eventType?: string;
  hasClientBotScore: boolean;
  /** Cohort dimensions; the cohort rule is skipped unless all three resolve. */
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  nowMs?: number;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  score: number;
  reasons: AnomalyReason[];
  counters: AnomalyCounters;
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

const cohortBrowserVersions60s = new BucketedDistributionCounter();

let lastCleanupMs = 0;

/**
 * Major version of the reported browser engine, used as the cohort rule's
 * distribution dimension. A deliberately loose parse: the rule only cares that
 * rotating user agents map to different values and stable ones map to the same
 * value, so any token that moves with the browser release works.
 */
function getBrowserMajorVersion(userAgent: string): string {
  const match =
    /(?:Edg|EdgA|EdgiOS|OPR|SamsungBrowser|Firefox|FxiOS|CriOS|Chrome)\/(\d{1,4})/.exec(userAgent) ??
    /Version\/(\d{1,4})/.exec(userAgent);
  return match ? match[1] : "";
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
  cohortBrowserVersions60s.cleanup(nowMs, MINUTE);
}

// A single counter described once for both backends: its Redis key/member and an
// equivalent in-process observation. `enabled` is false for the conditional
// counters (no path/host, or a client score was supplied), which contribute 0.
interface CounterPlan {
  name: keyof AnomalyCounters;
  enabled: boolean;
  kind?: "rolling" | "distribution";
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

function buildCounterPlan(input: AnomalyInput, nowMs: number): CounterPlan[] {
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
  const browserMajorVersion = getBrowserMajorVersion(input.userAgent || "");
  const hasCohort =
    browserMajorVersion !== "" &&
    typeof input.screenWidth === "number" &&
    typeof input.screenHeight === "number" &&
    input.screenWidth > 0 &&
    input.screenHeight > 0;
  const cohortKey = `${siteId}:${input.screenWidth}x${input.screenHeight}:${normalizeDimension(input.language)}`;
  const cohortBucket = Math.floor(nowMs / MINUTE);

  return [
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
      name: "cohortEvents60s",
      enabled: hasCohort,
      kind: "distribution",
      redisKey: `bot:a:cbv:${cohortKey}:${cohortBucket}`,
      member: browserMajorVersion,
      windowMs: 2 * MINUTE,
      maxSize: MAX_DISTRIBUTION_FIELDS,
      observeLocal: () => 0,
      topCounterName: "cohortTopVersionEvents60s",
      distinctCounterName: "cohortDistinctVersions60s",
      observeLocalDistribution: now =>
        cohortBrowserVersions60s.observe(cohortKey, browserMajorVersion, now, MINUTE, MAX_DISTRIBUTION_FIELDS),
    },
  ];
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
    cohortEvents60s: 0,
    cohortTopVersionEvents60s: 0,
    cohortDistinctVersions60s: 0,
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

function computeAnomalyResult(counters: AnomalyCounters): AnomalyResult {
  // Individual rules are keyed on (site, ip, ua) — they describe a single actor
  // and may convict on their own. The interaction-burst threshold is set beyond
  // human clicking speed (10/s sustained); ordinary widget bursts stay below it.
  const individualReasons: AnomalyReason[] = [];
  addReason(individualReasons, "tuple_events_10s", 4, counters.tupleEvents10s, 30, 10);
  addReason(individualReasons, "tuple_events_60s", 4, counters.tupleEvents60s, 120, 60);
  addReason(individualReasons, "tuple_interaction_events_10s", 4, counters.tupleInteractionEvents10s, 100, 10);
  addReason(individualReasons, "tuple_distinct_paths_60s", 4, counters.tupleDistinctPaths60s, 25, 60);
  addReason(individualReasons, "missing_client_score_60s", 1, counters.missingClientScore60s, 20, 60);

  // Cohort uniformity. Not a crowd rule: a crowd rule blames a visitor for a
  // dimension real people share (an IP, a popular browser), whereas this fires
  // only on a distribution no organic population produces — a busy fingerprint
  // spread evenly across many browser versions instead of peaked on the current
  // one. It convicts because the alternative is not convicting at all: a paced
  // distributed crawler leaves no per-identity evidence to corroborate.
  if (
    counters.cohortEvents60s >= COHORT_MIN_EVENTS_60S &&
    counters.cohortDistinctVersions60s >= COHORT_MIN_DISTINCT_VERSIONS &&
    counters.cohortTopVersionEvents60s < counters.cohortEvents60s * COHORT_MAX_MODAL_SHARE
  ) {
    individualReasons.push({
      rule: "cohort_version_uniformity_60s",
      score: 4,
      value: Math.round((counters.cohortTopVersionEvents60s / counters.cohortEvents60s) * 100),
      threshold: COHORT_MAX_MODAL_SHARE * 100,
      windowSeconds: 60,
    });
  }

  // Crowd rules are keyed on shared dimensions (ip, site+ua) that many real
  // visitors legitimately share — one busy CGNAT IP or a popular browser on a
  // busy site exceeds them with zero per-visitor evidence. Like generic hosting
  // ASNs in the layer above, they corroborate but never convict: their scores
  // count only when at least one individual rule also fired.
  const crowdReasons: AnomalyReason[] = [];
  addReason(crowdReasons, "ip_events_60s", 3, counters.ipEvents60s, 200, 60);
  addReason(crowdReasons, "ip_distinct_user_agents_5m", 3, counters.ipDistinctUserAgents5m, 10, 300);
  addReason(crowdReasons, "ip_distinct_hosts_60s", 2, counters.ipDistinctHosts60s, 6, 60);
  addReason(crowdReasons, "site_user_agent_events_60s", 1, counters.siteUserAgentEvents60s, 300, 60);

  const individualScore = individualReasons.reduce((total, reason) => total + reason.score, 0);
  const crowdScore = crowdReasons.reduce((total, reason) => total + reason.score, 0);
  const score = individualScore + (individualReasons.length > 0 ? crowdScore : 0);

  return {
    isAnomalous: score >= ANOMALY_SCORE_THRESHOLD,
    score,
    reasons: [...individualReasons, ...crowdReasons],
    counters,
  };
}

export async function observeTrackingAnomaly(input: AnomalyInput): Promise<AnomalyResult> {
  const nowMs = input.nowMs ?? Date.now();
  const plan = buildCounterPlan(input, nowMs);

  let counters: AnomalyCounters;
  if (redisAnomalyEnabled) {
    try {
      counters = await observeViaRedis(plan, nowMs);
    } catch (error) {
      // A Redis blip must never break ingestion. Fall back to the in-process
      // counters — accuracy degrades under clustering, but detection keeps working
      // and recovers automatically once Redis is back.
      logger.error({ err: error }, "Redis anomaly counters failed; using in-process fallback");
      counters = observeViaLocal(plan, nowMs);
    }
  } else {
    counters = observeViaLocal(plan, nowMs);
  }

  return computeAnomalyResult(counters);
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
  cohortBrowserVersions60s.clear();
  lastCleanupMs = 0;
  eventSeq = 0;
}

/** Force the counter backend in tests (Redis vs. in-process fallback). */
export function setRedisAnomalyEnabledForTests(enabled: boolean) {
  redisAnomalyEnabled = enabled;
}
