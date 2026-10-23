import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import type { QueryTab } from "../types";
import { ResultsPanel } from "./ResultsPanel";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_match, key: string) => values?.[key] ?? `{${key}}`),
  useLocale: () => "en",
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
  vi.spyOn(performance, "now").mockImplementation(() => 13_400);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const baseTab: QueryTab = {
  id: "tab-1",
  name: "Query 1",
  prompt: "",
  query: "SELECT pathname FROM scoped_events",
  generationHistory: [],
  rows: [],
  sort: null,
  resultError: null,
  hasRun: false,
};

const previousRows = [{ pathname: "/" }, { pathname: "/pricing" }];

function renderPanel(props: Partial<ComponentProps<typeof ResultsPanel>> = {}) {
  const onCancelRun = vi.fn();
  const activeTab = props.activeTab ?? baseTab;
  const rows = props.rows ?? activeTab.rows;
  render(
    <TooltipProvider>
      <ResultsPanel
        activeTab={activeTab}
        columns={rows.length > 0 ? Object.keys(rows[0]!) : []}
        rows={rows}
        sort={null}
        onSortChange={() => {}}
        onCancelRun={onCancelRun}
        {...props}
      />
    </TooltipProvider>
  );
  return { onCancelRun };
}

const liveRegion = () => screen.getByRole("status");

// The header status mixes text nodes and an aria-hidden separator, so match on full text content.
const getStatusText = (text: string) =>
  screen.getByText((_content, element) => element?.tagName === "SPAN" && element.textContent === text);

describe("ResultsPanel", () => {
  it("replaces stale results with the loader, elapsed time and a Cancel button while running", () => {
    const { onCancelRun } = renderPanel({
      activeTab: { ...baseTab, rows: previousRows, hasRun: true },
      run: { status: "running", startedAt: 1_000 },
    });

    expect(screen.getAllByText("Running query")).toHaveLength(2); // visible label + announcement
    expect(screen.getByText("12.4s")).toBeTruthy();
    expect(screen.queryByRole("columnheader")).toBeNull();
    expect(screen.queryByRole("button", { name: "Download results" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancelRun).toHaveBeenCalledOnce();
  });

  it("announces the start once, without the ticking timer", () => {
    renderPanel({ run: { status: "running", startedAt: 1_000 } });

    expect(liveRegion().textContent).toBe("Running query");
  });

  it("shows the row count and how long the run took", () => {
    renderPanel({
      activeTab: { ...baseTab, rows: previousRows, hasRun: true },
      run: { status: "done", durationMs: 12_449 },
    });

    expect(getStatusText("2 rows · 12.4s")).toBeTruthy();
    expect(liveRegion().textContent).toBe("Query finished: 2 rows");
  });

  it("goes back to the previous results after a cancel, with a neutral status", () => {
    renderPanel({
      activeTab: { ...baseTab, rows: previousRows, hasRun: true },
      run: { status: "cancelled" },
    });

    expect(screen.getAllByText("Query cancelled")).toHaveLength(2); // header + announcement
    // The previous table and its export are back (jsdom has no layout, so virtual rows don't render).
    expect(screen.getByRole("columnheader", { name: "pathname" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download results" })).toBeTruthy();
    expect(screen.queryByText("Error")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("goes back to the empty state when a first run is cancelled", () => {
    renderPanel({ run: { status: "cancelled" } });

    expect(screen.getByText("Run a query")).toBeTruthy();
  });

  it("keeps the red error block for failures", () => {
    renderPanel({
      activeTab: { ...baseTab, hasRun: true, resultError: "Unknown column pathnam" },
      run: { status: "failed", durationMs: 800 },
    });

    expect(screen.getByText("Unknown column pathnam")).toBeTruthy();
    expect(liveRegion().textContent).toBe("Query failed");
  });
});
