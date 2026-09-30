import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TimeSeriesChart } from "./TimeSeriesChart";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));
vi.mock("@/lib/store", () => ({
  useStore: () => ({ time: { mode: "day", day: "2026-09-01" }, bucket: "hour", setTime: vi.fn(), setBucket: vi.fn() }),
  getTimezone: () => "UTC",
}));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() {
        this.callback(
          [{ contentRect: { width: 600, height: 250 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        );
      }
      disconnect() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("creates annotations in the bucket under the cursor rather than the nearest point", async () => {
  const start = new Date("2026-09-01T09:00:00Z");
  const end = new Date("2026-09-01T10:00:00Z");
  const onPlotClick = vi.fn();
  const { container } = render(
    <TimeSeriesChart
      current={[
        { x: start, y: 1 },
        { x: end, y: 2 },
      ]}
      max={2}
      chartMin={start}
      chartMax={end}
      onPlotClick={onPlotClick}
      renderTooltip={() => null}
    />
  );
  const hitArea = container.querySelector('rect[fill="transparent"]')!;
  // Plot width is 545px. The hit rectangle begins at the 40px left margin.
  fireEvent.click(hitArea, { clientX: (545 * 2) / 3 });
  await waitFor(() => expect(onPlotClick).toHaveBeenCalledWith(start));
});
