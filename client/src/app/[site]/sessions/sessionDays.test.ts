import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { groupSessionsByDay, relativeDay, sessionDayKey } from "./sessionDays";

const session = (id: string, session_start: string) => ({ id, session_start });

describe("sessionDayKey", () => {
  it("is the day in the viewer's timezone, not the UTC day the row was stored under", () => {
    // 01:30 UTC on the 30th is still the 29th in New York and already the 30th in Tokyo.
    expect(sessionDayKey("2026-09-30 01:30:00", "UTC")).toBe("2026-09-30");
    expect(sessionDayKey("2026-09-30 01:30:00", "America/New_York")).toBe("2026-09-29");
    expect(sessionDayKey("2026-09-30 01:30:00", "Asia/Tokyo")).toBe("2026-09-30");
    expect(sessionDayKey("2026-09-30 20:30:00", "Asia/Tokyo")).toBe("2026-10-01");
  });
});

describe("groupSessionsByDay", () => {
  const newestFirst = [
    session("a", "2026-09-30 14:00:00"),
    session("b", "2026-09-30 02:00:00"),
    session("c", "2026-09-29 23:00:00"),
    session("d", "2026-09-28 10:00:00"),
  ];

  it("splits a start-ordered list into runs of one day, keeping the order", () => {
    expect(
      groupSessionsByDay(newestFirst, "UTC").map(group => [group.day, group.sessions.map(row => row.id).join("")])
    ).toEqual([
      ["2026-09-30", "ab"],
      ["2026-09-29", "c"],
      ["2026-09-28", "d"],
    ]);
  });

  it("moves the day boundary with the timezone", () => {
    expect(
      groupSessionsByDay(newestFirst, "America/New_York").map(group => [
        group.day,
        group.sessions.map(row => row.id).join(""),
      ])
    ).toEqual([
      ["2026-09-30", "a"],
      ["2026-09-29", "bc"],
      ["2026-09-28", "d"],
    ]);
  });

  it("works oldest first and on an empty page", () => {
    expect(groupSessionsByDay([...newestFirst].reverse(), "UTC").map(group => group.day)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
    expect(groupSessionsByDay([], "UTC")).toEqual([]);
  });
});

describe("relativeDay", () => {
  // 03:00 UTC on Oct 1 is still Sep 30 in Los Angeles.
  const now = DateTime.fromISO("2026-10-01T03:00:00Z");

  it("names today and yesterday where the viewer is", () => {
    expect(relativeDay("2026-10-01", "UTC", now)).toBe("today");
    expect(relativeDay("2026-09-30", "UTC", now)).toBe("yesterday");
    expect(relativeDay("2026-09-30", "America/Los_Angeles", now)).toBe("today");
    expect(relativeDay("2026-09-29", "America/Los_Angeles", now)).toBe("yesterday");
  });

  it("leaves every other day to be shown as a date", () => {
    expect(relativeDay("2026-09-28", "UTC", now)).toBeNull();
    expect(relativeDay("2026-10-02", "UTC", now)).toBeNull();
  });
});
