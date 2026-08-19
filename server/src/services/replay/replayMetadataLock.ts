import { randomUUID } from "node:crypto";
import { redis } from "../../db/redis/redis.js";

const LOCK_TTL_MS = 60_000;
const LOCK_WAIT_MS = 5_000;
const LOCK_RETRY_MS = 25;

const RELEASE_LOCK_LUA = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
`;

export class ReplayMetadataLockTimeoutError extends Error {
  constructor(siteId: number, sessionId: string) {
    super(`Timed out waiting for replay metadata lock for site ${siteId}, session ${sessionId}`);
    this.name = "ReplayMetadataLockTimeoutError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Serialize one session's metadata read-modify-write across backend workers.
 * The token-checked release cannot delete a replacement lock after expiration.
 */
export async function withReplayMetadataLock<T>(
  siteId: number,
  sessionId: string,
  operation: () => Promise<T>
): Promise<T> {
  const lockKey = `rybbit:replay-metadata-lock:${siteId}:${sessionId}`;
  const token = randomUUID();
  const deadline = Date.now() + LOCK_WAIT_MS;

  let acquired = false;
  while (!acquired) {
    acquired = (await redis.set(lockKey, token, "PX", LOCK_TTL_MS, "NX")) === "OK";
    if (acquired) break;

    if (Date.now() >= deadline) {
      throw new ReplayMetadataLockTimeoutError(siteId, sessionId);
    }
    await delay(LOCK_RETRY_MS);
  }

  try {
    return await operation();
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
    } catch (error) {
      // The lease expires automatically. Do not replace a successful metadata
      // update with an HTTP failure solely because cleanup could not reach Redis.
      console.error("Failed to release replay metadata lock", { siteId, sessionId, error });
    }
  }
}
