import { DateTime, Settings } from "luxon";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ExperimentVariantResult } from "@/api/analytics/endpoints";

import { formatRelativeTime, getVariantStats } from "./experimentHelpers";

const arm = (overrides: Partial<ExperimentVariantResult>): ExperimentVariantResult => ({
  variant: "control",
  units: 0,
  sessions: 0,
  exposures: 0,
  conversions: 0,
  conversionRate: 0,
  lift: null,
  isControl: false,
  ...overrides,
});

describe("getVariantStats", () => {
  const control = arm({ variant: "control", isControl: true, units: 100, sessions: 120, exposures: 100, conversions: 3 });

  it("uses units, not sessions or exposures, as the sample size", () => {
    const variant = arm({ variant: "b", units: 100, sessions: 120, exposures: 100 });
    const repeated = arm({ variant: "b", units: 100, sessions: 900, exposures: 5000 });

    const baseline = getVariantStats(control, variant);
    expect(baseline).not.toBeNull();
    // Repeat sessions and flag evaluations by the same visitors add no evidence.
    expect(getVariantStats(control, repeated)).toEqual(baseline);
    expect(baseline!.decision).not.toBe("winning");
  });

  it("returns null for the control itself and for an arm without units", () => {
    expect(getVariantStats(control, control)).toBeNull();
    expect(getVariantStats(control, arm({ variant: "b", sessions: 20, exposures: 500 }))).toBeNull();
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
