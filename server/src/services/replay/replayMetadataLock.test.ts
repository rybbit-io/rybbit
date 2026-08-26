import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  eval: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomUUID: () => "test-lock-token",
}));

vi.mock("../../db/redis/redis.js", () => ({
  redis: {
    set: mocks.set,
    eval: mocks.eval,
  },
}));

import { withReplayMetadataLock } from "./replayMetadataLock.js";

describe("withReplayMetadataLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.set.mockResolvedValue("OK");
    mocks.eval.mockResolvedValue(1);
  });

  it("acquires and token-releases the per-session lock", async () => {
    const operation = vi.fn().mockResolvedValue("updated");

    await expect(withReplayMetadataLock(42, "session-123", operation)).resolves.toBe("updated");

    expect(mocks.set).toHaveBeenCalledWith(
      "rybbit:replay-metadata-lock:42:session-123",
      "test-lock-token",
      "PX",
      60_000,
      "NX"
    );
    expect(operation).toHaveBeenCalledOnce();

    const [releaseScript, keyCount, lockKey, token] = mocks.eval.mock.calls[0];
    expect(releaseScript).toContain('redis.call("GET", KEYS[1]) == ARGV[1]');
    expect(releaseScript).toContain('redis.call("DEL", KEYS[1])');
    expect([keyCount, lockKey, token]).toEqual([1, "rybbit:replay-metadata-lock:42:session-123", "test-lock-token"]);
  });

  it("releases the lock when the protected operation fails", async () => {
    const failure = new Error("metadata insert failed");

    await expect(
      withReplayMetadataLock(42, "session-123", async () => {
        throw failure;
      })
    ).rejects.toBe(failure);

    expect(mocks.eval).toHaveBeenCalledOnce();
  });
});
