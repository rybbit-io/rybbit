import { describe, expect, it } from "vitest";
import { Goal, SavedFunnel } from "@/api/analytics/endpoints";
import {
  bestMover,
  buildLedgerRows,
  formatRate,
  funnelRefs,
  goalPattern,
  goalPivotFilters,
  matchesGoalSearch,
  pathPatternToRegex,
  slippingGoal,
  sortLedgerRows,
} from "./goalLedger";

const SESSIONS = 10_000;

const goal = (overrides: Partial<Goal> & { goalId: number }): Goal => {
  const conversions = overrides.total_conversions ?? 0;
  const sessions = overrides.total_sessions ?? SESSIONS;
  return {
    name: `Goal ${overrides.goalId}`,
    goalType: "path",
    config: { pathPattern: `/page-${overrides.goalId}` },
    createdAt: "2026-09-01 00:00:00",
    total_conversions: conversions,
    total_sessions: sessions,
    conversion_rate: sessions > 0 ? conversions / sessions : 0,
    ...overrides,
  };
};

const pricing = goal({
  goalId: 1,
  name: "Viewed pricing",
  config: { pathPattern: "/pricing" },
  total_conversions: 2000,
});
const signup = goal({
  goalId: 2,
  name: "Signup",
  goalType: "event",
  config: { eventName: "signup" },
  total_conversions: 500,
});
const github = goal({
  goalId: 3,
  name: "GitHub click",
  goalType: "outbound",
  config: { valuePattern: "https://github.com/**" },
  total_conversions: 300,
});

describe("buildLedgerRows", () => {
  it("leaves every change empty without a comparison period", () => {
    const [row] = buildLedgerRows([pricing], undefined);

    expect(row.conversions).toBe(2000);
    expect(row.rate).toBeCloseTo(0.2);
    expect(row.previousConversions).toBeNull();
    expect(row.conversionsDelta).toBeNull();
    expect(row.rateDelta).toBeNull();
    expect(row.conversionsChange).toBeNull();
    expect(row.rateChange).toBeNull();
  });

  it("joins the comparison period by goal id, whatever order it arrives in", () => {
    const previous = [
      goal({ goalId: 2, total_conversions: 400, total_sessions: 8000 }),
      goal({ goalId: 1, total_conversions: 1600, total_sessions: 8000 }),
    ];
    const [pricingRow, signupRow] = buildLedgerRows([pricing, signup], previous);

    expect(pricingRow.previousConversions).toBe(1600);
    expect(pricingRow.conversionsDelta).toEqual({ direction: "up", text: "25.0%", signed: "+25.0%" });
    expect(signupRow.previousConversions).toBe(400);
  });

  it("reports the rate's change in percentage points at two decimals", () => {
    // 20.00% now against 21.25% before.
    const previous = [goal({ goalId: 1, total_conversions: 1700, total_sessions: 8000 })];
    const [row] = buildLedgerRows([pricing], previous);

    expect(row.rateChange).toBeCloseTo(-1.25);
    expect(row.rateDelta).toEqual({ direction: "down", text: "1.25 pp", signed: "-1.25 pp" });
  });

  it("has no percentage for a goal that converted nothing before", () => {
    const [row] = buildLedgerRows([pricing], [goal({ goalId: 1, total_conversions: 0 })]);

    expect(row.conversionsChange).toBeNull();
    expect(row.conversionsDelta?.direction).toBe("none");
  });

  it("leaves a goal the comparison period does not list without a change", () => {
    const [row] = buildLedgerRows([pricing], [goal({ goalId: 99, total_conversions: 5 })]);

    expect(row.previousConversions).toBeNull();
    expect(row.conversionsDelta).toBeNull();
  });

  it("labels a goal saved without a name through the caller's stand-in", () => {
    const unnamed = goal({ goalId: 7, name: null });

    expect(buildLedgerRows([unnamed], undefined)[0].label).toBe("/page-7");
    expect(buildLedgerRows([unnamed], undefined, g => `Goal #${g.goalId}`)[0].label).toBe("Goal #7");
  });
});

describe("matchesGoalSearch", () => {
  const rows = buildLedgerRows(
    [
      pricing,
      signup,
      goal({
        goalId: 4,
        name: "Paid plan",
        goalType: "event",
        config: { eventName: "subscribed", propertyFilters: [{ key: "plan", value: "Pro" }] },
      }),
    ],
    undefined
  );
  const matching = (search: string) => rows.filter(row => matchesGoalSearch(row, search)).map(row => row.goal.goalId);

  it("matches everything for an empty search", () => {
    expect(matching("  ")).toEqual([1, 2, 4]);
  });

  it("matches the name, ignoring case", () => {
    expect(matching("SIGN")).toEqual([2]);
  });

  it("matches what the goal targets", () => {
    expect(matching("/pric")).toEqual([1]);
    expect(matching("subscribed")).toEqual([4]);
  });

  it("matches property filter keys and values", () => {
    expect(matching("plan")).toEqual([4]);
    expect(matching("pro")).toEqual([4]);
  });
});

describe("sortLedgerRows", () => {
  const previous = [
    goal({ goalId: 1, total_conversions: 1900 }), // +5.3%, +1.00 pp
    goal({ goalId: 2, total_conversions: 250 }), // +100%, +2.50 pp
    goal({ goalId: 3, total_conversions: 450 }), // -33.3%, -1.50 pp
  ];
  const rows = buildLedgerRows([github, pricing, signup], previous);
  const ids = (sorted: ReturnType<typeof sortLedgerRows>) => sorted.map(row => row.goal.goalId);

  it("sorts by conversions in both directions", () => {
    expect(ids(sortLedgerRows(rows, { key: "conversions", order: "desc" }))).toEqual([1, 2, 3]);
    expect(ids(sortLedgerRows(rows, { key: "conversions", order: "asc" }))).toEqual([3, 2, 1]);
  });

  it("sorts by rate", () => {
    expect(ids(sortLedgerRows(rows, { key: "rate", order: "desc" }))).toEqual([1, 2, 3]);
  });

  it("sorts by the change in conversions and in rate", () => {
    expect(ids(sortLedgerRows(rows, { key: "conversionsChange", order: "desc" }))).toEqual([2, 1, 3]);
    expect(ids(sortLedgerRows(rows, { key: "rateChange", order: "asc" }))).toEqual([3, 1, 2]);
  });

  it("sorts by name without regard to case", () => {
    const named = buildLedgerRows(
      [goal({ goalId: 1, name: "signup" }), goal({ goalId: 2, name: "Checkout" }), goal({ goalId: 3, name: "Trial" })],
      undefined
    );

    expect(ids(sortLedgerRows(named, { key: "name", order: "asc" }))).toEqual([2, 1, 3]);
    expect(ids(sortLedgerRows(named, { key: "name", order: "desc" }))).toEqual([3, 1, 2]);
  });

  it("keeps goals without a change last in either direction", () => {
    const withNewGoal = buildLedgerRows(
      [pricing, signup, goal({ goalId: 9, total_conversions: 9000 })],
      [...previous, goal({ goalId: 9, total_conversions: 0 })]
    );

    expect(ids(sortLedgerRows(withNewGoal, { key: "conversionsChange", order: "desc" }))).toEqual([2, 1, 9]);
    expect(ids(sortLedgerRows(withNewGoal, { key: "conversionsChange", order: "asc" }))).toEqual([1, 2, 9]);
  });

  it("breaks ties by conversions, then by goal id", () => {
    const tied = buildLedgerRows(
      [goal({ goalId: 5, total_conversions: 10 }), goal({ goalId: 4, total_conversions: 10 })],
      undefined
    );

    expect(ids(sortLedgerRows(tied, { key: "conversions", order: "desc" }))).toEqual([4, 5]);
    expect(ids(sortLedgerRows(tied, { key: "conversions", order: "asc" }))).toEqual([4, 5]);
  });

  it("does not reorder its input", () => {
    sortLedgerRows(rows, { key: "conversions", order: "desc" });

    expect(ids(rows)).toEqual([3, 1, 2]);
  });
});

describe("bestMover and slippingGoal", () => {
  it("picks the largest percent gain and the largest rate drop", () => {
    const rows = buildLedgerRows(
      [pricing, signup, github],
      [
        goal({ goalId: 1, total_conversions: 1900 }),
        goal({ goalId: 2, total_conversions: 250 }),
        goal({ goalId: 3, total_conversions: 450 }),
      ]
    );

    expect(bestMover(rows)?.goal.goalId).toBe(2);
    expect(slippingGoal(rows)?.goal.goalId).toBe(3);
  });

  it("ignores a goal with no baseline when naming the best mover", () => {
    const rows = buildLedgerRows(
      [pricing, goal({ goalId: 9, total_conversions: 9000 })],
      [goal({ goalId: 1, total_conversions: 1900 }), goal({ goalId: 9, total_conversions: 0 })]
    );

    expect(bestMover(rows)?.goal.goalId).toBe(1);
  });

  it("names nothing when no goal gained or lost", () => {
    const flat = buildLedgerRows([pricing], [goal({ goalId: 1, total_conversions: 2000 })]);
    const falling = buildLedgerRows([pricing], [goal({ goalId: 1, total_conversions: 2500 })]);
    const rising = buildLedgerRows([pricing], [goal({ goalId: 1, total_conversions: 1500 })]);

    expect(bestMover(flat)).toBeNull();
    expect(slippingGoal(flat)).toBeNull();
    expect(bestMover(falling)).toBeNull();
    expect(slippingGoal(rising)).toBeNull();
  });

  it("does not call a change that prints as zero a move", () => {
    // 20.000% against 20.004%: -0.004 pp prints as 0.00 pp.
    const rows = buildLedgerRows(
      [goal({ goalId: 1, total_conversions: 20_000, total_sessions: 100_000 })],
      [goal({ goalId: 1, total_conversions: 20_004, total_sessions: 100_000 })]
    );

    expect(slippingGoal(rows)).toBeNull();
  });

  it("names nothing without a comparison period", () => {
    const rows = buildLedgerRows([pricing, signup], undefined);

    expect(bestMover(rows)).toBeNull();
    expect(slippingGoal(rows)).toBeNull();
  });
});

describe("pathPatternToRegex", () => {
  it("anchors a literal path and escapes regex characters", () => {
    expect(pathPatternToRegex("/pricing")).toBe("^/pricing$");
    expect(pathPatternToRegex("/docs/v1.2")).toBe("^/docs/v1\\.2$");
  });

  it("makes * one segment and ** any number of segments, as the server does", () => {
    expect(pathPatternToRegex("/product/*/view")).toBe("^/product/[^/]+/view$");
    expect(pathPatternToRegex("/docs/**")).toBe("^/docs/.*$");
    expect(new RegExp(pathPatternToRegex("/product/*/view")).test("/product/42/view")).toBe(true);
    expect(new RegExp(pathPatternToRegex("/product/*/view")).test("/product/a/b/view")).toBe(false);
  });
});

describe("goalPivotFilters", () => {
  it("selects a literal page by its path", () => {
    expect(goalPivotFilters(pricing)).toEqual([{ parameter: "pathname", type: "equals", value: ["/pricing"] }]);
  });

  it("selects a wildcard page pattern by the regex the goal is counted with", () => {
    expect(goalPivotFilters({ goalType: "path", config: { pathPattern: "/docs/**" } })).toEqual([
      { parameter: "pathname", type: "regex", value: ["^/docs/.*$"] },
    ]);
  });

  it("selects an event by its name", () => {
    expect(goalPivotFilters(signup)).toEqual([{ parameter: "event_name", type: "equals", value: ["signup"] }]);
  });

  it("offers nothing for goals the filters cannot express", () => {
    expect(goalPivotFilters(github)).toBeNull();
    expect(
      goalPivotFilters({
        goalType: "event",
        config: { eventName: "signup", propertyFilters: [{ key: "plan", value: "pro" }] },
      })
    ).toBeNull();
    expect(
      goalPivotFilters({
        goalType: "path",
        config: { pathPattern: "/pricing", eventPropertyKey: "utm_source", eventPropertyValue: "ads" },
      })
    ).toBeNull();
    expect(goalPivotFilters({ goalType: "path", config: { pathPattern: `/${"a".repeat(600)}/*` } })).toBeNull();
    expect(goalPivotFilters({ goalType: "path", config: {} })).toBeNull();
  });
});

describe("funnelRefs", () => {
  const funnel = (id: number, steps: SavedFunnel["steps"]): SavedFunnel => ({
    id,
    name: `Funnel ${id}`,
    steps,
    createdAt: "",
    updatedAt: "",
  });
  const funnels = [
    funnel(1, [
      { type: "page", value: "/" },
      { type: "page", value: "/pricing" },
      { type: "event", value: "signup" },
    ]),
    funnel(2, [
      { type: "event", value: "demo_opened" },
      { type: "event", value: "signup" },
    ]),
    funnel(3, [
      { type: "outbound", value: "https://github.com/**" },
      { type: "page", value: "/docs" },
    ]),
  ];

  it("finds the step that targets the goal's page", () => {
    expect(funnelRefs(pricing, funnels)).toEqual([{ funnel: funnels[0], step: 2, of: 3 }]);
  });

  it("finds every funnel that uses the goal's event", () => {
    expect(funnelRefs(signup, funnels).map(ref => [ref.funnel.id, ref.step, ref.of])).toEqual([
      [1, 3, 3],
      [2, 2, 2],
    ]);
  });

  it("matches autocapture goals on type and pattern", () => {
    expect(funnelRefs(github, funnels).map(ref => ref.funnel.id)).toEqual([3]);
    expect(funnelRefs({ goalType: "outbound", config: {} }, funnels)).toEqual([]);
  });

  it("does not confuse a page with an event of the same name", () => {
    expect(funnelRefs({ goalType: "path", config: { pathPattern: "signup" } }, funnels)).toEqual([]);
  });
});

describe("formatting", () => {
  it("prints a rate with two decimals", () => {
    expect(formatRate(0.0473)).toBe("4.73%");
    expect(formatRate(0)).toBe("0.00%");
  });

  it("names what a goal matches", () => {
    expect(goalPattern(pricing)).toBe("/pricing");
    expect(goalPattern(signup)).toBe("signup");
    expect(goalPattern(github)).toBe("https://github.com/**");
    expect(goalPattern({ goalType: "copy", config: {} })).toBe("");
  });
});
