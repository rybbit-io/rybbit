/**
 * Shared state for data imports, so every cluster worker enforces the same
 * one-import-per-organization lock and monthly quota.
 *
 * The lock is a plain `SET key importId NX PX ttl`; the release script is its
 * owner-checked follow-up, so a late or stale caller can't release a lock that
 * now belongs to a different import.
 */

/**
 * KEYS[1] lock key
 * ARGV[1] expected owner
 *
 * Deletes the lock only while it still belongs to ARGV[1]. Returns 1 if deleted.
 */
export const IMPORT_LOCK_RELEASE_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

/**
 * Per-organization monthly import quota, checked and reserved in one atomic
 * round trip.
 *
 * KEYS[1] hash of month (yyyyMM) -> events counted against that month
 *
 * ARGV[1] monthly event limit
 * ARGV[2] TTL in milliseconds (slides on every call)
 * ARGV[3..] triples of (month, baseline, requested)
 *
 * A month's usage is the larger of its stored count, which includes every
 * worker's reservations, and the caller's baseline (ClickHouse usage when its
 * tracker was built, plus its own reservations since). Trackers are rebuilt
 * regularly, so events that reached ClickHouse after the count was seeded,
 * live traffic included, are adopted instead of undercounted. Each month
 * grants min(requested, limit - usage), and the stored count becomes usage
 * plus the grant. Returns the granted count per triple, in order.
 */
export const IMPORT_QUOTA_RESERVE_LUA = `
local limit = tonumber(ARGV[1])
local ttlMs = tonumber(ARGV[2])
local granted = {}

for i = 3, #ARGV, 3 do
  local month = ARGV[i]
  local stored = tonumber(redis.call('HGET', KEYS[1], month) or 0)
  local used = math.max(stored, tonumber(ARGV[i + 1]))
  local grant = math.max(0, math.min(tonumber(ARGV[i + 2]), limit - used))
  redis.call('HSET', KEYS[1], month, string.format('%d', used + grant))
  granted[#granted + 1] = grant
end

redis.call('PEXPIRE', KEYS[1], ttlMs)
-- Same table either way; ioredis-mock (the tests' Lua runtime) can only return
-- it in this form.
return { unpack(granted) }
`;
