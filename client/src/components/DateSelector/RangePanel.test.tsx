import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DateTime } from "luxon";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RangePanel } from "./RangePanel";
import { Comparison, DEFAULT_COMPARISON, Time } from "./types";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`) : message,
}));

const ZONE = "America/New_York";

const onApply = vi.fn();
const onCancel = vi.fn();
const setTimezone = vi.fn();

const renderPanel = (time: Time, props: { pastMinutesEnabled?: boolean; comparison?: Comparison } = {}) =>
  render(
    <RangePanel
      time={time}
      comparison={props.comparison ?? DEFAULT_COMPARISON}
      zone={ZONE}
      timezone="America/New_York"
      setTimezone={setTimezone}
      pastMinutesEnabled={props.pastMinutesEnabled ?? true}
      onApply={onApply}
      onCancel={onCancel}
    />
  );

const DATE_RANGE: Time = { mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" };

/** react-day-picker tags each day button with a locale date string. */
const day = (label: string) => document.querySelector<HTMLButtonElement>(`[data-day="${label}"]`)!;

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("RangePanel presets", () => {
  it("rules the preset groups apart instead of running them into one flat list", () => {
    const { container } = renderPanel(DATE_RANGE);

    // realtime | relative | calendar
    expect(container.querySelectorAll('[data-slot="command-separator"]').length).toBe(2);
  });

  it("offers Last Week and Last Month, which had labels but no menu item before", () => {
    renderPanel(DATE_RANGE);

    expect(screen.getByText("Last Week")).toBeTruthy();
    expect(screen.getByText("Last Month")).toBeTruthy();
  });

  it("applies a preset immediately — the fast path does not wait for Apply", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(screen.getByText("Last 30 Days"));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toMatchObject({ mode: "range", wellKnown: "last-30-days" });
  });

  it("filters the list as you search", async () => {
    renderPanel(DATE_RANGE);

    fireEvent.change(screen.getByPlaceholderText("Search ranges"), { target: { value: "week" } });

    await waitFor(() => expect(screen.queryByText("Last 30 Days")).toBeNull());
    expect(screen.getByText("This Week")).toBeTruthy();
    expect(screen.getByText("Last Week")).toBeTruthy();
  });

  it("hides the realtime group when a caller disables past-minutes windows", () => {
    const { container } = renderPanel(DATE_RANGE, { pastMinutesEnabled: false });

    expect(screen.queryByText("Last 30 Minutes")).toBeNull();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="command-separator"]').length).toBe(1);
  });
});

describe("RangePanel draft", () => {
  it("seeds the bound fields from the current window", () => {
    renderPanel(DATE_RANGE);

    expect(screen.getByLabelText<HTMLInputElement>("Start date").value).toBe("2024-03-08");
    // the stored end is exclusive; the field shows the last day actually included
    expect(screen.getByLabelText<HTMLInputElement>("End date").value).toBe("2024-03-14");
    expect(screen.getByLabelText<HTMLInputElement>("Start time").value).toBe("");
  });

  it("picking days on the calendar does not apply anything until Apply is pressed", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(day("3/20/2024"));
    fireEvent.click(day("3/25/2024"));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>("Start date").value).toBe("2024-03-20");
    expect(screen.getByLabelText<HTMLInputElement>("End date").value).toBe("2024-03-25");

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      { mode: "range", startDate: "2024-03-20", endDate: "2024-03-25" },
      DEFAULT_COMPARISON
    );
  });

  it("a fresh click starts a new range rather than extending the old one", () => {
    renderPanel(DATE_RANGE);

    // react-day-picker's own range mode would keep 2024-03-08 as the start here
    fireEvent.click(day("3/20/2024"));

    expect(screen.getByLabelText<HTMLInputElement>("Start date").value).toBe("2024-03-20");
    expect(screen.getByLabelText<HTMLInputElement>("End date").value).toBe("2024-03-20");
  });

  it("one click is a single day, which is what gets an hourly bucket", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(day("3/20/2024"));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({ mode: "day", day: "2024-03-20" }, DEFAULT_COMPARISON);
  });

  it("typing a clock promotes the window to an exact datetime range", () => {
    renderPanel(DATE_RANGE);

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "09:30" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "17:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      {
        mode: "range",
        startDate: "2024-03-08",
        startTime: "09:30:00",
        endDate: "2024-03-14",
        endTime: "17:00:00",
      },
      DEFAULT_COMPARISON
    );
  });

  it("typing a date is not clobbered mid-edit by an unparseable intermediate value", () => {
    renderPanel(DATE_RANGE);

    const endDate = screen.getByLabelText<HTMLInputElement>("End date");
    fireEvent.change(endDate, { target: { value: "" } });
    expect(endDate.value).toBe("");

    fireEvent.change(endDate, { target: { value: "2024-03-11" } });
    expect(endDate.value).toBe("2024-03-11");

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(
      { mode: "range", startDate: "2024-03-08", endDate: "2024-03-11" },
      DEFAULT_COMPARISON
    );
  });

  it("keeps the clocks when the days move under them", () => {
    renderPanel({
      mode: "range",
      startDate: "2024-03-08",
      startTime: "09:30:00",
      endDate: "2024-03-09",
      endTime: "17:00:00",
    });

    fireEvent.click(day("3/20/2024"));
    fireEvent.click(day("3/25/2024"));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      {
        mode: "range",
        startDate: "2024-03-20",
        startTime: "09:30:00",
        endDate: "2024-03-25",
        endTime: "17:00:00",
      },
      DEFAULT_COMPARISON
    );
  });

  it("keeps an overnight clock through the first of the two clicks", () => {
    // 17:00 -> 09:00 is inverted on a single day, so collapsing the selection to
    // the anchor day would have thrown the clocks away before the second click
    renderPanel({
      mode: "range",
      startDate: "2024-03-08",
      startTime: "17:00:00",
      endDate: "2024-03-09",
      endTime: "09:00:00",
    });

    fireEvent.click(day("3/20/2024"));
    fireEvent.click(day("3/25/2024"));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      {
        mode: "range",
        startDate: "2024-03-20",
        startTime: "17:00:00",
        endDate: "2024-03-25",
        endTime: "09:00:00",
      },
      DEFAULT_COMPARISON
    );
  });

  it("refuses to apply while the fields do not describe a window", () => {
    renderPanel(DATE_RANGE);

    // an end before the start: the previous draft is still what Apply would send
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2024-03-01" } });

    const apply = screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.click(apply);
    expect(onApply).not.toHaveBeenCalled();

    // and it recovers once the range makes sense again
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2024-03-12" } });
    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(
      { mode: "range", startDate: "2024-03-08", endDate: "2024-03-12" },
      DEFAULT_COMPARISON
    );
  });

  it("refuses a typed date past today, which the calendar already disables", () => {
    renderPanel(DATE_RANGE);

    const future = DateTime.now().plus({ years: 1 }).toISODate()!;
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: future } });

    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("refuses a wall time that daylight saving skipped", () => {
    renderPanel({ mode: "range", startDate: "2024-03-10", endDate: "2024-03-10" });

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "02:30" } });

    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Cancel discards the draft", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(day("3/20/2024"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("RangePanel footer", () => {
  it("names the comparison window the dashboard will chart against", () => {
    renderPanel(DATE_RANGE);

    expect(screen.getByText("Compares against Mar 1 – Mar 7")).toBeTruthy();
  });

  it("says so when there is no comparison period", () => {
    renderPanel({ mode: "all-time" });

    expect(screen.getByText("No comparison period")).toBeTruthy();
  });

  it("changes what the dashboard compares against, and applies it with the period", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(screen.getByRole("button", { name: /Compares against/ }));
    fireEvent.click(screen.getByRole("button", { name: /Same period last year/ }));

    // drafted, not applied: the dashboard does not move until Apply
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText("Compares against Mar 8 – Mar 14, 2023")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(DATE_RANGE, { mode: "year" });
  });

  it("turns the comparison off entirely", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(screen.getByRole("button", { name: /Compares against/ }));
    fireEvent.click(screen.getByRole("button", { name: /No comparison/ }));

    expect(screen.getByText("No comparison period")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(DATE_RANGE, { mode: "none" });
  });

  it("offers only the comparisons a realtime window can answer", () => {
    renderPanel({ mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 });

    fireEvent.click(screen.getByRole("button", { name: /Compares against/ }));

    expect(screen.getByRole("button", { name: /Previous period/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Same period last year/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Matching weekdays/ })).toBeNull();
  });

  it("compares against a window typed by hand", () => {
    renderPanel(DATE_RANGE);

    fireEvent.click(screen.getByRole("button", { name: /Compares against/ }));
    fireEvent.click(screen.getByRole("button", { name: /Custom range/ }));

    fireEvent.change(screen.getByLabelText("Comparison start date"), { target: { value: "2023-12-01" } });
    fireEvent.change(screen.getByLabelText("Comparison end date"), { target: { value: "2023-12-07" } });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(DATE_RANGE, {
      mode: "custom",
      customTime: { mode: "range", startDate: "2023-12-01", endDate: "2023-12-07" },
    });
  });

  it("surfaces the timezone and lets it be searched", async () => {
    renderPanel(DATE_RANGE);

    const trigger = screen.getByRole("button", { name: /America\/New_York/ });
    fireEvent.click(trigger);

    const search = await screen.findByPlaceholderText("Search timezones");
    fireEvent.change(search, { target: { value: "tokyo" } });

    const option = await screen.findByText(/Asia\/Tokyo/);
    fireEvent.click(option);

    expect(setTimezone).toHaveBeenCalledWith("Asia/Tokyo");
  });
});

describe("RangePanel calendar", () => {
  it("does not let a future day be picked", () => {
    const { container } = renderPanel({ mode: "day", day: new Date().toISOString().slice(0, 10) });

    const disabled = container.querySelectorAll("button[disabled][data-day]");
    expect(disabled.length).toBeGreaterThan(0);
  });

  it("offers month and year dropdowns rather than only chevrons", () => {
    const { container } = renderPanel(DATE_RANGE);

    const dropdowns = container.querySelectorAll("select");
    expect(dropdowns.length).toBeGreaterThan(0);
  });

  it("opens on the month the current window ends in", () => {
    const { container } = renderPanel(DATE_RANGE);

    const captions = within(container).getAllByText(/March 2024|Mar 2024/);
    expect(captions.length).toBeGreaterThan(0);
  });
});
