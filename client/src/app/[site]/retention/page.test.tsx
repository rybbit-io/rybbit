import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcessedRetentionData } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";

type QueryState = { data?: ProcessedRetentionData; isLoading: boolean; isError: boolean; refetch: () => void };
type HookOptions = { periodTime?: "current" | "previous"; enabled?: boolean };

const mocks = vi.hoisted(() => ({
  current: {} as QueryState,
  previous: undefined as ProcessedRetentionData | undefined,
  calls: [] as { mode: string; options?: HookOptions }[],
}));

// Fills {placeholders} and drops rich-text tags, so assertions read like the screen.
const translate = (message: string, values?: Record<string, unknown>) =>
  message.replace(/<\/?\w+>/g, "").replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? `{${key}}`));
vi.mock("next-intl", () => ({
  useExtracted: () => Object.assign(translate, { rich: translate }),
  useLocale: () => "en",
}));
vi.mock("@/api/analytics/hooks/useGetRetention", () => ({
  useGetRetention: (mode: string, options?: HookOptions) => {
    mocks.calls.push({ mode, options });
    if (options?.periodTime === "previous") return { data: options.enabled === false ? undefined : mocks.previous };
    return mocks.current;
  },
}));
vi.mock("@/hooks/useSetPageTitle", () => ({ useSetPageTitle: () => {} }));
vi.mock("@/components/DisabledOverlay", () => ({
  DisabledOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/site/CompareControl", () => ({ CompareControl: () => <div data-testid="compare" /> }));
vi.mock("../components/SubHeader/SubHeader", () => ({ SubHeader: () => <div data-testid="sub-header" /> }));

import RetentionPage from "./page";

const WEEKS = ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"];

function response(
  counts: Record<string, number[]>,
  overrides: Partial<ProcessedRetentionData> = {}
): ProcessedRetentionData {
  const periods = overrides.periods ?? WEEKS;
  const cohorts: ProcessedRetentionData["cohorts"] = {};
  for (const [key, values] of Object.entries(counts)) {
    const padded = periods.map((_, offset) => values[offset] ?? null);
    cohorts[key] = {
      size: values[0],
      counts: padded,
      percentages: padded.map(value => (value === null ? null : (value / values[0]) * 100)),
    };
  }
  return {
    cohorts,
    maxPeriods: periods.length - 1,
    mode: "week",
    range: 31,
    periods,
    windowStart: "2026-08-31T00:00:00.000Z",
    windowEnd: "2026-09-30T15:00:00.000Z",
    timeZone: "UTC",
    firstPeriodPartial: false,
    lastPeriodPartial: true,
    lastPeriodInProgress: true,
    truncated: false,
    lookbackDays: 90,
    ...overrides,
  };
}

const populated = () =>
  response({
    "2026-08-31": [1000, 200, 100, 80, 20],
    "2026-09-07": [1000, 100, 60, 10],
    "2026-09-14": [2000, 200, 30],
    "2026-09-21": [1000, 40],
    "2026-09-28": [400],
  });

const settled = (data: ProcessedRetentionData): QueryState => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  mocks.current = settled(populated());
  mocks.previous = undefined;
  mocks.calls = [];
  useStore.setState({
    site: "1",
    time: { mode: "range", startDate: "2026-08-31", endDate: "2026-09-30" },
    previousTime: { mode: "range", startDate: "2026-07-31", endDate: "2026-08-30" },
    filters: [],
  });
});

afterEach(cleanup);

describe("RetentionPage", () => {
  it("takes its period from the sub-header and defaults to weekly cohorts on a month", () => {
    render(<RetentionPage />);

    expect(screen.getByTestId("sub-header")).toBeTruthy();
    expect(mocks.calls[0]).toMatchObject({ mode: "week" });
    expect(mocks.calls.some(call => call.options?.periodTime === "previous")).toBe(true);
  });

  it("defaults to daily cohorts on a short range", () => {
    useStore.setState({ time: { mode: "range", startDate: "2026-09-24", endDate: "2026-09-30" } });
    render(<RetentionPage />);

    expect(mocks.calls[0]).toMatchObject({ mode: "day" });
  });

  it("states the average retention, cohort size and best cohort", () => {
    render(<RetentionPage />);

    const stat = (label: string) => screen.getByText(label).parentElement!.parentElement!;
    expect(within(stat("Week 1 retention")).getByText("12.5%")).toBeTruthy();
    expect(within(stat("Week 2 retention")).getByText("8.0%")).toBeTruthy();
    expect(within(stat("Avg. cohort size")).getByText("1,250")).toBeTruthy();
    expect(within(stat("Best cohort")).getByText("Aug 31 – Sep 6")).toBeTruthy();
    expect(within(stat("Best cohort")).getByText("20.0% came back in week 1")).toBeTruthy();
  });

  it("shows deltas against the comparison period", () => {
    mocks.previous = response({
      "2026-08-31": [800, 80, 40, 30, 10],
      "2026-09-07": [800, 80, 40, 10],
      "2026-09-14": [800, 80, 10],
      "2026-09-21": [800, 10],
      "2026-09-28": [300],
    });
    render(<RetentionPage />);

    const weekOne = screen.getByText("Week 1 retention").parentElement!.parentElement!;
    // 12.5% against 10.0% in the comparison period.
    expect(within(weekOne).getByText("+2.5 pp")).toBeTruthy();
    expect(within(weekOne).getByText(/^10\.0% in /)).toBeTruthy();
  });

  it("does not ask for a comparison on all time", () => {
    useStore.setState({ time: { mode: "all-time" }, previousTime: { mode: "all-time" } });
    render(<RetentionPage />);

    expect(mocks.calls.find(call => call.options?.periodTime === "previous")?.options?.enabled).toBe(false);
  });

  it("draws the grid from period 1 and hatches the period in progress instead of calling it final", () => {
    render(<RetentionPage />);

    expect(screen.queryByText("Week 0")).toBeNull();
    const finished = screen.getByRole("button", { name: "Aug 31 – Sep 6 cohort, Week 1: 20.0%, 200 of 1,000 users" });
    const inProgress = screen.getByRole("button", { name: "Sep 21 – Sep 27 cohort, Week 1: 4.0%, 40 of 1,000 users" });
    expect(finished.style.backgroundImage).not.toContain("repeating-linear-gradient");
    expect(inProgress.style.backgroundImage).toContain("repeating-linear-gradient");
    expect(screen.getByText("Week in progress, 3 of 7 days. Returns start filling in on Oct 5.")).toBeTruthy();
    expect(screen.getByText("In progress: the week of Sep 28 has 3 of 7 days")).toBeTruthy();
  });

  it("switches the cells between percent and retained users", () => {
    render(<RetentionPage />);

    const cell = screen.getByRole("button", { name: "Aug 31 – Sep 6 cohort, Week 1: 20.0%, 200 of 1,000 users" });
    expect(cell.textContent).toBe("20.0%");
    fireEvent.click(screen.getByRole("radio", { name: "Users" }));
    expect(cell.textContent).toBe("200");
  });

  it("opens a popover with the figures behind a cell", () => {
    render(<RetentionPage />);

    fireEvent.click(screen.getByRole("button", { name: "Aug 31 – Sep 6 cohort, Week 2: 10.0%, 100 of 1,000 users" }));

    const popover = screen.getByRole("dialog", { name: "Cohort cell details" });
    expect(within(popover).getByText("Aug 31 – Sep 6 cohort")).toBeTruthy();
    expect(within(popover).getByText("Active again Sep 14 – Sep 20")).toBeTruthy();
    expect(within(popover).getByText("Came back")).toBeTruthy();
    expect(within(popover).getByText("Did not come back").nextElementSibling?.textContent).toBe("900");
    expect(within(popover).getByText("Average for Week 2").nextElementSibling?.textContent).toBe("8.0%");
  });

  it("calls out the largest cohort when it retains differently, and highlights it on request", () => {
    render(<RetentionPage />);

    expect(
      screen.getByText(
        "The Sep 14 – Sep 20 cohort is your largest at 2,000 new users, but only 10.0% came back in week 1, 2.5 pp under average."
      )
    ).toBeTruthy();
    const row = screen.getByRole("button", { name: "Sep 14 – Sep 20" });
    expect(row.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "View cohort" }));
    expect(row.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the controls live and shows skeletons while loading", () => {
    mocks.current = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<RetentionPage />);

    expect(screen.getByRole("radio", { name: "Daily" })).toBeTruthy();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.getByText("Week 1 retention")).toBeTruthy();
  });

  it("asks for a longer range when the range holds a single period", () => {
    mocks.current = settled(response({ "2026-09-28": [400] }, { periods: ["2026-09-28"] }));
    render(<RetentionPage />);

    expect(screen.getByText("This range is too short for retention")).toBeTruthy();
    expect(screen.queryByText("Week 1 retention")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Last 60 Days" }));
    expect(useStore.getState().time).toMatchObject({ mode: "range", wellKnown: "last-60-days" });
  });

  it("says so when the range has no new users", () => {
    mocks.current = settled(response({}));
    render(<RetentionPage />);

    expect(screen.getByText("No new users in this range")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export CSV" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows the error state with a retry", () => {
    const refetch = vi.fn();
    mocks.current = { isLoading: false, isError: true, refetch };
    render(<RetentionPage />);

    expect(screen.getByText("Failed to load retention data")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    expect(refetch).toHaveBeenCalled();
  });
});
