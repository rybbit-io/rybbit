import { afterEach, describe, expect, it } from "vitest";
import { getCachedValue, invalidateProjectCache, setCachedValue } from "./statsCache.js";

describe("statsCache", () => {
  afterEach(() => {
    invalidateProjectCache("project-a");
    invalidateProjectCache("project-b");
  });

  it("stores and returns values per namespace and project", () => {
    const payload = [{ visits: 10 }];
    setCachedValue("overview", "project-a", "range", payload);

    expect(getCachedValue("overview", "project-a", "range")).toBe(payload);
    expect(getCachedValue("overview", "project-b", "range")).toBeUndefined();
  });

  it("invalidates all cached entries for a project", () => {
    setCachedValue("pages", "project-a", "filters", [{ path: "/" }]);
    setCachedValue("overview", "project-a", "range", [{ period: "2025-01-01" }]);

    invalidateProjectCache("project-a");

    expect(getCachedValue("pages", "project-a", "filters")).toBeUndefined();
    expect(getCachedValue("overview", "project-a", "range")).toBeUndefined();
  });
});
