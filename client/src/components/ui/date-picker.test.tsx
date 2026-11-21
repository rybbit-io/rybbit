import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Settings } from "luxon";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DatePicker, DateTimePicker } from "./date-picker";

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));

/** react-day-picker tags each day button with a locale date string. */
const day = (year: number, month: number, date: number) =>
  document.querySelector<HTMLButtonElement>(`[data-day="${new Date(year, month - 1, date).toLocaleDateString()}"]`)!;

// ICU puts a narrow no-break space before AM/PM.
const text = (element: HTMLElement) => element.textContent?.replace(/\s/g, " ");

const description = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map(id => document.getElementById(id)?.textContent)
    .join(" ");

const previousLocale = Settings.defaultLocale;
beforeAll(() => {
  Settings.defaultLocale = "en-US";
});
afterAll(() => {
  Settings.defaultLocale = previousLocale;
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DatePicker", () => {
  it("shows the value as a short date, and a placeholder when empty", () => {
    const { rerender } = render(<DatePicker aria-label="From" value="2026-11-20" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "From" });
    expect(trigger.textContent).toBe("Nov 20, 2026");
    // Named by its label, with the value still announced.
    expect(description(trigger)).toBe("Nov 20, 2026");

    rerender(<DatePicker aria-label="From" value="" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "From" }).textContent).toBe("Pick a date");
  });

  it("picks a day from the calendar and closes", () => {
    const onChange = vi.fn();
    render(<DatePicker aria-label="From" value="2026-11-20" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "From" }));
    expect(screen.getByRole("grid")).toBeTruthy();

    fireEvent.click(day(2026, 11, 3));
    expect(onChange).toHaveBeenCalledWith("2026-11-03");
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("disables days outside min and max", () => {
    render(<DatePicker aria-label="From" value="2026-11-20" min="2026-11-10" max="2026-11-22" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "From" }));

    expect(day(2026, 11, 9).disabled).toBe(true);
    expect(day(2026, 11, 10).disabled).toBe(false);
    expect(day(2026, 11, 22).disabled).toBe(false);
    expect(day(2026, 11, 23).disabled).toBe(true);
  });
});

describe("DateTimePicker", () => {
  it("shows date and time, and keeps the time when another day is picked", () => {
    const onChange = vi.fn();
    render(<DateTimePicker aria-label="Starts" value="2026-11-20T21:17" onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: "Starts" });
    expect(text(trigger)).toBe("Nov 20, 2026, 9:17 PM");

    fireEvent.click(trigger);
    fireEvent.click(day(2026, 11, 21));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-21T21:17");
    // Still open: the time is usually the next thing to set.
    expect(screen.getByLabelText("Time")).toBeTruthy();
  });

  it("prints a wall clock that the browser's zone skips as written", () => {
    // 02:30 on a US spring-forward day does not exist in New York; it is a
    // valid wall clock in other dashboard zones and must not shift to 03:30.
    const previousZone = Settings.defaultZone;
    Settings.defaultZone = "America/New_York";
    try {
      render(<DateTimePicker aria-label="Starts" value="2026-03-08T02:30" onChange={vi.fn()} />);
      expect(text(screen.getByRole("button", { name: "Starts" }))).toBe("Mar 8, 2026, 2:30 AM");
    } finally {
      Settings.defaultZone = previousZone;
    }
  });

  it("edits the time in place and ignores a half-typed one", () => {
    const onChange = vi.fn();
    render(<DateTimePicker aria-label="Starts" value="2026-11-20T21:17" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Starts" }));

    const time = screen.getByLabelText<HTMLInputElement>("Time");
    expect(time.value).toBe("21:17");
    fireEvent.change(time, { target: { value: "08:05" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-20T08:05");

    onChange.mockClear();
    fireEvent.change(time, { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("starts a fresh value at midnight and can be cleared when clearable", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimePicker aria-label="Expires" value="" placeholder="Never" clearable onChange={onChange} />
    );

    const trigger = screen.getByRole("button", { name: "Expires" });
    expect(trigger.textContent).toBe("Never");
    fireEvent.click(trigger);
    // Nothing to clear yet.
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    fireEvent.click(day(new Date().getFullYear(), new Date().getMonth() + 1, 15));
    expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15T00:00$/));

    rerender(
      <DateTimePicker aria-label="Expires" value="2026-11-20T09:00" placeholder="Never" clearable onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.queryByLabelText("Time")).toBeNull();
  });
});
