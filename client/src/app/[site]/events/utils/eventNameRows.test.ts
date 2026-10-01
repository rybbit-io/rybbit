import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { EventNameStats } from "../../../../api/analytics/endpoints";
import {
  buildEventNameRows,
  countNewEventNames,
  EventNameRow,
  filterEventNameRows,
  sortEventNameRows,
} from "./eventNameRows";

const ZONE = "America/New_York";
const NOW = DateTime.fromISO("2026-09-03T12:00:00", { zone: ZONE });

const stats: EventNameStats = {
  // The period runs to Sep 4; Sep 4 has not started yet.
  buckets: ["2026-09-01 00:00:00", "2026-09-02 00:00:00", "2026-09-03 00:00:00", "2026-09-04 00:00:00"],
  events: [
    { eventName: "signup", count: 60, users: 40, lastSeen: "2026-09-03 15:59:00", trend: [10, 20, 30, 0] },
    { eventName: "cta_click", count: 30, users: 10, lastSeen: "2026-09-02 08:00:00", trend: [30, 0, 0, 0] },
    { eventName: "docs_search", count: 10, users: 0, lastSeen: "not a date", trend: [0, 10, 0, 0] },
  ],
};

describe("buildEventNameRows", () => {
  it("is empty until the stats arrive", () => {
    expect(buildEventNameRows(undefined, undefined, ZONE, NOW)).toEqual([]);
  });

  it("works out events per user and each name's share of all custom events", () => {
    const [signup, cta] = buildEventNameRows(stats, undefined, ZONE, NOW);

    expect(signup.perUser).toBe(1.5);
    expect(signup.share).toBe(0.6);
    expect(cta.perUser).toBe(3);
    expect(cta.share).toBe(0.3);
  });

  it("does not divide by zero users", () => {
    expect(buildEventNameRows(stats, undefined, ZONE, NOW)[2].perUser).toBe(0);
  });

  it("cuts the trend at the buckets that have started, so an unfinished period does not end in zeros", () => {
    const rows = buildEventNameRows(stats, undefined, ZONE, NOW);

    expect(rows[0].trend).toEqual([10, 20, 30]);
    expect(rows[1].trend).toEqual([30, 0, 0]);
  });

  it("reads the last occurrence as UTC and tolerates one it cannot read", () => {
    const rows = buildEventNameRows(stats, undefined, ZONE, NOW);

    expect(rows[0].lastSeen?.toUTC().toISO()).toBe("2026-09-03T15:59:00.000Z");
    expect(rows[2].lastSeen).toBeNull();
  });

  it("leaves the comparison count undefined when there is no comparison", () => {
    expect(buildEventNameRows(stats, undefined, ZONE, NOW).map(row => row.previousCount)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("counts a name missing from the comparison period as zero there", () => {
    const rows = buildEventNameRows(stats, [{ eventName: "signup", count: 50 }], ZONE, NOW);

    expect(rows.map(row => row.previousCount)).toEqual([50, 0, 0]);
  });

  it("matches a numeric-looking name the names endpoint returned as a number", () => {
    const numeric: EventNameStats = {
      buckets: [],
      events: [{ eventName: "404", count: 5, users: 5, lastSeen: "2026-09-03 10:00:00", trend: [] }],
    };
    // processResults coerces "404" to 404 on the wire.
    const previous = [{ eventName: 404 as unknown as string, count: 2 }];

    expect(buildEventNameRows(numeric, previous, ZONE, NOW)[0].previousCount).toBe(2);
  });
});

describe("countNewEventNames", () => {
  it("is unknown without both periods", () => {
    expect(countNewEventNames(undefined, [])).toBeUndefined();
    expect(countNewEventNames(stats, undefined)).toBeUndefined();
  });

  it("counts the names the comparison period does not have", () => {
    expect(countNewEventNames(stats, [{ eventName: "signup", count: 50 }])).toBe(2);
    expect(countNewEventNames(stats, [])).toBe(3);
    expect(
      countNewEventNames(
        stats,
        stats.events.map(event => ({ eventName: event.eventName, count: 1 }))
      )
    ).toBe(0);
  });
});

const row = (overrides: Partial<EventNameRow> & { eventName: string }): EventNameRow => ({
  count: 0,
  users: 0,
  perUser: 0,
  share: 0,
  lastSeen: null,
  trend: [],
  previousCount: undefined,
  ...overrides,
});

describe("sortEventNameRows", () => {
  const rows = [
    row({ eventName: "b", count: 10, users: 5, previousCount: 20 }),
    row({ eventName: "a", count: 30, users: 2, previousCount: 10 }),
    row({ eventName: "c", count: 20, users: 9, previousCount: 0 }),
  ];
  const names = (sorted: EventNameRow[]) => sorted.map(item => item.eventName);

  it("sorts by a number in either direction", () => {
    expect(names(sortEventNameRows(rows, "count", "desc"))).toEqual(["a", "c", "b"]);
    expect(names(sortEventNameRows(rows, "users", "asc"))).toEqual(["a", "b", "c"]);
  });

  it("sorts names alphabetically", () => {
    expect(names(sortEventNameRows(rows, "name", "asc"))).toEqual(["a", "b", "c"]);
    expect(names(sortEventNameRows(rows, "name", "desc"))).toEqual(["c", "b", "a"]);
  });

  it("ranks a name that is new in the period above any finite rise", () => {
    // a: +200%, b: -50%, c: new.
    expect(names(sortEventNameRows(rows, "change", "desc"))).toEqual(["c", "a", "b"]);
    expect(names(sortEventNameRows(rows, "change", "asc"))).toEqual(["b", "a", "c"]);
  });

  it("orders two new names by count instead of producing NaN", () => {
    const fresh = [
      row({ eventName: "x", count: 1, previousCount: 0 }),
      row({ eventName: "y", count: 9, previousCount: 0 }),
    ];

    expect(names(sortEventNameRows(fresh, "change", "desc"))).toEqual(["y", "x"]);
  });

  it("breaks ties by count and then name, so the order is stable", () => {
    const tied = [
      row({ eventName: "z", count: 5, users: 1 }),
      row({ eventName: "m", count: 5, users: 1 }),
      row({ eventName: "k", count: 8, users: 1 }),
    ];

    expect(names(sortEventNameRows(tied, "users", "desc"))).toEqual(["k", "m", "z"]);
  });

  it("does not reorder the array it was given", () => {
    sortEventNameRows(rows, "count", "desc");

    expect(names(rows)).toEqual(["b", "a", "c"]);
  });
});

describe("filterEventNameRows", () => {
  const rows = [row({ eventName: "Signup" }), row({ eventName: "cta_click" })];

  it("returns everything for an empty or blank search", () => {
    expect(filterEventNameRows(rows, "")).toBe(rows);
    expect(filterEventNameRows(rows, "   ")).toBe(rows);
  });

  it("matches part of a name, ignoring case", () => {
    expect(filterEventNameRows(rows, " SIGN ").map(item => item.eventName)).toEqual(["Signup"]);
    expect(filterEventNameRows(rows, "missing")).toEqual([]);
  });
});
