import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPARISON } from "@/components/DateSelector/types";
import { useStore } from "@/lib/store";
import { AnalysisBar } from "./AnalysisBar";
import { BreakdownControl } from "./BreakdownControl";
import { CompareControl } from "./CompareControl";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

const SEPTEMBER = { mode: "range", startDate: "2026-09-01", endDate: "2026-09-30" } as const;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  useStore.setState({ timezone: "UTC" });
  useStore.getState().setComparison(DEFAULT_COMPARISON);
  useStore.getState().setTime(SEPTEMBER);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const openMenu = (name: RegExp) => fireEvent.keyDown(screen.getByRole("button", { name }), { key: "Enter" });

describe("AnalysisBar", () => {
  it("puts compare first, then breakdown, then the page's controls, with the end slot last", () => {
    render(
      <AnalysisBar
        breakdown={<button type="button">Breakdown stand-in</button>}
        end={<button type="button">New goal</button>}
      >
        <button type="button">Sort</button>
      </AnalysisBar>
    );

    expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual([
      "Compare Previous period",
      "Breakdown stand-in",
      "Sort",
      "New goal",
    ]);
  });

  it("drops the compare control when a page has nothing to compare", () => {
    render(<AnalysisBar compare={null} breakdown={<button type="button">Breakdown stand-in</button>} />);

    expect(screen.queryByRole("button", { name: /Compare/ })).toBeNull();
  });
});

describe("CompareControl", () => {
  it("names the comparison the dashboard is using", () => {
    render(<CompareControl />);

    expect(screen.getByRole("button", { name: "Compare Previous period" })).toBeTruthy();
  });

  it("offers the modes the period supports with the window each resolves to, and no custom range", () => {
    render(<CompareControl />);
    openMenu(/Compare/);

    expect(screen.getAllByRole("menuitemradio").map(item => item.textContent)).toEqual([
      "Previous periodAug 2 – Aug 31",
      "Matching weekdaysAug 4 – Sep 2",
      "Same period last yearSep 1 – Sep 30, 2025",
      "Off",
    ]);
    expect(screen.getByRole("menuitemradio", { name: /Previous period/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("turns the comparison off for the whole dashboard", () => {
    render(<CompareControl />);
    openMenu(/Compare/);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Off" }));

    expect(useStore.getState().comparison).toEqual({ mode: "none" });
    expect(useStore.getState().previousTime).toBeNull();
    expect(screen.getByRole("button", { name: "Compare Off" })).toBeTruthy();
  });

  it("turns it back on", () => {
    useStore.getState().setComparison({ mode: "none" });
    render(<CompareControl />);
    openMenu(/Compare/);
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Previous period/ }));

    expect(useStore.getState().comparison).toEqual({ mode: "previous" });
    expect(useStore.getState().previousTime).toEqual({ mode: "range", startDate: "2026-08-02", endDate: "2026-08-31" });
  });

  it("shows a custom window set in the date panel and keeps its dates when it is picked again", () => {
    const custom = {
      mode: "custom",
      customTime: { mode: "range", startDate: "2026-07-01", endDate: "2026-07-30" },
    } as const;
    useStore.getState().setComparison(custom);
    render(<CompareControl />);

    expect(screen.getByRole("button", { name: "Compare Custom range" })).toBeTruthy();

    openMenu(/Compare/);
    const item = screen.getByRole("menuitemradio", { name: /Custom range/ });
    expect(item.textContent).toBe("Custom rangeJul 1 – Jul 30");
    fireEvent.click(item);

    expect(useStore.getState().comparison).toEqual(custom);
  });

  it("reports the previous period when the stored mode does not apply to the selected period", () => {
    useStore.getState().setComparison({ mode: "weekday" });
    useStore.getState().setTime({ mode: "month", month: "2026-09-01" });
    render(<CompareControl />);

    expect(screen.getByRole("button", { name: "Compare Previous period" })).toBeTruthy();

    openMenu(/Compare/);
    expect(screen.queryByRole("menuitemradio", { name: /Matching weekdays/ })).toBeNull();
  });
});

describe("BreakdownControl", () => {
  type Dimension = "none" | "section" | "channel";
  const options = [
    { value: "none", label: "None" },
    { value: "section", label: "Section" },
    { value: "channel", label: "Channel", icon: <svg data-testid="channel-icon" /> },
  ] satisfies { value: Dimension; label: string; icon?: React.ReactNode }[];

  it("shows the selected option on its trigger", () => {
    render(<BreakdownControl<Dimension> value="section" onChange={() => {}} options={options} />);

    expect(screen.getByRole("button", { name: "Breakdown Section" })).toBeTruthy();
  });

  it("reports the option that was picked", () => {
    const onChange = vi.fn<(value: Dimension) => void>();
    render(<BreakdownControl<Dimension> value="none" onChange={onChange} options={options} />);
    openMenu(/Breakdown/);

    expect(screen.getByRole("menuitemradio", { name: "None" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("channel-icon")).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Channel" }));

    expect(onChange).toHaveBeenCalledWith("channel");
  });

  it("takes another label for the same control", () => {
    render(<BreakdownControl<Dimension> value="none" onChange={() => {}} options={options} label="Group by" />);

    expect(screen.getByRole("button", { name: "Group by None" })).toBeTruthy();
  });
});
