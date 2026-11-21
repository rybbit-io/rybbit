import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ARRIVAL_MS, NO_ARRIVALS, recordArrivals, useArrivalHighlight } from "./use-arrival-highlight";

describe("recordArrivals", () => {
  it("stamps the arriving keys with the arrival time", () => {
    const arrivals = recordArrivals(NO_ARRIVALS, ["a", "b"], 5000);
    expect([...arrivals]).toEqual([
      ["a", 5000],
      ["b", 5000],
    ]);
  });

  it("keeps stamps still highlighting and drops finished ones", () => {
    const first = recordArrivals(NO_ARRIVALS, ["old"], 1000);
    const second = recordArrivals(first, ["mid"], 1000 + ARRIVAL_MS / 2);
    const third = recordArrivals(second, ["new"], 1000 + ARRIVAL_MS);

    expect(third.has("old")).toBe(false);
    expect(third.get("mid")).toBe(1000 + ARRIVAL_MS / 2);
    expect(third.get("new")).toBe(1000 + ARRIVAL_MS);
  });

  it("returns a new map and leaves the previous one untouched", () => {
    const first = recordArrivals(NO_ARRIVALS, ["a"], 0);
    const second = recordArrivals(first, ["b"], 10);
    expect(second).not.toBe(first);
    expect([...first.keys()]).toEqual(["a"]);
    expect(NO_ARRIVALS.size).toBe(0);
  });

  it("stamps at most the top 200 of a large flushed batch", () => {
    const keys = Array.from({ length: 1000 }, (_, i) => `event-${i}`);
    const arrivals = recordArrivals(NO_ARRIVALS, keys, 0);
    expect(arrivals.size).toBe(200);
    expect(arrivals.has("event-0")).toBe(true);
    expect(arrivals.has("event-200")).toBe(false);
  });
});

describe("useArrivalHighlight", () => {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }) as unknown as Animation);
  let wash = "rgb(48, 48, 48)";

  function Row({ arrivedAt }: { arrivedAt?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    useArrivalHighlight(ref, arrivedAt);
    return <div ref={ref}>row</div>;
  }

  beforeEach(() => {
    vi.spyOn(performance, "now").mockReturnValue(10_000);
    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ getPropertyValue: (name: string) => (name === "--arrival-bg" ? ` ${wash}` : "") }) as CSSStyleDeclaration
    );
    HTMLElement.prototype.animate = animate as unknown as HTMLElement["animate"];
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    animate.mockClear();
    cancel.mockClear();
    wash = "rgb(48, 48, 48)";
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  });

  it("leaves rows that didn't arrive from a poll alone", () => {
    render(<Row />);
    expect(animate).not.toHaveBeenCalled();
  });

  it("fades the token color off a row that just arrived", () => {
    render(<Row arrivedAt={10_000} />);

    expect(animate).toHaveBeenCalledOnce();
    const [keyframes, timing] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(keyframes[0]).toEqual({ backgroundColor: "rgb(48, 48, 48)" });
    expect(keyframes.at(-1)).toEqual({ backgroundColor: "transparent" });
    expect(timing).toMatchObject({ duration: ARRIVAL_MS });
    expect(timing.delay).toBeCloseTo(0);
  });

  it("resumes mid-fade when a virtualized row remounts, instead of starting over", () => {
    render(<Row arrivedAt={10_000 - 400} />);
    const [, timing] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(timing.delay).toBe(-400);
  });

  it("holds the mark and drops it without a fade under reduced motion", () => {
    // jsdom has no matchMedia; the hook treats its absence as "no preference".
    window.matchMedia = (query: string) =>
      ({ matches: query === "(prefers-reduced-motion: reduce)" }) as MediaQueryList;
    render(<Row arrivedAt={10_000} />);
    delete (window as Partial<Window>).matchMedia;

    const [keyframes, timing] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(keyframes).toEqual([{ backgroundColor: "rgb(48, 48, 48)" }, { backgroundColor: "rgb(48, 48, 48)" }]);
    expect(timing).toMatchObject({ duration: ARRIVAL_MS });
  });

  it("stays plain once the highlight window has passed", () => {
    render(<Row arrivedAt={10_000 - ARRIVAL_MS} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it("does nothing without a color token", () => {
    wash = "";
    render(<Row arrivedAt={10_000} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it("cancels the fade when the row unmounts", () => {
    const { unmount } = render(<Row arrivedAt={10_000} />);
    unmount();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
