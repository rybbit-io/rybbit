import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionGetOrCreate: vi.fn(),
  quit: vi.fn(),
}));

vi.mock("../../db/redis/redis.js", () => ({
  sessionRedis: { quit: mocks.quit },
  sessionGetOrCreate: (...args: unknown[]) => mocks.sessionGetOrCreate(...args),
}));

import { SessionsService } from "./sessionsService.js";

const SESSION_TTL_MS = 30 * 60 * 1000;

describe("SessionsService (Redis-backed)", () => {
  let service: SessionsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    mocks.sessionGetOrCreate.mockReset();
    mocks.quit.mockReset();
    service = new SessionsService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the session id resolved by Redis and refreshes its TTL", async () => {
    mocks.sessionGetOrCreate.mockResolvedValue("sess-existing");

    const result = await service.updateSession({ userId: "user-a", siteId: 42 });

    expect(result.sessionId).toBe("sess-existing");
    expect(mocks.sessionGetOrCreate).toHaveBeenCalledTimes(1);
    const [key, candidate, ttl] = mocks.sessionGetOrCreate.mock.calls[0];
    expect(key).toBe("session:42:user-a");
    expect(typeof candidate).toBe("string");
    expect(candidate).toHaveLength(14); // nanoid(14) candidate
    expect(ttl).toBe(SESSION_TTL_MS);
  });

  it("namespaces the Redis key by site and user", async () => {
    mocks.sessionGetOrCreate.mockResolvedValue("x");

    await service.updateSession({ userId: "u1", siteId: 1 });
    await service.updateSession({ userId: "u1", siteId: 2 });
    await service.updateSession({ userId: "u2", siteId: 1 });

    const keys = mocks.sessionGetOrCreate.mock.calls.map(c => c[0]);
    expect(keys).toEqual(["session:1:u1", "session:2:u1", "session:1:u2"]);
  });

  it("keeps the anonymous Redis key unchanged when identified user ID is empty", async () => {
    mocks.sessionGetOrCreate.mockResolvedValue("x");

    await service.updateSession({ userId: "anonymous-user", identifiedUserId: "", siteId: 42 });

    expect(mocks.sessionGetOrCreate.mock.calls[0][0]).toBe("session:42:anonymous-user");
  });

  it("separates identified users that share the same anonymous fingerprint", async () => {
    mocks.sessionGetOrCreate.mockResolvedValue("x");

    await service.updateSession({ userId: "shared-fingerprint", identifiedUserId: "employee-alice", siteId: 42 });
    await service.updateSession({ userId: "shared-fingerprint", identifiedUserId: "employee-bob", siteId: 42 });

    const keys = mocks.sessionGetOrCreate.mock.calls.map(call => call[0] as string);
    expect(new Set(keys).size).toBe(2);
    expect(keys.every(key => key.startsWith("session:42:identified:"))).toBe(true);
    expect(keys.every(key => !key.includes("employee-alice") && !key.includes("employee-bob"))).toBe(true);
  });

  it("separates the same identified user across distinct anonymous fingerprints", async () => {
    mocks.sessionGetOrCreate.mockResolvedValue("x");

    await service.updateSession({ userId: "device-a", identifiedUserId: "employee-alice", siteId: 42 });
    await service.updateSession({ userId: "device-b", identifiedUserId: "employee-alice", siteId: 42 });

    const keys = mocks.sessionGetOrCreate.mock.calls.map(call => call[0]);
    expect(new Set(keys).size).toBe(2);
  });

  it("keeps colliding identified users separate during a Redis outage", async () => {
    mocks.sessionGetOrCreate.mockRejectedValue(new Error("redis down"));

    const alice = await service.updateSession({
      userId: "shared-fingerprint",
      identifiedUserId: "employee-alice",
      siteId: 42,
    });
    const bob = await service.updateSession({
      userId: "shared-fingerprint",
      identifiedUserId: "employee-bob",
      siteId: 42,
    });

    expect(alice.sessionId).not.toBe(bob.sessionId);
  });

  it("falls back to a window-stable id when Redis fails, without throwing", async () => {
    mocks.sessionGetOrCreate.mockRejectedValue(new Error("redis down"));

    const first = await service.updateSession({ userId: "user-b", siteId: 7 });
    // Still within the sliding window → same fallback id, so events stay grouped.
    vi.setSystemTime(new Date(Date.now() + SESSION_TTL_MS - 1000));
    const second = await service.updateSession({ userId: "user-b", siteId: 7 });

    expect(first.sessionId).toBe(second.sessionId);
    expect(typeof first.sessionId).toBe("string");
    expect(first.sessionId.length).toBeGreaterThan(0);
  });

  it("reuses the real Redis session id when a later command blips, instead of splitting", async () => {
    // The core regression guard: an intermittent Redis failure must not fracture
    // a visitor into multiple sessions. The blip should inherit the real id.
    mocks.sessionGetOrCreate.mockResolvedValueOnce("sess-real");
    const ok = await service.updateSession({ userId: "user-d", siteId: 9 });

    mocks.sessionGetOrCreate.mockRejectedValueOnce(new Error("redis blip"));
    const blip = await service.updateSession({ userId: "user-d", siteId: 9 });

    expect(ok.sessionId).toBe("sess-real");
    expect(blip.sessionId).toBe("sess-real");
  });

  it("rotates the fallback id once the sliding window lapses", async () => {
    mocks.sessionGetOrCreate.mockRejectedValue(new Error("redis down"));

    const first = await service.updateSession({ userId: "user-c", siteId: 7 });
    vi.setSystemTime(new Date(Date.now() + SESSION_TTL_MS + 1000));
    const later = await service.updateSession({ userId: "user-c", siteId: 7 });

    expect(first.sessionId).not.toBe(later.sessionId);
  });

  it("closes the Redis connection on shutdown", async () => {
    mocks.quit.mockResolvedValue("OK");
    await service.close();
    expect(mocks.quit).toHaveBeenCalledTimes(1);
  });
});
