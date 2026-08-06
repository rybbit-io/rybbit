import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
  sql: {},
}));

import { TimeBucket } from "../types.js";
import {
  buildStringFilterCondition,
  getBotFilterStatement,
  getBotLayerStatement,
  getBotSqlParam,
  getBotTimeStatementFill,
} from "./utils.js";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

type FillParams = Parameters<typeof getBotTimeStatementFill>[0];
const fillParams = (p: Record<string, unknown>) => p as unknown as FillParams;

describe("getBotLayerStatement", () => {
  it("should return empty string for undefined layer", () => {
    expect(getBotLayerStatement(undefined)).toBe("");
  });

  it("should return empty string for null layer", () => {
    expect(getBotLayerStatement(null)).toBe("");
  });

  it("should return empty string for empty string layer", () => {
    expect(getBotLayerStatement("")).toBe("");
  });

  it("should map each known layer to its detection column", () => {
    expect(getBotLayerStatement("ua_pattern")).toBe("AND detected_ua_pattern");
    expect(getBotLayerStatement("header_heuristics")).toBe("AND detected_header_heuristics");
    expect(getBotLayerStatement("client_signals")).toBe("AND detected_client_signals");
    expect(getBotLayerStatement("bot_asn")).toBe("AND detected_bot_asn");
    expect(getBotLayerStatement("rate_anomaly")).toBe("AND detected_rate_anomaly");
  });

  it("silently returns empty string for an unmapped layer string", () => {
    // Pinned behavior: an unknown layer is a silent no-op — the caller gets no
    // filter and no error, so a typo'd layer returns unfiltered data.
    expect(getBotLayerStatement("nonsense_layer")).toBe("");
    expect(getBotLayerStatement("ua_pattern; DROP TABLE events")).toBe("");
  });
});

describe("getBotSqlParam", () => {
  it("should use domainWithoutWWW for referrer", () => {
    expect(getBotSqlParam("referrer")).toBe("domainWithoutWWW(referrer)");
  });

  it("should use concat for dimensions", () => {
    expect(getBotSqlParam("dimensions")).toBe("concat(toString(screen_width), 'x', toString(screen_height))");
  });

  it("should use region-city concat for city", () => {
    expect(getBotSqlParam("city")).toBe("concat(toString(region), '-', toString(city))");
  });

  it("should use browser concat for browser_version", () => {
    expect(getBotSqlParam("browser_version")).toBe("concat(toString(browser), ' ', toString(browser_version))");
  });

  it("should use CASE expression for operating_system_version", () => {
    const result = getBotSqlParam("operating_system_version");
    expect(result).toContain("CASE");
    expect(result).toContain("Windows 10/11");
  });

  it("should pass through standard and bot-specific parameters", () => {
    expect(getBotSqlParam("browser")).toBe("browser");
    expect(getBotSqlParam("pathname")).toBe("pathname");
    expect(getBotSqlParam("asn_org")).toBe("asn_org");
    expect(getBotSqlParam("bot_category")).toBe("bot_category");
    expect(getBotSqlParam("matched_ua_pattern")).toBe("matched_ua_pattern");
  });
});

describe("buildStringFilterCondition", () => {
  it("should build is_null condition", () => {
    expect(buildStringFilterCondition("browser", "is_null", [])).toBe("(browser IS NULL OR browser = '')");
  });

  it("should build is_not_null condition", () => {
    expect(buildStringFilterCondition("browser", "is_not_null", [])).toBe("(browser IS NOT NULL AND browser != '')");
  });

  it("should build single-value equals condition", () => {
    expect(buildStringFilterCondition("browser", "equals", ["Chrome"])).toBe("browser = 'Chrome'");
  });

  it("should OR-join multi-value contains conditions", () => {
    expect(buildStringFilterCondition("pathname", "contains", ["/blog", "/docs"])).toBe(
      "(pathname LIKE '%/blog%' OR pathname LIKE '%/docs%')"
    );
  });

  it("should AND-join multi-value not_contains conditions", () => {
    expect(buildStringFilterCondition("pathname", "not_contains", ["/admin", "/debug"])).toBe(
      "(pathname NOT LIKE '%/admin%' AND pathname NOT LIKE '%/debug%')"
    );
  });

  it("should build regex condition with match()", () => {
    expect(buildStringFilterCondition("pathname", "regex", ["^/blog/.*"])).toBe("match(pathname, '^/blog/.*')");
  });

  it("should build not_regex condition with NOT match()", () => {
    expect(buildStringFilterCondition("pathname", "not_regex", ["^/admin/.*"])).toBe(
      "NOT match(pathname, '^/admin/.*')"
    );
  });

  it("should throw for empty regex pattern", () => {
    expect(() => buildStringFilterCondition("pathname", "regex", [""])).toThrow("Regex pattern cannot be empty");
  });

  it("wraps invalid regex errors with the same message as the main filter builder", () => {
    expect(() => buildStringFilterCondition("pathname", "regex", ["[invalid"])).toThrow("Invalid regex pattern");
  });

  it("should throw for regex pattern exceeding max length", () => {
    const longPattern = "a".repeat(501);
    expect(() => buildStringFilterCondition("pathname", "regex", [longPattern])).toThrow("Regex pattern too long");
  });
});

describe("getBotFilterStatement", () => {
  describe("Empty and invalid inputs", () => {
    it("should return empty string when filters are undefined", () => {
      expect(getBotFilterStatement()).toBe("");
    });

    it("should return empty string for empty string", () => {
      expect(getBotFilterStatement("")).toBe("");
    });

    it("should return empty string for empty array", () => {
      expect(getBotFilterStatement("[]")).toBe("");
    });

    it("should throw for invalid JSON", () => {
      expect(() => getBotFilterStatement("invalid json")).toThrow("Invalid JSON format");
    });
  });

  describe("Parameter allowlist", () => {
    it("silently drops filters whose parameter is not in BOT_FILTER_PARAMETERS", () => {
      // Pinned behavior: unsupported parameters are filtered out without error,
      // so a caller filtering by event_name gets unfiltered data back.
      const filters = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["click"] }]);
      expect(getBotFilterStatement(filters)).toBe("");
    });

    it("silently drops channel, utm and entry/exit page filters", () => {
      const filters = JSON.stringify([
        { parameter: "channel", type: "equals", value: ["Organic Search"] },
        { parameter: "utm_source", type: "equals", value: ["google"] },
        { parameter: "entry_page", type: "equals", value: ["/home"] },
        { parameter: "exit_page", type: "equals", value: ["/bye"] },
      ]);
      expect(getBotFilterStatement(filters)).toBe("");
    });

    it("keeps supported parameters while dropping unsupported ones", () => {
      const filters = JSON.stringify([
        { parameter: "event_name", type: "equals", value: ["click"] },
        { parameter: "browser", type: "equals", value: ["Chrome"] },
      ]);
      expect(getBotFilterStatement(filters)).toBe("AND browser = 'Chrome'");
    });
  });

  describe("Operator cases mirrored from the main filter builder", () => {
    it("should handle single value equals filter", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "equals", value: ["Chrome"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND browser = 'Chrome'");
    });

    it("should OR-join multiple equals values", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "equals", value: ["Chrome", "Firefox"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND (browser = 'Chrome' OR browser = 'Firefox')");
    });

    it("should AND-join multiple not_equals values (NOT IN semantics)", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "not_equals", value: ["Chrome", "Firefox"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND (browser != 'Chrome' AND browser != 'Firefox')");
    });

    it("should handle contains with % wrapping", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "contains", value: ["/blog"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND pathname LIKE '%/blog%'");
    });

    it("should handle not_contains", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "not_contains", value: ["/admin"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND pathname NOT LIKE '%/admin%'");
    });

    it("should handle starts_with, escaping user wildcards like the main builder", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "starts_with", value: ["50%"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND pathname LIKE '50\\\\%%'");
    });

    it("should handle ends_with", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "ends_with", value: ["/checkout"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND pathname LIKE '%/checkout'");
    });

    it("should handle is_null", () => {
      const filters = JSON.stringify([{ parameter: "browser", type: "is_null", value: [] }]);
      expect(getBotFilterStatement(filters)).toBe("AND (browser IS NULL OR browser = '')");
    });

    it("should handle is_not_null", () => {
      const filters = JSON.stringify([{ parameter: "country", type: "is_not_null", value: [] }]);
      expect(getBotFilterStatement(filters)).toBe("AND (country IS NOT NULL AND country != '')");
    });

    it("should handle regex filters", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "regex", value: ["^/blog/.*"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND match(pathname, '^/blog/.*')");
    });

    it("should handle not_regex filters", () => {
      const filters = JSON.stringify([{ parameter: "pathname", type: "not_regex", value: ["^/admin/.*"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND NOT match(pathname, '^/admin/.*')");
    });

    it("should handle greater_than_or_equal", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than_or_equal", value: ["40.5"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND lat >= 40.5");
    });

    it("should handle less_than_or_equal", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "less_than_or_equal", value: ["-70.25"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND lon <= -70.25");
    });

    it("should throw for invalid numeric values", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "greater_than", value: ["not-a-number"] }]);
      expect(() => getBotFilterStatement(filters)).toThrow("Invalid numeric value");
    });

    it("should handle lat equals with tolerance", () => {
      const filters = JSON.stringify([{ parameter: "lat", type: "equals", value: ["40.7128"] }]);
      const result = getBotFilterStatement(filters);
      expect(result).toContain("lat >= 40.7118");
      expect(result).toContain("lat <= 40.7138");
    });

    it("should negate the lat/lon range for not_equals", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "not_equals", value: ["-74.006"] }]);
      const result = getBotFilterStatement(filters);
      expect(result).toContain("NOT (lon >= -74.007 AND lon <= -74.005)");
    });

    it("should escape single quotes in values", () => {
      const filters = JSON.stringify([
        { parameter: "browser", type: "equals", value: ["Chrome'; DROP TABLE users;--"] },
      ]);
      expect(getBotFilterStatement(filters)).toBe("AND browser = 'Chrome\\'; DROP TABLE users;--'");
    });

    it("should join multiple filters with AND", () => {
      const filters = JSON.stringify([
        { parameter: "browser", type: "equals", value: ["Chrome"] },
        { parameter: "country", type: "not_equals", value: ["CN"] },
      ]);
      expect(getBotFilterStatement(filters)).toBe("AND browser = 'Chrome' AND country != 'CN'");
    });

    it("does NOT check identified_user_id for user_id filters, unlike the main builder", () => {
      // Structural divergence, not fixable drift: the bot_events ClickHouse
      // table (src/db/clickhouse/clickhouse.ts) has a user_id column but no
      // identified_user_id column — bots are never identified — so the main
      // builder's user_id -> identified_user_id expansion cannot apply here.
      const filters = JSON.stringify([{ parameter: "user_id", type: "equals", value: ["user123"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND user_id = 'user123'");
    });

    it("should apply expression transforms for referrer and city", () => {
      const filters = JSON.stringify([
        { parameter: "referrer", type: "equals", value: ["google.com"] },
        { parameter: "city", type: "equals", value: ["CA-San Francisco"] },
      ]);
      const result = getBotFilterStatement(filters);
      expect(result).toContain("domainWithoutWWW(referrer) = 'google.com'");
      expect(result).toContain("concat(toString(region), '-', toString(city)) = 'CA-San Francisco'");
    });
  });
});

describe("getBotTimeStatementFill", () => {
  describe("date range mode", () => {
    it("should build a timezone-aware WITH FILL clause from start_date and end_date", () => {
      const result = getBotTimeStatementFill(
        fillParams({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "America/New_York" }),
        "day"
      );
      expect(normalize(result)).toBe(
        "WITH FILL FROM toTimeZone( toDateTime(toStartOfDay(toDateTime('2024-01-01', 'America/New_York'))), 'UTC' ) " +
          "TO if( toDate('2024-01-31') = toDate(now(), 'America/New_York'), toTimeZone(now(), 'UTC'), " +
          "toTimeZone( toDateTime(toStartOfDay(toDateTime('2024-01-31', 'America/New_York'))) + INTERVAL 1 DAY, 'UTC' ) ) " +
          "STEP INTERVAL 1 DAY"
      );
    });

    it("should default a missing time_zone to UTC", () => {
      const result = getBotTimeStatementFill(fillParams({ start_date: "2024-01-01", end_date: "2024-01-31" }), "day");
      expect(result).toContain("toDateTime('2024-01-01', 'UTC')");
    });
  });

  describe("datetime range mode", () => {
    it("should build a WITH FILL clause from start_datetime and end_datetime", () => {
      const result = getBotTimeStatementFill(
        fillParams({
          start_datetime: "2024-01-01 05:30:00",
          end_datetime: "2024-01-02 06:45:00",
          time_zone: "UTC",
        }),
        "hour"
      );
      expect(normalize(result)).toBe(
        "WITH FILL FROM toTimeZone( toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-01-01 05:30:00', 'UTC'), 'UTC'))), 'UTC' ) " +
          "TO toTimeZone( toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-01-02 06:45:00', 'UTC'), 'UTC'))), 'UTC' ) " +
          "STEP INTERVAL 1 HOUR"
      );
    });
  });

  describe("past minutes mode", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should build a WITH FILL clause from past_minutes_start/end relative to now", () => {
      const result = getBotTimeStatementFill(fillParams({ past_minutes_start: 120, past_minutes_end: 60 }), "hour");
      expect(normalize(result)).toBe(
        "WITH FILL FROM toStartOfHour(toDateTime('2024-06-15 10:00:00')) " +
          "TO toStartOfHour(toDateTime('2024-06-15 11:00:00')) + INTERVAL 1 HOUR " +
          "STEP INTERVAL 1 HOUR"
      );
    });

    it("should use MINUTE-based interval for minute buckets", () => {
      const result = getBotTimeStatementFill(
        fillParams({ past_minutes_start: 30, past_minutes_end: 0 }),
        "five_minutes"
      );
      expect(result).toContain("+ INTERVAL 1 MINUTE");
      expect(result).toContain("STEP INTERVAL 5 MINUTES");
    });
  });

  describe("validation", () => {
    it("should throw for an invalid bucket", () => {
      expect(() =>
        getBotTimeStatementFill(
          fillParams({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" }),
          "decade" as TimeBucket
        )
      ).toThrow();
    });

    it("should throw when no time range params are provided", () => {
      expect(() => getBotTimeStatementFill(fillParams({}), "day")).toThrow();
    });
  });
});
