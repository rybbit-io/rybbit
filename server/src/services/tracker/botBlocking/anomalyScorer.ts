import { createHash } from "crypto";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const ANOMALY_SCORE_THRESHOLD = 4;
const CLEANUP_INTERVAL_MS = 60 * SECOND;

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

function pruneTimestamps(bucket: number[], nowMs: number, windowMs: number): number {
  const oldestAllowed = nowMs - windowMs;
  let removeCount = 0;
  while (removeCount < bucket.length && bucket[removeCount] < oldestAllowed) {
    removeCount++;
  }
  if (removeCount > 0) {
    bucket.splice(0, removeCount);
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
  return bucket.size;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 16);
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

export function observeTrackingAnomaly(input: AnomalyInput): AnomalyResult {
  const nowMs = input.nowMs ?? Date.now();
  maybeCleanup(nowMs);

  const siteId = input.siteId;
  const ipAddress = normalizeDimension(input.ipAddress);
  const userAgentHash = hashValue(input.userAgent || "");
  const hostname = normalizeDimension(input.hostname);
  const pathname = normalizeDimension(input.pathname);

  const tupleKey = `${siteId}:${ipAddress}:${userAgentHash}`;
  const ipKey = `${siteId}:${ipAddress}`;
  const siteUserAgentKey = `${siteId}:${userAgentHash}`;

  const counters: AnomalyCounters = {
    tupleEvents10s: tupleEvents10s.observe(tupleKey, nowMs, 10 * SECOND),
    tupleEvents60s: tupleEvents60s.observe(tupleKey, nowMs, MINUTE),
    tupleDistinctPaths60s: pathname ? tupleDistinctPaths60s.observe(tupleKey, pathname, nowMs, MINUTE) : 0,
    ipEvents60s: ipEvents60s.observe(ipKey, nowMs, MINUTE),
    ipDistinctUserAgents5m: ipDistinctUserAgents5m.observe(ipKey, userAgentHash, nowMs, 5 * MINUTE),
    ipDistinctHosts60s: hostname ? ipDistinctHosts60s.observe(ipKey, hostname, nowMs, MINUTE) : 0,
    siteUserAgentEvents60s: siteUserAgentEvents60s.observe(siteUserAgentKey, nowMs, MINUTE),
    missingClientScore60s: input.hasClientBotScore ? 0 : missingClientScore60s.observe(tupleKey, nowMs, MINUTE),
  };

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
}
