import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { GetSessionsResponse } from "../../../../../api/analytics/endpoints";
import { formatGroupDuration, groupSessions, relativeDay } from "./sessionGroups";

const session = (id: string, start: string, duration: number, pageviews: number) =>
  ({ session_id: id, session_start: start, session_duration: duration, pageviews }) as GetSessionsResponse[number];

// Newest first, as the endpoint returns them. Times are UTC.
const sessions = [
  session("a", "2026-09-30 12:32:08", 742, 11),
  session("b", "2026-09-30 07:14:00", 223, 4),
  // 22:30 UTC on the 29th is 00:30 on the 30th in Stockholm (UTC+2).
  session("c", "2026-09-29 22:30:00", 60, 2),
  session("d", "2026-09-29 14:05:00", 490, 7),
  session("e", "2026-09-25 11:58:00", 567, 9),
];

describe("groupSessions", () => {
  it("groups by the day a session started, in the dashboard's timezone", () => {
    const groups = groupSessions(sessions, "Europe/Stockholm", "day");

    expect(groups.map(group => [group.key, group.sessions.map(s => s.session_id)])).toEqual([
      ["2026-09-30", ["a", "b", "c"]],
      ["2026-09-29", ["d"]],
      ["2026-09-25", ["e"]],
    ]);
  });

  it("puts the same sessions on different days in a different timezone", () => {
    const groups = groupSessions(sessions, "UTC", "day");

    expect(groups.map(group => [group.key, group.sessions.length])).toEqual([
      ["2026-09-30", 2],
      ["2026-09-29", 2],
      ["2026-09-25", 1],
    ]);
  });

  it("totals the sessions it lists", () => {
    const [today] = groupSessions(sessions, "UTC", "day");

    expect(today.duration).toBe(965);
    expect(today.pageviews).toBe(15);
  });

  it("groups by ISO week, keyed by its Monday", () => {
    const groups = groupSessions(sessions, "UTC", "week");

    expect(groups.map(group => [group.key, group.sessions.length])).toEqual([
      ["2026-09-28", 4],
      ["2026-09-21", 1],
    ]);
  });

  it("has no groups for an empty page", () => {
    expect(groupSessions([], "UTC", "day")).toEqual([]);
  });
});

describe("formatGroupDuration", () => {
  it("stays in minutes and seconds under an hour", () => {
    expect(formatGroupDuration(45)).toBe("45s");
    expect(formatGroupDuration(965)).toBe("16m 5s");
    expect(formatGroupDuration(600)).toBe("10m");
  });

  it("switches to hours and minutes past the hour", () => {
    expect(formatGroupDuration(4757)).toBe("1h 19m");
    expect(formatGroupDuration(7200)).toBe("2h");
  });

  it("is zero seconds for nothing", () => {
    expect(formatGroupDuration(0)).toBe("0s");
  });
});

describe("relativeDay", () => {
  const now = DateTime.fromISO("2026-09-30T09:00:00", { zone: "utc" });

  it("names today and yesterday and nothing else", () => {
    expect(relativeDay("2026-09-30", now)).toBe("today");
    expect(relativeDay("2026-09-29", now)).toBe("yesterday");
    expect(relativeDay("2026-09-28", now)).toBeNull();
  });
});
