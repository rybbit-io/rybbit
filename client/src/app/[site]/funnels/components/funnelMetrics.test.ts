import { describe, expect, it } from "vitest";
import type { FunnelSummariesResponse, Goal, SavedFunnel } from "@/api/analytics/endpoints";
import {
  biggestDecline,
  biggestDropOff,
  biggestGain,
  computeFunnelMetrics,
  countMoves,
  findMatchingGoal,
  formatRate,
  formatStepDuration,
  FunnelRowData,
  highestConversion,
  metricsFromSummary,
  rateDelta,
  searchFunnels,
  sortFunnels,
} from "./funnelMetrics";

const funnel = (id: number, name: string, stepCount = 3): SavedFunnel => ({
  id,
  name,
  steps: Array.from({ length: stepCount }, (_, index) => ({ type: "page" as const, value: `/step-${index + 1}` })),
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
});

const row = (id: number, name: string, current: number[] | null, previous: number[] | null = null): FunnelRowData => ({
  funnel: funnel(id, name, (current ?? previous ?? [0, 0, 0]).length),
  current: current && computeFunnelMetrics(current.map(sessions => ({ sessions }))),
  previous: previous && computeFunnelMetrics(previous.map(sessions => ({ sessions }))),
});

describe("computeFunnelMetrics", () => {
  it("puts the drop-off on the step people left, not on the step they never reached", () => {
    const metrics = computeFunnelMetrics([{ sessions: 1000 }, { sessions: 250 }, { sessions: 50 }]);

    expect(metrics.steps.map(step => step.dropped)).toEqual([750, 200, 0]);
    expect(metrics.steps.map(step => step.continueRate)).toEqual([0.25, 0.2, null]);
    expect(metrics.steps.map(step => step.ofStart)).toEqual([1, 0.25, 0.05]);
    expect(metrics.steps.map(step => step.fromPrevious)).toEqual([1, 0.25, 0.2]);
    expect(metrics).toMatchObject({ entered: 1000, converted: 50, conversion: 0.05, worstStep: 1 });
  });

  it("has no rate to state when nobody entered", () => {
    const metrics = computeFunnelMetrics([{ sessions: 0 }, { sessions: 0 }]);

    expect(metrics.conversion).toBeNull();
    expect(metrics.steps[0]).toMatchObject({ ofStart: 0, continueRate: null, dropped: 0 });
    expect(metrics.worstStep).toBeNull();
  });

  it("names no worst step when every session goes all the way", () => {
    expect(computeFunnelMetrics([{ sessions: 10 }, { sessions: 10 }]).worstStep).toBeNull();
  });

  it("keeps step times on the step they start from, and none on the last", () => {
    const metrics = computeFunnelMetrics(
      [
        { sessions: 100, medianSecondsToNext: 58 },
        { sessions: 40, medianSecondsToNext: 81 },
        { sessions: 10, medianSecondsToNext: 999 },
      ],
      708
    );

    expect(metrics.steps.map(step => step.medianSecondsToNext)).toEqual([58, 81, null]);
    expect(metrics.medianSecondsToConvert).toBe(708);
  });
});

describe("metricsFromSummary", () => {
  const response: FunnelSummariesResponse = {
    sessions_entered_any: 100,
    truncated: false,
    funnels: [
      {
        funnel_id: 7,
        steps: [
          { sessions: 100, median_seconds_to_next: 30 },
          { sessions: 20, median_seconds_to_next: null },
        ],
        median_seconds_to_convert: 30,
      },
    ],
  };

  it("reads the funnel's own summary", () => {
    expect(metricsFromSummary(funnel(7, "Signup", 2), response)).toMatchObject({
      entered: 100,
      converted: 20,
      conversion: 0.2,
      medianSecondsToConvert: 30,
    });
  });

  it("has nothing for a funnel the summary leaves out, or while it loads", () => {
    expect(metricsFromSummary(funnel(8, "Other", 2), response)).toBeNull();
    expect(metricsFromSummary(funnel(7, "Signup", 2), undefined)).toBeNull();
  });

  it("ignores a summary computed for a different set of steps", () => {
    // The funnel was just edited from two steps to three; the summary has not refetched.
    expect(metricsFromSummary(funnel(7, "Signup", 3), response)).toBeNull();
  });
});

describe("formatting", () => {
  it("prints small rates with two decimals so 0.49% is not rounded to 0.5%", () => {
    expect(formatRate(0.0049)).toBe("0.49%");
    expect(formatRate(0.167)).toBe("16.7%");
    expect(formatRate(0)).toBe("0%");
    expect(formatRate(1)).toBe("100%");
  });

  it("states rate changes in percentage points at the precision of the rates", () => {
    expect(rateDelta(0.167, 0.155)).toMatchObject({ direction: "up", text: "1.2 pp" });
    expect(rateDelta(0.0049, 0.0045)).toMatchObject({ direction: "up", text: "0.04 pp" });
    expect(rateDelta(0.147, 0.16)).toMatchObject({ direction: "down", text: "1.3 pp" });
    expect(rateDelta(0.5, 0.5)).toMatchObject({ direction: "flat" });
  });

  it("draws no change without both periods", () => {
    expect(rateDelta(0.5, null)).toBeNull();
    expect(rateDelta(null, 0.5)).toBeNull();
    expect(rateDelta(0.5, undefined)).toBeNull();
  });

  it("formats step times", () => {
    expect(formatStepDuration(0.4)).toBe("<1s");
    expect(formatStepDuration(58)).toBe("58s");
    expect(formatStepDuration(81)).toBe("1m 21s");
    expect(formatStepDuration(120)).toBe("2m");
    expect(formatStepDuration(708)).toBe("11m 48s");
    expect(formatStepDuration(7500)).toBe("2h 5m");
  });
});

describe("sortFunnels", () => {
  const rows = [
    row(1, "Visit to paid", [1000, 100, 10], [1000, 100, 5]),
    row(2, "Docs activation", [500, 200, 100], [500, 200, 150]),
    row(3, "Blog to pricing", null),
    row(4, "Hero to signup", [2000, 20, 2], [2000, 20, 2]),
  ];
  const names = (sorted: FunnelRowData[]) => sorted.map(item => item.funnel.name);

  it("orders by sessions entered, funnels without figures last", () => {
    expect(names(sortFunnels(rows, "entered"))).toEqual([
      "Hero to signup",
      "Visit to paid",
      "Docs activation",
      "Blog to pricing",
    ]);
  });

  it("orders by conversion and by change in conversion", () => {
    expect(names(sortFunnels(rows, "conversion"))).toEqual([
      "Docs activation",
      "Visit to paid",
      "Hero to signup",
      "Blog to pricing",
    ]);
    expect(names(sortFunnels(rows, "change"))).toEqual([
      "Visit to paid",
      "Hero to signup",
      "Docs activation",
      "Blog to pricing",
    ]);
  });

  it("orders by name, and leaves creation order alone", () => {
    expect(names(sortFunnels(rows, "name"))).toEqual([
      "Blog to pricing",
      "Docs activation",
      "Hero to signup",
      "Visit to paid",
    ]);
    expect(sortFunnels(rows, "created")).toEqual(rows);
  });

  it("does not reorder the rows it was given", () => {
    const before = [...rows];
    sortFunnels(rows, "entered");
    expect(rows).toEqual(before);
  });
});

describe("the stat band's picks", () => {
  const rows = [
    row(1, "Visit to paid", [1000, 100, 10], [1000, 100, 5]), // 0.5% -> 1%
    row(2, "Docs activation", [500, 200, 100], [400, 200, 120]), // 30% -> 20%
    row(3, "Demo to signup", [100, 90, 2], [100, 90, 10]), // 10% -> 2%, loses 88 of 90 at step 2
    row(4, "Blog to pricing", null),
  ];

  it("counts funnels that convert better and worse", () => {
    expect(countMoves(rows)).toEqual({ improved: 1, declined: 2 });
  });

  it("does not count a move that prints as zero", () => {
    expect(countMoves([row(1, "Flat", [100000, 50000], [100000, 50001])])).toEqual({ improved: 0, declined: 0 });
  });

  it("picks the funnel whose conversion rose the most", () => {
    const gain = biggestGain(rows);

    expect(gain?.row.funnel.name).toBe("Visit to paid");
    expect(gain?.delta).toMatchObject({ direction: "up", text: "0.50 pp" });
  });

  it("has no biggest gain when nothing improved or there is no comparison", () => {
    expect(biggestGain([rows[1], rows[2]])).toBeNull();
    expect(biggestGain([row(1, "No comparison", [10, 5])])).toBeNull();
  });

  it("picks the funnel whose conversion fell the most and the step transition that lost the most ground", () => {
    const decline = biggestDecline(rows);

    expect(decline?.row.funnel.name).toBe("Docs activation");
    expect(decline?.delta).toMatchObject({ direction: "down", text: "10.0 pp" });
    // Step 1 to 2 fell from 50% to 40%, step 2 to 3 from 60% to 50%: the first transition wins the tie.
    expect(decline?.stepIndex).toBe(0);
    // Entries rose from 400 to 500 while conversion fell.
    expect(decline?.enteredDelta).toMatchObject({ direction: "up", text: "25.0%" });
  });

  it("only mentions entries when they rose", () => {
    expect(biggestDecline([rows[2]])?.enteredDelta).toBeNull();
    expect(biggestDecline([rows[0]])).toBeNull();
  });

  it("picks the single leakiest step across all funnels", () => {
    const leak = biggestDropOff(rows);

    expect(leak?.row.funnel.name).toBe("Demo to signup");
    expect(leak?.stepIndex).toBe(1);
    expect(leak?.rate).toBeCloseTo(88 / 90);
  });

  it("has no leakiest step without figures", () => {
    expect(biggestDropOff([rows[3]])).toBeNull();
  });

  it("picks the best converting funnel when there is no comparison", () => {
    expect(highestConversion(rows)?.funnel.name).toBe("Docs activation");
    expect(highestConversion([rows[3]])).toBeNull();
  });
});

describe("findMatchingGoal", () => {
  const goal = (goalId: number, goalType: Goal["goalType"], config: Goal["config"]): Goal => ({
    goalId,
    name: `Goal ${goalId}`,
    goalType,
    config,
    createdAt: "2026-09-01T00:00:00Z",
    total_conversions: 0,
    total_sessions: 0,
    conversion_rate: 0,
  });
  const goals = [
    goal(1, "path", { pathPattern: "/signup" }),
    goal(2, "event", { eventName: "subscription_created" }),
    goal(3, "event", { eventName: "cta_click", propertyFilters: [{ key: "location", value: "hero" }] }),
    goal(4, "button_click", { valuePattern: "Buy*" }),
    goal(5, "outbound", {}),
  ];

  it("matches a page step to a path goal with the same pattern", () => {
    expect(findMatchingGoal({ type: "page", value: "/signup" }, goals)?.goalId).toBe(1);
    expect(findMatchingGoal({ type: "page", value: "/pricing" }, goals)).toBeUndefined();
  });

  it("matches an event step to an event goal with the same name and property filters", () => {
    expect(findMatchingGoal({ type: "event", value: "subscription_created" }, goals)?.goalId).toBe(2);
    expect(findMatchingGoal({ type: "event", value: "cta_click" }, goals)).toBeUndefined();
    expect(
      findMatchingGoal(
        { type: "event", value: "cta_click", propertyFilters: [{ key: "location", value: "hero" }] },
        goals
      )?.goalId
    ).toBe(3);
    // The legacy single-property fields mean the same thing.
    expect(
      findMatchingGoal(
        { type: "event", value: "cta_click", eventPropertyKey: "location", eventPropertyValue: "hero" },
        goals
      )?.goalId
    ).toBe(3);
  });

  it("matches autocapture steps by type and pattern, an empty pattern meaning any", () => {
    expect(findMatchingGoal({ type: "button_click", value: "Buy*" }, goals)?.goalId).toBe(4);
    expect(findMatchingGoal({ type: "button_click", value: "" }, goals)).toBeUndefined();
    expect(findMatchingGoal({ type: "outbound", value: "" }, goals)?.goalId).toBe(5);
  });

  it("never matches a step limited to one hostname: no goal is that narrow", () => {
    expect(findMatchingGoal({ type: "page", value: "/signup", hostname: "app.example.com" }, goals)).toBeUndefined();
  });

  it("does not confuse a page with an event of the same text", () => {
    expect(findMatchingGoal({ type: "event", value: "/signup" }, goals)).toBeUndefined();
  });
});

describe("searchFunnels", () => {
  const rows = [row(1, "Visit to paid", null), row(2, "Docs activation", null)];
  rows[1].funnel.steps[0] = { type: "event", value: "copy_snippet", name: "Copied snippet" };

  it("matches the name, a step's value or a step's label, ignoring case", () => {
    expect(searchFunnels(rows, "PAID").map(item => item.funnel.id)).toEqual([1]);
    expect(searchFunnels(rows, "copy_").map(item => item.funnel.id)).toEqual([2]);
    expect(searchFunnels(rows, "copied").map(item => item.funnel.id)).toEqual([2]);
    expect(searchFunnels(rows, "/step-2").map(item => item.funnel.id)).toEqual([1, 2]);
  });

  it("returns everything for an empty search", () => {
    expect(searchFunnels(rows, "  ")).toEqual(rows);
  });
});
