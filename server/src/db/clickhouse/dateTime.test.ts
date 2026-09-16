import { DateTime, Settings } from "luxon";
import { afterEach, describe, expect, it } from "vitest";
import { toClickHouseDateTime } from "./dateTime.js";

const originalZone = Settings.defaultZone;

describe("toClickHouseDateTime", () => {
  afterEach(() => {
    Settings.defaultZone = originalZone;
  });

  it("renders every input kind as an explicit-UTC ISO string", () => {
    expect(toClickHouseDateTime("2026-09-15T12:57:22.789Z")).toBe("2026-09-15T12:57:22.789Z");
    expect(toClickHouseDateTime("2026-09-15T14:57:22.789+02:00")).toBe("2026-09-15T12:57:22.789Z");
    expect(toClickHouseDateTime("2026-09-15T12:57:22")).toBe("2026-09-15T12:57:22.000Z");
    expect(toClickHouseDateTime("2026-09-15 12:57:22")).toBe("2026-09-15T12:57:22.000Z");
    expect(toClickHouseDateTime(1_700_000_000_123)).toBe("2023-11-14T22:13:20.123Z");
    expect(toClickHouseDateTime(new Date(Date.UTC(2026, 0, 15, 7, 57, 22)))).toBe("2026-01-15T07:57:22.000Z");
    expect(toClickHouseDateTime(DateTime.fromISO("2026-01-15T07:57:22-05:00", { setZone: true }))).toBe(
      "2026-01-15T12:57:22.000Z"
    );
  });

  it("ignores the process timezone", () => {
    for (const zone of ["Europe/Berlin", "Asia/Shanghai", "America/New_York"]) {
      Settings.defaultZone = zone;
      expect(toClickHouseDateTime("2026-09-15T12:57:22.789Z")).toBe("2026-09-15T12:57:22.789Z");
      expect(toClickHouseDateTime("2026-09-15 12:57:22")).toBe("2026-09-15T12:57:22.000Z");
      expect(toClickHouseDateTime(new Date("2026-09-15T12:57:22.789Z"))).toBe("2026-09-15T12:57:22.789Z");
    }
  });

  it("keeps the repeated daylight-saving hour distinct", () => {
    Settings.defaultZone = "Europe/Berlin";
    expect(toClickHouseDateTime("2026-10-25T02:30:00.999+02:00")).toBe("2026-10-25T00:30:00.999Z");
    expect(toClickHouseDateTime("2026-10-25T02:30:00.999+01:00")).toBe("2026-10-25T01:30:00.999Z");
  });

  it("rejects values ClickHouse could not parse", () => {
    expect(() => toClickHouseDateTime("not-a-date")).toThrow(RangeError);
    expect(() => toClickHouseDateTime("")).toThrow(RangeError);
    expect(() => toClickHouseDateTime(NaN)).toThrow(RangeError);
    expect(() => toClickHouseDateTime(new Date("nope"))).toThrow(RangeError);
  });
});
