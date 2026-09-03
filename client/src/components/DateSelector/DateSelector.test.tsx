import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DateTime } from "luxon";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateSelector } from "./DateSelector";
import { Time } from "./types";

const mocks = vi.hoisted(() => ({ timezone: "America/New_York", setTimezone: vi.fn(), setComparison: vi.fn() }));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`) : message,
}));

vi.mock("@/lib/store", () => ({
  useStore: () => ({
    timezone: mocks.timezone,
    setTimezone: mocks.setTimezone,
    bucket: "day",
    comparison: { mode: "previous" },
    setComparison: mocks.setComparison,
  }),
  useTimezone: () => (mocks.timezone === "system" ? "America/New_York" : mocks.timezone),
}));

const setTime = vi.fn();

beforeEach(() => {
  mocks.timezone = "America/New_York";
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

describe("DateSelector", () => {
  it("names the current window on the trigger", () => {
    render(<DateSelector time={{ mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" }} setTime={setTime} />);

    expect(screen.getByRole("button", { name: /Friday, Mar 8 - Thursday, Mar 14/ })).toBeTruthy();
  });

  it("names an exact window by its clocks", () => {
    render(
      <DateSelector
        time={{
          mode: "range",
          startDate: "2024-03-08",
          startTime: "09:30:00",
          endDate: "2024-03-08",
          endTime: "17:00:00",
        }}
        setTime={setTime}
      />
    );

    expect(screen.getByRole("button", { name: /Mar 8/ })).toBeTruthy();
  });

  it("re-seeds the panel when the timezone moves the preset to another day", () => {
    // Switching timezone re-resolves a preset in the store, so the panel has to
    // pick up that new value; a draft held from the old zone would apply the
    // wrong date.
    const today: Time = { mode: "day", day: "2024-03-15", wellKnown: "today" };
    const { rerender } = render(<DateSelector time={today} setTime={setTime} />);

    fireEvent.click(screen.getByRole("button", { name: /Today/ }));
    expect(screen.getByLabelText<HTMLInputElement>("Start date").value).toBe("2024-03-15");

    mocks.timezone = "Asia/Tokyo";
    const tomorrowThere: Time = { mode: "day", day: "2024-03-16", wellKnown: "today" };
    rerender(<DateSelector time={tomorrowThere} setTime={setTime} />);

    expect(screen.getByLabelText<HTMLInputElement>("Start date").value).toBe("2024-03-16");
  });

  it("applying a preset stores it as the new dashboard default", () => {
    render(<DateSelector time={{ mode: "day", day: "2024-03-15", wellKnown: "today" }} setTime={setTime} />);

    fireEvent.click(screen.getByRole("button", { name: /Today/ }));
    fireEvent.click(screen.getByText("Last 30 Days"));

    expect(setTime).toHaveBeenCalledTimes(1);
    expect(setTime.mock.calls[0][0]).toMatchObject({ wellKnown: "last-30-days" });
    expect(localStorage.getItem("rybbit-default-time-range")).toBe("last-30-days");
  });

  it("closes once a window is applied", () => {
    render(<DateSelector time={{ mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" }} setTime={setTime} />);

    fireEvent.click(screen.getByRole("button", { name: /Mar 8/ }));
    expect(screen.getByPlaceholderText(/Search/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText(/Search/)).toBeNull();
  });

  it("hides the realtime presets when a caller disables them", () => {
    render(
      <DateSelector
        time={{ mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" }}
        setTime={setTime}
        pastMinutesEnabled={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Mar 8/ }));
    expect(screen.queryByText("Last 30 Minutes")).toBeNull();
    expect(screen.getByText("Today")).toBeTruthy();
  });
});

describe("DateSelector typed window label", () => {
  it("names a run of days ending today by its count", () => {
    const today = DateTime.now().setZone("America/New_York");
    render(
      <DateSelector
        time={{ mode: "range", startDate: today.minus({ days: 13 }).toISODate()!, endDate: today.toISODate()! }}
        setTime={setTime}
      />
    );

    expect(screen.getByRole("button", { name: /Last 14 days/ })).toBeTruthy();
  });
});

describe("DateSelector hotkeys", () => {
  const range: Time = { mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" };

  it("applies a preset from a single key", () => {
    render(<DateSelector time={range} setTime={setTime} />);

    fireEvent.keyDown(document.body, { key: "w" });

    expect(setTime).toHaveBeenCalledTimes(1);
    expect(setTime.mock.calls[0][0]).toMatchObject({ wellKnown: "last-7-days" });
    expect(localStorage.getItem("rybbit-default-time-range")).toBe("last-7-days");
  });

  it("opens the panel on c", () => {
    render(<DateSelector time={range} setTime={setTime} />);

    fireEvent.keyDown(document.body, { key: "c" });

    expect(screen.getByPlaceholderText(/Search/)).toBeTruthy();
    expect(setTime).not.toHaveBeenCalled();
  });

  it("stays out of the way while typing or chording", () => {
    render(
      <>
        <input aria-label="Other field" />
        <DateSelector time={range} setTime={setTime} />
      </>
    );

    fireEvent.keyDown(screen.getByLabelText("Other field"), { key: "w" });
    fireEvent.keyDown(document.body, { key: "w", metaKey: true });
    fireEvent.keyDown(document.body, { key: "w", ctrlKey: true });

    expect(setTime).not.toHaveBeenCalled();
  });

  it("ignores realtime keys when a caller hides those presets", () => {
    render(<DateSelector time={range} setTime={setTime} pastMinutesEnabled={false} />);

    fireEvent.keyDown(document.body, { key: "r" });
    expect(setTime).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: "d" });
    expect(setTime.mock.calls[0][0]).toMatchObject({ wellKnown: "today" });
  });

  it("can be switched off", () => {
    render(<DateSelector time={range} setTime={setTime} hotkeys={false} />);

    fireEvent.keyDown(document.body, { key: "w" });
    expect(setTime).not.toHaveBeenCalled();
  });

  it("shows the key beside each preset in the rail", () => {
    render(<DateSelector time={range} setTime={setTime} />);

    fireEvent.click(screen.getByRole("button", { name: /Mar 8/ }));

    expect(screen.getByText("Last 7 Days").parentElement?.textContent).toContain("w");
  });
});
