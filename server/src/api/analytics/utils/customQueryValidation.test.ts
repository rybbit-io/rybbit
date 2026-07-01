import { describe, expect, it } from "vitest";
import { validateScopedQuery } from "./customQueryValidation.js";

const SCOPED_ONLY_ERROR = "Queries can only read from scoped_events";

describe("validateScopedQuery — table reference scoping", () => {
  it("allows reading from scoped_events", () => {
    expect(validateScopedQuery("SELECT count(*) FROM scoped_events")).toBeNull();
  });

  it("allows CTEs and self-joins on scoped_events", () => {
    expect(
      validateScopedQuery(
        "WITH t AS (SELECT user_id, count() c FROM scoped_events GROUP BY user_id) SELECT * FROM t"
      )
    ).toBeNull();
    expect(
      validateScopedQuery(
        "SELECT a.user_id FROM scoped_events a JOIN scoped_events b ON a.user_id = b.user_id"
      )
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
    expect(
      validateScopedQuery("SELECT * FROM scoped_events,sessions_mv_target LIMIT 1")
    ).toBe(SCOPED_ONLY_ERROR);
  });

  it("blocks an unauthorized table inside a subquery comma-join", () => {
    expect(
      validateScopedQuery(
        "SELECT * FROM (SELECT * FROM scoped_events, sessions_mv_target) x LIMIT 1"
      )
    ).toBe(SCOPED_ONLY_ERROR);
  });

  it("still blocks plain FROM/JOIN to unauthorized tables", () => {
    expect(validateScopedQuery("SELECT * FROM events")).toBe(SCOPED_ONLY_ERROR);
    expect(
      validateScopedQuery("SELECT * FROM scoped_events JOIN events ON 1=1")
    ).toBe(SCOPED_ONLY_ERROR);
  });

  it("requires the query to reference scoped_events at all", () => {
    expect(validateScopedQuery("SELECT 1")).toBe("Query must read from scoped_events");
  });
});
