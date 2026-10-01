import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RangeValue } from "../sessionRanges";
import { RangeChip } from "./RangeChip";

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? ""),
}));

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

const renderChip = (value: RangeValue, duration = false) => {
  const onChange = vi.fn();
  render(
    <RangeChip
      label={duration ? "Duration" : "Pageviews"}
      clearLabel="Clear range"
      value={value}
      onChange={onChange}
      duration={duration}
    />
  );
  return onChange;
};

const trigger = () => screen.getByRole("button", { name: /^(Pageviews|Duration)/ });

describe("RangeChip label", () => {
  it("reads Any at rest, with nothing to clear", () => {
    renderChip({});

    expect(trigger().textContent).toBe("Pageviews Any");
    expect(screen.queryByRole("button", { name: "Clear range" })).toBeNull();
  });

  it("reads as the filter it applies", () => {
    renderChip({ min: 3 });
    expect(trigger().textContent).toBe("Pageviews 3 or more");
    cleanup();

    renderChip({ max: 5 });
    expect(trigger().textContent).toBe("Pageviews up to 5");
    cleanup();

    renderChip({ min: 2, max: 5 });
    expect(trigger().textContent).toBe("Pageviews 2 to 5");
    cleanup();

    renderChip({ min: 1, max: 1 });
    expect(trigger().textContent).toBe("Pageviews exactly 1");
  });

  it("reads seconds as a duration", () => {
    renderChip({ min: 10 }, true);
    expect(trigger().textContent).toBe("Duration 10s or longer");
    cleanup();

    renderChip({ min: 30, max: 300 }, true);
    expect(trigger().textContent).toBe("Duration 30s to 5m");
  });
});

describe("RangeChip editing", () => {
  it("applies what was typed and nothing before Apply is pressed", () => {
    const onChange = renderChip({});

    fireEvent.click(trigger());
    fireEvent.change(screen.getByLabelText("At least"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("At most"), { target: { value: "9" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith({ min: 2, max: 9 });
  });

  it("opens on the applied range", () => {
    renderChip({ min: 10 }, true);

    fireEvent.click(trigger());

    expect((screen.getByLabelText("At least (seconds)") as HTMLInputElement).value).toBe("10");
    expect((screen.getByLabelText("At most (seconds)") as HTMLInputElement).value).toBe("");
  });

  it("clears from the chip without opening it", () => {
    const onChange = renderChip({ min: 10 }, true);

    fireEvent.click(screen.getByRole("button", { name: "Clear range" }));

    expect(onChange).toHaveBeenCalledWith({});
    expect(screen.queryByLabelText("At least (seconds)")).toBeNull();
  });

  it("clears from inside the popover", () => {
    const onChange = renderChip({ max: 4 });

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onChange).toHaveBeenCalledWith({});
  });
});
