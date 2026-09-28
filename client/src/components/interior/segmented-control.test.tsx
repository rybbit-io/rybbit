import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SegmentedControl, interpolateSegment, seekEnabled, type SegmentedControlOption } from "./segmented-control";

type Period = "day" | "week" | "month";

const OPTIONS: SegmentedControlOption<Period>[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const radio = (name: string) => screen.getByRole("radio", { name });
const checkedNames = () =>
  screen
    .getAllByRole("radio")
    .filter(element => element.getAttribute("aria-checked") === "true")
    .map(element => element.textContent);

afterEach(() => {
  cleanup();
});

describe("SegmentedControl", () => {
  it("renders a labelled radio group with one checked radio and a single tab stop", () => {
    render(<SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="week" />);

    expect(screen.getByRole("radiogroup", { name: "Period" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(checkedNames()).toEqual(["Weekly"]);
    expect(radio("Weekly").tabIndex).toBe(0);
    expect(radio("Daily").tabIndex).toBe(-1);
    expect(radio("Monthly").tabIndex).toBe(-1);
  });

  it("defaults to the first enabled option when uncontrolled", () => {
    render(
      <SegmentedControl
        aria-label="Period"
        options={[{ value: "day", label: "Daily", disabled: true }, ...OPTIONS.slice(1)]}
      />
    );

    expect(checkedNames()).toEqual(["Weekly"]);
  });

  it("selects on click and reports the change", () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="day" onValueChange={onValueChange} />);

    fireEvent.click(radio("Monthly"));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("month");
    expect(checkedNames()).toEqual(["Monthly"]);
    expect(radio("Monthly").tabIndex).toBe(0);
    expect(radio("Daily").tabIndex).toBe(-1);
  });

  it("ignores a click on the segment that is already checked", () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="day" onValueChange={onValueChange} />);

    fireEvent.click(radio("Daily"));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("moves focus and selection with the arrow keys, wrapping at both ends", () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="day" onValueChange={onValueChange} />);

    fireEvent.keyDown(radio("Daily"), { key: "ArrowRight" });
    expect(checkedNames()).toEqual(["Weekly"]);
    expect(document.activeElement).toBe(radio("Weekly"));

    fireEvent.keyDown(radio("Weekly"), { key: "ArrowDown" });
    expect(checkedNames()).toEqual(["Monthly"]);

    fireEvent.keyDown(radio("Monthly"), { key: "ArrowRight" });
    expect(checkedNames()).toEqual(["Daily"]);
    expect(document.activeElement).toBe(radio("Daily"));

    fireEvent.keyDown(radio("Daily"), { key: "ArrowLeft" });
    expect(checkedNames()).toEqual(["Monthly"]);

    fireEvent.keyDown(radio("Monthly"), { key: "ArrowUp" });
    expect(checkedNames()).toEqual(["Weekly"]);

    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(["week", "month", "day", "month", "week"]);
  });

  it("jumps to the first and last enabled segment with Home and End", () => {
    const options: SegmentedControlOption<string>[] = [
      { value: "a", label: "A", disabled: true },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
      { value: "d", label: "D", disabled: true },
    ];
    render(<SegmentedControl aria-label="Letters" options={options} defaultValue="c" />);

    fireEvent.keyDown(radio("C"), { key: "Home" });
    expect(checkedNames()).toEqual(["B"]);
    expect(document.activeElement).toBe(radio("B"));

    fireEvent.keyDown(radio("B"), { key: "End" });
    expect(checkedNames()).toEqual(["C"]);
    expect(document.activeElement).toBe(radio("C"));
  });

  it("leaves other keys and modified arrows to the browser", () => {
    render(<SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="day" />);

    const tab = fireEvent.keyDown(radio("Daily"), { key: "Tab" });
    const altArrow = fireEvent.keyDown(radio("Daily"), { key: "ArrowRight", altKey: true });

    // fireEvent returns false when the handler called preventDefault.
    expect(tab).toBe(true);
    expect(altArrow).toBe(true);
    expect(checkedNames()).toEqual(["Daily"]);
  });

  it("skips disabled segments with the keyboard and ignores clicks on them", () => {
    const onValueChange = vi.fn();
    const options = OPTIONS.map(option => (option.value === "week" ? { ...option, disabled: true } : option));
    render(<SegmentedControl aria-label="Period" options={options} defaultValue="day" onValueChange={onValueChange} />);

    expect(radio("Weekly").getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(radio("Weekly"));
    expect(checkedNames()).toEqual(["Daily"]);

    fireEvent.keyDown(radio("Daily"), { key: "ArrowRight" });
    expect(checkedNames()).toEqual(["Monthly"]);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("month");
  });

  it("keeps a disabled control focusable but inert to clicks and keys", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Period"
        options={OPTIONS}
        defaultValue="day"
        onValueChange={onValueChange}
        disabled
      />
    );

    expect(screen.getByRole("radiogroup").getAttribute("aria-disabled")).toBe("true");
    expect(radio("Daily").tabIndex).toBe(0);

    fireEvent.click(radio("Weekly"));
    fireEvent.keyDown(radio("Daily"), { key: "ArrowRight" });

    expect(checkedNames()).toEqual(["Daily"]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("follows a controlled value and stays put when the parent refuses a change", () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState<Period>("day");
      return (
        <SegmentedControl
          aria-label="Period"
          options={OPTIONS}
          value={value}
          onValueChange={next => {
            onValueChange(next);
            if (next !== "month") setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);

    fireEvent.click(radio("Monthly"));
    expect(onValueChange).toHaveBeenLastCalledWith("month");
    expect(checkedNames()).toEqual(["Daily"]);

    fireEvent.click(radio("Weekly"));
    expect(checkedNames()).toEqual(["Weekly"]);
  });

  it("follows a change made by the parent", () => {
    const { rerender } = render(<SegmentedControl aria-label="Period" options={OPTIONS} value="day" />);

    rerender(<SegmentedControl aria-label="Period" options={OPTIONS} value="week" />);

    expect(checkedNames()).toEqual(["Weekly"]);
  });

  it("checks nothing when the value matches no option, and keeps a tab stop", () => {
    render(<SegmentedControl aria-label="Period" options={OPTIONS} value={"year" as Period} />);

    expect(checkedNames()).toEqual([]);
    expect(radio("Daily").tabIndex).toBe(0);
  });

  it("names a segment by its ariaLabel when the label is not plain text", () => {
    render(
      <SegmentedControl
        aria-label="Map view"
        options={[
          { value: "countries", label: <svg aria-hidden />, ariaLabel: "Countries" },
          { value: "cities", label: <svg aria-hidden />, ariaLabel: "Cities" },
        ]}
        defaultValue="cities"
      />
    );

    expect(radio("Cities").getAttribute("aria-checked")).toBe("true");
    expect(radio("Countries").getAttribute("aria-checked")).toBe("false");
  });

  it("hydrates its server render without a mismatch", async () => {
    const element = <SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="week" />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);

    // Before hydration the checked segment carries its own thumb and the
    // sliding one is clipped away.
    const checked = container.querySelector('[role="radio"][aria-checked="true"]');
    expect(checked?.textContent).toBe("Weekly");
    expect(checked?.className).toContain("bg-white");
    expect(container.querySelector<HTMLElement>("[aria-hidden]")?.style.clipPath).toBe("inset(0px 100% 0px 0px)");

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    act(() => root?.unmount());
    container.remove();
  });

  it("paints the thumb on the checked segment until the row can be measured", () => {
    // jsdom has no layout, so the control stays in its server-render state.
    render(<SegmentedControl aria-label="Period" options={OPTIONS} defaultValue="week" />);

    expect(radio("Weekly").className).toContain("bg-white");
    expect(radio("Daily").className).not.toContain("bg-white");
  });
});

describe("interpolateSegment", () => {
  const rects = [
    { left: 0, width: 40 },
    { left: 40, width: 80 },
    { left: 120, width: 60 },
  ];

  it("returns a segment's own box at whole positions", () => {
    expect(interpolateSegment(rects, 0)).toEqual({ left: 0, width: 40 });
    expect(interpolateSegment(rects, 2)).toEqual({ left: 120, width: 60 });
  });

  it("blends offset and width between neighbours", () => {
    expect(interpolateSegment(rects, 0.5)).toEqual({ left: 20, width: 60 });
    expect(interpolateSegment(rects, 1.25)).toEqual({ left: 60, width: 75 });
  });

  it("clamps positions outside the row and handles an empty row", () => {
    expect(interpolateSegment(rects, -0.3)).toEqual({ left: 0, width: 40 });
    expect(interpolateSegment(rects, 2.4)).toEqual({ left: 120, width: 60 });
    expect(interpolateSegment([], 1)).toEqual({ left: 0, width: 0 });
  });
});

describe("seekEnabled", () => {
  const options = [{}, { disabled: true }, {}, {}];

  it("steps in either direction and wraps", () => {
    expect(seekEnabled(options, 2, 1)).toBe(3);
    expect(seekEnabled(options, 3, 1)).toBe(0);
    expect(seekEnabled(options, 0, -1)).toBe(3);
  });

  it("skips disabled options", () => {
    expect(seekEnabled(options, 0, 1)).toBe(2);
    expect(seekEnabled(options, 2, -1)).toBe(0);
  });

  it("returns -1 when every option is disabled", () => {
    expect(seekEnabled([{ disabled: true }, { disabled: true }], 0, 1)).toBe(-1);
  });
});
