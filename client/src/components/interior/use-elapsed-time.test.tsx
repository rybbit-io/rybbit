import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatElapsed, useElapsedTime } from "./use-elapsed-time";

// performance.now() is driven by hand, separately from the fake interval, to prove the hook reads
// the clock rather than counting ticks.
let clock = 0;

beforeEach(() => {
  clock = 1_000;
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const tick = (to: number) => {
  clock = to;
  act(() => {
    vi.advanceTimersByTime(100);
  });
};

describe("useElapsedTime", () => {
  it("is zero and schedules nothing without a start time", () => {
    const { result } = renderHook(() => useElapsedTime(null));

    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("updates about ten times a second", () => {
    const { result } = renderHook(() => useElapsedTime(1_000));
    const seen: number[] = [];

    for (let step = 1; step <= 5; step++) {
      tick(1_000 + step * 100);
      seen.push(result.current);
    }

    expect(seen).toEqual([100, 200, 300, 400, 500]);
  });

  it("reads the clock instead of counting ticks", () => {
    const { result } = renderHook(() => useElapsedTime(1_000));

    // A throttled background tab: the next tick arrives 5 s late and must still report 5 s.
    tick(6_000);

    expect(result.current).toBe(5_000);
  });

  it("measures from the given start, not from mount", () => {
    clock = 13_400;
    const { result } = renderHook(() => useElapsedTime(1_000));

    expect(result.current).toBe(12_400);
  });

  it("never reports negative time", () => {
    const { result } = renderHook(() => useElapsedTime(5_000));

    expect(result.current).toBe(0);
  });

  it("stops ticking when the start time clears and on unmount", () => {
    const { rerender, unmount } = renderHook(({ startedAt }) => useElapsedTime(startedAt), {
      initialProps: { startedAt: 1_000 as number | null },
    });
    expect(vi.getTimerCount()).toBe(1);

    rerender({ startedAt: null });
    expect(vi.getTimerCount()).toBe(0);

    rerender({ startedAt: 2_000 });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("shows tenths of a second, truncated so a live timer never runs ahead", () => {
    expect(formatElapsed(0, "en")).toBe("0.0s");
    expect(formatElapsed(12_449, "en")).toBe("12.4s");
    expect(formatElapsed(12_499, "en")).toBe("12.4s");
    expect(formatElapsed(59_999, "en")).toBe("59.9s");
  });

  it("switches to minutes past a minute", () => {
    expect(formatElapsed(60_000, "en")).toBe("1m 0.0s");
    expect(formatElapsed(125_300, "en")).toBe("2m 5.3s");
  });

  it("formats for the locale", () => {
    expect(formatElapsed(12_400, "pl")).toBe("12,4 s");
    expect(formatElapsed(12_400, "zh")).toBe("12.4秒");
  });

  it("treats negative and non-finite input as zero", () => {
    expect(formatElapsed(-50, "en")).toBe("0.0s");
    expect(formatElapsed(Number.NaN, "en")).toBe("0.0s");
  });
});
