import RedisMock from "ioredis-mock";
import { beforeEach, describe, expect, it } from "vitest";
import { pickReplaySession, REPLAY_SESSION_LUA } from "./replaySession.js";

// The Lua runs for real in ioredis-mock's embedded Lua runtime, against the
// same cases as its in-process copy, so the two can't drift apart.

const ANALYTICS_KEY = "session:42:visitor";
const REPLAY_KEY = "replay-session:42:visitor";
const TTL_MS = 30 * 60 * 1000;

type Case = {
  name: string;
  analytics: string | null;
  replay: string | null;
  hasFullSnapshot: boolean;
  sessionId: string;
  needsFullSnapshot: boolean;
};

const CASES: Case[] = [
  {
    name: "a first batch starts the session its pageview will join",
    analytics: null,
    replay: null,
    hasFullSnapshot: true,
    sessionId: "candidate",
    needsFullSnapshot: false,
  },
  {
    name: "a first batch without a snapshot asks for one",
    analytics: null,
    replay: null,
    hasFullSnapshot: false,
    sessionId: "candidate",
    needsFullSnapshot: true,
  },
  {
    name: "a replay joins the analytics session",
    analytics: "A",
    replay: null,
    hasFullSnapshot: true,
    sessionId: "A",
    needsFullSnapshot: false,
  },
  {
    name: "a replay joining without a snapshot (a new identity) asks for one",
    analytics: "A",
    replay: null,
    hasFullSnapshot: false,
    sessionId: "A",
    needsFullSnapshot: true,
  },
  {
    name: "a replay continues in the analytics session",
    analytics: "A",
    replay: "A",
    hasFullSnapshot: false,
    sessionId: "A",
    needsFullSnapshot: false,
  },
  {
    name: "a replay outlives its lapsed analytics session",
    analytics: null,
    replay: "A",
    hasFullSnapshot: false,
    sessionId: "A",
    needsFullSnapshot: false,
  },
  {
    name: "a snapshot alone doesn't start a session once analytics has lapsed",
    analytics: null,
    replay: "A",
    hasFullSnapshot: true,
    sessionId: "A",
    needsFullSnapshot: false,
  },
  {
    name: "a replay waits in its session for a snapshot before following a new one",
    analytics: "B",
    replay: "A",
    hasFullSnapshot: false,
    sessionId: "A",
    needsFullSnapshot: true,
  },
  {
    name: "a replay follows a new analytics session from a batch with a snapshot",
    analytics: "B",
    replay: "A",
    hasFullSnapshot: true,
    sessionId: "B",
    needsFullSnapshot: false,
  },
];

interface SessionMockRedis {
  eval(script: string, keyCount: number, ...args: (string | number)[]): Promise<[string, number]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "PX", ttlMs: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
  flushall(): Promise<unknown>;
}

describe("REPLAY_SESSION_LUA", () => {
  let redis: SessionMockRedis;

  beforeEach(async () => {
    redis = new RedisMock() as unknown as SessionMockRedis;
    await redis.flushall();
  });

  async function resolve(hasFullSnapshot: boolean) {
    const [sessionId, needsFullSnapshot] = await redis.eval(
      REPLAY_SESSION_LUA,
      2,
      ANALYTICS_KEY,
      REPLAY_KEY,
      "candidate",
      TTL_MS,
      hasFullSnapshot ? "1" : "0"
    );
    return { sessionId, needsFullSnapshot: needsFullSnapshot === 1 };
  }

  for (const testCase of CASES) {
    it(testCase.name, async () => {
      if (testCase.analytics) await redis.set(ANALYTICS_KEY, testCase.analytics, "PX", 1000);
      if (testCase.replay) await redis.set(REPLAY_KEY, testCase.replay, "PX", 1000);

      expect(await resolve(testCase.hasFullSnapshot)).toEqual({
        sessionId: testCase.sessionId,
        needsFullSnapshot: testCase.needsFullSnapshot,
      });

      // The replay's session is the one it's in now, on a fresh window.
      expect(await redis.get(REPLAY_KEY)).toBe(testCase.sessionId);
      expect(await redis.pttl(REPLAY_KEY)).toBeGreaterThan(1000);
      // The analytics session is only ever created, never renewed or moved.
      expect(await redis.get(ANALYTICS_KEY)).toBe(testCase.analytics ?? (testCase.replay ? null : testCase.sessionId));
      if (testCase.analytics) {
        expect(await redis.pttl(ANALYTICS_KEY)).toBeLessThanOrEqual(1000);
      }
    });
  }
});

describe("pickReplaySession", () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      expect(pickReplaySession(testCase.analytics, testCase.replay, testCase.hasFullSnapshot)).toEqual({
        sessionId: testCase.sessionId === "candidate" ? null : testCase.sessionId,
        needsFullSnapshot: testCase.needsFullSnapshot,
      });
    });
  }
});
