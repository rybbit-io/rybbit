import { FilterParameter } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import {
  EVENT_FILTERS,
  FUNNEL_PAGE_FILTERS,
  GOALS_PAGE_FILTERS,
  JOURNEY_PAGE_FILTERS,
  SESSION_PAGE_FILTERS,
  SESSION_REPLAY_PAGE_FILTERS,
  USER_DETAIL_PAGE_FILTERS,
  USER_PAGE_FILTERS,
} from "./filterGroups";
import { parseAsFilters } from "./parsers";

const GROUPS: Record<string, FilterParameter[]> = {
  SESSION_PAGE_FILTERS,
  USER_DETAIL_PAGE_FILTERS,
  EVENT_FILTERS,
  GOALS_PAGE_FILTERS,
  FUNNEL_PAGE_FILTERS,
  USER_PAGE_FILTERS,
  JOURNEY_PAGE_FILTERS,
  SESSION_REPLAY_PAGE_FILTERS,
};

describe.each(Object.entries(GROUPS))("%s", (_name, group) => {
  it("is non-empty", () => {
    expect(group.length).toBeGreaterThan(0);
  });

  it("only offers parameters that survive a url round-trip", () => {
    // A parameter the URL parser rejects would be silently dropped on reload,
    // so anything the picker offers has to be in parseAsFilters' allow-list.
    const filters = group.map(parameter => ({ parameter, type: "equals" as const, value: ["x"] }));

    expect(parseAsFilters.parse(JSON.stringify(filters))).toHaveLength(group.length);
  });
});

describe("uniqueness", () => {
  it.each(Object.entries(GROUPS).filter(([name]) => name !== "EVENT_FILTERS"))(
    "%s lists each parameter once",
    (_name, group) => {
      expect(new Set(group).size).toBe(group.length);
    }
  );

  it("EVENT_FILTERS is the exception — it re-adds page_title, which BASE_FILTERS already has", () => {
    // Current behaviour, and a bug: the filter picker gets page_title twice.
    expect(EVENT_FILTERS.filter(parameter => parameter === "page_title")).toHaveLength(2);
    expect(new Set(EVENT_FILTERS).size).toBe(EVENT_FILTERS.length - 1);
  });
});

describe("group relationships", () => {
  it("scopes the user detail page to everything but user_id", () => {
    expect(SESSION_PAGE_FILTERS).toContain("user_id");
    expect(USER_DETAIL_PAGE_FILTERS).not.toContain("user_id");
    expect(USER_DETAIL_PAGE_FILTERS).toEqual(SESSION_PAGE_FILTERS.filter(f => f !== "user_id"));
  });

  it("gives goals and funnels the same base set, without page-level parameters", () => {
    expect(GOALS_PAGE_FILTERS).toEqual(FUNNEL_PAGE_FILTERS);
    for (const pageLevel of ["pathname", "entry_page", "exit_page", "event_name"] as FilterParameter[]) {
      expect(GOALS_PAGE_FILTERS).not.toContain(pageLevel);
    }
  });

  it("offers event_name only where events are listed", () => {
    expect(EVENT_FILTERS).toContain("event_name");
    expect(SESSION_PAGE_FILTERS).toContain("event_name");
    expect(USER_PAGE_FILTERS).not.toContain("event_name");
    expect(JOURNEY_PAGE_FILTERS).not.toContain("event_name");
    expect(SESSION_REPLAY_PAGE_FILTERS).not.toContain("event_name");
  });

  it("keeps every group's parameters within the session page's superset, minus journey-only geo", () => {
    for (const [name, group] of Object.entries(GROUPS)) {
      for (const parameter of group) {
        expect(SESSION_PAGE_FILTERS, `${name}.${parameter}`).toContain(parameter);
      }
    }
  });

  it("restricts session replay to session-level dimensions only", () => {
    for (const pageLevel of ["pathname", "entry_page", "exit_page", "querystring"] as FilterParameter[]) {
      expect(SESSION_REPLAY_PAGE_FILTERS).not.toContain(pageLevel);
    }
    expect(SESSION_REPLAY_PAGE_FILTERS).toContain("user_id");
  });
});
