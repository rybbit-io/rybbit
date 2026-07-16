import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: mocks.query },
}));
vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true }));

import { ImportQuotaTracker } from "./importQuotaTracker.js";

describe("ImportQuotaTracker batch usage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ json: async () => [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queries usage only for months represented in the current batch", async () => {
    await ImportQuotaTracker.createFromSnapshot({
      siteIds: [42, 43],
      subscription: {
        source: "stripe",
        subscriptionId: "sub_123",
        priceId: "price_123",
        planName: "pro-100k-monthly",
        eventLimit: 100_000,
        replayLimit: 1_000,
        periodStart: "2026-07-01",
        currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
        status: "active",
        interval: "month",
        cancelAtPeriodEnd: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      timestamps: ["2026-06-01 12:00:00", "2026-07-01 12:00:00", "2026-07-02 12:00:00"],
    });

    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("toYYYYMM(timestamp) IN {months:Array(UInt32)}"),
        query_params: expect.objectContaining({ months: [202606, 202607] }),
      })
    );
  });

  it("does not query ClickHouse for an empty final batch", async () => {
    await ImportQuotaTracker.createFromSnapshot({
      siteIds: [42],
      subscription: {
        source: "free",
        eventLimit: 10_000,
        periodStart: "2026-07-01",
        planName: "free",
        status: "free",
      },
      timestamps: [],
    });

    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("applies numeric ClickHouse month keys to the matching import month", async () => {
    mocks.query.mockResolvedValue({ json: async () => [{ month: 202607, count: "99999" }] });
    const tracker = await ImportQuotaTracker.createFromSnapshot({
      siteIds: [42],
      subscription: {
        source: "stripe",
        subscriptionId: "sub_123",
        priceId: "price_123",
        planName: "pro-100k-monthly",
        eventLimit: 100_000,
        replayLimit: 1_000,
        periodStart: "2026-07-01",
        currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
        status: "active",
        interval: "month",
        cancelAtPeriodEnd: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      timestamps: ["2026-07-01 12:00:00", "2026-07-02 12:00:00"],
    });

    expect(tracker.canImportBatch(["2026-07-01 12:00:00", "2026-07-02 12:00:00"])).toEqual([0]);
  });
});
