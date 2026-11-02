import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ready",
  replayBudgetCharge: vi.fn(),
}));

vi.mock("../../db/redis/redis.js", () => ({
  replayBudgetRedis: {
    get status() {
      return mocks.status;
    },
  },
  replayBudgetCharge: mocks.replayBudgetCharge,
}));

import { chargeReplaySessionBudget, resetReplayBudgetFallback } from "./replaySessionBudget.js";

describe("chargeReplaySessionBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReplayBudgetFallback();
    mocks.status = "ready";
  });

  it("uses the shared Redis budget when Redis is ready", async () => {
    mocks.replayBudgetCharge.mockResolvedValue({ accepted: false, usedBytes: 2000 });

    expect(await chargeReplaySessionBudget(42, "s1", 10, 1000)).toEqual({ accepted: false, usedBytes: 2000 });
    expect(mocks.replayBudgetCharge).toHaveBeenCalledWith("replay:budget:42:s1", 10, 1000, expect.any(Number));
  });

  it("keeps enforcing the cap in-process when Redis is down", async () => {
    mocks.status = "reconnecting";

    expect(await chargeReplaySessionBudget(42, "s1", 600, 1000)).toEqual({ accepted: true, usedBytes: 600 });
    expect(await chargeReplaySessionBudget(42, "s1", 600, 1000)).toEqual({ accepted: true, usedBytes: 1200 });
    expect(await chargeReplaySessionBudget(42, "s1", 1, 1000)).toEqual({ accepted: false, usedBytes: 1200 });
    // Other sessions keep their own budget.
    expect(await chargeReplaySessionBudget(42, "s2", 1, 1000)).toEqual({ accepted: true, usedBytes: 1 });
    expect(mocks.replayBudgetCharge).not.toHaveBeenCalled();
  });

  it("falls back in-process when the Redis call fails", async () => {
    mocks.replayBudgetCharge.mockRejectedValue(new Error("timeout"));

    expect(await chargeReplaySessionBudget(42, "s1", 600, 1000)).toEqual({ accepted: true, usedBytes: 600 });
  });

  it("accepts everything when the cap is disabled", async () => {
    expect(await chargeReplaySessionBudget(42, "s1", 10_000, 0)).toEqual({ accepted: true, usedBytes: 0 });
    expect(mocks.replayBudgetCharge).not.toHaveBeenCalled();
  });
});
