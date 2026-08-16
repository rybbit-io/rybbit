import { Filter } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { Time } from "../../components/DateSelector/types";
import { buildAnalyticsRequest } from "./analyticsRequest";

const timeZone = "America/New_York";

const build = (descriptor: Parameters<typeof buildAnalyticsRequest>[0], time: Time | null, filters?: Filter[]) =>
  buildAnalyticsRequest(descriptor, { time, timeZone, filters });

describe("buildAnalyticsRequest", () => {
  it("serialises a day as a whole-day date range", () => {
    const request = build({ path: "overview" }, { mode: "day", day: "2026-08-14" });

    expect(request.path).toBe("overview");
    expect(request.params).toEqual({
      start_date: "2026-08-14",
      end_date: "2026-08-14",
      time_zone: timeZone,
    });
    expect(request.body).toBeUndefined();
    expect(request.unwrap).toBe(true);
  });

  it("closes week, month and year ranges on the period boundary", () => {
    expect(build({ path: "overview" }, { mode: "week", week: "2026-08-10" }).params).toMatchObject({
      start_date: "2026-08-10",
      end_date: "2026-08-16",
    });
    expect(build({ path: "overview" }, { mode: "month", month: "2026-08-01" }).params).toMatchObject({
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });
    expect(build({ path: "overview" }, { mode: "year", year: "2026-01-01" }).params).toMatchObject({
      start_date: "2026-01-01",
      end_date: "2026-12-31",
    });
  });

  it("sends past-minutes rather than a date range", () => {
    const request = build({ path: "overview" }, { mode: "past-minutes", pastMinutesStart: 60, pastMinutesEnd: 0 });

    expect(request.params).toEqual({
      past_minutes_start: 60,
      past_minutes_end: 0,
      time_zone: timeZone,
    });
    expect(request.params).not.toHaveProperty("start_date");
  });

  it("converts an exact datetime range to UTC datetimes", () => {
    const request = build(
      { path: "overview" },
      {
        mode: "range",
        startDate: "2026-08-14",
        endDate: "2026-08-14",
        startTime: "09:00",
        endTime: "17:00",
      }
    );

    // 09:00–17:00 in New York (UTC-4 in August) is 13:00–21:00 UTC.
    expect(request.params).toEqual({
      start_datetime: "2026-08-14 13:00:00",
      end_datetime: "2026-08-14 21:00:00",
      time_zone: timeZone,
    });
  });

  it("sends an empty window for all-time", () => {
    const request = build({ path: "overview" }, { mode: "all-time" });

    expect(request.params).toEqual({ start_date: "", end_date: "", time_zone: timeZone });
  });

  it("omits the window entirely when there is no time context", () => {
    const request = build({ path: "user-traits/keys" }, null);

    expect(request.params).toEqual({ time_zone: timeZone });
  });

  it("carries filters, but drops empty ones", () => {
    const real: Filter = { parameter: "browser", type: "equals", value: ["Chrome"] };
    const blank: Filter = { parameter: "country", type: "equals", value: [""] };

    expect(build({ path: "overview" }, { mode: "day", day: "2026-08-14" }, [real, blank]).params.filters).toEqual([
      real,
    ]);
    expect(build({ path: "overview" }, { mode: "day", day: "2026-08-14" }, [blank]).params).not.toHaveProperty(
      "filters"
    );
    expect(build({ path: "user-traits/keys" }, null, [real]).params.filters).toEqual([real]);
  });

  it("merges endpoint params over the shared context and drops undefined ones", () => {
    const request = build(
      { path: "metric", params: { parameter: "pathname", limit: 10, page: undefined } },
      { mode: "day", day: "2026-08-14" }
    );

    expect(request.params).toEqual({
      start_date: "2026-08-14",
      end_date: "2026-08-14",
      time_zone: timeZone,
      parameter: "pathname",
      limit: 10,
    });
  });

  it("hands the resolved window to body-carrying endpoints", () => {
    const request = build(
      {
        path: "funnels/analyze",
        body: common => ({ steps: ["/"], startDate: common.startDate, endDate: common.endDate }),
        unwrap: false,
      },
      { mode: "day", day: "2026-08-14" }
    );

    expect(request.body).toEqual({ steps: ["/"], startDate: "2026-08-14", endDate: "2026-08-14" });
    expect(request.unwrap).toBe(false);
  });

  it("produces identical requests for identical inputs, so query keys cannot drift", () => {
    const descriptor = { path: "metric", params: { parameter: "browser" } };
    const time: Time = { mode: "day", day: "2026-08-14" };

    expect(build(descriptor, time)).toEqual(build(descriptor, time));
  });
});
