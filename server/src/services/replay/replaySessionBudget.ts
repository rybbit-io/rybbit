import { replayBudgetCharge, replayBudgetRedis } from "../../db/redis/redis.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("session-replay-budget");

const DEFAULT_MAX_MB_PER_SESSION = 50;

// About the 99th percentile of replay sessions. The sessions above it are mostly
// pathological: recorder loops re-taking full snapshots, or many visitors merged
// into one never-ending session, which once wrote 1.2B rows (several TB) a day.
// 0 disables the cap.
function maxBytesFromEnv(): number {
  const raw = process.env.SESSION_REPLAY_MAX_MB_PER_SESSION;
  const mb = raw === undefined || raw === "" ? DEFAULT_MAX_MB_PER_SESSION : Number(raw);
  if (!Number.isFinite(mb) || mb < 0) {
    return DEFAULT_MAX_MB_PER_SESSION * 1024 * 1024;
  }
  return Math.floor(mb * 1024 * 1024);
}

export const REPLAY_MAX_BYTES_PER_SESSION = maxBytesFromEnv();

// Must outlive the 30-minute sliding session it shadows; the key slides on every
// batch, so a live session can't outrun it.
const BUDGET_TTL_MS = 2 * 60 * 60 * 1000;
const FALLBACK_CACHE_MAX = 50_000;

export type ReplayBudgetDecision = { accepted: boolean; usedBytes: number };

// Per-worker budgets for when Redis is unavailable. Looser than the shared one
// (each worker counts on its own), but a Redis outage must neither block replay
// ingestion nor lift the cap.
const fallbackBudgets = new Map<string, { usedBytes: number; expiresAt: number }>();

function chargeFallback(key: string, bytes: number, capBytes: number, now: number): ReplayBudgetDecision {
  const existing = fallbackBudgets.get(key);
  let usedBytes = existing && existing.expiresAt > now ? existing.usedBytes : 0;
  const accepted = usedBytes < capBytes;
  if (accepted) {
    usedBytes += bytes;
  }

  // Re-insert to mark as most-recently-used (Map preserves insertion order).
  fallbackBudgets.delete(key);
  fallbackBudgets.set(key, { usedBytes, expiresAt: now + BUDGET_TTL_MS });
  if (fallbackBudgets.size > FALLBACK_CACHE_MAX) {
    const oldest = fallbackBudgets.keys().next().value;
    if (oldest !== undefined) fallbackBudgets.delete(oldest);
  }

  return { accepted, usedBytes };
}

/**
 * Charge a replay batch against its session's byte budget. Returns whether the
 * batch may be stored; once a session is over the cap every later batch is
 * refused until the session goes quiet.
 */
export async function chargeReplaySessionBudget(
  siteId: number,
  sessionId: string,
  bytes: number,
  capBytes: number = REPLAY_MAX_BYTES_PER_SESSION
): Promise<ReplayBudgetDecision> {
  if (capBytes <= 0) {
    return { accepted: true, usedBytes: 0 };
  }

  const key = `replay:budget:${siteId}:${sessionId}`;
  let decision: ReplayBudgetDecision;

  if (replayBudgetRedis.status !== "ready") {
    decision = chargeFallback(key, bytes, capBytes, Date.now());
  } else {
    try {
      decision = await replayBudgetCharge(key, bytes, capBytes, BUDGET_TTL_MS);
    } catch (error) {
      logger.error(error as Error, "Replay budget lookup failed; using in-process fallback");
      decision = chargeFallback(key, bytes, capBytes, Date.now());
    }
  }

  // Only the batch that crosses the cap is both accepted and at/over it, so this
  // logs once per capped session rather than once per refused batch.
  if (decision.accepted && decision.usedBytes >= capBytes) {
    logger.warn({ siteId, sessionId, usedBytes: decision.usedBytes, capBytes }, "Session replay reached its size cap");
  }

  return decision;
}

/** Test hook: forget all in-process fallback budgets. */
export function resetReplayBudgetFallback(): void {
  fallbackBudgets.clear();
}
