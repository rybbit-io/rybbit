import { DateTime, Settings } from "luxon";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ExperimentVariantResult } from "@/api/analytics/endpoints";

import { formatRelativeTime, getVariantConfidence } from "./experimentHelpers";

const arm = (overrides: Partial<ExperimentVariantResult>): ExperimentVariantResult => ({
  variant: "control",
  sessions: 0,
  exposures: 0,
  conversions: 0,
  conversionRate: 0,
  lift: null,
  isControl: false,
  ...overrides,
});

describe("getVariantConfidence", () => {
  const control = arm({ variant: "control", isControl: true, sessions: 100, exposures: 100, conversions: 3 });
  control.conversionRate = control.conversions / control.sessions;

  it("uses sessions, not exposures, as a zero-conversion arm's sample size", () => {
    const variant = arm({ variant: "b", sessions: 100, exposures: 100 });
    const repeatedExposures = arm({ variant: "b", sessions: 100, exposures: 5000 });

    const baseline = getVariantConfidence(control, variant);
    expect(baseline).not.toBeNull();
    // Repeat flag evaluations in the same sessions add no evidence.
    expect(getVariantConfidence(control, repeatedExposures)).toEqual(baseline);
    expect(baseline!.isSignificant).toBe(false);
  });

  it("returns null until both arms have enough sessions", () => {
    const variant = arm({ variant: "b", sessions: 20, exposures: 500 });
    expect(getVariantConfidence(control, variant)).toBeNull();
  });
});

describe("formatRelativeTime", () => {
  const now = DateTime.fromISO("2026-10-24T12:00:00Z").toMillis();

  beforeEach(() => {
    Settings.now = () => now;
    Settings.defaultZone = "America/New_York";
  });

  afterEach(() => {
    Settings.now = () => Date.now();
    Settings.defaultZone = "system";
  });

  it("parses Postgres timestamps as UTC", () => {
    expect(formatRelativeTime("2026-10-24 09:30:00")).toBe("2 hours ago");
    expect(formatRelativeTime("2026-10-24 09:30:00.123456")).toBe("2 hours ago");
  });

  it("still parses ISO timestamps", () => {
    expect(formatRelativeTime("2026-10-24T09:30:00.000Z")).toBe("2 hours ago");
  });

  it("returns null for missing or unparseable values", () => {
    expect(formatRelativeTime(null)).toBeNull();
    expect(formatRelativeTime("not a date")).toBeNull();
  });
});
