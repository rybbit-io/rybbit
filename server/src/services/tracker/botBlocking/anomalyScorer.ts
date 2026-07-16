import { anomalyObserve, type AnomalyCounterSpec } from "../../../db/redis/redis.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const ANOMALY_SCORE_THRESHOLD = 4;
const CLEANUP_INTERVAL_MS = 60 * SECOND;
const MAX_COUNTER_BUCKET_SIZE = 512;
const MAX_DISTINCT_BUCKET_SIZE = 512;

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
  tupleDistinctPaths60s: number;
  ipEvents60s: number;
  ipDistinctUserAgents5m: number;
  ipDistinctHosts60s: number;
  siteUserAgentEvents60s: number;
  missingClientScore60s: number;
}

export interface AnomalyInput {
  siteId: string;
  ipAddress: string;
  userAgent: string;
  hostname?: string;
  pathname?: string;
  eventType?: string;
  hasClientBotScore: boolean;
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

const tupleEvents10s = new RollingCounter();
const tupleEvents60s = new RollingCounter();
const ipEvents60s = new RollingCounter();
const siteUserAgentEvents60s = new RollingCounter();
const missingClientScore60s = new RollingCounter();

const tupleDistinctPaths60s = new RollingDistinctCounter();
const ipDistinctUserAgents5m = new RollingDistinctCounter();
const ipDistinctHosts60s = new RollingDistinctCounter();

let lastCleanupMs = 0;

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
  ipEvents60s.cleanup(nowMs, MINUTE);
  siteUserAgentEvents60s.cleanup(nowMs, MINUTE);
  missingClientScore60s.cleanup(nowMs, MINUTE);
  tupleDistinctPaths60s.cleanup(nowMs, MINUTE);
  ipDistinctUserAgents5m.cleanup(nowMs, 5 * MINUTE);
  ipDistinctHosts60s.cleanup(nowMs, MINUTE);
}

// A single counter described once for both backends: its Redis key/member and an
// equivalent in-process observation. `enabled` is false for the conditional
// counters (no path/host, or a client score was supplied), which contribute 0.
interface CounterPlan {
  name: keyof AnomalyCounters;
  enabled: boolean;
  redisKey: string;
  member: string;
  windowMs: number;
  maxSize: number;
  observeLocal: (nowMs: number) => number;
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

  return [
    {
      name: "tupleEvents10s",
      enabled: true,
      redisKey: `bot:a:te10:${tupleKey}`,
      member: eventToken,
      windowMs: 10 * SECOND,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => tupleEvents10s.observe(tupleKey, now, 10 * SECOND),
    },
    {
      name: "tupleEvents60s",
      enabled: true,
      redisKey: `bot:a:te60:${tupleKey}`,
      member: eventToken,
      windowMs: MINUTE,
      maxSize: MAX_COUNTER_BUCKET_SIZE,
      observeLocal: now => tupleEvents60s.observe(tupleKey, now, MINUTE),
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
  ];
}

function emptyCounters(): AnomalyCounters {
  return {
    tupleEvents10s: 0,
    tupleEvents60s: 0,
    tupleDistinctPaths60s: 0,
    ipEvents60s: 0,
    ipDistinctUserAgents5m: 0,
    ipDistinctHosts60s: 0,
    siteUserAgentEvents60s: 0,
    missingClientScore60s: 0,
  };
}

async function observeViaRedis(plan: CounterPlan[], nowMs: number): Promise<AnomalyCounters> {
  const enabled = plan.filter(entry => entry.enabled);
  const specs: AnomalyCounterSpec[] = enabled.map(entry => ({
    key: entry.redisKey,
    member: entry.member,
    windowMs: entry.windowMs,
    maxSize: entry.maxSize,
  }));

  const results = await anomalyObserve(nowMs, specs);

  const counters = emptyCounters();
  enabled.forEach((entry, index) => {
    counters[entry.name] = results[index] ?? 0;
  });
  return counters;
}

function observeViaLocal(plan: CounterPlan[], nowMs: number): AnomalyCounters {
  maybeCleanup(nowMs);
  const counters = emptyCounters();
  for (const entry of plan) {
    if (entry.enabled) {
      counters[entry.name] = entry.observeLocal(nowMs);
    }
  }
  return counters;
}

function computeAnomalyResult(counters: AnomalyCounters): AnomalyResult {
  const reasons: AnomalyReason[] = [];
  addReason(reasons, "tuple_events_10s", 4, counters.tupleEvents10s, 30, 10);
  addReason(reasons, "tuple_events_60s", 4, counters.tupleEvents60s, 120, 60);
  addReason(reasons, "tuple_distinct_paths_60s", 4, counters.tupleDistinctPaths60s, 25, 60);
  addReason(reasons, "ip_events_60s", 3, counters.ipEvents60s, 200, 60);
  addReason(reasons, "ip_distinct_user_agents_5m", 3, counters.ipDistinctUserAgents5m, 10, 300);
  addReason(reasons, "ip_distinct_hosts_60s", 2, counters.ipDistinctHosts60s, 6, 60);
  addReason(reasons, "site_user_agent_events_60s", 1, counters.siteUserAgentEvents60s, 300, 60);
  addReason(reasons, "missing_client_score_60s", 1, counters.missingClientScore60s, 20, 60);

  const score = reasons.reduce((total, reason) => total + reason.score, 0);

  return {
    isAnomalous: score >= ANOMALY_SCORE_THRESHOLD,
    score,
    reasons,
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
      logger.error(error as Error, "Redis anomaly counters failed; using in-process fallback");
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
  ipEvents60s.clear();
  siteUserAgentEvents60s.clear();
  missingClientScore60s.clear();
  tupleDistinctPaths60s.clear();
  ipDistinctUserAgents5m.clear();
  ipDistinctHosts60s.clear();
  lastCleanupMs = 0;
  eventSeq = 0;
}

/** Force the counter backend in tests (Redis vs. in-process fallback). */
export function setRedisAnomalyEnabledForTests(enabled: boolean) {
  redisAnomalyEnabled = enabled;
}
