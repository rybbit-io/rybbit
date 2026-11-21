import { apiRateLimitConsume, apiRateLimitRedis } from "../db/redis/redis.js";
import {
  API_BURST_LIMIT,
  API_BURST_WINDOW_MS,
  API_RATE_LIMIT_OBSERVE_ONLY,
  IS_CLOUD,
  PRO_API_DAILY_LIMIT,
  STANDARD_API_DAILY_LIMIT,
} from "./const.js";
import { createServiceLogger } from "./logger/logger.js";

const logger = createServiceLogger("api-rate-limit");

const MS_PER_DAY = 86_400_000;
const BURST_REFILL_PER_SECOND = API_BURST_LIMIT / (API_BURST_WINDOW_MS / 1000);
// Long enough that the counter survives clock skew around the rollover, short
// enough that yesterday's keys are gone well before they matter.
const DAILY_TTL_SECONDS = 90_000;

export type RateLimitScope = "burst" | "daily";

export interface RateLimitDecision {
  /** Whether the request may proceed. Always true in observe-only mode. */
  allowed: boolean;
  /** True when observe-only mode admitted a request the limits would have denied. */
  wouldHaveDenied: boolean;
  /** Which tier bound the request; null when it was within both. */
  scope: RateLimitScope | null;
  burstLimit: number;
  burstRemaining: number;
  /** Seconds until the burst bucket is full again. */
  burstResetSeconds: number;
  /** 0 when the daily tier is unlimited (self-hosted). */
  dailyLimit: number;
  dailyRemaining: number;
  /** Seconds until the next UTC midnight. */
  dailyResetSeconds: number;
  /** Seconds until the binding tier admits another request. 0 when allowed. */
  retryAfterSeconds: number;
}

/**
 * The daily quota for a plan. Mirrors `apiKeyLimitForPlan`'s plan matching so
 * the two limits can never disagree about what counts as Pro. Self-hosted is
 * unlimited (0), as it has no plans and no shared infrastructure to protect.
 */
export function dailyLimitForPlan(planName: string | null | undefined): number {
  if (!IS_CLOUD) {
    return 0;
  }
  const plan = planName || "free";
  return plan.includes("pro") || plan === "custom" ? PRO_API_DAILY_LIMIT : STANDARD_API_DAILY_LIMIT;
}

/** UTC day number. Part of the daily key, so the quota resets by key rollover. */
function utcDay(now: number): number {
  return Math.floor(now / MS_PER_DAY);
}

/**
 * Today's request count for an owner, without charging one. Returns null when
 * the counter can't be read, so callers can say "unavailable" rather than
 * showing a confident zero.
 */
export async function peekDailyUsage(ownerId: string): Promise<number | null> {
  const now = Date.now();
  if (breakerIsOpen(now)) {
    return null;
  }
  try {
    const used = await apiRateLimitRedis.get(`rl:day:${ownerId}:${utcDay(now)}`);
    return used === null ? 0 : Number(used);
  } catch {
    return null;
  }
}

/** Seconds until the daily quota resets, for callers reporting usage. */
export function dailyQuotaResetSeconds(): number {
  return secondsUntilUtcMidnight(Date.now());
}

function secondsUntilUtcMidnight(now: number): number {
  return Math.ceil(((utcDay(now) + 1) * MS_PER_DAY - now) / 1000);
}

/**
 * Per-instance fallback used only while Redis is unreachable. It sees one
 * instance's share of traffic, so N instances allow up to N times the limits —
 * a deliberate trade: degraded accounting never blocks a legitimate request,
 * and the burst ceiling still holds per instance, which is the tier that
 * protects the database.
 */
interface FallbackState {
  tokens: number;
  ts: number;
  day: number;
  dailyUsed: number;
}

const fallbackState = new Map<string, FallbackState>();
const FALLBACK_MAX_OWNERS = 10_000;

// Redis commands time out after a second. Paying that on every request for the
// length of an outage would add a second of latency to the whole API, so a run
// of failures parks the limiter on the in-process path and it retries only
// occasionally.
const BREAKER_FAILURE_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 10_000;
let consecutiveFailures = 0;
let breakerOpenUntil = 0;

function breakerIsOpen(now: number): boolean {
  return now < breakerOpenUntil;
}

function recordRedisFailure(now: number): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
    breakerOpenUntil = now + BREAKER_COOLDOWN_MS;
  }
}

function recordRedisSuccess(): void {
  consecutiveFailures = 0;
  breakerOpenUntil = 0;
}

function pruneFallbackState(now: number): void {
  if (fallbackState.size <= FALLBACK_MAX_OWNERS) {
    return;
  }
  const today = utcDay(now);
  for (const [owner, state] of fallbackState) {
    // A full bucket carries no information, so an idle owner can be dropped.
    if (state.day !== today || (state.tokens >= API_BURST_LIMIT && now - state.ts > API_BURST_WINDOW_MS)) {
      fallbackState.delete(owner);
    }
  }
  // If that freed nothing, evict least-recently-seen owners instead of clearing
  // the map: wiping every counter at once would hand a full budget back to
  // everybody, turning the memory bound into a way around the limiter.
  if (fallbackState.size > FALLBACK_MAX_OWNERS) {
    const byAge = [...fallbackState.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (const [owner] of byAge.slice(0, fallbackState.size - FALLBACK_MAX_OWNERS)) {
      fallbackState.delete(owner);
    }
  }
}

function consumeInProcess(ownerId: string, dailyLimit: number, now: number): RateLimitDecision {
  pruneFallbackState(now);
  const today = utcDay(now);
  const state = fallbackState.get(ownerId);
  const bucket: FallbackState =
    !state || state.day !== today
      ? { tokens: API_BURST_LIMIT, ts: now, day: today, dailyUsed: 0 }
      : {
          ...state,
          tokens: Math.min(API_BURST_LIMIT, state.tokens + ((now - state.ts) / 1000) * BURST_REFILL_PER_SECOND),
          ts: now,
        };

  const dailyExceeded = dailyLimit > 0 && bucket.dailyUsed >= dailyLimit;
  const burstExceeded = bucket.tokens < 1;
  const allowed = !dailyExceeded && !burstExceeded;

  if (allowed || API_RATE_LIMIT_OBSERVE_ONLY) {
    if (!burstExceeded) {
      bucket.tokens -= 1;
    }
    bucket.dailyUsed += 1;
  }
  fallbackState.set(ownerId, bucket);

  return buildDecision({
    allowed,
    scope: dailyExceeded ? 2 : burstExceeded ? 1 : 0,
    burstRemaining: Math.floor(Math.max(bucket.tokens, 0)),
    dailyRemaining: dailyLimit > 0 ? Math.max(dailyLimit - bucket.dailyUsed, 0) : -1,
    retryAfterMs: burstExceeded ? Math.ceil(((1 - bucket.tokens) / BURST_REFILL_PER_SECOND) * 1000) : 0,
    dailyLimit,
    now,
  });
}

function buildDecision(input: {
  allowed: boolean;
  scope: number;
  burstRemaining: number;
  dailyRemaining: number;
  retryAfterMs: number;
  dailyLimit: number;
  now: number;
}): RateLimitDecision {
  const scope: RateLimitScope | null = input.scope === 2 ? "daily" : input.scope === 1 ? "burst" : null;
  const dailyResetSeconds = secondsUntilUtcMidnight(input.now);
  return {
    allowed: input.allowed || API_RATE_LIMIT_OBSERVE_ONLY,
    wouldHaveDenied: !input.allowed,
    scope,
    burstLimit: API_BURST_LIMIT,
    burstRemaining: input.burstRemaining,
    burstResetSeconds: Math.ceil((API_BURST_LIMIT - input.burstRemaining) / BURST_REFILL_PER_SECOND),
    dailyLimit: input.dailyLimit,
    dailyRemaining: Math.max(input.dailyRemaining, 0),
    dailyResetSeconds,
    retryAfterSeconds:
      scope === "daily"
        ? dailyResetSeconds
        : scope === "burst"
          ? Math.max(Math.ceil(input.retryAfterMs / 1000), 1)
          : 0,
  };
}

/**
 * Charge one request against an owner's budget and report the outcome.
 *
 * `ownerId` is the credential's owner — an organization id for org keys, a user
 * id for user keys — never the key id, so an org cannot widen its budget by
 * minting more keys.
 */
export async function consumeApiRateLimit(ownerId: string, dailyLimit: number): Promise<RateLimitDecision> {
  const now = Date.now();
  if (breakerIsOpen(now)) {
    return consumeInProcess(ownerId, dailyLimit, now);
  }
  try {
    const result = await apiRateLimitConsume({
      burstKey: `rl:burst:${ownerId}`,
      dailyKey: `rl:day:${ownerId}:${utcDay(now)}`,
      burstCapacity: API_BURST_LIMIT,
      burstRefillPerSecond: BURST_REFILL_PER_SECOND,
      dailyLimit,
      dailyTtlSeconds: DAILY_TTL_SECONDS,
      observeOnly: API_RATE_LIMIT_OBSERVE_ONLY,
    });
    recordRedisSuccess();
    return buildDecision({ ...result, dailyLimit, now });
  } catch (error) {
    recordRedisFailure(now);
    // Only the failure that trips the breaker is logged in full; the rest of an
    // outage would just repeat it once per request.
    if (consecutiveFailures === BREAKER_FAILURE_THRESHOLD) {
      logger.warn({ err: error, ownerId }, "Redis rate limit failing; using in-process counters until it recovers");
    }
    return consumeInProcess(ownerId, dailyLimit, now);
  }
}
