import RedisMock from "ioredis-mock";
import { beforeEach, describe, expect, it } from "vitest";
import { IMPORT_LOCK_RELEASE_LUA, IMPORT_QUOTA_RESERVE_LUA } from "./importQuotaLua.js";

// Behavioral tests for the import lock and quota Lua, executed for real by
// ioredis-mock's embedded Lua runtime.

const LOCK = "import:lock:org_1";
const QUOTA = "import:quota:org_1";
const TTL_MS = 60_000;

interface ImportMockRedis {
  importLockRelease(key: string, owner: string): Promise<number>;
  importQuotaReserve(key: string, ...args: (string | number)[]): Promise<number[]>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<string | null>;
  get(key: string): Promise<string | null>;
  hget(key: string, field: string): Promise<string | null>;
  pttl(key: string): Promise<number>;
  flushall(): Promise<unknown>;
}

let redis: ImportMockRedis;

const reserve = (limit: number, ...triples: [string, number, number][]) =>
  redis.importQuotaReserve(QUOTA, limit, TTL_MS, ...triples.flat());

describe("import lock Lua scripts", () => {
  beforeEach(async () => {
    const client = new RedisMock();
    client.defineCommand("importLockRelease", { numberOfKeys: 1, lua: IMPORT_LOCK_RELEASE_LUA });
    redis = client as unknown as ImportMockRedis;
    await redis.flushall();
  });

  it("only one caller acquires the lock", async () => {
    expect(await redis.set(LOCK, "import_a", "PX", TTL_MS, "NX")).toBe("OK");
    expect(await redis.set(LOCK, "import_b", "PX", TTL_MS, "NX")).toBeNull();
  });

  it("only the import that holds the lock releases it", async () => {
    await redis.set(LOCK, "import_a", "PX", TTL_MS, "NX");

    // Deleting an older import leaves the running import's lock alone.
    expect(await redis.importLockRelease(LOCK, "import_old")).toBe(0);
    expect(await redis.get(LOCK)).toBe("import_a");

    expect(await redis.importLockRelease(LOCK, "import_a")).toBe(1);
    expect(await redis.get(LOCK)).toBeNull();
  });
});

describe("import quota Lua script", () => {
  beforeEach(async () => {
    const client = new RedisMock();
    client.defineCommand("importQuotaReserve", { numberOfKeys: 1, lua: IMPORT_QUOTA_RESERVE_LUA });
    redis = client as unknown as ImportMockRedis;
    await redis.flushall();
  });

  it("seeds a month from the baseline and grants only what is left of the limit", async () => {
    expect(await reserve(10, ["202405", 7, 5])).toEqual([3]);
    expect(await redis.hget(QUOTA, "202405")).toBe("10");
  });

  it("shares reservations between callers that bring a lower baseline", async () => {
    // Two workers with the same stale ClickHouse baseline: the second sees the first's reservation.
    expect(await reserve(10, ["202405", 4, 5])).toEqual([5]);
    expect(await reserve(10, ["202405", 4, 5])).toEqual([1]);
    expect(await reserve(10, ["202405", 4, 5])).toEqual([0]);
  });

  it("adopts a refreshed baseline that is higher than the stored count", async () => {
    expect(await reserve(10, ["202405", 2, 3])).toEqual([3]);
    expect(await redis.hget(QUOTA, "202405")).toBe("5");

    // A rebuilt tracker sees live traffic in ClickHouse that the stored count never counted.
    expect(await reserve(10, ["202405", 9, 3])).toEqual([1]);
    expect(await redis.hget(QUOTA, "202405")).toBe("10");

    // Live traffic alone has reached the limit: nothing more is granted.
    await redis.flushall();
    await reserve(10, ["202405", 2, 1]);
    expect(await reserve(10, ["202405", 10, 4])).toEqual([0]);
    expect(await redis.hget(QUOTA, "202405")).toBe("10");
  });

  it("tracks months independently and returns grants in request order", async () => {
    expect(await reserve(3, ["202405", 3, 2], ["202406", 0, 2])).toEqual([0, 2]);
    expect(await redis.hget(QUOTA, "202405")).toBe("3");
    expect(await redis.hget(QUOTA, "202406")).toBe("2");
  });

  it("never grants a negative count when a month is already past its limit", async () => {
    expect(await reserve(5, ["202405", 9, 1])).toEqual([0]);
    expect(await redis.hget(QUOTA, "202405")).toBe("9");
  });

  it("slides the TTL on every call", async () => {
    await reserve(5, ["202405", 0, 1]);
    expect(await redis.pttl(QUOTA)).toBeGreaterThan(0);
  });
});
