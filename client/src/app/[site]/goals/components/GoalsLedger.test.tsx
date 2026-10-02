import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Goal, GoalsSummary } from "@/api/analytics/endpoints";
import { buildLedgerRows, DEFAULT_LEDGER_SORT, LedgerSort } from "../utils/goalLedger";
import { GoalsSummaryBand } from "./GoalsSummaryBand";

vi.mock("next-intl", () => ({
  // Fills {placeholders} the way the page's simple messages need; plural
  // messages are left as written.
  useExtracted: () => (message: string, values?: Record<string, string | number>) =>
    message.replace(/\{(\w+)\}/g, (match, key) => (values && key in values ? String(values[key]) : match)),
}));

// The rows are not under test here, and they pull in the whole site shell
// (pivots, segment dialog, replay drawer).
vi.mock("./GoalRow", () => ({
  LEDGER_GRID: { compare: "grid", plain: "grid" },
  GoalRow: ({ row }: { row: { label: string } }) => <div role="row">{row.label}</div>,
}));

import { GoalsLedger } from "./GoalsLedger";

afterEach(cleanup);

const goal = (goalId: number, name: string, conversions: number, sessions: number): Goal => ({
  goalId,
  name,
  goalType: "path",
  config: { pathPattern: `/${name.toLowerCase()}` },
  createdAt: "2026-09-01 00:00:00",
  total_conversions: conversions,
  total_sessions: sessions,
  conversion_rate: conversions / sessions,
});

const summaryOf = (goals: Goal[], sessions: number, converting: number): GoalsSummary => ({
  goals,
  total_sessions: sessions,
  converting_sessions: converting,
  total_goals: goals.length,
});

const current = summaryOf([goal(1, "Pricing", 2000, 10_000), goal(2, "Signup", 500, 10_000)], 10_000, 2200);
const previous = summaryOf([goal(1, "Pricing", 2500, 10_000), goal(2, "Signup", 250, 10_000)], 10_000, 2600);

describe("GoalsLedger", () => {
  const renderLedger = (sort: LedgerSort, comparisonEnabled = true) => {
    const onSortChange = vi.fn();
    render(
      <GoalsLedger
        rows={buildLedgerRows(current.goals, previous.goals)}
        sort={sort}
        onSortChange={onSortChange}
        comparisonEnabled={comparisonEnabled}
        isLoadingComparison={false}
        maxConversions={2000}
        siteId={1}
        canWrite
        timeSeriesByGoal={new Map()}
        isLoadingTimeSeries={false}
        trendHeading="Daily"
        trendLabel="conversions per day"
        chartTitle="Conversions per day"
        onClone={() => {}}
      />
    );
    return onSortChange;
  };

  it("marks the sorted column and leaves the others unsorted", () => {
    renderLedger(DEFAULT_LEDGER_SORT);

    expect(screen.getByRole("columnheader", { name: "Conversions" }).getAttribute("aria-sort")).toBe("descending");
    expect(screen.getByRole("columnheader", { name: "Rate" }).getAttribute("aria-sort")).toBe("none");
  });

  it("flips the direction of the column that is already sorted", () => {
    const onSortChange = renderLedger(DEFAULT_LEDGER_SORT);
    fireEvent.click(screen.getByRole("button", { name: "Conversions" }));

    expect(onSortChange).toHaveBeenCalledWith({ key: "conversions", order: "asc" });
  });

  it("starts a figure column at the largest and the name column at A", () => {
    const onSortChange = renderLedger(DEFAULT_LEDGER_SORT);
    fireEvent.click(screen.getByRole("button", { name: "Rate" }));
    fireEvent.click(screen.getByRole("button", { name: "Goal" }));

    expect(onSortChange).toHaveBeenNthCalledWith(1, { key: "rate", order: "desc" });
    expect(onSortChange).toHaveBeenNthCalledWith(2, { key: "name", order: "asc" });
  });

  it("sorts each change column by its own figure", () => {
    const onSortChange = renderLedger(DEFAULT_LEDGER_SORT);
    const [conversionsChange, rateChange] = screen.getAllByRole("button", { name: "Change" });
    fireEvent.click(conversionsChange);
    fireEvent.click(rateChange);

    expect(onSortChange).toHaveBeenNthCalledWith(1, { key: "conversionsChange", order: "desc" });
    expect(onSortChange).toHaveBeenNthCalledWith(2, { key: "rateChange", order: "desc" });
  });

  it("has no change columns while the comparison is off", () => {
    renderLedger(DEFAULT_LEDGER_SORT, false);

    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
    expect(screen.getByRole("button", { name: "Conversions" })).toBeTruthy();
  });

  it("draws a row for each goal it is given", () => {
    renderLedger(DEFAULT_LEDGER_SORT);

    expect(screen.getByText("Pricing")).toBeTruthy();
    expect(screen.getByText("Signup")).toBeTruthy();
  });
});

describe("GoalsSummaryBand", () => {
  const renderBand = (comparisonEnabled: boolean, before: GoalsSummary | undefined = previous) =>
    render(
      <GoalsSummaryBand
        summary={current}
        previous={comparisonEnabled ? before : undefined}
        rows={buildLedgerRows(current.goals, comparisonEnabled ? before.goals : undefined)}
        isLoading={false}
        comparisonEnabled={comparisonEnabled}
        isLoadingComparison={false}
      />
    );

  it("opens with sessions, converting sessions and goal completions", () => {
    renderBand(false);

    expect(screen.getByText("Sessions").parentElement?.parentElement?.textContent).toContain("10,000");
    expect(screen.getByText("Converting sessions").parentElement?.parentElement?.textContent).toContain("2,200");
    expect(screen.getByText("22.0% completed at least one goal")).toBeTruthy();
    // 2,000 + 500: completions count a session once per goal it completed.
    expect(screen.getByText("Goal completions").parentElement?.parentElement?.textContent).toContain("2,500");
  });

  it("names no mover and no slipping goal while the comparison is off", () => {
    renderBand(false);

    expect(screen.queryByText("Best mover")).toBeNull();
    expect(screen.queryByText("Slipping")).toBeNull();
  });

  it("names the goal that gained the most and the one that lost the most rate", () => {
    renderBand(true);

    const mover = screen.getByText("Best mover").parentElement?.parentElement;
    const slipping = screen.getByText("Slipping").parentElement?.parentElement;
    expect(mover?.textContent).toContain("Signup");
    expect(mover?.textContent).toContain("100.0%");
    expect(slipping?.textContent).toContain("Pricing");
    expect(slipping?.textContent).toContain("5.00 pp");
    expect(screen.getByText("Rate went from 25.00% to 20.00%")).toBeTruthy();
  });

  it("says so when nothing gained and nothing slipped", () => {
    renderBand(true, current);

    expect(screen.getByText("No goal gained conversions")).toBeTruthy();
    expect(screen.getByText("No goal lost conversion rate")).toBeTruthy();
  });
});
