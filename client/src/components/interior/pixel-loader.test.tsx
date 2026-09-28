import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PixelGrid, PixelLoader } from "./pixel-loader";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));

let clock = 0;

beforeEach(() => {
  clock = 1_000;
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PixelGrid", () => {
  it("staggers nine cells along the chevron wavefront on a 650 ms loop", () => {
    const { container } = render(<PixelGrid />);
    const cells = Array.from(container.querySelectorAll<HTMLElement>("span > span"));

    // (column + |row - 1|) * 90 ms, row by row.
    const delays = [90, 180, 270, 0, 90, 180, 90, 180, 270];
    expect(cells.map(cell => cell.style.animation)).toEqual(
      delays.map(delay => `rybbit-pixel-on 650ms ease-in-out ${delay}ms infinite`)
    );
  });

  it("is hidden from assistive tech", () => {
    const { container } = render(<PixelGrid />);

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("PixelLoader", () => {
  it("shows the label and a ticking elapsed time", () => {
    render(<PixelLoader label="Running query" startedAt={1_000} />);
    expect(screen.getByText("Running query")).toBeTruthy();
    expect(screen.getByText("0.0s")).toBeTruthy();

    clock = 13_400;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText("12.4s")).toBeTruthy();
  });

  it("keeps the ticking timer out of any live region", () => {
    const { container } = render(<PixelLoader label="Running query" startedAt={1_000} />);

    expect(container.querySelector("[aria-live], [role='status'], [role='alert']")).toBeNull();
  });

  it("omits the timer without a start time", () => {
    const { container } = render(<PixelLoader label="Writing SQL…" />);

    expect(container.textContent).toBe("Writing SQL…");
    expect(vi.getTimerCount()).toBe(0);
  });
});
