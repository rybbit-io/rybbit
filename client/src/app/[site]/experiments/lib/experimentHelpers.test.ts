import { DateTime, Settings } from "luxon";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { projectedDecision } from "@rybbit/shared";

import type { Experiment, ExperimentVariantResult } from "@/api/analytics/endpoints";

import { formatRelativeTime, getExperimentVerdict, getVariantStats } from "./experimentHelpers";

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

  it("gives an arm with more conversions a higher chance to beat control", () => {
    const baseline = getVariantStats(control, arm({ variant: "b", units: 100, conversions: 3 }))!;
    const better = getVariantStats(control, arm({ variant: "c", units: 100, conversions: 9 }))!;
    expect(better.chanceToBeatControl).toBeGreaterThan(baseline.chanceToBeatControl);
  });

  it("returns null for the control itself and for an arm without units", () => {
    expect(getVariantStats(control, control)).toBeNull();
    expect(getVariantStats(control, arm({ variant: "b", sessions: 20, exposures: 500 }))).toBeNull();
  });
});

describe("getExperimentVerdict remaining visitors", () => {
  const experiment = {
    status: "running",
    featureFlag: {
      variants: [],
      conditionSets: [
        {
          rules: [],
          variants: [
            { key: "control", rolloutPercentage: 34 },
            { key: "a", rolloutPercentage: 33 },
            { key: "b", rolloutPercentage: 33 },
          ],
        },
      ],
    },
  } as unknown as Experiment;
  const control = arm({ variant: "control", isControl: true, units: 250, conversions: 25 });
  const results = (a: number, b: number) => [
    control,
    arm({ variant: "a", units: 250, conversions: a }),
    arm({ variant: "b", units: 250, conversions: b }),
  ];
  const remainingAt = (scale: number) => Math.ceil(750 * (scale - 1));

  it("waits for the first projected winner, not an earlier projected loser", () => {
    const winScale = projectedDecision(control, { units: 250, conversions: 34 })!.scale;
    expect(projectedDecision(control, { units: 250, conversions: 14 })!.scale).toBeLessThan(winScale);

    const verdict = getExperimentVerdict(experiment, results(34, 14));
    expect(verdict.leader).toBeUndefined();
    expect(verdict.remainingUnits).toBe(remainingAt(winScale));
  });

  it("waits for the last variant to lose before control can win", () => {
    const lastLoss = projectedDecision(control, { units: 250, conversions: 16 })!.scale;

    expect(getExperimentVerdict(experiment, results(16, 14)).remainingUnits).toBe(remainingAt(lastLoss));
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
