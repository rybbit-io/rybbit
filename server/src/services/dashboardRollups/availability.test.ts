import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../../db/clickhouse/client.js", () => ({ clickhouse: { query } }));

beforeEach(() => {
  vi.resetModules();
  query.mockReset();
  vi.stubEnv("DASHBOARD_ROLLUPS", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("session snapshot readiness", () => {
  it("does no database work when disabled", async () => {
    vi.stubEnv("DASHBOARD_ROLLUPS", "false");
    const { availableSessionRollups } = await import("./availability.js");
    expect(await availableSessionRollups()).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
  it("coalesces checks and caches a successful refresh", async () => {
    query.mockResolvedValue({ json: async () => [{ ready: "1" }] });
    const { availableSessionRollups } = await import("./availability.js");
    const values = await Promise.all(Array.from({ length: 20 }, availableSessionRollups));
    expect(values.every(Boolean)).toBe(true);
    expect(await availableSessionRollups()).toEqual(values[0]);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it.each(["unpopulated", "unavailable"])("falls back for %s storage", async kind => {
    if (kind === "unavailable") query.mockRejectedValue(new Error("table missing"));
    else query.mockResolvedValue({ json: async () => [{ ready: 0 }] });
    const { availableSessionRollups } = await import("./availability.js");
    expect(await availableSessionRollups()).toBeNull();
    expect(await availableSessionRollups()).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("backs off failed reads and checks new configurations independently", async () => {
    query.mockResolvedValue({ json: async () => [{ ready: 1 }] });
    const { availableSessionRollups, invalidateSessionRollups } = await import("./availability.js");
    const previous = await availableSessionRollups();
    invalidateSessionRollups();
    expect(await availableSessionRollups()).toBeNull();
    vi.stubEnv("DASHBOARD_ROLLUP_TIME_ZONES", "America/New_York");
    const next = await availableSessionRollups();
    expect(next?.table).not.toBe(previous?.table);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
