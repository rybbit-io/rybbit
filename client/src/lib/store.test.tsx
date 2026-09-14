// The .tsx suffix selects Vitest's jsdom project for localStorage and window.history coverage.
import { Filter } from "@rybbit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPARISON } from "../components/DateSelector/types";
import { addFilter, getFilteredFilters, getTimezone, removeFilter, updateFilter, useStore } from "./store";

const chrome: Filter = { parameter: "browser", type: "equals", value: ["Chrome"] };
const firefox: Filter = { parameter: "browser", type: "equals", value: ["Firefox"] };
const canada: Filter = { parameter: "country", type: "equals", value: ["CA"] };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-29T16:00:00.000Z"));
  localStorage.clear();
  window.history.replaceState({}, "", "/42/main");
  useStore.setState({
    site: "",
    privateKey: null,
    time: { mode: "day", day: "2026-08-14" },
    previousTime: { mode: "day", day: "2026-08-13" },
    comparison: DEFAULT_COMPARISON,
    bucket: "hour",
    selectedStat: "users",
    filters: [],
    timezone: "UTC",
  });
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("filter state", () => {
  it("adds a filter and replaces an existing parameter/operator pair", () => {
    addFilter(chrome);
    addFilter(firefox);

    expect(useStore.getState().filters).toEqual([firefox]);
  });

  it("keeps filters with different parameters or operators distinct", () => {
    const notChrome: Filter = { parameter: "browser", type: "not_equals", value: ["Chrome"] };

    addFilter(chrome);
    addFilter(notChrome);
    addFilter(canada);

    expect(useStore.getState().filters).toEqual([chrome, notChrome, canada]);
  });

  it("updates and removes filters while preserving the remaining order", () => {
    useStore.getState().setFilters([chrome, canada]);

    updateFilter(firefox, 0);
    expect(useStore.getState().filters).toEqual([firefox, canada]);

    removeFilter(firefox);
    expect(useStore.getState().filters).toEqual([canada]);
  });

  it("selects only the filter dimensions a page supports", () => {
    useStore.getState().setFilters([chrome, canada]);

    expect(getFilteredFilters(["country"])).toEqual([canada]);
    expect(getFilteredFilters(["browser", "country"])).toEqual([chrome, canada]);
    expect(getFilteredFilters([])).toEqual([]);
  });
});

describe("time and comparison state", () => {
  it("derives the comparison window and bucket whenever time changes", () => {
    useStore.getState().setTime({ mode: "range", startDate: "2026-08-01", endDate: "2026-08-07" });

    expect(useStore.getState()).toMatchObject({
      time: { mode: "range", startDate: "2026-08-01", endDate: "2026-08-07" },
      previousTime: { mode: "range", startDate: "2026-07-25", endDate: "2026-07-31" },
      bucket: "day",
    });
  });

  it("can change time without replacing a manually selected bucket", () => {
    useStore.getState().setBucket("month");
    useStore.getState().setTime({ mode: "day", day: "2026-08-20" }, false);

    expect(useStore.getState()).toMatchObject({
      time: { mode: "day", day: "2026-08-20" },
      previousTime: { mode: "day", day: "2026-08-19" },
      bucket: "month",
    });
  });

  it("keeps comparison disabled as the selected period changes", () => {
    useStore.getState().setComparison({ mode: "none" });
    expect(useStore.getState().previousTime).toBeNull();

    useStore.getState().setTime({ mode: "month", month: "2026-07-01" });
    expect(useStore.getState()).toMatchObject({ comparison: { mode: "none" }, previousTime: null });
  });

  it("resolves explicit and system timezones through the public helper", () => {
    useStore.getState().setTimezone("America/Los_Angeles");
    expect(getTimezone()).toBe("America/Los_Angeles");

    useStore.getState().setTimezone("system");
    expect(getTimezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});

describe("site context", () => {
  it("resets dashboard selections to defaults when the new URL has no state", () => {
    useStore.setState({
      selectedStat: "bounce_rate",
      filters: [chrome],
      bucket: "month",
      comparison: { mode: "none" },
    });

    useStore.getState().setSiteContext("84", "abcdef123456");

    const state = useStore.getState();
    expect(state.site).toBe("84");
    expect(state.privateKey).toBe("abcdef123456");
    expect(state.selectedStat).toBe("users");
    expect(state.filters).toEqual([]);
    expect(state.time.wellKnown).toBe("today");
    expect(state.comparison).toEqual(DEFAULT_COMPARISON);
  });

  it("preserves selections whose URL parameters are waiting to hydrate", () => {
    window.history.replaceState({}, "", "/84/main?timeMode=day&bucket=month&stat=bounce_rate&filters=%5B%5D");
    useStore.setState({
      time: { mode: "day", day: "2026-08-14" },
      previousTime: null,
      selectedStat: "bounce_rate",
      filters: [chrome],
      bucket: "month",
      comparison: { mode: "none" },
    });

    useStore.getState().setSite("84");

    expect(useStore.getState()).toMatchObject({
      site: "84",
      time: { mode: "day", day: "2026-08-14" },
      previousTime: null,
      selectedStat: "bounce_rate",
      filters: [chrome],
      bucket: "month",
      comparison: { mode: "none" },
    });
  });
});
