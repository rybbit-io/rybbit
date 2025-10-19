import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trxMock, beginMock, unsafeMock } = vi.hoisted(() => {
  return {
    trxMock: vi.fn(),
    beginMock: vi.fn(),
    unsafeMock: vi.fn(),
  };
});

vi.mock("../../db/postgres/postgres.js", () => {
  const sqlFn: any = vi.fn();
  sqlFn.begin = (...args: unknown[]) => beginMock(...args);
  sqlFn.unsafe = (...args: unknown[]) => unsafeMock(...args);
  return { sql: sqlFn };
});

import * as statsCache from "./statsCache.js";
import { rebuildProjectAggregates, scheduleProjectAggregation } from "./statsAggregationService.js";

describe("statsAggregationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trxMock.mockResolvedValue(undefined);
    beginMock.mockImplementation(async callback => {
      await callback(trxMock);
      return undefined;
    });
    unsafeMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates dates when scheduling and flushes once", async () => {
    scheduleProjectAggregation("proj_1", [
      "2025-01-01T10:00:00.000Z",
      "2025-01-01T12:30:00.000Z",
      "2025-01-02T00:00:00.000Z",
    ]);

    await new Promise(resolve => setImmediate(resolve));
    await Promise.resolve();

    expect(beginMock).toHaveBeenCalledTimes(2);
  });

  it("rebuilds aggregates across distinct dates and invalidates cache", async () => {
    const invalidateSpy = vi.spyOn(statsCache, "invalidateProjectCache");
    unsafeMock.mockResolvedValue([
      { event_date: new Date("2024-01-01T00:00:00.000Z") },
      { event_date: new Date("2024-01-02T00:00:00.000Z") },
    ]);

    await rebuildProjectAggregates("proj_2", "2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z");

    expect(unsafeMock).toHaveBeenCalledWith(
      expect.stringContaining("FROM project_events"),
      ["proj_2", "2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"]
    );
    expect(beginMock).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledWith("proj_2");

    invalidateSpy.mockRestore();
  });

  it("skips recompute when no dates are returned", async () => {
    unsafeMock.mockResolvedValue([]);
    await rebuildProjectAggregates("proj_3");
    expect(beginMock).not.toHaveBeenCalled();
  });
});
