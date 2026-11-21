import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: { query: { featureFlags: { findMany: mocks.findMany } } },
}));

vi.mock("../../db/redis/redis.js", () => ({
  redis: { get: mocks.get, set: mocks.set, del: mocks.del },
}));

import {
  getFeatureFlagDefinitions,
  getFeatureFlagDefinitionsForRuntime,
  invalidateFeatureFlagDefinitions,
} from "./definitions.js";

describe("feature flag definitions cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(null);
    mocks.set.mockResolvedValue("OK");
    mocks.del.mockResolvedValue(1);
  });

  it("caches empty results so flagless sites do not repeatedly query Postgres", async () => {
    mocks.findMany.mockResolvedValue([]);

    await expect(getFeatureFlagDefinitions(123)).resolves.toEqual([]);

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith("feature-flags:definitions:123", "[]", "EX", 300);
  });

  it("returns definitions from the shared cache without querying Postgres", async () => {
    const definitions = [{ flagId: 1, siteId: 123, key: "checkout" }];
    mocks.get.mockResolvedValue(JSON.stringify(definitions));

    await expect(getFeatureFlagDefinitions(123)).resolves.toEqual(definitions);

    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not enable browser evaluation for server-only flags", async () => {
    mocks.get.mockResolvedValue(
      JSON.stringify([
        { flagId: 1, siteId: 123, key: "server_key", runtime: "server" },
        { flagId: 2, siteId: 123, key: "shared_key", runtime: "both" },
      ])
    );

    await expect(getFeatureFlagDefinitionsForRuntime(123, "client")).resolves.toEqual([
      { flagId: 2, siteId: 123, key: "shared_key", runtime: "both" },
    ]);
  });

  it("falls back to Postgres when Redis is unavailable", async () => {
    const definitions = [{ flagId: 1, siteId: 456, key: "checkout" }];
    mocks.get.mockRejectedValue(new Error("redis unavailable"));
    mocks.findMany.mockResolvedValue(definitions);
    mocks.set.mockRejectedValue(new Error("redis unavailable"));

    await expect(getFeatureFlagDefinitions(456)).resolves.toEqual(definitions);
  });

  it("invalidates the shared cache after a mutation", async () => {
    await invalidateFeatureFlagDefinitions(123);

    expect(mocks.del).toHaveBeenCalledWith("feature-flags:definitions:123");
  });
});
