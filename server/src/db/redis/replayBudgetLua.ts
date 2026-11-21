/**
 * Per-session replay byte budget, checked and charged in one atomic round trip.
 *
 * A batch is accepted while the session is still under its cap, so the batch
 * that crosses the cap is stored and every batch after it is refused. The TTL
 * slides on every call, refused ones included: a session that keeps sending
 * stays capped for as long as it keeps sending, instead of getting a fresh
 * budget when the key would otherwise have expired underneath it.
 *
 * KEYS[1] byte counter for one (site, session)
 *
 * ARGV[1] bytes in this batch
 * ARGV[2] cap in bytes
 * ARGV[3] TTL in milliseconds
 *
 * Returns { accepted, usedBytes } where usedBytes includes this batch when it
 * was accepted.
 */
export const REPLAY_BUDGET_LUA = `
local bytes = tonumber(ARGV[1])
local cap   = tonumber(ARGV[2])
local ttlMs = tonumber(ARGV[3])

local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used >= cap then
  redis.call('PEXPIRE', KEYS[1], ttlMs)
  return { 0, used }
end

used = redis.call('INCRBY', KEYS[1], bytes)
redis.call('PEXPIRE', KEYS[1], ttlMs)
return { 1, used }
`;
