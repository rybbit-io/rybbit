import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), available: vi.fn(), invalidate: vi.fn() }));
vi.mock("../../api/analytics/utils/analyticsQuery.js", () => ({ runAnalyticsQuery: mocks.query }));
vi.mock("../../lib/logger/logger.js", () => ({ createServiceLogger: () => ({ warn: vi.fn() }) }));
vi.mock("./availability.js", () => ({
  availableSessionRollups: mocks.available,
  invalidateSessionRollups: mocks.invalidate,
}));
import { readSessionRollups } from "./read.js";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.available.mockResolvedValue({ table: "dashboard_sessions_test", view: "refresh", timeZones: ["UTC"] });
});
describe("optional session rollup reads", () => {
  it("returns null for unavailable storage without issuing an analytics query", async () => {
    mocks.available.mockResolvedValue(null);
    expect(await readSessionRollups(1, {})).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("preserves an empty successful result", async () => {
    mocks.query.mockResolvedValue([]);
    expect(await readSessionRollups(1, {}, "day")).toEqual([]);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("invalidates failed storage and allows the caller to run its legacy query", async () => {
    mocks.query.mockRejectedValue(new Error("storage removed"));
    expect(await readSessionRollups(1, {})).toBeNull();
    expect(mocks.invalidate).toHaveBeenCalledOnce();
  });
  it("leaves exact-time and hourly event charts on the existing path", async () => {
    expect(await readSessionRollups(1, {}, "hour")).toBeNull();
    expect(
      await readSessionRollups(1, { start_datetime: "2026-01-01 00:30:00", end_datetime: "2026-02-01 00:30:00" })
    ).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
