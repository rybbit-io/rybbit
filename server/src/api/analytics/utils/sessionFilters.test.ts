import { describe, expect, it } from "vitest";
import { buildFilteredSessionsCTE } from "./sessionFilters.js";

const SITE_ID = 1;
const timeStatement = "AND timestamp >= toDateTime('2026-08-01 00:00:00')";

const build = (parameter: string, value: string) =>
  buildFilteredSessionsCTE(JSON.stringify([{ parameter, type: "equals", value: [value] }]), SITE_ID, timeStatement)!;

describe("buildFilteredSessionsCTE", () => {
  it("projects only the aggregate needed by a UTM filter", () => {
    const sql = build("utm_campaign", "launch");

    expect(sql).toContain("argMin(url_parameters, timestamp)['utm_campaign'] AS utm_campaign");
    expect(sql).not.toContain("argMax(browser,");
    expect(sql).not.toContain("AS utm_source");
    expect(sql).not.toContain("feature_flags");
  });

  it("projects the component columns needed by transformed filters", () => {
    const sql = build("browser_version", "Chrome 140");

    expect(sql).toContain("argMax(browser, timestamp) AS browser");
    expect(sql).toContain("argMax(browser_version, timestamp) AS browser_version");
    expect(sql).not.toContain("argMax(country,");
  });

  it("uses membership subqueries without projecting unrelated event fields", () => {
    const sql = build("pathname", "/pricing");

    expect(sql).toContain("session_id IN (");
    expect(sql).toContain("pathname = '/pricing'");
    expect(sql).not.toContain("argMax(pathname,");
    expect(sql).not.toContain("argMax(browser,");
  });
});
