/**
 * Two-tier API rate limiter: a token-bucket burst guard and a UTC-day quota,
 * evaluated and committed in one atomic round trip.
 *
 * Both tiers are checked *before* either is charged, so a request refused on
 * quota never also drains the burst bucket — otherwise a client stuck at its
 * daily limit would keep paying burst tokens for requests it can't make, and
 * `RateLimit-Remaining` would report a burst budget that no longer exists.
 *
 * `TIME` makes the script non-deterministic, which Redis permits alongside
 * writes under effects replication (the default since 5.0). Reading the clock
 * inside Redis rather than passing it from Node keeps every app instance on one
 * clock, so skew between instances cannot refill a bucket early.
 *
 * KEYS[1] burst bucket, a hash of { tokens, ts }
 * KEYS[2] daily counter for the current UTC day (the day is part of the key,
 *         so the reset is a natural key rollover rather than a scheduled wipe)
 *
 * ARGV[1] burst capacity (tokens)
 * ARGV[2] burst refill rate (tokens per second)
 * ARGV[3] daily limit, 0 = unlimited
 * ARGV[4] TTL in seconds for the daily counter
 * ARGV[5] 1 = observe only: account for the request but never deny it
 *
 * Returns { allowed, scope, burstRemaining, dailyRemaining, retryAfterMs }
 * where scope is 0 = none, 1 = burst, 2 = daily and dailyRemaining is -1 when
 * the daily tier is unlimited.
 */
export const API_RATE_LIMIT_LUA = `
local capacity   = tonumber(ARGV[1])
local refill     = tonumber(ARGV[2])
local dailyLimit = tonumber(ARGV[3])
local dailyTtl   = tonumber(ARGV[4])
local observe    = tonumber(ARGV[5]) == 1

local time = redis.call('TIME')
local now = tonumber(time[1]) + tonumber(time[2]) / 1000000

local dailyUsed = 0
if dailyLimit > 0 then
  dailyUsed = tonumber(redis.call('GET', KEYS[2])) or 0
end
local dailyExceeded = dailyLimit > 0 and dailyUsed >= dailyLimit

local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(bucket[1])
local ts = tonumber(bucket[2])
if tokens == nil or ts == nil then
  tokens = capacity
else
  tokens = math.min(capacity, tokens + (now - ts) * refill)
end
local burstExceeded = tokens < 1

local allowed = not dailyExceeded and not burstExceeded

-- Charge the request when it is allowed, and always in observe mode: shadow
-- runs are only useful if their daily totals match the traffic that would have
-- been counted under enforcement.
if allowed or observe then
  if not burstExceeded then
    tokens = tokens - 1
  end
  redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
  -- Outlive a full refill so an idle owner's bucket expires instead of
  -- lingering; a missing bucket is indistinguishable from a full one.
  redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / refill * 1000) + 1000)
  if dailyLimit > 0 then
    dailyUsed = redis.call('INCR', KEYS[2])
    if dailyUsed == 1 then
      redis.call('EXPIRE', KEYS[2], dailyTtl)
    end
  end
end

local scope = 0
local retryAfterMs = 0
if dailyExceeded then
  scope = 2
elseif burstExceeded then
  scope = 1
  retryAfterMs = math.ceil((1 - tokens) / refill * 1000)
end

local dailyRemaining = -1
if dailyLimit > 0 then
  dailyRemaining = math.max(dailyLimit - dailyUsed, 0)
end

return {
  allowed and 1 or 0,
  scope,
  math.floor(math.max(tokens, 0)),
  dailyRemaining,
  retryAfterMs,
}
`;
