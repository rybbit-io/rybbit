import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLocation: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("../../db/geolocation/geolocation.js", () => ({ getLocation: mocks.getLocation }));
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { insert: mocks.insert } }));

import { pageviewQueue } from "./pageviewQueue.js";

const payload = {
  site_id: 42,
  timestamp: "2026-07-12T12:00:00.123Z",
  sessionId: "session-1",
  userId: "visitor-1",
  identifiedUserId: "",
  ipAddress: "198.51.100.10",
  ua: { browser: {}, os: {}, device: {}, engine: {}, cpu: {}, ua: "" },
  hostname: "example.com",
  pathname: "/",
} as any;

describe("PageviewQueue delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocation.mockResolvedValue({});
    mocks.insert.mockResolvedValue(undefined);
    (pageviewQueue as any).queue = [];
    (pageviewQueue as any).processing = false;
    (pageviewQueue as any).closing = false;
  });

  it("does not acknowledge an event until ClickHouse stores its batch", async () => {
    let acknowledged = false;
    const delivery = pageviewQueue.add(payload).then(() => {
      acknowledged = true;
    });

    await Promise.resolve();
    expect(acknowledged).toBe(false);

    await (pageviewQueue as any).processQueue();
    await delivery;
    expect(acknowledged).toBe(true);
  });

  it("requeues a transiently failed batch instead of dropping it", async () => {
    mocks.insert.mockRejectedValueOnce(new Error("ClickHouse unavailable"));
    const delivery = pageviewQueue.add(payload);

    await (pageviewQueue as any).processQueue();
    expect((pageviewQueue as any).queue).toHaveLength(1);

    await (pageviewQueue as any).processQueue({ ignoreBackoff: true });
    await expect(delivery).resolves.toBeUndefined();
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });

  it("recovers when enrichment fails before insertion", async () => {
    mocks.getLocation.mockRejectedValueOnce(new Error("GeoIP unavailable"));
    const delivery = pageviewQueue.add(payload);

    await expect((pageviewQueue as any).processQueue()).resolves.toBeUndefined();
    expect((pageviewQueue as any).processing).toBe(false);
    expect((pageviewQueue as any).queue).toHaveLength(1);

    await (pageviewQueue as any).processQueue({ ignoreBackoff: true });
    await expect(delivery).resolves.toBeUndefined();
  });
});
