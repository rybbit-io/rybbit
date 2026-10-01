import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { percentDelta, pointDelta } from "@/lib/delta";
import { Delta } from "./Delta";
import { StatBand, StatBandCell } from "./StatBand";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

afterEach(cleanup);

const cells = (count: number): StatBandCell[] =>
  Array.from({ length: count }, (_, index) => ({ label: `Metric ${index + 1}`, value: String(index + 1) }));

const grid = (container: HTMLElement) => container.querySelector(".grid")!;
const classList = (value: string) => value.split(/\s+/).filter(Boolean).sort();

describe("StatBand", () => {
  it("draws a label, a value and its hover text for each cell", () => {
    render(<StatBand cells={[{ label: "Sessions", value: "84.2k", title: "84,210" }]} />);

    expect(screen.getByText("Sessions")).toBeTruthy();
    expect(screen.getByText("84.2k").getAttribute("title")).toBe("84,210");
  });

  it("skips falsy cells so one can be conditional inline", () => {
    const { container } = render(<StatBand cells={[{ label: "Sessions", value: "1" }, false, null, undefined]} />);

    expect(grid(container).children).toHaveLength(1);
  });

  it("renders nothing without cells", () => {
    const { container } = render(<StatBand cells={[false]} />);

    expect(container.firstChild).toBeNull();
  });

  it("replaces every value with a skeleton while loading, keeping the labels", () => {
    const { container } = render(
      <StatBand isLoading cells={[{ label: "Sessions", value: "84.2k", delta: percentDelta(110, 100) }]} />
    );

    expect(screen.getByText("Sessions")).toBeTruthy();
    expect(screen.queryByText("84.2k")).toBeNull();
    expect(screen.queryByText("10.0%")).toBeNull();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(1);
  });

  it("lets one cell load on its own", () => {
    render(
      <StatBand
        cells={[
          { label: "Sessions", value: "84.2k" },
          { label: "Users", value: "61.5k", isLoading: true },
        ]}
      />
    );

    expect(screen.getByText("84.2k")).toBeTruthy();
    expect(screen.queryByText("61.5k")).toBeNull();
  });

  it("holds the sub line's place while loading", () => {
    const { container } = render(<StatBand isLoading cells={[{ label: "Sessions", value: "1", sub: "vs 74.9k" }]} />);

    expect(screen.queryByText("vs 74.9k")).toBeNull();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("shows the delta and the sub line beside a loaded value", () => {
    render(
      <StatBand cells={[{ label: "Bounce rate", value: "41.2%", delta: pointDelta(41.2, 43.1), sub: "vs 43.1%" }]} />
    );

    expect(screen.getByText("1.9 pp")).toBeTruthy();
    expect(screen.getByText("vs 43.1%")).toBeTruthy();
  });

  it("lays six cells out 2, 3 and 6 to a row, as the user profile band always has", () => {
    const { container } = render(<StatBand cells={cells(6)} />);

    expect(classList(grid(container).className)).toEqual(
      classList("grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-850 sm:grid-cols-3 lg:grid-cols-6")
    );
    expect(grid(container).lastElementChild!.className).not.toContain("col-span");
  });

  it("lays four cells out 2 and 4 to a row", () => {
    const { container } = render(<StatBand cells={cells(4)} />);

    expect(grid(container).className).toContain("grid-cols-2");
    expect(grid(container).className).toContain("lg:grid-cols-4");
    expect(grid(container).className).not.toContain("sm:grid-cols");
  });

  it("stretches the last of five cells so no row is left short", () => {
    const { container } = render(<StatBand cells={cells(5)} />);
    const last = grid(container).lastElementChild!.className;

    // 2 to a row leaves one over, 3 to a row leaves two: the last cell spans two columns in both.
    expect(last).toContain("col-span-2");
    expect(last).not.toContain("sm:col-span");
    expect(last).toContain("lg:col-span-1");
    expect(grid(container).firstElementChild!.className).not.toContain("col-span");
  });

  it("honours an explicit column count", () => {
    const { container } = render(<StatBand cells={cells(8)} columns={4} />);

    expect(grid(container).className).toContain("lg:grid-cols-4");
    expect(grid(container).lastElementChild!.className).not.toContain("col-span");
  });

  it("caps the default at six to a row and fills the row a seventh cell starts", () => {
    const { container } = render(<StatBand cells={cells(7)} />);
    const last = grid(container).lastElementChild!.className;

    expect(grid(container).className).toContain("lg:grid-cols-6");
    expect(last).toContain("col-span-2");
    expect(last).toContain("sm:col-span-3");
    expect(last).toContain("lg:col-span-6");
  });
});

describe("Delta", () => {
  it("draws nothing without a value", () => {
    const { container } = render(<Delta value={percentDelta(10, undefined)} />);

    expect(container.firstChild).toBeNull();
  });

  it("paints a rise green and reads out the signed figure", () => {
    const { container } = render(<Delta value={percentDelta(1124, 1000)} />);

    expect(container.firstElementChild!.className).toContain("text-emerald-600");
    expect(screen.getByText("12.4%").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("+12.4%").className).toContain("sr-only");
  });

  it("paints a fall red", () => {
    const { container } = render(<Delta value={percentDelta(951, 1000)} />);

    expect(container.firstElementChild!.className).toContain("text-red-600");
    expect(screen.getByText("-4.9%")).toBeTruthy();
  });

  it("flips the colours for a metric where up is bad", () => {
    const rise = render(<Delta value={pointDelta(43.1, 41.2)} upIsGood={false} />);
    expect(rise.container.firstElementChild!.className).toContain("text-red-600");
    rise.unmount();

    const fall = render(<Delta value={pointDelta(41.2, 43.1)} upIsGood={false} />);
    expect(fall.container.firstElementChild!.className).toContain("text-emerald-600");
  });

  it("is neutral when nothing changed, whatever direction is good", () => {
    const { container } = render(<Delta value={pointDelta(47.1, 47.1)} upIsGood={false} />);

    expect(container.firstElementChild!.className).toContain("text-neutral-500");
    expect(screen.getAllByText("0.0 pp")).toHaveLength(2);
  });

  it("is neutral and says why when the comparison period is empty", () => {
    const { container } = render(<Delta value={percentDelta(42, 0)} />);

    expect(container.firstElementChild!.className).toContain("text-neutral-500");
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("No data in the comparison period")).toBeTruthy();
  });
});
