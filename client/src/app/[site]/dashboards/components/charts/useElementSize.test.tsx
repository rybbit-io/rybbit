import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPie } from "./DashboardPie";

type Callback = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;

type ObserverRecord = { callback: Callback; elements: Element[]; disconnected: boolean };

const observers: ObserverRecord[] = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private record: ObserverRecord;
      constructor(callback: Callback) {
        this.record = { callback, elements: [], disconnected: false };
        observers.push(this.record);
      }
      observe(element: Element) {
        this.record.elements.push(element);
      }
      unobserve() {}
      disconnect() {
        this.record.disconnected = true;
      }
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mapping = { xColumn: "label", valueColumn: "visits" };

describe("dashboard card sizing", () => {
  it("measures a chart whose first render was the empty state", () => {
    // Zero-valued rows render <ChartEmpty /> first, so the measured wrapper is not mounted yet.
    const { container, rerender } = render(<DashboardPie rows={[{ label: "a", visits: 0 }]} mapping={mapping} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(observers).toHaveLength(0);

    rerender(<DashboardPie rows={[{ label: "a", visits: 5 }]} mapping={mapping} />);
    const live = observers.filter(observer => !observer.disconnected);
    expect(live).toHaveLength(1);
    expect(live[0].elements).toHaveLength(1);

    act(() => live[0].callback([{ contentRect: { width: 200, height: 200 } }]));
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("stops observing when the chart falls back to the empty state", () => {
    const { rerender } = render(<DashboardPie rows={[{ label: "a", visits: 5 }]} mapping={mapping} />);
    expect(observers).toHaveLength(1);

    rerender(<DashboardPie rows={[{ label: "a", visits: 0 }]} mapping={mapping} />);
    expect(observers[0].disconnected).toBe(true);
  });
});
