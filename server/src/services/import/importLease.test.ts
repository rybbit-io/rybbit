import { describe, expect, it, vi } from "vitest";
import { RedisImportLease, ResilientImportLease, type ImportLease } from "./importLease.js";

class FakeRedisLeaseClient {
  private readonly values = new Map<string, { value: string; expiresAt: number }>();

  constructor(private now = 0) {}

  advance(milliseconds: number): void {
    this.now += milliseconds;
  }

  async set(key: string, value: string, _px: "PX", ttlMs: number, _nx: "NX"): Promise<"OK" | null> {
    const current = this.values.get(key);
    if (current && current.expiresAt > this.now) return null;

    this.values.set(key, { value, expiresAt: this.now + ttlMs });
    return "OK";
  }

  async eval(script: string, _numberOfKeys: number, key: string, ...args: (string | number)[]): Promise<number> {
    const current = this.values.get(key);
    if (!current || current.expiresAt <= this.now) {
      if (script.includes("redis.call('SET'")) {
        this.values.set(key, { value: String(args[0]), expiresAt: this.now + Number(args[1]) });
        return 1;
      }
      return 0;
    }
    if (current.value !== args[0]) return 0;

    if (script.includes("PEXPIRE")) {
      current.expiresAt = this.now + Number(args[1]);
      return 1;
    }

    this.values.delete(key);
    return 1;
  }
}

describe("Site Import lease", () => {
  it("shares ownership across workers in every deployment and releases only for the owner", async () => {
    const redis = new FakeRedisLeaseClient();
    const workerA = new RedisImportLease(redis, 1_000);
    const workerB = new RedisImportLease(redis, 1_000);

    expect(await workerA.acquire("org-1", "import-a")).toBe(true);
    expect(await workerB.refresh("org-1", "import-a")).toBe(true);
    expect(await workerB.acquire("org-1", "import-b")).toBe(false);

    await workerB.release("org-1", "import-b");
    expect(await workerB.acquire("org-1", "import-b")).toBe(false);

    await workerA.release("org-1", "import-a");
    expect(await workerB.acquire("org-1", "import-b")).toBe(true);
  });

  it("does not let an expired owner release its successor's lease", async () => {
    const redis = new FakeRedisLeaseClient();
    const workerA = new RedisImportLease(redis, 1_000);
    const workerB = new RedisImportLease(redis, 1_000);

    await workerA.acquire("org-1", "import-a");
    redis.advance(1_001);
    await workerB.acquire("org-1", "import-b");
    await workerA.release("org-1", "import-a");

    expect(await workerA.acquire("org-1", "import-c")).toBe(false);
    expect(await workerB.refresh("org-1", "import-b")).toBe(true);
  });

  it("fails open when shared coordination is unavailable", async () => {
    const unavailable = new Error("Redis unavailable");
    const delegate: ImportLease = {
      acquire: vi.fn().mockRejectedValue(unavailable),
      refresh: vi.fn().mockRejectedValue(unavailable),
      release: vi.fn().mockRejectedValue(unavailable),
    };
    const onError = vi.fn();
    const lease = new ResilientImportLease(delegate, onError);

    await expect(lease.acquire("org-1", "import-a")).resolves.toBe(true);
    await expect(lease.refresh("org-1", "import-a")).resolves.toBe(true);
    await expect(lease.release("org-1", "import-a")).resolves.toBeUndefined();
    expect(onError).toHaveBeenNthCalledWith(1, "acquire", unavailable);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("adopts the lease after a fail-open acquire once Redis recovers", async () => {
    const redis = new FakeRedisLeaseClient();
    const sharedLease = new RedisImportLease(redis, 1_000);
    const delegate: ImportLease = {
      acquire: vi.fn().mockRejectedValueOnce(new Error("Redis unavailable")),
      refresh: (organizationId, importId) => sharedLease.refresh(organizationId, importId),
      release: (organizationId, importId) => sharedLease.release(organizationId, importId),
    };
    let now = 0;
    const lease = new ResilientImportLease(delegate, vi.fn(), 30_000, () => now);

    expect(await lease.acquire("org-1", "import-a")).toBe(true);
    now = 30_001;
    expect(await lease.refresh("org-1", "import-a")).toBe(true);
    expect(await sharedLease.acquire("org-1", "import-b")).toBe(false);
  });

  it("short-circuits Redis calls during the outage cooldown and probes afterward", async () => {
    const delegate: ImportLease = {
      acquire: vi.fn(),
      refresh: vi.fn().mockRejectedValueOnce(new Error("Redis unavailable")).mockResolvedValue(false),
      release: vi.fn(),
    };
    let now = 0;
    const lease = new ResilientImportLease(delegate, vi.fn(), 30_000, () => now);

    expect(await lease.refresh("org-1", "import-a")).toBe(true);
    expect(await lease.refresh("org-1", "import-a")).toBe(true);
    expect(delegate.refresh).toHaveBeenCalledTimes(1);

    now = 30_001;
    expect(await lease.refresh("org-1", "import-a")).toBe(false);
    expect(delegate.refresh).toHaveBeenCalledTimes(2);
  });
});
