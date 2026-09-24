import { describe, expect, it } from "vitest";
import { validateScopedQuery } from "./utils/customQueryValidation.js";

describe("validateScopedQuery", () => {
  it("allows SELECT queries against scoped_events", () => {
    expect(validateScopedQuery("SELECT event_name, count() FROM scoped_events GROUP BY event_name")).toBeNull();
  });

  it("allows aliases that use blocked table names", () => {
    expect(validateScopedQuery("SELECT event_name, count() AS events FROM scoped_events GROUP BY event_name")).toBeNull();
  });

  it("allows WITH expressions that read from scoped_events", () => {
    expect(
      validateScopedQuery(`
        WITH event_name AS name
        SELECT name, count()
        FROM scoped_events
        GROUP BY name
      `)
    ).toBeNull();
  });

  it("allows CTEs derived from scoped_events", () => {
    expect(
      validateScopedQuery(`
        WITH top_events AS (
          SELECT event_name, count() AS event_count
          FROM scoped_events
          GROUP BY event_name
        )
        SELECT *
        FROM top_events
      `)
    ).toBeNull();
  });

  it("rejects direct reads from events", () => {
    expect(validateScopedQuery("SELECT count() FROM events")).toBe("Queries can only read from scoped_events");
  });

  it("rejects comma joins to other tables", () => {
    expect(validateScopedQuery("SELECT count() FROM scoped_events, hourly_events_by_site_mv_target")).toBe(
      "Queries can only read from scoped_events"
    );
  });

  it("rejects multiple statements", () => {
    expect(validateScopedQuery("SELECT count() FROM scoped_events; SELECT count() FROM scoped_events")).toBe(
      "Only one SQL statement is allowed"
    );
  });

  it("ignores blocked words inside string literals", () => {
    expect(validateScopedQuery("SELECT 'DROP TABLE events' AS label FROM scoped_events LIMIT 1")).toBeNull();
  });

  it("rejects redefining scoped_events", () => {
    expect(validateScopedQuery("WITH scoped_events AS (SELECT * FROM events) SELECT * FROM scoped_events")).toBe(
      "scoped_events is reserved and cannot be redefined"
    );
  });

  it("rejects table functions", () => {
    expect(validateScopedQuery("SELECT * FROM scoped_events UNION ALL SELECT * FROM s3('https://example.com')")).toBe(
      "s3() is not allowed in custom analytics queries"
    );
  });
});
