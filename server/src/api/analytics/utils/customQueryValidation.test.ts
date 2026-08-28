import { describe, expect, it } from "vitest";
import { sanitizeClickhouseError, validateScopedQuery } from "./customQueryValidation.js";

const SCOPED_ONLY_ERROR = "Queries can only read from scoped_events";
const QUOTED_IDENTIFIER_ERROR = "Quoted identifiers, # and // comments, and $$ strings are not allowed in custom analytics queries";

describe("validateScopedQuery — table reference scoping", () => {
  it("allows reading from scoped_events", () => {
    expect(validateScopedQuery("SELECT count(*) FROM scoped_events")).toBeNull();
  });

  it("allows CTEs and self-joins on scoped_events", () => {
    expect(
      validateScopedQuery("WITH t AS (SELECT user_id, count() c FROM scoped_events GROUP BY user_id) SELECT * FROM t")
    ).toBeNull();
    expect(
      validateScopedQuery("SELECT a.user_id FROM scoped_events a JOIN scoped_events b ON a.user_id = b.user_id")
    ).toBeNull();
  });

  it("does not flag commas in SELECT lists, GROUP BY, ORDER BY, or function args", () => {
    expect(
      validateScopedQuery(
        "SELECT count(*), uniq(user_id) FROM scoped_events GROUP BY pathname ORDER BY pathname, count() LIMIT 10"
      )
    ).toBeNull();
  });

  it("blocks comma-join to a materialized view target table (RYB-015)", () => {
    expect(
      validateScopedQuery(
        "SELECT sessions_mv_target.site_id FROM scoped_events, sessions_mv_target WHERE sessions_mv_target.site_id > 0 LIMIT 100"
      )
    ).toBe(SCOPED_ONLY_ERROR);
    expect(
      validateScopedQuery(
        "SELECT pathname_hourly_mv_target.pathname FROM scoped_events, pathname_hourly_mv_target LIMIT 100"
      )
    ).toBe(SCOPED_ONLY_ERROR);
  });

  it("blocks comma-join without surrounding whitespace", () => {
    expect(validateScopedQuery("SELECT * FROM scoped_events,sessions_mv_target LIMIT 1")).toBe(SCOPED_ONLY_ERROR);
  });

  it("blocks an unauthorized table inside a subquery comma-join", () => {
    expect(validateScopedQuery("SELECT * FROM (SELECT * FROM scoped_events, sessions_mv_target) x LIMIT 1")).toBe(
      SCOPED_ONLY_ERROR
    );
  });

  it("still blocks plain FROM/JOIN to unauthorized tables", () => {
    expect(validateScopedQuery("SELECT * FROM events")).toBe(SCOPED_ONLY_ERROR);
    expect(validateScopedQuery("SELECT * FROM scoped_events JOIN events ON 1=1")).toBe(SCOPED_ONLY_ERROR);
  });

  it("blocks IN table operands that read unauthorized tables", () => {
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE user_id IN events")).toBe(SCOPED_ONLY_ERROR);
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE user_id NOT IN events")).toBe(
      SCOPED_ONLY_ERROR
    );
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE user_id in events")).toBe(SCOPED_ONLY_ERROR);
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE user_id GLOBAL IN events")).toBe(
      SCOPED_ONLY_ERROR
    );
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE user_id GLOBAL NOT IN events")).toBe(
      SCOPED_ONLY_ERROR
    );
  });

  it("allows IN table operands only when they reference scoped_events or a safe CTE", () => {
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE user_id IN scoped_events")).toBeNull();
    expect(
      validateScopedQuery(
        "WITH safe_users AS (SELECT user_id FROM scoped_events) SELECT count() FROM scoped_events WHERE user_id IN safe_users"
      )
    ).toBeNull();
  });

  it("does not treat IN function(...) value expressions as table references", () => {
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE country IN tuple('US','GB')")).toBeNull();
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE country IN ('US','GB')")).toBeNull();
  });

  it("allows ARRAY JOIN over an array expression without flagging it as a table", () => {
    expect(
      validateScopedQuery("SELECT k, count() FROM scoped_events ARRAY JOIN mapKeys(url_parameters) AS k GROUP BY k")
    ).toBeNull();
    expect(
      validateScopedQuery("SELECT k FROM scoped_events LEFT ARRAY JOIN mapKeys(url_parameters) AS k")
    ).toBeNull();
  });

  it("still blocks a real JOIN to an unauthorized table after an ARRAY JOIN", () => {
    expect(
      validateScopedQuery(
        "SELECT k FROM scoped_events ARRAY JOIN mapKeys(url_parameters) AS k JOIN events e ON 1=1"
      )
    ).toBe(SCOPED_ONLY_ERROR);
  });

  it("blocks quoted identifiers that can hide unauthorized table references", () => {
    expect(validateScopedQuery('SELECT * FROM "events" scoped_events WHERE 1=1')).toBe(QUOTED_IDENTIFIER_ERROR);
    expect(validateScopedQuery("SELECT * FROM `events` scoped_events WHERE 1=1")).toBe(QUOTED_IDENTIFIER_ERROR);
    expect(validateScopedQuery('SELECT * FROM "scoped_events" WHERE 1=1')).toBe(QUOTED_IDENTIFIER_ERROR);
  });

  it("allows double quotes and backticks inside string literals", () => {
    expect(validateScopedQuery("SELECT 'quoted \"text\" and `ticks`' AS label FROM scoped_events")).toBeNull();
  });

  it("requires the query to reference scoped_events at all", () => {
    expect(validateScopedQuery("SELECT 1")).toBe("Query must read from scoped_events");
  });
});

// Lexer-mismatch bypasses: syntax ClickHouse understands but the literal
// stripper doesn't. Each of these read another site's rows before the fix.
describe("validateScopedQuery lexer-mismatch bypasses", () => {
  const UNSUPPORTED = "Quoted identifiers, # and // comments, and $$ strings are not allowed in custom analytics queries";

  it("rejects # line comments used to hide a UNION", () => {
    expect(
      validateScopedQuery("SELECT * FROM scoped_events WHERE 1=1 # '\nUNION ALL SELECT * FROM events WHERE site_id = 2 -- '")
    ).toBe(UNSUPPORTED);
  });

  it("rejects #! line comments", () => {
    expect(validateScopedQuery("SELECT * FROM scoped_events #! '\nUNION ALL SELECT * FROM events -- '")).toBe(UNSUPPORTED);
  });

  it("rejects // line comments", () => {
    expect(validateScopedQuery("SELECT * FROM scoped_events WHERE 1=1 // '\nUNION ALL SELECT * FROM events -- '")).toBe(
      UNSUPPORTED
    );
  });

  it("rejects $$ heredoc strings", () => {
    expect(
      validateScopedQuery("SELECT * FROM scoped_events WHERE pathname = $$'$$ UNION ALL SELECT * FROM events -- '")
    ).toBe(UNSUPPORTED);
  });

  it("rejects $tag$ heredoc strings", () => {
    expect(validateScopedQuery("SELECT $x$'$x$ AS a FROM scoped_events UNION ALL SELECT * FROM events -- '")).toBe(
      UNSUPPORTED
    );
  });

  it("still allows # and $ inside single-quoted literals", () => {
    expect(validateScopedQuery("SELECT count() FROM scoped_events WHERE pathname LIKE '%#top%' OR pathname = '$x$'")).toBeNull();
  });

  it("rejects suffixed external-storage table functions", () => {
    expect(validateScopedQuery("SELECT * FROM icebergS3('http://x'), scoped_events")).toMatch(/icebergS3\(\) is not allowed/);
    expect(validateScopedQuery("SELECT * FROM deltaLakeLocal('/tmp'), scoped_events")).toMatch(/deltaLakeLocal\(\) is not allowed/);
  });

  it("rejects server-introspection and sleep functions", () => {
    expect(validateScopedQuery("SELECT hostName() FROM scoped_events")).toBe("hostName() is not allowed in custom analytics queries");
    expect(validateScopedQuery("SELECT currentUser() FROM scoped_events")).toBe("currentUser() is not allowed in custom analytics queries");
    expect(validateScopedQuery("SELECT sleepEachRow(1) FROM scoped_events")).toBe("sleepEachRow() is not allowed in custom analytics queries");
    expect(validateScopedQuery("SELECT * FROM mergeTreeProjection('a','events','p'), scoped_events")).toBe(
      "mergeTreeProjection() is not allowed in custom analytics queries"
    );
  });
});

describe("sanitizeClickhouseError", () => {
  it("strips version, table UUIDs and stack traces", () => {
    const message =
      "Code: 47. DB::Exception: Unknown expression identifier 'foo' (table default.events (072583d3-1467-4d46-89ff-3f6981180a16)). (UNKNOWN_IDENTIFIER) (version 26.7.4.58 (official build))";
    expect(sanitizeClickhouseError(new Error(message))).toBe(
      "Code: 47. DB::Exception: Unknown expression identifier 'foo' (table default.events). (UNKNOWN_IDENTIFIER)"
    );
  });

  it("maps privilege errors to a generic message", () => {
    expect(
      sanitizeClickhouseError(new Error("Code: 497. DB::Exception: rybbit_query: Not enough privileges. (ACCESS_DENIED)"))
    ).toBe("Query references data outside scoped_events");
  });

  it("falls back for non-Error values", () => {
    expect(sanitizeClickhouseError("boom")).toBe("Failed to run query");
  });

  it("collapses non-user-facing error classes to the code only", () => {
    expect(
      sanitizeClickhouseError(
        new Error("Code: 1. DB::Exception: user rybbit_query failed reading /var/lib/clickhouse/store/x.bin on host ch-1")
      )
    ).toBe("Query failed (ClickHouse error 1)");
  });

  it("strips the (from ip) suffix on user-facing errors", () => {
    expect(sanitizeClickhouseError(new Error("Code: 62. DB::Exception: Syntax error: failed at position 5 (from 10.0.0.1:1234)"))).toBe(
      "Code: 62. DB::Exception: Syntax error: failed at position 5"
    );
  });
});
