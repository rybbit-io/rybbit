import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { percentDelta } from "@/lib/delta";
import { ChartLegend, LegendRow } from "./ChartLegend";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

const rows: LegendRow[] = [
  { id: "custom_event", label: "Custom events", color: "red", total: 38620, delta: percentDelta(38620, 33120) },
  { id: "error", label: "Errors", color: "grey", total: 1284, delta: percentDelta(1284, 1400), upIsGood: false },
  { id: "pageview", label: "Pageviews", color: "blue", total: 212940, delta: percentDelta(212940, 187447) },
];

const renderLegend = (props: Partial<Parameters<typeof ChartLegend>[0]> = {}) => {
  const onToggle = vi.fn();
  render(
    <ChartLegend
      rows={rows}
      hidden={new Set(["pageview"])}
      onToggle={onToggle}
      nameLabel="Type"
      showDelta={true}
      {...props}
    />
  );
  return onToggle;
};

describe("ChartLegend", () => {
  afterEach(cleanup);

  it("draws each series as a switch that says whether its line is shown", () => {
    renderLegend();

    expect(screen.getByRole("switch", { name: /Custom events/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: /Pageviews/ }).getAttribute("aria-checked")).toBe("false");
  });

  it("toggles the series that was clicked", () => {
    const onToggle = renderLegend();

    fireEvent.click(screen.getByRole("switch", { name: /Pageviews/ }));

    expect(onToggle).toHaveBeenCalledWith("pageview");
  });

  it("shows the exact total on hover and the change against the comparison period", () => {
    renderLegend();

    expect(screen.getByTitle((38620).toLocaleString())).toBeTruthy();
    expect(screen.getByText("+16.6%")).toBeTruthy();
    expect(screen.getByText("-8.3%")).toBeTruthy();
  });

  it("colours a fall in errors as good news", () => {
    renderLegend();

    expect(screen.getByText("-8.3%").parentElement?.className).toContain("emerald");
    expect(screen.getByText("+16.6%").parentElement?.className).toContain("emerald");
  });

  it("drops the change column when the comparison is off", () => {
    renderLegend({ showDelta: false });

    expect(screen.queryByText("Change")).toBeNull();
    expect(screen.queryByText("+16.6%")).toBeNull();
  });

  it("shows placeholders instead of rows while loading", () => {
    renderLegend({ isLoading: true });

    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("prints the note under the rows", () => {
    renderLegend({ note: "Pageviews are hidden by default." });

    expect(screen.getByText("Pageviews are hidden by default.")).toBeTruthy();
  });
});
