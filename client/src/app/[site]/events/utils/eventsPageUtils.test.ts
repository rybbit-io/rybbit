import { describe, expect, it } from "vitest";
import { Goal, SavedFunnel, SiteEventCountPoint } from "../../../../api/analytics/endpoints";
import { DEFAULT_HIDDEN_TYPES, EVENT_TYPE_SERIES, SERIES_COLORS, seriesColor, totalsByType } from "./eventTypes";
import { formatShare, groupProperties } from "./properties";
import { funnelsForEvent, goalsForEvent, silentEventDailyAverage } from "./usedIn";

const goal = (goalId: number, goalType: Goal["goalType"], config: Goal["config"]): Goal => ({
  goalId,
  name: `Goal ${goalId}`,
  goalType,
  config,
  createdAt: "2026-01-01",
  total_conversions: 0,
  total_sessions: 0,
  conversion_rate: 0,
});

const funnel = (id: number, steps: SavedFunnel["steps"]): SavedFunnel => ({
  id,
  name: `Funnel ${id}`,
  steps,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  conversionRate: null,
  totalVisitors: null,
});

describe("goalsForEvent", () => {
  const goals = [
    goal(1, "event", { eventName: "signup" }),
    goal(2, "event", { eventName: "signup_started" }),
    goal(3, "path", { pathPattern: "/signup" }),
    goal(4, "button_click", { valuePattern: "signup" }),
    goal(5, "event", { eventName: "signup", propertyFilters: [{ key: "method", value: "google" }] }),
  ];

  it("returns the event goals on exactly this name", () => {
    expect(goalsForEvent(goals, "signup").map(item => item.goalId)).toEqual([1, 5]);
  });

  it("is empty for an event nothing measures and while goals are unknown", () => {
    expect(goalsForEvent(goals, "cta_click")).toEqual([]);
    expect(goalsForEvent(undefined, "signup")).toEqual([]);
  });
});

describe("funnelsForEvent", () => {
  const funnels = [
    funnel(1, [
      { type: "page", value: "/pricing" },
      { type: "event", value: "signup" },
    ]),
    funnel(2, [
      { type: "page", value: "signup" },
      { type: "button_click", value: "signup" },
    ]),
    funnel(3, [{ type: "event", value: "signup" }]),
  ];

  it("returns the funnels with an event step on this name", () => {
    expect(funnelsForEvent(funnels, "signup").map(item => item.id)).toEqual([1, 3]);
  });

  it("ignores page and autocapture steps that happen to share the text", () => {
    expect(funnelsForEvent([funnels[1]], "signup")).toEqual([]);
    expect(funnelsForEvent(undefined, "signup")).toEqual([]);
  });
});

describe("silentEventDailyAverage", () => {
  it("averages over the days between the first and last occurrence", () => {
    expect(silentEventDailyAverage({ total: 66, spanDays: 22 })).toBe(3);
  });

  it("does not divide by zero", () => {
    expect(silentEventDailyAverage({ total: 5, spanDays: 0 })).toBe(0);
  });
});

describe("event type series", () => {
  const point = (overrides: Partial<SiteEventCountPoint>): SiteEventCountPoint => ({
    time: "2026-09-01 00:00:00",
    pageview_count: 0,
    custom_event_count: 0,
    performance_count: 0,
    outbound_count: 0,
    error_count: 0,
    button_click_count: 0,
    copy_count: 0,
    form_submit_count: 0,
    input_change_count: 0,
    event_count: 0,
    ...overrides,
  });

  it("leads with the data hue and never repeats a colour across the types", () => {
    expect(EVENT_TYPE_SERIES[0]).toMatchObject({ type: "custom_event", color: "hsl(var(--dataviz))" });
    expect(new Set(EVENT_TYPE_SERIES.map(series => series.color)).size).toBe(EVENT_TYPE_SERIES.length);
  });

  it("hides the per-pageview types by default and nothing else", () => {
    expect([...DEFAULT_HIDDEN_TYPES].sort()).toEqual(["pageview", "performance"]);
  });

  it("treats only a rise in errors as bad news", () => {
    expect(EVENT_TYPE_SERIES.filter(series => series.upIsGood === false).map(series => series.type)).toEqual(["error"]);
  });

  it("wraps around when there are more series than colours", () => {
    expect(seriesColor(0)).toBe(SERIES_COLORS[0]);
    expect(seriesColor(SERIES_COLORS.length)).toBe(SERIES_COLORS[0]);
  });

  it("sums each type over the period", () => {
    const totals = totalsByType([
      point({ custom_event_count: 4, pageview_count: 10, error_count: 1 }),
      point({ custom_event_count: 6, pageview_count: 5 }),
    ]);

    expect(totals.custom_event).toBe(10);
    expect(totals.pageview).toBe(15);
    expect(totals.error).toBe(1);
    expect(totals.copy).toBe(0);
  });

  it("is all zeros before the data arrives", () => {
    expect(Object.values(totalsByType(undefined)).every(total => total === 0)).toBe(true);
  });
});

describe("groupProperties", () => {
  it("orders keys by the events that carry them and values by count", () => {
    const groups = groupProperties([
      { propertyKey: "referral_code", propertyValue: "HN", count: 4 },
      { propertyKey: "method", propertyValue: "email", count: 30 },
      { propertyKey: "method", propertyValue: "google", count: 50 },
      { propertyKey: "referral_code", propertyValue: "NORTH", count: 6 },
    ]);

    expect(groups.map(group => [group.key, group.total])).toEqual([
      ["method", 80],
      ["referral_code", 10],
    ]);
    expect(groups[0].values.map(value => value.propertyValue)).toEqual(["google", "email"]);
    expect(groups[1].values.map(value => value.propertyValue)).toEqual(["NORTH", "HN"]);
  });

  it("is empty for an event sent without properties", () => {
    expect(groupProperties([])).toEqual([]);
  });
});

describe("formatShare", () => {
  it.each([
    [1, "100%"],
    [0.51, "51%"],
    [0.104, "10%"],
    [0.062, "6.2%"],
    [0.0004, "0.0%"],
    [0, "0.0%"],
  ])("prints %s as %s", (fraction, expected) => {
    expect(formatShare(fraction)).toBe(expected);
  });

  it("never rounds a part up to the whole", () => {
    expect(formatShare(0.996)).toBe("99.6%");
    expect(formatShare(0.99999)).toBe("99.9%");
  });
});
