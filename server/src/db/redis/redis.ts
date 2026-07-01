import { Redis } from "ioredis";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("redis");

// Fail fast so callers can fall back rather than hanging during an outage.
const REDIS_COMMAND_TIMEOUT_MS = 1000;

// ioredis pipelines commands over a single connection, so a slow command holds
// up everything queued behind it (head-of-line blocking). Build each hot-path
// concern its own connection so, for example, session resolution never waits on
// the heavier multi-key anomaly Lua script that runs on the same event.
function createRedisClient(label: string): Redis {
  const client = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
    commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  });

  // ioredis emits an error on every failed reconnect attempt, which floods the
  // logs while Redis is unreachable (e.g. local dev without Redis). Log only
  // when the error changes; a successful connect re-arms logging so the next
  // outage is still reported.
  let lastLoggedError: string | undefined;
  client.on("error", (error: Error) => {
    const signature = `${(error as NodeJS.ErrnoException).code ?? ""}:${error.message}`;
    if (signature === lastLoggedError) return;
    lastLoggedError = signature;
    logger.error(error, `Redis client error (${label}); suppressing repeats`);
  });
  client.on("connect", () => {
    lastLoggedError = undefined;
    logger.info(`Redis connected (${label})`);
  });

  return client;
}

// Shared request/response client for bot detection (anomaly scoring + stats) and
// general use. Distinct from the BullMQ connections used by the uptime service
// (those have their own settings).
export const redis = createRedisClient("main");

// Dedicated connection for per-event session resolution. Isolated from `redis`
// so a session GET/SET is never head-of-line blocked behind the anomaly scorer's
// Lua call — that blocking timed sessions out, and a timed-out session forced the
// fallback path, which used to fracture one visitor into multiple sessions.
export const sessionRedis = createRedisClient("session");

// Atomic get-or-create with a sliding TTL. If the key exists we refresh its TTL
// and return the stored id; otherwise we store the candidate and return it. Run
// as a single Lua script so concurrent workers can never create duplicate
// sessions for the same (siteId, userId). defineCommand uses EVALSHA with an
// EVAL fallback, so the script body is only sent over the wire once.
sessionRedis.defineCommand("sessionGetOrCreate", {
  numberOfKeys: 1,
  lua: `
    local existing = redis.call('GET', KEYS[1])
    if existing then
      redis.call('PEXPIRE', KEYS[1], ARGV[2])
      return existing
    end
    redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
    return ARGV[1]
  `,
});

interface SessionRedis extends Redis {
  sessionGetOrCreate(key: string, candidateId: string, ttlMs: number): Promise<string>;
}

/**
 * Return the session id for `key`, creating it from `candidateId` if absent, and
 * (re)setting its TTL to `ttlMs`. Atomic across all workers.
 */
export function sessionGetOrCreate(key: string, candidateId: string, ttlMs: number): Promise<string> {
  return (sessionRedis as SessionRedis).sessionGetOrCreate(key, candidateId, ttlMs);
}

// Rolling-window counters for the bot anomaly scorer. Each counter is a sorted
// set: member -> observation, score -> time (ms). For event-rate counters the
// member is a unique per-event token (so cardinality == event count); for
// distinct counters the member is the observed value (so cardinality == distinct
// count, and re-observing refreshes its score). For every counter we add the
// observation, drop anything older than its window, cap the set size, refresh the
// key TTL, and read back the cardinality.
//
// All of a request's counters run in one Lua call so anomaly scoring costs a
// single round-trip, and because the state lives in Redis every worker/replica
// shares one view — an in-process Map would only ever see 1/N of the traffic
// behind a load balancer, diluting the thresholds by the worker count.
//
// numberOfKeys is omitted so the key count can be passed per call. KEYS holds the
// counter keys; ARGV is [nowMs, member1, windowMs1, maxSize1, member2, ...] with
// one (member, windowMs, maxSize) triple per key. Returns one count per key.
redis.defineCommand("anomalyObserve", {
  lua: `
    local now = tonumber(ARGV[1])
    local results = {}
    for i = 1, #KEYS do
      local key = KEYS[i]
      local base = (i - 1) * 3 + 1
      local member = ARGV[base + 1]
      local windowMs = tonumber(ARGV[base + 2])
      local maxSize = tonumber(ARGV[base + 3])
      redis.call('ZADD', key, now, member)
      redis.call('ZREMRANGEBYSCORE', key, '-inf', '(' .. (now - windowMs))
      if maxSize > 0 then
        redis.call('ZREMRANGEBYRANK', key, 0, -maxSize - 1)
      end
      redis.call('PEXPIRE', key, windowMs)
      results[i] = redis.call('ZCARD', key)
    end
    return results
  `,
});

export interface AnomalyCounterSpec {
  /** Fully-namespaced Redis key for this counter. */
  key: string;
  /** Unique per-event token (rate counters) or observed value (distinct counters). */
  member: string;
  windowMs: number;
  /** Hard cap on stored members; 0 disables trimming. */
  maxSize: number;
}

interface AnomalyRedis extends Redis {
  anomalyObserve(...args: (string | number)[]): Promise<number[]>;
}

/**
 * Observe one event against a batch of rolling-window counters and return each
 * counter's current cardinality, in the same order as `specs`. Atomic across all
 * workers; a single round-trip regardless of how many counters are passed.
 */
export function anomalyObserve(nowMs: number, specs: AnomalyCounterSpec[]): Promise<number[]> {
  const keys = specs.map(spec => spec.key);
  const args: (string | number)[] = [specs.length, ...keys, nowMs];
  for (const spec of specs) {
    args.push(spec.member, spec.windowMs, spec.maxSize);
  }
  return (redis as AnomalyRedis).anomalyObserve(...args);
}
