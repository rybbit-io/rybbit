import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stickyResolve: vi.fn(),
  redisStatus: { value: "ready" },
}));

vi.mock("../../db/redis/redis.js", () => ({
  identityRedis: {
    get status() {
      return mocks.redisStatus.value;
    },
  },
  stickyResolve: (...args: unknown[]) => mocks.stickyResolve(...args),
}));

import { resolveStickyUserId, setStickyIdentityEnabledForTests } from "./stickyUserId.js";

const baseInput = {
  siteId: 123,
  rawUserId: "abc123def456",
  ipAddress: "203.0.113.10",
  userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
  saltScope: "",
  nowMs: 1_000_000,
  isDatacenterEgress: () => true,
};

describe("resolveStickyUserId", () => {
  beforeEach(() => {
    setStickyIdentityEnabledForTests(true);
    mocks.redisStatus.value = "ready";
    mocks.stickyResolve.mockReset();
    mocks.stickyResolve.mockResolvedValue(["abc123def456", "known"]);
  });

  it("returns the resolved canonical id from Redis", async () => {
    mocks.stickyResolve.mockResolvedValue(["canonical9999", "attach"]);

    const userId = await resolveStickyUserId(baseInput);

    expect(userId).toBe("canonical9999");
    expect(mocks.stickyResolve).toHaveBeenCalledTimes(1);
  });

  it("builds keys scoped by site, salt partition, and UA hash", async () => {
    await resolveStickyUserId({ ...baseInput, saltScope: "2026-07-19" });

    const call = mocks.stickyResolve.mock.calls[0][0];
    expect(call.seenKey).toBe("sticky:seen:123:abc123def456");
    expect(call.aliasKey).toBe("sticky:alias:123:abc123def456");
    expect(call.seenKeyPrefix).toBe("sticky:seen:123:");
    expect(call.aliasKeyPrefix).toBe("sticky:alias:123:");
    expect(call.candidatesKey).toMatch(/^sticky:cand:123:2026-07-19:[0-9a-f]{16}$/);
    expect(call.rawUserId).toBe("abc123def456");
    expect(call.nowMs).toBe(1_000_000);
  });

  it("uses different candidate pools for different user agents", async () => {
    await resolveStickyUserId(baseInput);
    await resolveStickyUserId({ ...baseInput, userAgent: "Mozilla/5.0 Firefox/128" });

    const [first, second] = mocks.stickyResolve.mock.calls.map(call => call[0].candidatesKey);
    expect(first).not.toBe(second);
  });

  it("marks residential egress ineligible for re-attachment", async () => {
    await resolveStickyUserId({ ...baseInput, isDatacenterEgress: () => false });

    expect(mocks.stickyResolve.mock.calls[0][0].eligible).toBe(false);
  });

  it("marks datacenter egress eligible", async () => {
    await resolveStickyUserId(baseInput);

    expect(mocks.stickyResolve.mock.calls[0][0].eligible).toBe(true);
  });

  it("skips Redis entirely when the connection is not ready", async () => {
    mocks.redisStatus.value = "reconnecting";

    const userId = await resolveStickyUserId(baseInput);

    expect(userId).toBe(baseInput.rawUserId);
    expect(mocks.stickyResolve).not.toHaveBeenCalled();
  });

  it("skips when ip or user agent is missing", async () => {
    expect(await resolveStickyUserId({ ...baseInput, ipAddress: "" })).toBe(baseInput.rawUserId);
    expect(await resolveStickyUserId({ ...baseInput, userAgent: "" })).toBe(baseInput.rawUserId);
    expect(mocks.stickyResolve).not.toHaveBeenCalled();
  });

  it("falls back to the raw fingerprint when Redis fails, without throwing", async () => {
    mocks.stickyResolve.mockRejectedValue(new Error("redis down"));

    const userId = await resolveStickyUserId(baseInput);

    expect(userId).toBe(baseInput.rawUserId);
  });

  it("does nothing when disabled", async () => {
    setStickyIdentityEnabledForTests(false);

    const userId = await resolveStickyUserId(baseInput);

    expect(userId).toBe(baseInput.rawUserId);
    expect(mocks.stickyResolve).not.toHaveBeenCalled();
  });
});
