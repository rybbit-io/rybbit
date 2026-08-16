import { describe, expect, it, vi } from "vitest";
import { patternToRegex, processResults } from "./utils.js";

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
  sql: {},
}));

const makeResultSet = <T>(rows: T[]) => ({ json: async () => rows }) as unknown as Parameters<typeof processResults>[0];

describe("patternToRegex", () => {
  it("should convert a single * to a one-segment matcher", () => {
    expect(patternToRegex("/blog/*")).toBe("^/blog/[^/]+$");
  });

  it("should convert ** to a multi-segment matcher", () => {
    expect(patternToRegex("/blog/**")).toBe("^/blog/.*$");
  });

  it("should handle ** in the middle of a pattern", () => {
    expect(patternToRegex("/docs/**/intro")).toBe("^/docs/.*/intro$");
  });

  it("should handle bare wildcards", () => {
    expect(patternToRegex("*")).toBe("^[^/]+$");
    expect(patternToRegex("**")).toBe("^.*$");
  });

  it("should escape regex metacharacters", () => {
    expect(patternToRegex("/path.html")).toBe("^/path\\.html$");
    expect(patternToRegex("/a+b?c")).toBe("^/a\\+b\\?c$");
    expect(patternToRegex("/(x)|[y]")).toBe("^/\\(x\\)\\|\\[y\\]$");
    expect(patternToRegex("/p{1}^$")).toBe("^/p\\{1\\}\\^\\$$");
    expect(patternToRegex("/back\\slash")).toBe("^/back\\\\slash$");
  });

  it("should not treat a literal {{DOUBLE_STAR}} in the input as the internal marker", () => {
    // Braces are escaped before the marker substitution, so the marker regex
    // cannot match user input containing the literal token.
    expect(patternToRegex("/{{DOUBLE_STAR}}")).toBe("^/\\{\\{DOUBLE_STAR\\}\\}$");
  });

  it("should treat *** as ** followed by *", () => {
    expect(patternToRegex("/a/***")).toBe("^/a/.*[^/]+$");
  });

  it("should anchor patterns without wildcards", () => {
    expect(patternToRegex("/pricing")).toBe("^/pricing$");
  });
});

describe("processResults", () => {
  it("should coerce numeric strings to numbers", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([{ count: "123", ratio: "45.6", negative: "-7" }])
    );

    expect(rows).toEqual([{ count: 123, ratio: 45.6, negative: -7 }]);
  });

  it("should leave existing numbers untouched", async () => {
    const rows = await processResults<Record<string, unknown>>(makeResultSet([{ count: 42 }]));

    expect(rows).toEqual([{ count: 42 }]);
  });

  it("should not coerce ID-like fields even when numeric", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([
        {
          session_id: "12345",
          user_id: "67890",
          identified_user_id: "111",
          effective_user_id: "222",
          site_id: "999",
        },
      ])
    );

    expect(rows).toEqual([
      {
        session_id: "12345",
        user_id: "67890",
        identified_user_id: "111",
        effective_user_id: "222",
        site_id: 999,
      },
    ]);
  });

  it("should leave booleans, empty strings, null, and undefined untouched", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([{ flagOn: true, flagOff: false, empty: "", missing: null, gone: undefined }])
    );

    expect(rows).toEqual([{ flagOn: true, flagOff: false, empty: "", missing: null, gone: undefined }]);
  });

  it("should not coerce non-numeric strings", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([{ browser: "Chrome", date: "2024-01-01", version: "1.2.3", word: "true" }])
    );

    expect(rows).toEqual([{ browser: "Chrome", date: "2024-01-01", version: "1.2.3", word: "true" }]);
  });

  // Number(" ") === 0, and only the exact empty string is excluded, so
  // whitespace-only strings collapse to 0. Pinning current behavior.
  it("should coerce whitespace-only strings to 0", async () => {
    const rows = await processResults<Record<string, unknown>>(makeResultSet([{ blank: " " }]));

    expect(rows).toEqual([{ blank: 0 }]);
  });

  it("should process every row independently", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([
        { pathname: "/a", visitors: "10" },
        { pathname: "/b", visitors: "20" },
      ])
    );

    expect(rows).toEqual([
      { pathname: "/a", visitors: 10 },
      { pathname: "/b", visitors: 20 },
    ]);
  });
});
