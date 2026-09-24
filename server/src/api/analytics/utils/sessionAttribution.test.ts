import { describe, expect, it } from "vitest";
import { goalSessionUtmAgg, SESSION_UTM_MEDIUM_AGG } from "./sessionAttribution.js";

describe("session UTM attribution", () => {
  it("uses the first non-empty utm value instead of the landing event map", () => {
    expect(SESSION_UTM_MEDIUM_AGG).toBe(
      "argMinIf(url_parameters['utm_medium'], timestamp, url_parameters['utm_medium'] != '')"
    );
  });

  it("supports aliased goal session projections", () => {
    expect(goalSessionUtmAgg("utm_medium")).toBe(
      "argMinIf(e.url_parameters['utm_medium'], e.timestamp, e.url_parameters['utm_medium'] != '')"
    );
  });
});
