import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: {},
}));

vi.mock("../storage/r2StorageService.js", () => ({
  r2Storage: {
    deleteBatch: vi.fn(),
    getBatch: vi.fn(),
    isEnabled: () => false,
    storeBatch: vi.fn(),
  },
}));

import { ReplayPayloadStorage } from "./replayPayloadStorage.js";

function resultSet(rows: unknown[]) {
  return { json: async () => rows };
}

function makeDependencies() {
  const analyticsStore = {
    command: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(resultSet([])),
  };
  const objectStorage = {
    deleteBatch: vi.fn().mockResolvedValue(undefined),
    getBatch: vi.fn().mockResolvedValue([]),
    isEnabled: vi.fn().mockReturnValue(false),
    storeBatch: vi.fn().mockResolvedValue(null),
  };

  return {
    analyticsStore,
    objectStorage,
    storage: new ReplayPayloadStorage(analyticsStore as any, objectStorage),
  };
}

describe("ReplayPayloadStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconstructs hybrid inline and keyed payloads through their adapters", async () => {
    const { analyticsStore, objectStorage, storage } = makeDependencies();
    analyticsStore.query.mockResolvedValue(
      resultSet([
        {
          batch_index: null,
          data: JSON.stringify({ source: "inline" }),
          event_data_key: null,
          timestamp: 200,
          type: "2",
        },
        {
          batch_index: 0,
          data: "",
          event_data_key: "42/session/object.json.zst",
          timestamp: 100,
          type: "2",
        },
        {
          batch_index: 1,
          data: "",
          event_data_key: "42/session/object.json.zst",
          timestamp: 300,
          type: "3",
        },
      ])
    );
    objectStorage.getBatch.mockResolvedValue([{ source: "keyed" }, false]);

    await expect(storage.readSessionEvents(42, "session")).resolves.toEqual([
      { data: { source: "keyed" }, timestamp: 100, type: 2 },
      { data: { source: "inline" }, timestamp: 200, type: 2 },
      { data: false, timestamp: 300, type: 3 },
    ]);
    expect(objectStorage.getBatch).toHaveBeenCalledWith("42/session/object.json.zst");
  });

  it("does not parse a keyed row as inline data when object storage is disabled", async () => {
    const { analyticsStore, objectStorage, storage } = makeDependencies();
    analyticsStore.query.mockResolvedValue(
      resultSet([
        {
          batch_index: 0,
          data: "",
          event_data_key: "42/session/object.json.zst",
          timestamp: 100,
          type: "2",
        },
      ])
    );
    objectStorage.isEnabled.mockReturnValue(false);
    objectStorage.getBatch.mockRejectedValue(new Error("R2 storage is not enabled"));

    await expect(storage.readSessionEvents(42, "session")).rejects.toThrow("R2 storage is not enabled");
    expect(objectStorage.getBatch).toHaveBeenCalledWith("42/session/object.json.zst");
  });

  it("compensates object storage when the ClickHouse insert fails", async () => {
    const { analyticsStore, objectStorage, storage } = makeDependencies();
    const insertError = new Error("ClickHouse unavailable");
    analyticsStore.insert.mockRejectedValue(insertError);
    objectStorage.isEnabled.mockReturnValue(true);
    objectStorage.storeBatch.mockResolvedValue("42/session/new-object.json.zst");

    await expect(
      storage.storeEvents({
        events: [{ data: { node: 1 }, timestamp: 100, type: 2 }],
        identifiedUserId: "identified-user",
        sessionId: "session",
        siteId: 42,
        userId: "device-user",
      })
    ).rejects.toBe(insertError);

    expect(objectStorage.deleteBatch).toHaveBeenCalledWith("42/session/new-object.json.zst");
  });

  it("retains ClickHouse key references when disabled object storage cannot delete them", async () => {
    const { analyticsStore, objectStorage, storage } = makeDependencies();
    analyticsStore.query.mockResolvedValue(resultSet([{ event_data_key: "42/session/old-object.json.zst" }]));
    objectStorage.isEnabled.mockReturnValue(false);
    objectStorage.deleteBatch.mockRejectedValue(new Error("R2 storage is not enabled"));

    await expect(storage.deleteSessionEvents(42, "session")).rejects.toThrow("R2 storage is not enabled");
    expect(objectStorage.deleteBatch).toHaveBeenCalledWith("42/session/old-object.json.zst");
    expect(analyticsStore.command).not.toHaveBeenCalled();
  });

  it("cleans user payload objects before erasing their only ClickHouse references", async () => {
    const { analyticsStore, objectStorage, storage } = makeDependencies();
    analyticsStore.query.mockResolvedValue(resultSet([{ event_data_key: "42/session/user-object.json.zst" }]));

    await storage.deleteUserEvents(42, "identified-user", ["identified-user", "device-user"]);

    expect(analyticsStore.query.mock.calls[0][0].query).toContain("identified_user_id = {userId:String}");
    expect(analyticsStore.query.mock.calls[0][0].query_params).toEqual({
      deviceIds: ["identified-user", "device-user"],
      siteId: 42,
      userId: "identified-user",
    });
    expect(objectStorage.deleteBatch).toHaveBeenCalledWith("42/session/user-object.json.zst");
    expect(analyticsStore.command).toHaveBeenCalledWith(
      expect.objectContaining({
        query_params: {
          deviceIds: ["identified-user", "device-user"],
          siteId: 42,
          userId: "identified-user",
        },
      })
    );
    expect(objectStorage.deleteBatch.mock.invocationCallOrder[0]).toBeLessThan(
      analyticsStore.command.mock.invocationCallOrder[0]
    );
  });
});
