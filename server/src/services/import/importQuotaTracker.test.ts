import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImportQuotaTracker } from "./importQuotaTracker.js";
import { db } from "../../db/postgres/postgres.js";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: { select: vi.fn() },
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  getBestSubscription: vi.fn(),
}));

vi.mock("../../lib/const.js", () => ({
  IS_CLOUD: true,
}));

vi.mock("../../api/analytics/utils/utils.js", () => ({
  processResults: vi.fn(),
}));

// The constructor is private; tests build trackers directly with injected state
// instead of going through the DB/ClickHouse-backed static create().
function makeTracker(usage: Record<string, number>, limit: number, oldestAllowedMonth: string): ImportQuotaTracker {
  return new (ImportQuotaTracker as any)(new Map(Object.entries(usage)), limit, oldestAllowedMonth);
}

// Drizzle query builders are thenable; create() awaits `.limit(1)` for the org
// row and `.where(...)` for the site rows, so every link resolves to `rows`.
function chainResolving(rows: unknown) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

function mockDbForCreate() {
  vi.mocked(db.select as any)
    .mockReturnValueOnce(chainResolving([{ stripeCustomerId: "cus_123" }]))
    .mockReturnValueOnce(chainResolving([])); // no sites -> ClickHouse never queried
}

describe("ImportQuotaTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Current month is 2024-06.
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("canImportBatch", () => {
    it("should allow all timestamps when under the monthly limit", () => {
      const tracker = makeTracker({}, 10, "202312");
      const result = tracker.canImportBatch(["2024-06-01 00:00:00", "2024-06-10 08:15:30", "2024-06-14 23:59:59"]);
      expect(result).toEqual([0, 1, 2]);
    });

    it("should return an empty array for an empty batch", () => {
      const tracker = makeTracker({}, 10, "202312");
      expect(tracker.canImportBatch([])).toEqual([]);
    });

    it("should account for existing usage in a month", () => {
      const tracker = makeTracker({ "202405": 3 }, 5, "202312");
      const result = tracker.canImportBatch([
        "2024-05-01 10:00:00",
        "2024-05-02 10:00:00",
        "2024-05-03 10:00:00",
        "2024-05-04 10:00:00",
      ]);
      // Only 2 slots remain in May (3 used out of 5).
      expect(result).toEqual([0, 1]);
    });

    it("should track quota per month independently in a batch spanning months", () => {
      const tracker = makeTracker({}, 2, "202312");
      const result = tracker.canImportBatch([
        "2024-05-01 10:00:00",
        "2024-06-01 10:00:00",
        "2024-05-02 10:00:00",
        "2024-06-02 10:00:00",
        "2024-05-03 10:00:00", // 3rd May event exceeds May's limit
      ]);
      expect(result).toEqual([0, 1, 2, 3]);
    });

    it("should reject events for a month exactly at the limit", () => {
      const tracker = makeTracker({ "202406": 5 }, 5, "202312");
      expect(tracker.canImportBatch(["2024-06-01 10:00:00"])).toEqual([]);
    });

    it("should allow exactly one more event when one below the limit", () => {
      const tracker = makeTracker({ "202406": 4 }, 5, "202312");
      expect(tracker.canImportBatch(["2024-06-01 10:00:00", "2024-06-02 10:00:00"])).toEqual([0]);
    });

    it("should accumulate increments across successive calls", () => {
      const tracker = makeTracker({}, 3, "202312");
      expect(tracker.canImportBatch(["2024-06-01 10:00:00", "2024-06-02 10:00:00"])).toEqual([0, 1]);
      expect(tracker.canImportBatch(["2024-06-03 10:00:00", "2024-06-04 10:00:00"])).toEqual([0]);
      expect(tracker.canImportBatch(["2024-06-05 10:00:00"])).toEqual([]);
    });

    it("should reject future timestamps", () => {
      const tracker = makeTracker({}, 10, "202312");
      expect(tracker.canImportBatch(["2024-06-15 12:00:01", "2025-01-01 00:00:00"])).toEqual([]);
    });

    it("should allow a timestamp exactly at the current time", () => {
      const tracker = makeTracker({}, 10, "202312");
      // dt > now is false when equal, so it is not treated as future.
      expect(tracker.canImportBatch(["2024-06-15 12:00:00"])).toEqual([0]);
    });

    it("should reject timestamps older than the allowed window", () => {
      const tracker = makeTracker({}, 10, "202312");
      expect(tracker.canImportBatch(["2023-11-30 23:59:59", "2020-01-01 00:00:00"])).toEqual([]);
    });

    it("should allow timestamps exactly in the oldest allowed month", () => {
      const tracker = makeTracker({}, 10, "202312");
      // "202312" < "202312" is false, so the boundary month is allowed.
      expect(tracker.canImportBatch(["2023-12-01 00:00:00"])).toEqual([0]);
    });

    it("should reject invalid timestamp strings", () => {
      const tracker = makeTracker({}, 10, "202312");
      expect(
        tracker.canImportBatch([
          "not-a-date",
          "2024-06-15T10:00:00", // ISO "T" separator does not match the expected format
          "",
          "2024-13-01 10:00:00", // invalid month
        ])
      ).toEqual([]);
    });

    it("should not consume quota for rejected timestamps", () => {
      const tracker = makeTracker({}, 1, "202312");
      const result = tracker.canImportBatch([
        "2025-01-01 00:00:00", // future, rejected
        "bad-timestamp", // invalid, rejected
        "2024-06-01 10:00:00", // valid, takes the single slot
      ]);
      expect(result).toEqual([2]);
    });

    it("should keep valid events interleaved with rejected ones", () => {
      const tracker = makeTracker({}, 10, "202312");
      const result = tracker.canImportBatch(["2024-06-01 10:00:00", "garbage", "2024-06-02 10:00:00"]);
      expect(result).toEqual([0, 2]);
    });

    it("should still reject malformed and future timestamps when the limit is Infinity", () => {
      const tracker = makeTracker({}, Infinity, "190001");
      // Self-hosted: quota accounting is disabled, but timestamp validation
      // applies exactly like the cloud path.
      expect(tracker.canImportBatch(["not-a-date", "2099-01-01 00:00:00", "2024-06-01 10:00:00"])).toEqual([2]);
    });

    it("should ignore the historical window when the limit is Infinity", () => {
      // The window is tier/quota-derived, so it is disabled for self-hosted
      // even if oldestAllowedMonth would otherwise reject the timestamp.
      const tracker = makeTracker({}, Infinity, "202401");
      expect(tracker.canImportBatch(["2020-01-01 00:00:00"])).toEqual([0]);
    });
  });

  describe("getHistoricalWindowMonths (via create)", () => {
    async function createTrackerForSubscription(subscription: Record<string, unknown>) {
      mockDbForCreate();
      vi.mocked(getBestSubscription).mockResolvedValueOnce(subscription as any);
      return ImportQuotaTracker.create("org-1");
    }

    it("should allow 6 months of history for the free tier", async () => {
      const tracker = await createTrackerForSubscription({
        source: "free",
        eventLimit: 10000,
      });
      // 2024-06 minus 6 months, start of month.
      expect(tracker.getOldestAllowedMonth()).toBe("202312");
    });

    it("should allow 24 months of history for appsumo", async () => {
      const tracker = await createTrackerForSubscription({
        source: "appsumo",
        planName: "appsumo-tier2",
        eventLimit: 100000,
      });
      expect(tracker.getOldestAllowedMonth()).toBe("202206");
    });

    it("should allow 60 months of history for stripe pro plans", async () => {
      const tracker = await createTrackerForSubscription({
        source: "stripe",
        planName: "pro100k",
        eventLimit: 100000,
      });
      expect(tracker.getOldestAllowedMonth()).toBe("201906");
    });

    it("should allow 24 months of history for non-pro stripe plans", async () => {
      const tracker = await createTrackerForSubscription({
        source: "stripe",
        planName: "standard100k",
        eventLimit: 100000,
      });
      expect(tracker.getOldestAllowedMonth()).toBe("202206");
    });

    it("should use the subscription event limit as the monthly limit", async () => {
      const tracker = await createTrackerForSubscription({
        source: "free",
        eventLimit: 2,
      });
      expect(tracker.canImportBatch(["2024-06-01 10:00:00", "2024-06-02 10:00:00", "2024-06-03 10:00:00"])).toEqual([
        0, 1,
      ]);
    });

    it("should throw when the organization is not found", async () => {
      vi.mocked(db.select as any).mockReturnValueOnce(chainResolving([]));
      await expect(ImportQuotaTracker.create("missing-org")).rejects.toThrow("Organization missing-org not found");
    });
  });
});
