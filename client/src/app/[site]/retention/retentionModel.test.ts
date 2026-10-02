import { describe, expect, it } from "vitest";
import { ProcessedRetentionData } from "../../../api/analytics/endpoints";
import {
  buildRetentionModel,
  defaultRetentionMode,
  findCohortOutlier,
  HEAT_STEPS,
  heatStep,
  lastPeriodProgress,
  niceScale,
  retentionCsv,
  statOffsets,
} from "./retentionModel";

const WEEKS = ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"];

/** Cohorts given as counts per offset; the response pads past the window with null. */
function response(
  counts: Record<string, number[]>,
  overrides: Partial<ProcessedRetentionData> = {}
): ProcessedRetentionData {
  const periods = overrides.periods ?? WEEKS;
  const cohorts: ProcessedRetentionData["cohorts"] = {};
  for (const [key, values] of Object.entries(counts)) {
    const padded = periods.map((_, offset) => values[offset] ?? null);
    cohorts[key] = {
      size: values[0],
      counts: padded,
      percentages: padded.map(value => (value === null ? null : (value / values[0]) * 100)),
    };
  }
  return {
    cohorts,
    maxPeriods: periods.length - 1,
    mode: "week",
    range: 31,
    periods,
    windowStart: "2026-08-31T00:00:00.000Z",
    windowEnd: "2026-09-30T15:00:00.000Z",
    timeZone: "UTC",
    firstPeriodPartial: false,
    lastPeriodPartial: true,
    lastPeriodInProgress: true,
    truncated: false,
    lookbackDays: 90,
    ...overrides,
  };
}

const sample = () =>
  response({
    "2026-08-31": [1000, 200, 100, 80, 20],
    "2026-09-07": [1000, 100, 60, 10],
    "2026-09-14": [2000, 200, 30],
    "2026-09-21": [1000, 40],
    "2026-09-28": [400],
  });

describe("buildRetentionModel", () => {
  it("marks the last diagonal as in progress and keeps the user counts", () => {
    const model = buildRetentionModel(sample());

    expect(model.maxOffset).toBe(4);
    expect(model.cohorts.map(cohort => cohort.cells.length)).toEqual([5, 4, 3, 2, 1]);
    expect(model.cohorts[0].cells[1]).toEqual({ offset: 1, users: 200, pct: 20, partial: false });
    // Aug 31 + 4 weeks, Sep 7 + 3 weeks…: the week of Sep 28, which is not over.
    expect(model.cohorts.map(cohort => cohort.cells[cohort.cells.length - 1].partial)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(model.cohorts[1].cells[2].partial).toBe(false);
    expect(model.cohorts[4].open).toBe(true);
    expect(model.cohorts[3].open).toBe(false);
  });

  it("averages finished cells only, weighted by cohort size", () => {
    const model = buildRetentionModel(sample());

    // Week 1: 200 + 100 + 200 of 1000 + 1000 + 2000; the Sep 21 cohort's week 1 is in progress.
    expect(model.average[1]).toEqual({ users: 500, size: 4000, pct: 12.5 });
    expect(model.average[2]).toEqual({ users: 160, size: 2000, pct: 8 });
    expect(model.average[3]).toEqual({ users: 80, size: 1000, pct: 8 });
    expect(model.average[4]).toBeNull();
  });

  it("leaves the open cohort out of the average cohort size", () => {
    const model = buildRetentionModel(sample());

    expect(model.totalNew).toBe(5400);
    expect(model.averageSize).toBe(1250);
  });

  it("leaves a cohort clipped by the range start out of the average size too", () => {
    const model = buildRetentionModel({ ...sample(), firstPeriodPartial: true });

    expect(model.cohorts[0].clipped).toBe(true);
    expect(model.averageSize).toBeCloseTo(4000 / 3);
  });

  it("picks the best cohort by finished period-1 retention, ignoring tiny cohorts", () => {
    const data = sample();
    data.cohorts["2026-09-07"] = { size: 10, counts: [10, 9, 9, 1, null], percentages: [100, 90, 90, 10, null] };
    const model = buildRetentionModel(data);

    // 90% of 10 users does not beat 20% of 1000.
    expect(model.best?.key).toBe("2026-08-31");
  });

  it("keeps periods with no new users as empty rows", () => {
    const data = sample();
    delete data.cohorts["2026-09-07"];
    const model = buildRetentionModel(data);

    expect(model.cohorts[1]).toMatchObject({ key: "2026-09-07", size: 0 });
    expect(model.average[1]).toEqual({ users: 400, size: 3000, pct: (400 / 3000) * 100 });
  });

  it("scales the heat and the axis to the highest finished figure after period 0", () => {
    const model = buildRetentionModel(sample());
    expect(model.scaleMax).toBe(20);
    expect(model.scaleStep).toBe(5);
  });

  it("treats every cell as final when the last period is whole", () => {
    const model = buildRetentionModel({ ...sample(), lastPeriodPartial: false, lastPeriodInProgress: false });

    expect(model.cohorts.some(cohort => cohort.cells.some(cell => cell.partial))).toBe(false);
    expect(model.cohorts[4].open).toBe(false);
    expect(model.average[4]).toEqual({ users: 20, size: 1000, pct: 2 });
  });
});

describe("niceScale", () => {
  it("rounds up to a ceiling with at most five steps", () => {
    expect(niceScale(16.8)).toEqual({ max: 20, step: 5 });
    expect(niceScale(43)).toEqual({ max: 50, step: 10 });
    expect(niceScale(3.2)).toEqual({ max: 4, step: 1 });
    expect(niceScale(100)).toEqual({ max: 100, step: 20 });
    expect(niceScale(0)).toEqual({ max: 1, step: 0.25 });
  });
});

describe("heatStep", () => {
  it("spreads the scale over the eight steps and clamps at both ends", () => {
    expect(heatStep(0, 20)).toBe(0);
    expect(heatStep(9.9, 20)).toBe(3);
    expect(heatStep(10, 20)).toBe(4);
    expect(heatStep(20, 20)).toBe(HEAT_STEPS.length - 1);
    expect(heatStep(55, 20)).toBe(HEAT_STEPS.length - 1);
  });
});

describe("statOffsets", () => {
  it("uses the longest set of periods the range has finished", () => {
    expect(statOffsets("week", buildRetentionModel(sample()))).toEqual([1, 2, 3]);
    expect(statOffsets("week", null)).toEqual([1, 4, 8]);
    expect(statOffsets("day", null)).toEqual([1, 7, 30]);
  });
});

describe("findCohortOutlier", () => {
  it("reports the largest cohort when it is clearly larger and retains differently", () => {
    const outlier = findCohortOutlier(buildRetentionModel(sample()));

    expect(outlier?.cohort.key).toBe("2026-09-14");
    expect(outlier?.pct).toBe(10);
    expect(outlier?.difference).toBe(-2.5);
  });

  it("stays quiet when no cohort stands out in size", () => {
    const model = buildRetentionModel(
      response({
        "2026-08-31": [1000, 200, 100, 80, 20],
        "2026-09-07": [1050, 100, 60, 10],
        "2026-09-14": [1000, 150, 30],
        "2026-09-21": [1000, 40],
        "2026-09-28": [400],
      })
    );
    expect(findCohortOutlier(model)).toBeNull();
  });

  it("stays quiet when the largest cohort retains like the rest", () => {
    const model = buildRetentionModel(
      response({
        "2026-08-31": [1000, 125, 100, 80, 20],
        "2026-09-07": [1000, 125, 60, 10],
        "2026-09-14": [2000, 250, 30],
        "2026-09-21": [1000, 40],
        "2026-09-28": [400],
      })
    );
    expect(findCohortOutlier(model)).toBeNull();
  });

  it("needs at least three cohorts with a finished period 1", () => {
    const model = buildRetentionModel(
      response(
        { "2026-09-14": [2000, 200, 30], "2026-09-21": [1000, 40], "2026-09-28": [400] },
        { periods: ["2026-09-14", "2026-09-21", "2026-09-28"] }
      )
    );
    expect(findCohortOutlier(model)).toBeNull();
  });
});

describe("lastPeriodProgress", () => {
  it("counts the days of the last period the window has reached", () => {
    // Monday Sep 28 to Wednesday Sep 30, 15:00: three days in.
    expect(lastPeriodProgress(sample())).toEqual({ elapsedDays: 3, totalDays: 7, nextPeriod: "2026-10-05" });
  });

  it("is null when the last period is whole", () => {
    expect(lastPeriodProgress({ ...sample(), lastPeriodPartial: false })).toBeNull();
  });
});

describe("defaultRetentionMode", () => {
  it("is daily for a short range and weekly for a long one", () => {
    expect(defaultRetentionMode({ mode: "day", day: "2026-09-30" }, "UTC")).toBe("day");
    expect(defaultRetentionMode({ mode: "range", startDate: "2026-09-24", endDate: "2026-09-30" }, "UTC")).toBe("day");
    expect(defaultRetentionMode({ mode: "range", startDate: "2026-09-01", endDate: "2026-09-30" }, "UTC")).toBe("week");
    expect(defaultRetentionMode({ mode: "month", month: "2026-09-01" }, "UTC")).toBe("week");
    expect(defaultRetentionMode({ mode: "all-time" }, "UTC")).toBe("week");
  });
});

describe("retentionCsv", () => {
  it("exports users and percent per period, leaving in-progress cells blank", () => {
    const { columns, rows } = retentionCsv(buildRetentionModel(sample()));

    expect(columns.slice(0, 4)).toEqual(["cohort_start", "new_users", "week_1_users", "week_1_percent"]);
    expect(rows[0]).toMatchObject({
      cohort_start: "2026-08-31",
      new_users: 1000,
      week_1_users: 200,
      week_1_percent: 20,
    });
    // The Sep 21 cohort's week 1 is the week in progress.
    expect(rows[3]).toMatchObject({ cohort_start: "2026-09-21", week_1_users: "", week_1_percent: "" });
    expect(rows[0].week_4_users).toBe("");
  });
});
