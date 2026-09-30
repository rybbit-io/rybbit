import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  site: null as Record<string, unknown> | null,
  updateError: null as Error | null,
  deleteError: null as Error | null,
  updates: [] as Record<string, unknown>[],
  deletes: 0,
}));

const mocks = vi.hoisted(() => ({
  clickhouseCommand: vi.fn(),
  clickhouseQuery: vi.fn(),
  invalidate: vi.fn(),
  getConfig: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    query: {
      sites: {
        findFirst: vi.fn(async () => state.site),
      },
    },
    update: vi.fn(() => ({
      set: (data: Record<string, unknown>) => ({
        where: async () => {
          if (state.updateError) throw state.updateError;
          state.updates.push(data);
        },
      }),
    })),
    delete: vi.fn(() => ({
      where: async () => {
        if (state.deleteError) throw state.deleteError;
        state.deletes += 1;
      },
    })),
  },
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { command: mocks.clickhouseCommand, query: mocks.clickhouseQuery },
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { invalidate: mocks.invalidate, getConfig: mocks.getConfig },
}));

vi.mock("../../api/stripe/getSubscription.js", () => ({
  getSubscriptionInner: vi.fn(),
}));

import { siteConfigurationLifecycle } from "./siteConfigurationLifecycle.js";

function makeSite() {
  return {
    siteId: 1,
    id: "abcdef123456",
    type: null,
    domain: "example.com",
    organizationId: "org_1",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.site = makeSite();
  state.updateError = null;
  state.deleteError = null;
  state.updates.length = 0;
  state.deletes = 0;
  mocks.clickhouseCommand.mockResolvedValue(undefined);
  mocks.clickhouseQuery.mockResolvedValue({ json: async () => [] });
  mocks.getConfig.mockResolvedValue({ siteId: 1, id: "abcdef123456", name: "Renamed" });
});

describe("siteConfigurationLifecycle", () => {
  it("clears the detected platform when the site domain changes", async () => {
    state.site = { ...makeSite(), detectedPlatform: "wordpress" };
    await siteConfigurationLifecycle.update(1, { domain: "new.example.com" });
    expect(state.updates[0]).toMatchObject({ domain: "new.example.com", detectedPlatform: null });
  });
  it("updates persistence once, invalidates the Site, and reloads its configuration", async () => {
    const result = await siteConfigurationLifecycle.update(1, { name: "Renamed" });

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toMatchObject({ name: "Renamed" });
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(mocks.invalidate).toHaveBeenCalledWith(state.site);
    expect(mocks.getConfig).toHaveBeenCalledWith(1);
    expect(result).toMatchObject({ name: "Renamed" });
  });

  it("propagates persistence failures without invalidating the cache", async () => {
    state.updateError = new Error("postgres unavailable");

    await expect(siteConfigurationLifecycle.update(1, { name: "Renamed" })).rejects.toThrow("postgres unavailable");

    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.getConfig).not.toHaveBeenCalled();
  });

  it("owns private-link persistence and invalidation", async () => {
    const privateLinkKey = await siteConfigurationLifecycle.updatePrivateLink(1, "generate_private_link_key");

    expect(privateLinkKey).toMatch(/^[a-f0-9]{12}$/);
    expect(state.updates).toEqual([{ privateLinkKey }]);
    expect(mocks.invalidate).toHaveBeenCalledWith(state.site);
  });

  it("deletes replay data before the Site row and then invalidates the Site", async () => {
    await siteConfigurationLifecycle.delete(1);

    expect(mocks.clickhouseCommand).toHaveBeenCalledTimes(2);
    expect(state.deletes).toBe(1);
    expect(mocks.invalidate).toHaveBeenCalledWith(state.site);
  });

  it("does not report deletion when replay cleanup fails", async () => {
    mocks.clickhouseCommand.mockRejectedValueOnce(new Error("clickhouse unavailable"));

    await expect(siteConfigurationLifecycle.delete(1)).rejects.toThrow("clickhouse unavailable");

    expect(state.deletes).toBe(0);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it("erases retained legacy and backfill metadata before deleting the site", async () => {
    mocks.clickhouseQuery.mockResolvedValue({
      json: async () => [{ name: "session_replay_metadata" }, { name: "session_replay_metadata_v2_backfill" }],
    });
    await siteConfigurationLifecycle.delete(1);
    const queries = mocks.clickhouseCommand.mock.calls.map(([command]) => command.query);
    expect(queries).toEqual(
      expect.arrayContaining([
        "DELETE FROM session_replay_metadata WHERE site_id = {id:UInt32}",
        "DELETE FROM session_replay_metadata_v2 WHERE site_id = {id:UInt32}",
        "DELETE FROM session_replay_metadata_v2_backfill WHERE site_id = {id:UInt32}",
      ])
    );
    expect(state.deletes).toBe(1);
  });

  it("does not delete the site when rollback-table discovery fails", async () => {
    mocks.clickhouseQuery.mockRejectedValueOnce(new Error("discovery failed"));
    await expect(siteConfigurationLifecycle.delete(1)).rejects.toThrow("discovery failed");
    expect(state.deletes).toBe(0);
  });
});
