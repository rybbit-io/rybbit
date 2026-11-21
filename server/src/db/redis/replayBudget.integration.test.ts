import RedisMock from "ioredis-mock";
import { beforeEach, describe, expect, it } from "vitest";
import { REPLAY_BUDGET_LUA } from "./replayBudgetLua.js";

// Behavioral tests for the replay budget Lua, executed for real by ioredis-mock's
// embedded Lua runtime.

const KEY = "replay:budget:42:session-1";
const CAP = 1000;
const TTL_MS = 60_000;

interface BudgetMockRedis {
  replayBudgetCharge(key: string, bytes: number, capBytes: number, ttlMs: number): Promise<[number, number]>;
  get(key: string): Promise<string | null>;
  pttl(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  flushall(): Promise<unknown>;
}

let redis: BudgetMockRedis;

function charge(bytes: number) {
  return redis.replayBudgetCharge(KEY, bytes, CAP, TTL_MS);
}

describe("replayBudgetCharge Lua script", () => {
  beforeEach(async () => {
    const client = new RedisMock();
    client.defineCommand("replayBudgetCharge", { numberOfKeys: 1, lua: REPLAY_BUDGET_LUA });
    redis = client as unknown as BudgetMockRedis;
    await redis.flushall();
  });

  it("accepts batches under the cap and adds them up", async () => {
    expect(await charge(400)).toEqual([1, 400]);
    expect(await charge(400)).toEqual([1, 800]);
  });

  it("accepts the batch that crosses the cap, then refuses without charging", async () => {
    await charge(800);
    expect(await charge(500)).toEqual([1, 1300]);
    expect(await charge(10)).toEqual([0, 1300]);
    expect(await redis.get(KEY)).toBe("1300");
  });

  it("slides the TTL on refused batches too", async () => {
    await charge(CAP);
    // Short enough to tell a slid TTL from the original, long enough that the
    // key can't expire before the refused charge runs on a slow CI runner.
    await redis.pexpire(KEY, 5_000);
    expect(await charge(10)).toEqual([0, CAP]);
    expect(await redis.pttl(KEY)).toBeGreaterThan(5_000);
  });
});
