import { Filter } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { analyticsParsers } from "./parsers";
import { buildPivotHref, canPivot, mergeFilters, PivotContext } from "./pivots";
import { urlParamsToComparison, urlParamsToTime } from "./time";

const country: Filter = { parameter: "country", type: "equals", value: ["US", "CA"] };
const device: Filter = { parameter: "device_type", type: "equals", value: ["Mobile"] };
const pricing: Filter = { parameter: "pathname", type: "equals", value: ["/pricing"] };
const signup: Filter = { parameter: "event_name", type: "equals", value: ["signup"] };

const context: PivotContext = {
  site: "42",
  privateKey: null,
  time: { mode: "range", startDate: "2026-09-01", endDate: "2026-09-30", wellKnown: "last-30-days" },
  comparison: { mode: "previous" },
  bucket: "day",
  selectedStat: "users",
  filters: [country],
  segmentId: null,
};

// Reads an href back the way the destination page does: nuqs parsers, then the
// same time and comparison deserialisers useSyncStateWithUrl calls.
function readBack(href: string) {
  const url = new URL(href, "https://app.example");
  const raw = (key: keyof typeof analyticsParsers) => url.searchParams.get(key);
  const filters = raw("filters");
  const segment = raw("segment");
  const start = raw("past_minutes_start");
  const end = raw("past_minutes_end");

  return {
    pathname: url.pathname,
    params: url.searchParams,
    filters: filters === null ? null : analyticsParsers.filters.parse(filters),
    segment: segment === null ? null : analyticsParsers.segment.parse(segment),
    time: urlParamsToTime(
      {
        timeMode: raw("timeMode"),
        wellKnown: raw("wellKnown"),
        day: raw("day"),
        startDate: raw("startDate"),
        endDate: raw("endDate"),
        startTime: raw("startTime"),
        endTime: raw("endTime"),
        week: raw("week"),
        month: raw("month"),
        year: raw("year"),
        past_minutes_start: start === null ? null : Number(start),
        past_minutes_end: end === null ? null : Number(end),
      },
      "UTC"
    ),
    comparison: urlParamsToComparison({
      compare: raw("compare"),
      compareStart: raw("compareStart"),
      compareEnd: raw("compareEnd"),
    }),
  };
}

describe("mergeFilters", () => {
  it("appends an extra on a new parameter", () => {
    expect(mergeFilters([country], [pricing])).toEqual([country, pricing]);
  });

  it("replaces a current filter on the same parameter and operator, in place", () => {
    const us: Filter = { parameter: "country", type: "equals", value: ["US"] };

    expect(mergeFilters([country, device], [us])).toEqual([us, device]);
  });

  it("keeps a current filter on the same parameter with a different operator", () => {
    const notDocs: Filter = { parameter: "pathname", type: "not_contains", value: ["/docs"] };

    expect(mergeFilters([notDocs], [pricing])).toEqual([notDocs, pricing]);
  });

  it("applies several extras in order", () => {
    expect(mergeFilters([], [pricing, device])).toEqual([pricing, device]);
  });

  it("returns the current filters when there is nothing to add, without mutating them", () => {
    const current = [country];

    expect(mergeFilters(current, [])).toEqual([country]);
    mergeFilters(current, [pricing]);
    expect(current).toEqual([country]);
  });
});

describe("canPivot", () => {
  it("offers every target when the aggregate adds no filter", () => {
    expect(canPivot("sessions", [])).toBe(true);
    expect(canPivot("users", [])).toBe(true);
    expect(canPivot("replays", [])).toBe(true);
  });

  it("offers Sessions for a page or an event", () => {
    expect(canPivot("sessions", [pricing])).toBe(true);
    expect(canPivot("sessions", [signup])).toBe(true);
  });

  it("does not offer Users for an event: the users list would drop the filter", () => {
    expect(canPivot("users", [pricing])).toBe(true);
    expect(canPivot("users", [signup])).toBe(false);
    expect(canPivot("users", [pricing, signup])).toBe(false);
  });

  it("offers Replays for any filter: the replay list sends them all", () => {
    expect(canPivot("replays", [pricing, signup])).toBe(true);
    expect(canPivot("replays", [{ parameter: "timezone", type: "equals", value: ["Europe/Berlin"] }])).toBe(true);
  });

  it("does not offer Sessions for a parameter the sessions list drops", () => {
    expect(canPivot("sessions", [{ parameter: "timezone", type: "equals", value: ["Europe/Berlin"] }])).toBe(false);
  });
});

describe("buildPivotHref", () => {
  it("leads to the target page of the same site", () => {
    expect(readBack(buildPivotHref("sessions", context)).pathname).toBe("/42/sessions");
    expect(readBack(buildPivotHref("users", context)).pathname).toBe("/42/users");
    expect(readBack(buildPivotHref("replays", context)).pathname).toBe("/42/replay");
  });

  it("stays inside a private link", () => {
    const href = buildPivotHref("sessions", { ...context, privateKey: "abcdef123456" });

    expect(readBack(href).pathname).toBe("/42/abcdef123456/sessions");
  });

  it("carries the current filters narrowed by the extras", () => {
    const href = buildPivotHref("sessions", context, [pricing]);

    expect(readBack(href).filters).toEqual([country, pricing]);
  });

  it("survives values that need escaping", () => {
    const awkward: Filter = { parameter: "pathname", type: "equals", value: ["/search?q=a&b=c d#x", '/"quoted"/100%'] };

    expect(readBack(buildPivotHref("sessions", { ...context, filters: [] }, [awkward])).filters).toEqual([awkward]);
  });

  it("writes no filters param when there are none", () => {
    const href = buildPivotHref("sessions", { ...context, filters: [] });

    expect(readBack(href).params.has("filters")).toBe(false);
  });

  it("keeps a preset period as the preset", () => {
    const { params } = readBack(buildPivotHref("sessions", context));

    expect(params.get("wellKnown")).toBe("last-30-days");
    expect(params.get("timeMode")).toBe("range");
    expect(params.has("startDate")).toBe(false);
  });

  it("keeps an explicit range, a day and a rolling window", () => {
    const range = { mode: "range", startDate: "2026-08-02", endDate: "2026-08-31" } as const;
    const day = { mode: "day", day: "2026-09-14" } as const;
    const rolling = { mode: "past-minutes", pastMinutesStart: 60, pastMinutesEnd: 0 } as const;

    expect(readBack(buildPivotHref("sessions", { ...context, time: range })).time).toEqual(range);
    expect(readBack(buildPivotHref("sessions", { ...context, time: day })).time).toEqual(day);
    expect(readBack(buildPivotHref("sessions", { ...context, time: rolling })).time).toEqual(rolling);
  });

  it("leaves the default comparison out and keeps any other", () => {
    expect(readBack(buildPivotHref("sessions", context)).params.has("compare")).toBe(false);

    const off = readBack(buildPivotHref("sessions", { ...context, comparison: { mode: "none" } }));
    expect(off.comparison).toEqual({ mode: "none" });

    const custom = {
      mode: "custom",
      customTime: { mode: "range", startDate: "2026-07-01", endDate: "2026-07-30" },
    } as const;
    expect(readBack(buildPivotHref("sessions", { ...context, comparison: custom })).comparison).toEqual(custom);
  });

  it("keeps the bucket, the selected stat and the applied segment", () => {
    const href = buildPivotHref("users", { ...context, bucket: "hour", selectedStat: "bounce_rate", segmentId: 7 });
    const { params, segment } = readBack(href);

    expect(params.get("bucket")).toBe("hour");
    expect(params.get("stat")).toBe("bounce_rate");
    expect(segment).toBe(7);
  });

  it("stays embedded but leaves a page's own params behind", () => {
    const href = buildPivotHref("sessions", {
      ...context,
      search: "?embed=true&hideSidebar=true&theme=light&tab=entry&filters=%5B%5D&wellKnown=today",
    });
    const { params, filters } = readBack(href);

    expect(params.get("embed")).toBe("true");
    expect(params.get("hideSidebar")).toBe("true");
    expect(params.get("theme")).toBe("light");
    expect(params.has("tab")).toBe(false);
    // The store wins over whatever the address bar still says.
    expect(filters).toEqual([country]);
    expect(params.get("wellKnown")).toBe("last-30-days");
  });

  it("accepts the query string as URLSearchParams", () => {
    const href = buildPivotHref("sessions", { ...context, search: new URLSearchParams("embed=true") });

    expect(readBack(href).params.get("embed")).toBe("true");
  });
});
