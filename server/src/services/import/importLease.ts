import { redis } from "../../db/redis/redis.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const IMPORT_LEASE_TTL_MS = 15 * 60 * 1000;
const IMPORT_LEASE_PREFIX = "site-import:organization:";
const logger = createServiceLogger("import-lease");

const REFRESH_LEASE_SCRIPT = `
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    return redis.call('PEXPIRE', KEYS[1], ARGV[2])
  end
  if not current then
    local adopted = redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2], 'NX')
    if adopted then
      return 1
    end
  end
  return 0
`;

const RELEASE_LEASE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

export interface ImportLease {
  acquire(organizationId: string, importId: string): Promise<boolean>;
  refresh(organizationId: string, importId: string): Promise<boolean>;
  release(organizationId: string, importId: string): Promise<void>;
}

interface ImportLeaseRedisClient {
  set(key: string, value: string, px: "PX", ttlMs: number, nx: "NX"): Promise<unknown>;
  eval(script: string, numberOfKeys: number, key: string, ...args: (string | number)[]): Promise<unknown>;
}

function leaseKey(organizationId: string): string {
  return `${IMPORT_LEASE_PREFIX}${organizationId}`;
}

export class RedisImportLease implements ImportLease {
  constructor(
    private readonly client: ImportLeaseRedisClient,
    private readonly ttlMs = IMPORT_LEASE_TTL_MS
  ) {}

  async acquire(organizationId: string, importId: string): Promise<boolean> {
    const result = await this.client.set(leaseKey(organizationId), importId, "PX", this.ttlMs, "NX");
    return result === "OK";
  }

  async refresh(organizationId: string, importId: string): Promise<boolean> {
    const result = await this.client.eval(REFRESH_LEASE_SCRIPT, 1, leaseKey(organizationId), importId, this.ttlMs);
    return Number(result) === 1;
  }

  async release(organizationId: string, importId: string): Promise<void> {
    await this.client.eval(RELEASE_LEASE_SCRIPT, 1, leaseKey(organizationId), importId);
  }
}

/**
 * Preserve import availability when shared coordination is temporarily down.
 * Redis is the normal cross-worker authority in every deployment; failing open
 * only during an outage restores the pre-lease behavior instead of turning a
 * Redis blip into an import outage.
 */
export class ResilientImportLease implements ImportLease {
  private unavailableUntil = 0;

  constructor(
    private readonly delegate: ImportLease,
    private readonly onError: (operation: keyof ImportLease, error: unknown) => void = (operation, error) => {
      logger.error({ err: error, operation }, "Site Import lease unavailable; allowing operation without coordination");
    },
    private readonly cooldownMs = 30_000,
    private readonly now: () => number = Date.now
  ) {}

  async acquire(organizationId: string, importId: string): Promise<boolean> {
    if (this.unavailableUntil > this.now()) return true;

    try {
      const result = await this.delegate.acquire(organizationId, importId);
      this.unavailableUntil = 0;
      return result;
    } catch (error) {
      this.unavailableUntil = this.now() + this.cooldownMs;
      this.onError("acquire", error);
      return true;
    }
  }

  async refresh(organizationId: string, importId: string): Promise<boolean> {
    if (this.unavailableUntil > this.now()) return true;

    try {
      const result = await this.delegate.refresh(organizationId, importId);
      this.unavailableUntil = 0;
      return result;
    } catch (error) {
      this.unavailableUntil = this.now() + this.cooldownMs;
      this.onError("refresh", error);
      return true;
    }
  }

  async release(organizationId: string, importId: string): Promise<void> {
    if (this.unavailableUntil > this.now()) return;

    try {
      await this.delegate.release(organizationId, importId);
    } catch (error) {
      this.onError("release", error);
    }
  }
}

// Redis ships with and is configured by the default self-hosted deployment as
// well as cloud. Always use it so a request may continue on a sibling worker.
export const importLease: ImportLease = new ResilientImportLease(
  new RedisImportLease(redis as unknown as ImportLeaseRedisClient)
);
