import { describe, expect, it } from "vitest";
import { getActiveSiteId, getSwitchSitePath, hasDateSelector } from "./routes";

describe("getActiveSiteId", () => {
  it("reads the site from a site route, with or without a private key", () => {
    expect(getActiveSiteId("/12/main")).toBe(12);
    expect(getActiveSiteId("/12/dashboards/4")).toBe(12);
    expect(getActiveSiteId("/12/abcdef123456/main")).toBe(12);
  });

  it("is null outside a site", () => {
    expect(getActiveSiteId("/")).toBeNull();
    expect(getActiveSiteId("/settings/account")).toBeNull();
    expect(getActiveSiteId("/rollup")).toBeNull();
  });
});

describe("hasDateSelector", () => {
  it("is true on pages that mount a DateSelector", () => {
    for (const path of ["/", "/rollup", "/12/main", "/12/sessions", "/12/user/abc", "/12/dashboards/4"]) {
      expect(hasDateSelector(path), path).toBe(true);
    }
  });

  it("is false where the preset hotkeys do nothing", () => {
    for (const path of ["/12/retention", "/12/query", "/12/api-playground", "/12/dashboards", "/settings/account"]) {
      expect(hasDateSelector(path), path).toBe(false);
    }
  });
});

describe("getSwitchSitePath", () => {
  it("keeps the section when switching from a site page", () => {
    expect(getSwitchSitePath("/12/sessions", 13)).toBe("/13/sessions");
    expect(getSwitchSitePath("/12/api-playground", 13)).toBe("/13/api-playground");
  });

  it("drops what belongs to the old site", () => {
    expect(getSwitchSitePath("/12/dashboards/4", 13)).toBe("/13/dashboards");
    expect(getSwitchSitePath("/12/user/abc", 13)).toBe("/13/main");
  });

  it("opens the main page from outside a site", () => {
    expect(getSwitchSitePath("/", 13)).toBe("/13/main");
    expect(getSwitchSitePath("/settings/teams", 13)).toBe("/13/main");
  });
});
