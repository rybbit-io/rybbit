// Lua body for the stickyResolve command. Kept in its own side-effect-free
// module so the behavioral tests can run the exact same script through a real
// Lua runtime (ioredis-mock) without importing the connection-creating redis.ts.
//
// KEYS: [1] seen:<rawId>  [2] candidate ZSET  [3] alias:<rawId>
// ARGV: rawId, nowMs, candidateWindowMs, seenTtlMs, aliasTtlMs, eligible(0/1),
//       seenKeyPrefix, aliasKeyPrefix, maxCandidates
//
// Only requests arriving through eligible (datacenter) egress register their
// identity as a rotation candidate: a residential visitor must never become the
// "exactly one candidate" that a later datacenter arrival gets merged into.
// Seen flags are set for everyone regardless.
//
// Alias resolution follows the chain to its terminal id (bounded) and writes the
// terminal back (path compression), so a canonical that was itself re-attached
// never forks a visitor across intermediate ids.
export const STICKY_RESOLVE_LUA = `
    local rawId = ARGV[1]
    local now = tonumber(ARGV[2])
    local windowMs = tonumber(ARGV[3])
    local seenTtlMs = ARGV[4]
    local aliasTtlMs = ARGV[5]
    local eligible = ARGV[6] == '1'
    local seenPrefix = ARGV[7]
    local aliasPrefix = ARGV[8]
    local maxCandidates = tonumber(ARGV[9])

    local function touch(id)
      redis.call('SET', seenPrefix .. id, '1', 'PX', seenTtlMs)
      if eligible then
        redis.call('ZADD', KEYS[2], now, id)
        redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', '(' .. (now - windowMs))
        redis.call('ZREMRANGEBYRANK', KEYS[2], 0, -maxCandidates - 1)
        redis.call('PEXPIRE', KEYS[2], windowMs)
      end
    end

    local canonical = redis.call('GET', KEYS[3])
    if canonical then
      for _ = 1, 5 do
        local hop = redis.call('GET', aliasPrefix .. canonical)
        if not hop then break end
        canonical = hop
      end
      redis.call('SET', KEYS[3], canonical, 'PX', aliasTtlMs)
      touch(canonical)
      return {canonical, 'alias'}
    end

    if redis.call('EXISTS', KEYS[1]) == 1 then
      touch(rawId)
      return {rawId, 'known'}
    end

    if eligible then
      redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', '(' .. (now - windowMs))
      local candidates = redis.call('ZRANGE', KEYS[2], 0, -1)
      local matched = nil
      local count = 0
      for _, id in ipairs(candidates) do
        if id ~= rawId then
          count = count + 1
          matched = id
        end
      end
      if count == 1 then
        redis.call('SET', KEYS[3], matched, 'PX', aliasTtlMs)
        touch(matched)
        return {matched, 'attach'}
      end
      touch(rawId)
      if count == 0 then
        return {rawId, 'abstain_none'}
      end
      return {rawId, 'abstain_multi'}
    end

    touch(rawId)
    return {rawId, 'new'}
`;
