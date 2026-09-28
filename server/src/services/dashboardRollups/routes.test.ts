import { afterEach, describe, expect, it, vi } from "vitest";
import { getRoutePatterns, routeExpression, routeGroupsEnabled, routePatternsForSite } from "./routes.js";
afterEach(() => vi.unstubAllEnvs());

describe("configured route templates", () => {
  it("matches complete URL segments and optional trailing slashes", () => {
    vi.stubEnv("DASHBOARD_ROUTE_PATTERNS", JSON.stringify([{ siteId: 1, path: "/summoners/:region/:player" }]));
    const patterns = getRoutePatterns();
    const pattern = new RegExp(patterns[0].regex);
    expect(pattern.test("/summoners/na/player-name/")).toBe(true);
    expect(pattern.test("/summoners/na/")).toBe(false);
    expect(pattern.test("/summoners/na/player/matches")).toBe(false);
    expect(routePatternsForSite(patterns, 1)).toEqual(patterns);
    expect(routePatternsForSite(patterns, 2)).toEqual([]);
  });
  it("escapes literal regex and SQL characters", () => {
    vi.stubEnv("DASHBOARD_ROUTE_PATTERNS", JSON.stringify([{ path: "/v1.0/o'brien/:id" }]));
    const patterns = getRoutePatterns();
    expect(new RegExp(patterns[0].regex).test("/v1X0/o'brien/123")).toBe(false);
    expect(new RegExp(patterns[0].regex).test("/v1.0/o'brien/123")).toBe(true);
    expect(routeExpression(patterns)).toContain("o\\'brien");
  });
  it("requires explicit enablement and valid configuration", () => {
    vi.stubEnv("DASHBOARD_ROUTE_GROUPS", "true");
    vi.stubEnv("DASHBOARD_ROUTE_PATTERNS", "[]");
    expect(routeGroupsEnabled()).toBe(false);
    vi.stubEnv("DASHBOARD_ROUTE_PATTERNS", "invalid");
    expect(routeGroupsEnabled()).toBe(false);
    vi.stubEnv("DASHBOARD_ROUTE_PATTERNS", JSON.stringify([{ path: "/x/prefix:id" }]));
    expect(() => getRoutePatterns()).toThrow("entire segment");
  });
});
