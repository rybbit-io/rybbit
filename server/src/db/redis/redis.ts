import { Redis } from "ioredis";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("redis");

// Fail fast so callers can fall back rather than hanging during an outage.
const REDIS_COMMAND_TIMEOUT_MS = 1000;

// A request/response Redis client shared across the process. Distinct from the
// BullMQ connections used by the uptime service (those have their own settings).
export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 200, 5000),
});

redis.on("error", (error: Error) => logger.error(error, "Redis client error"));
redis.on("connect", () => logger.info("Redis connected"));

// Atomic get-or-create with a sliding TTL. If the key exists we refresh its TTL
// and return the stored id; otherwise we store the candidate and return it. Run
// as a single Lua script so concurrent workers can never create duplicate
// sessions for the same (siteId, userId). defineCommand uses EVALSHA with an
// EVAL fallback, so the script body is only sent over the wire once.
redis.defineCommand("sessionGetOrCreate", {
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
  return (redis as SessionRedis).sessionGetOrCreate(key, candidateId, ttlMs);
}
