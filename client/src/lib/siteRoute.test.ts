import { describe, expect, it } from "vitest";
import {
  getMainDashboardPath,
  getSiteRouteContext,
  isSyncedAnalyticsRoute,
  PRIVATE_KEY_PATTERN,
  SYNCED_ANALYTICS_ROUTES,
} from "./siteRoute";

describe("getSiteRouteContext", () => {
  it("reads a normal site route", () => {
    expect(getSiteRouteContext("/42/sessions")).toEqual({
      siteId: "42",
      privateKey: null,
      route: "sessions",
    });
  });

  it("reads a shared-dashboard route and preserves the supplied key", () => {
    expect(getSiteRouteContext("/42/ABCDEF123456/performance")).toEqual({
      siteId: "42",
      privateKey: "ABCDEF123456",
      route: "performance",
    });
  });

  it("does not mistake an ordinary 12-character route for a private key", () => {
    expect(getSiteRouteContext("/42/session-list/details")).toEqual({
      siteId: "42",
      privateKey: null,
      route: "session-list",
    });
  });

  it("normalizes repeated and trailing slashes", () => {
    expect(getSiteRouteContext("//42//abcdef123456//events//")).toEqual({
      siteId: "42",
      privateKey: "abcdef123456",
      route: "events",
    });
  });

  it("returns null fields for a missing pathname", () => {
    expect(getSiteRouteContext(undefined)).toEqual({ siteId: null, privateKey: null, route: null });
    expect(getSiteRouteContext(null)).toEqual({ siteId: null, privateKey: null, route: null });
    expect(getSiteRouteContext("/")).toEqual({ siteId: null, privateKey: null, route: null });
  });

  it("leaves the route null at the root of either site URL shape", () => {
    expect(getSiteRouteContext("/42")).toEqual({ siteId: "42", privateKey: null, route: null });
    expect(getSiteRouteContext("/42/abcdef123456")).toEqual({
      siteId: "42",
      privateKey: "abcdef123456",
      route: null,
    });
  });
});

describe("private-key recognition", () => {
  it("requires exactly 12 hexadecimal characters", () => {
    expect(PRIVATE_KEY_PATTERN.test("abcdef123456")).toBe(true);
    expect(PRIVATE_KEY_PATTERN.test("ABCDEF123456")).toBe(true);
    expect(PRIVATE_KEY_PATTERN.test("abcdef12345")).toBe(false);
    expect(PRIVATE_KEY_PATTERN.test("abcdef1234567")).toBe(false);
    expect(PRIVATE_KEY_PATTERN.test("ghijkl123456")).toBe(false);
  });
});

describe("isSyncedAnalyticsRoute", () => {
  it("accepts every declared synchronized route", () => {
    for (const route of SYNCED_ANALYTICS_ROUTES) {
      expect(isSyncedAnalyticsRoute(route), route).toBe(true);
    }
  });

  it("rejects absent, unrelated, and differently-cased routes", () => {
    expect(isSyncedAnalyticsRoute(null)).toBe(false);
    expect(isSyncedAnalyticsRoute(undefined)).toBe(false);
    expect(isSyncedAnalyticsRoute("settings")).toBe(false);
    expect(isSyncedAnalyticsRoute("Sessions")).toBe(false);
  });
});

describe("getMainDashboardPath", () => {
  it("builds main paths for normal and shared dashboards", () => {
    expect(getMainDashboardPath("/42/events")).toBe("/42/main");
    expect(getMainDashboardPath("/42/abcdef123456/events")).toBe("/42/abcdef123456/main");
  });

  it("keeps the site identifier exactly as represented in the URL", () => {
    expect(getMainDashboardPath("/0042/users")).toBe("/0042/main");
  });

  it("rejects missing and non-numeric site identifiers", () => {
    expect(getMainDashboardPath(undefined)).toBeNull();
    expect(getMainDashboardPath("/settings/account")).toBeNull();
  });
});
