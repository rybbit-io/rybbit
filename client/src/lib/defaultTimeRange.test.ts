import { describe, expect, it } from "vitest";
import { capDashboardDefaultRange } from "./defaultTimeRange";

describe("capDashboardDefaultRange", () => {
  it("caps an all-time default on the users page", () => {
    expect(capDashboardDefaultRange("all-time", "/1/users")).toBe("last-30-days");
  });

  it("leaves the all-time default alone everywhere else", () => {
    expect(capDashboardDefaultRange("all-time", "/1")).toBe("all-time");
    expect(capDashboardDefaultRange("all-time", "/1/sessions")).toBe("all-time");
    expect(capDashboardDefaultRange("all-time", "/1/user/abc")).toBe("all-time");
  });

  it("never widens or rewrites a bounded default", () => {
    expect(capDashboardDefaultRange("today", "/1/users")).toBe("today");
    expect(capDashboardDefaultRange("last-7-days", "/1/users")).toBe("last-7-days");
  });
});
