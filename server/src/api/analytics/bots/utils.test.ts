import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
  sql: {},
}));

import { getBotFilterStatement, getBotLayerStatement, getBotPurposeStatement, getBotSqlParam } from "./utils.js";

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
  it("should pass through standard and bot-specific parameters", () => {
    expect(getBotSqlParam("browser")).toBe("browser");
    expect(getBotSqlParam("pathname")).toBe("pathname");
    expect(getBotSqlParam("asn_org")).toBe("asn_org");
    expect(getBotSqlParam("bot_category")).toBe("bot_category");
    expect(getBotSqlParam("matched_ua_pattern")).toBe("matched_ua_pattern");
  });
});

describe("getBotFilterStatement", () => {
  it("should return empty string when filters are undefined", () => {
    expect(getBotFilterStatement()).toBe("");
  });

  describe("Parameter allowlist", () => {
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

  describe("Operator cases", () => {
    it("should negate the lat/lon range for not_equals", () => {
      const filters = JSON.stringify([{ parameter: "lon", type: "not_equals", value: ["-74.006"] }]);
      const result = getBotFilterStatement(filters);
      expect(result).toContain("NOT (lon >= -74.007 AND lon <= -74.005)");
    });

    it("does NOT check identified_user_id for user_id filters, unlike the main builder", () => {
      // Structural divergence, not fixable drift: the bot_events ClickHouse
      // table (src/db/clickhouse/clickhouse.ts) has a user_id column but no
      // identified_user_id column — bots are never identified — so the main
      // builder's user_id -> identified_user_id expansion cannot apply here.
      const filters = JSON.stringify([{ parameter: "user_id", type: "equals", value: ["user123"] }]);
      expect(getBotFilterStatement(filters)).toBe("AND user_id = 'user123'");
    });
  });
});

describe("getBotPurposeStatement", () => {
  it("returns nothing when no purpose is selected", () => {
    expect(getBotPurposeStatement()).toBe("");
    expect(getBotPurposeStatement(null)).toBe("");
    expect(getBotPurposeStatement("")).toBe("");
  });

  it("expands the ai family to all three AI purposes", () => {
    expect(getBotPurposeStatement("ai")).toBe("AND bot_purpose IN ('ai_training', 'ai_search', 'ai_agent')");
  });

  it("expands ai_crawler to the two non-agent AI purposes", () => {
    // Agents are a person's fetch, not background crawling — the whole point of
    // the split is that they do not belong in a crawler total.
    expect(getBotPurposeStatement("ai_crawler")).toBe("AND bot_purpose IN ('ai_training', 'ai_search')");
  });

  it("matches a single known purpose", () => {
    expect(getBotPurposeStatement("ai_agent")).toBe("AND bot_purpose = 'ai_agent'");
    expect(getBotPurposeStatement("seo")).toBe("AND bot_purpose = 'seo'");
  });

  it("ignores an unknown purpose rather than interpolating it", () => {
    // The value reaches SQL by interpolation, so anything not on the allowlist
    // must produce no clause at all.
    expect(getBotPurposeStatement("'; DROP TABLE bot_events; --")).toBe("");
    expect(getBotPurposeStatement("nonsense")).toBe("");
  });
});
