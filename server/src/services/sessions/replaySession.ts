/**
 * Which session a session replay batch records into. Two keys take part: the
 * visitor's analytics session, which only tracked events renew, and the
 * session the replay is recording into, renewed by each replay batch.
 *
 * - While both name the same session, or the analytics one has lapsed: the
 *   replay's own session, so an idle tab's replay doesn't fragment into a new
 *   session — counted against the replay quota, with a fresh size budget —
 *   every 30 minutes.
 * - Once a tracked event has started a new analytics session: the replay
 *   follows it only from a batch that carries a full snapshot. Until then
 *   batches stay in the previous session and the response asks the recorder
 *   for a snapshot; a session that opened on incremental events alone could
 *   never be played, and the replay list leaves it out.
 * - No replay session yet (the first batch, a new identity): the analytics
 *   session, created if need be so the pageview joins it, and a snapshot is
 *   asked for if the batch has none.
 *
 * `pickReplaySession` is the in-process copy of `REPLAY_SESSION_LUA`, for when
 * Redis is unavailable; the two must agree.
 */

export type ReplaySessionChoice = {
  /** null: no session exists, so the caller's new candidate becomes it. */
  sessionId: string | null;
  needsFullSnapshot: boolean;
};

export function pickReplaySession(
  analyticsSessionId: string | null,
  replaySessionId: string | null,
  hasFullSnapshot: boolean
): ReplaySessionChoice {
  if (replaySessionId && replaySessionId !== analyticsSessionId) {
    if (analyticsSessionId && hasFullSnapshot) {
      return { sessionId: analyticsSessionId, needsFullSnapshot: false };
    }
    return { sessionId: replaySessionId, needsFullSnapshot: analyticsSessionId !== null };
  }
  if (replaySessionId) {
    return { sessionId: replaySessionId, needsFullSnapshot: false };
  }
  return { sessionId: analyticsSessionId, needsFullSnapshot: !hasFullSnapshot };
}

// KEYS[1] the analytics session, which this never renews unless it creates
// it; KEYS[2] the replay's session. ARGV: candidate id, TTL in ms, and "1" when
// the batch carries a full snapshot. Returns { sessionId, needsFullSnapshot }.
// Atomic for the same reason as `sessionGetOrCreate`.
export const REPLAY_SESSION_LUA = `
  local analyticsId = redis.call('GET', KEYS[1])
  local replayId = redis.call('GET', KEYS[2])
  local hasFullSnapshot = ARGV[3] == '1'
  local sessionId
  local needsFullSnapshot = 0
  if replayId and replayId ~= analyticsId then
    if analyticsId and hasFullSnapshot then
      sessionId = analyticsId
    else
      sessionId = replayId
      if analyticsId then needsFullSnapshot = 1 end
    end
  elseif replayId then
    sessionId = replayId
  else
    sessionId = analyticsId
    if not sessionId then
      sessionId = ARGV[1]
      redis.call('SET', KEYS[1], sessionId, 'PX', ARGV[2])
    end
    if not hasFullSnapshot then needsFullSnapshot = 1 end
  end
  redis.call('SET', KEYS[2], sessionId, 'PX', ARGV[2])
  return { sessionId, needsFullSnapshot }
`;
