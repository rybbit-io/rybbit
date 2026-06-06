import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionGetOrCreate: vi.fn(),
  quit: vi.fn(),
}));

vi.mock("../../db/redis/redis.js", () => ({
  redis: { quit: mocks.quit },
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

  it("falls back to a window-stable id when Redis fails, without throwing", async () => {
    mocks.sessionGetOrCreate.mockRejectedValue(new Error("redis down"));

    const first = await service.updateSession({ userId: "user-b", siteId: 7 });
    // Same 30-minute bucket → same fallback id, so events still share a session.
    vi.setSystemTime(new Date(Date.now() + SESSION_TTL_MS - 1000));
    const second = await service.updateSession({ userId: "user-b", siteId: 7 });

    expect(first.sessionId).toBe(second.sessionId);
    expect(first.sessionId).toContain("7");
    expect(first.sessionId).toContain("user-b");
  });

  it("rotates the fallback id once the time bucket advances", async () => {
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
