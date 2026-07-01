import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hincrby: vi.fn(),
  exec: vi.fn(),
  set: vi.fn(),
  hgetall: vi.fn(),
}));

vi.mock("../../../db/redis/redis.js", () => ({
  redis: {
    pipeline: () => ({ hincrby: mocks.hincrby, exec: mocks.exec }),
    set: (...args: unknown[]) => mocks.set(...args),
    hgetall: (...args: unknown[]) => mocks.hgetall(...args),
  },
}));

import {
  flushBotDetectionStats,
  recordBotBlockingRequest,
  recordBotDetections,
  resetBotDetectionStatsForTests,
} from "./botDetectionStats.js";

function hincrbyField(field: string): number | undefined {
  const call = mocks.hincrby.mock.calls.find(c => c[1] === field);
  return call?.[2] as number | undefined;
}

describe("botDetectionStats aggregation", () => {
  beforeEach(() => {
    resetBotDetectionStatsForTests();
    mocks.hincrby.mockReset();
    mocks.exec.mockReset().mockResolvedValue([]);
    mocks.set.mockReset().mockResolvedValue(null);
    mocks.hgetall.mockReset().mockResolvedValue({});
  });

  it("flushes only the delta since the previous flush", async () => {
    recordBotBlockingRequest(undefined, undefined); // totalRequests=1, cs:missing=1, sig:missingMask=1
    recordBotDetections(["ua_pattern"]); // totalBotRequests=1, m:ua_pattern=1

    await flushBotDetectionStats();

    expect(hincrbyField("totalRequests")).toBe(1);
    expect(hincrbyField("totalBotRequests")).toBe(1);
    expect(hincrbyField("m:ua_pattern")).toBe(1);
    expect(hincrbyField("cs:missing")).toBe(1);
    expect(mocks.exec).toHaveBeenCalledTimes(1);

    // Second flush with one more request should only push the new delta.
    mocks.hincrby.mockReset();
    recordBotBlockingRequest(0, 0);
    await flushBotDetectionStats();

    expect(hincrbyField("totalRequests")).toBe(1); // delta, not the running total of 2
    expect(hincrbyField("cs:score0")).toBe(1);
    expect(hincrbyField("m:ua_pattern")).toBeUndefined(); // unchanged → not sent
  });

  it("does not call exec when there is nothing new to flush", async () => {
    await flushBotDetectionStats();
    expect(mocks.hincrby).not.toHaveBeenCalled();
    expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("logs the aggregate only when it wins the per-interval lock", async () => {
    recordBotBlockingRequest(undefined, undefined);

    mocks.set.mockResolvedValue(null); // lock not acquired
    await flushBotDetectionStats();
    expect(mocks.hgetall).not.toHaveBeenCalled();

    mocks.set.mockResolvedValue("OK"); // lock acquired
    recordBotBlockingRequest(0, 0);
    await flushBotDetectionStats();
    expect(mocks.hgetall).toHaveBeenCalledWith("bot:stats");

    // Lock attempt uses NX so only one worker wins per interval.
    expect(mocks.set).toHaveBeenLastCalledWith("bot:stats:loglock", "1", "PX", expect.any(Number), "NX");
  });

  it("does not throw when Redis is unavailable", async () => {
    recordBotDetections(["rate_anomaly"]);
    mocks.exec.mockRejectedValue(new Error("redis down"));

    await expect(flushBotDetectionStats()).resolves.toBeUndefined();
  });
});
