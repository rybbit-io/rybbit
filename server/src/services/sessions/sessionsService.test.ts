import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionGetOrCreate: vi.fn(),
  eval: vi.fn(),
  quit: vi.fn(),
}));

vi.mock("../../db/redis/redis.js", () => ({
  sessionRedis: { quit: mocks.quit, eval: (...args: unknown[]) => mocks.eval(...args) },
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
    mocks.eval.mockReset();
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

describe("SessionsService.resolveReplaySession", () => {
  let service: SessionsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    mocks.sessionGetOrCreate.mockReset();
    mocks.eval.mockReset();
    service = new SessionsService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const replayBatch = (hasFullSnapshot = false) =>
    service.resolveReplaySession({ userId: "user-e", siteId: 9, hasFullSnapshot });

  it("resolves through the analytics key without the renewing command", async () => {
    mocks.eval.mockResolvedValue(["sess-existing", 0]);

    const result = await service.resolveReplaySession({ userId: "user-a", siteId: 42, hasFullSnapshot: true });

    expect(result).toEqual({ sessionId: "sess-existing", needsFullSnapshot: false });
    expect(mocks.sessionGetOrCreate).not.toHaveBeenCalled();
    const [script, keyCount, key, replayKey, candidate, ttl, hasFullSnapshot] = mocks.eval.mock.calls[0];
    // Nothing in the script slides a TTL it didn't just set.
    expect(script).not.toMatch(/EXPIRE/i);
    expect(keyCount).toBe(2);
    expect(key).toBe("session:42:user-a");
    expect(replayKey).toBe("replay-session:42:user-a");
    expect(candidate).toHaveLength(14);
    expect(ttl).toBe(SESSION_TTL_MS);
    expect(hasFullSnapshot).toBe("1");
  });

  it("passes on the script's request for a full snapshot", async () => {
    mocks.eval.mockResolvedValue(["sess-previous", 1]);

    expect(await replayBatch()).toEqual({ sessionId: "sess-previous", needsFullSnapshot: true });
    expect(mocks.eval.mock.calls[0][6]).toBe("0");
  });

  it("uses the same identified session key as updateSession", async () => {
    mocks.sessionGetOrCreate.mockResolvedValue("x");
    mocks.eval.mockResolvedValue(["x", 0]);

    await service.updateSession({ userId: "fingerprint", identifiedUserId: "employee-alice", siteId: 42 });
    await service.resolveReplaySession({
      userId: "fingerprint",
      identifiedUserId: "employee-alice",
      siteId: 42,
      hasFullSnapshot: false,
    });

    expect(mocks.eval.mock.calls[0][2]).toBe(mocks.sessionGetOrCreate.mock.calls[0][0]);
  });

  it("keeps a replay in the session Redis resolved when a later lookup fails", async () => {
    // An existing session: this worker never saw an event for the visitor.
    mocks.eval.mockResolvedValueOnce(["sess-real", 0]);
    await replayBatch();

    mocks.eval.mockRejectedValue(new Error("redis blip"));
    expect(await replayBatch()).toEqual({ sessionId: "sess-real", needsFullSnapshot: false });
  });

  it("keeps a replay in one session through an outage longer than the analytics window", async () => {
    mocks.eval.mockRejectedValue(new Error("redis down"));
    const first = await replayBatch(true);

    for (let minute = 20; minute <= 80; minute += 20) {
      vi.setSystemTime(new Date(Date.parse("2026-01-01T00:00:00.000Z") + minute * 60_000));
      expect(await replayBatch()).toEqual({ sessionId: first.sessionId, needsFullSnapshot: false });
    }
  });

  it("does not slide the analytics fallback window during an outage", async () => {
    mocks.sessionGetOrCreate.mockResolvedValueOnce("sess-real");
    await service.updateSession({ userId: "user-e", siteId: 9 });
    mocks.sessionGetOrCreate.mockRejectedValue(new Error("redis down"));
    mocks.eval.mockRejectedValue(new Error("redis down"));

    vi.setSystemTime(new Date(Date.now() + SESSION_TTL_MS - 1000));
    expect((await replayBatch()).sessionId).toBe("sess-real");

    // Replay didn't extend the analytics session, so the next event starts another.
    vi.setSystemTime(new Date(Date.now() + 2000));
    const event = await service.updateSession({ userId: "user-e", siteId: 9 });
    expect(event.sessionId).not.toBe("sess-real");

    // The replay waits for a full snapshot before following it.
    expect(await replayBatch()).toEqual({ sessionId: "sess-real", needsFullSnapshot: true });
    expect(await replayBatch(true)).toEqual({ sessionId: event.sessionId, needsFullSnapshot: false });
  });
});
