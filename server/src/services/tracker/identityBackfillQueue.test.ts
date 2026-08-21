import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  command: vi.fn(),
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { command: mocks.command },
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.useFakeTimers();
const { identityBackfillQueue } = await import("./identityBackfillQueue.js");

const TABLE_COUNT = 3;

/** Every key interpolated into the mutations of the most recent flush. */
function flushedKeys() {
  return mocks.command.mock.calls.map(([{ query_params }]) => query_params.keys);
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  // Drain anything a previous test left buffered so each starts empty.
  mocks.command.mockReset();
  mocks.command.mockResolvedValue(undefined);
  await identityBackfillQueue.flush();
  mocks.command.mockReset();
  mocks.command.mockResolvedValue(undefined);
});

describe("identityBackfillQueue", () => {
  it("collapses many identifies into one mutation per table", async () => {
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-b", userId: "user-b" }, 30);

    await identityBackfillQueue.flush();

    expect(mocks.command).toHaveBeenCalledTimes(TABLE_COUNT);
    for (const keys of flushedKeys()) {
      expect(keys).toEqual(["7:anon-a", "7:anon-b"]);
    }
  });

  it("keeps the first assignment when a device identifies twice in a window", async () => {
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "first" }, 30);
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "second" }, 30);

    await identityBackfillQueue.flush();

    expect(mocks.command.mock.calls[0][0].query_params.userIds).toEqual(["first"]);
  });

  it("keeps windows apart so an all-history backfill does not widen the routine ones", async () => {
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-b", userId: "user-b" }, null);

    await identityBackfillQueue.flush();

    const windowed = mocks.command.mock.calls.filter(([{ query_params }]) => query_params.days === 30);
    const unbounded = mocks.command.mock.calls.filter(([{ query_params }]) => query_params.days === undefined);

    expect(windowed).toHaveLength(TABLE_COUNT);
    expect(unbounded).toHaveLength(TABLE_COUNT);
    expect(windowed[0][0].query).toContain("INTERVAL {days: UInt16} DAY");
    expect(unbounded[0][0].query).not.toContain("INTERVAL");
  });

  it("retries assignments whose mutation failed instead of dropping them", async () => {
    mocks.command.mockRejectedValueOnce(new Error("ClickHouse timeout"));

    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);
    await identityBackfillQueue.flush();
    expect(mocks.command).toHaveBeenCalledTimes(TABLE_COUNT);

    mocks.command.mockReset();
    mocks.command.mockResolvedValue(undefined);

    await identityBackfillQueue.flush();

    expect(mocks.command).toHaveBeenCalledTimes(TABLE_COUNT);
    expect(mocks.command.mock.calls[0][0].query_params.keys).toEqual(["7:anon-a"]);
  });

  it("gives up after repeated failures rather than retrying forever", async () => {
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);

    for (let attempt = 0; attempt < 3; attempt++) {
      mocks.command.mockReset();
      mocks.command.mockRejectedValue(new Error("ClickHouse down"));
      await identityBackfillQueue.flush();
      expect(mocks.command).toHaveBeenCalledTimes(TABLE_COUNT);
    }

    mocks.command.mockReset();
    mocks.command.mockResolvedValue(undefined);
    await identityBackfillQueue.flush();

    expect(mocks.command).not.toHaveBeenCalled();
  });

  it("drains identities that arrived while a flush was in progress", async () => {
    const inFlight = deferred();
    mocks.command.mockReturnValueOnce(inFlight.promise);

    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);
    const first = identityBackfillQueue.flush();

    // Arrives after the first flush took its snapshot.
    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-b", userId: "user-b" }, 30);

    inFlight.resolve();
    await first;
    await identityBackfillQueue.flush();

    const allKeys = flushedKeys().flat();
    expect(allKeys).toContain("7:anon-a");
    expect(allKeys).toContain("7:anon-b");
  });

  it("waits for an in-flight flush so shutdown does not abandon it", async () => {
    const inFlight = deferred();
    mocks.command.mockReturnValueOnce(inFlight.promise);

    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);
    const first = identityBackfillQueue.flush();

    let shutdownDone = false;
    // What server shutdown does: flush() must not resolve while work is in flight.
    const shutdown = identityBackfillQueue.flush().then(() => {
      shutdownDone = true;
    });

    await Promise.resolve();
    expect(shutdownDone).toBe(false);

    inFlight.resolve();
    await first;
    await shutdown;

    expect(shutdownDone).toBe(true);
  });

  it("splits an oversized backlog across several mutations", async () => {
    const inFlight = deferred();
    mocks.command.mockReturnValueOnce(inFlight.promise);

    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "held", userId: "u" }, 30);
    const first = identityBackfillQueue.flush();

    // Everything below arrives while that flush is stuck, so it all lands in
    // one backlog rather than being spread over separate windows.
    for (let i = 0; i < 5001; i++) {
      identityBackfillQueue.enqueue({ siteId: 7, anonymousId: `anon-${i}`, userId: `user-${i}` }, 30);
    }

    inFlight.resolve();
    await first;
    // Joins the end of the chain, including the drains the size trigger queued.
    await identityBackfillQueue.flush();

    const mutations = mocks.command.mock.calls.map(([{ query_params }]) => query_params.keys);
    expect(mutations.every(keys => keys.length <= 5000)).toBe(true);

    const covered = new Set(mutations.flat());
    for (let i = 0; i < 5001; i++) {
      expect(covered.has(`7:anon-${i}`)).toBe(true);
    }
    expect(covered.has("7:held")).toBe(true);
  });

  it("retries a shutdown failure instead of exiting on top of it", async () => {
    mocks.command.mockRejectedValueOnce(new Error("ClickHouse blip"));

    identityBackfillQueue.enqueue({ siteId: 7, anonymousId: "anon-a", userId: "user-a" }, 30);
    await identityBackfillQueue.drainCompletely();

    // One failed table, then a clean retry round: nothing is left behind.
    expect(mocks.command).toHaveBeenCalledTimes(TABLE_COUNT * 2);

    mocks.command.mockReset();
    mocks.command.mockResolvedValue(undefined);
    await identityBackfillQueue.flush();
    expect(mocks.command).not.toHaveBeenCalled();
  });
});
