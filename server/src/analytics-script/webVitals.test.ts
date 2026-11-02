import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebVitalsCollector } from "./webVitals.js";

// Mock web-vitals module
vi.mock("web-vitals", () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));

import { onLCP, onCLS, onINP, onFCP, onTTFB } from "web-vitals";

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

describe("WebVitalsCollector", () => {
  let collector: WebVitalsCollector;
  let onReadyCallback: ReturnType<typeof vi.fn>;
  let mockMetricCallbacks: Map<Function, Function>;

  beforeEach(() => {
    vi.useFakeTimers();
    onReadyCallback = vi.fn();
    mockMetricCallbacks = new Map();

    // Setup mocks to capture callbacks
    vi.mocked(onLCP).mockImplementation(callback => {
      mockMetricCallbacks.set(onLCP, callback);
    });
    vi.mocked(onCLS).mockImplementation(callback => {
      mockMetricCallbacks.set(onCLS, callback);
    });
    vi.mocked(onINP).mockImplementation(callback => {
      mockMetricCallbacks.set(onINP, callback);
    });
    vi.mocked(onFCP).mockImplementation(callback => {
      mockMetricCallbacks.set(onFCP, callback);
    });
    vi.mocked(onTTFB).mockImplementation(callback => {
      mockMetricCallbacks.set(onTTFB, callback);
    });

    collector = new WebVitalsCollector(onReadyCallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    setVisibilityState("visible");
  });

  it("should initialize and register all metric callbacks", () => {
    collector.initialize();

    expect(onLCP).toHaveBeenCalled();
    expect(onCLS).toHaveBeenCalled();
    expect(onINP).toHaveBeenCalled();
    expect(onFCP).toHaveBeenCalled();
    expect(onTTFB).toHaveBeenCalled();
  });

  it("should collect individual metrics", () => {
    collector.initialize();

    // Simulate LCP metric
    const lcpCallback = mockMetricCallbacks.get(onLCP)!;
    lcpCallback({ name: "LCP", value: 2500 });

    const data = collector.getData();
    expect(data.lcp).toBe(2500);
    expect(data.cls).toBeNull();
  });

  it("should ask web-vitals to report LCP, CLS and INP changes as they happen", () => {
    collector.initialize();

    expect(onLCP).toHaveBeenCalledWith(expect.any(Function), { reportAllChanges: true });
    expect(onCLS).toHaveBeenCalledWith(expect.any(Function), { reportAllChanges: true });
    expect(onINP).toHaveBeenCalledWith(expect.any(Function), { reportAllChanges: true });
  });

  it("should give each metric its own options object", () => {
    // web-vitals keys per-metric state on the options object
    collector.initialize();

    const lcpOpts = vi.mocked(onLCP).mock.calls[0][1];
    const clsOpts = vi.mocked(onCLS).mock.calls[0][1];
    const inpOpts = vi.mocked(onINP).mock.calls[0][1];

    expect(new Set([lcpOpts, clsOpts, inpOpts]).size).toBe(3);
  });

  it("should keep the latest value when a metric is reported more than once", () => {
    collector.initialize();

    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 1200 });
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });

    expect(collector.getData().lcp).toBe(2500);
  });

  it("should not send early when every metric has a value", () => {
    collector.initialize();

    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    mockMetricCallbacks.get(onCLS)!({ name: "CLS", value: 0.1 });
    mockMetricCallbacks.get(onINP)!({ name: "INP", value: 200 });
    mockMetricCallbacks.get(onFCP)!({ name: "FCP", value: 1800 });
    mockMetricCallbacks.get(onTTFB)!({ name: "TTFB", value: 800 });

    expect(onReadyCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20000);

    expect(onReadyCallback).toHaveBeenCalledWith({
      lcp: 2500,
      cls: 0.1,
      inp: 200,
      fcp: 1800,
      ttfb: 800,
    });
  });

  it("should send data after timeout even if not all metrics collected", () => {
    collector.initialize();

    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    mockMetricCallbacks.get(onCLS)!({ name: "CLS", value: 0.1 });

    vi.advanceTimersByTime(19999);
    expect(onReadyCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onReadyCallback).toHaveBeenCalledWith({
      lcp: 2500,
      cls: 0.1,
      inp: null,
      fcp: null,
      ttfb: null,
    });
  });

  it("should only send data once", () => {
    collector.initialize();

    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    vi.advanceTimersByTime(20000);

    // Updates after the snapshot was sent are ignored
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 3000 });
    setVisibilityState("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));

    expect(onReadyCallback).toHaveBeenCalledTimes(1);
    expect(collector.getData().lcp).toBe(2500);
  });

  it("should send data when the page is hidden", () => {
    collector.initialize();

    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });

    setVisibilityState("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onReadyCallback).toHaveBeenCalledWith({
      lcp: 2500,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    });

    // The pending timeout no longer fires a second send
    vi.advanceTimersByTime(20000);
    expect(onReadyCallback).toHaveBeenCalledTimes(1);
  });

  it("should not send when the page becomes visible", () => {
    collector.initialize();

    setVisibilityState("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onReadyCallback).not.toHaveBeenCalled();
  });

  it("should send data on pagehide", () => {
    collector.initialize();

    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    window.dispatchEvent(new Event("pagehide"));

    expect(onReadyCallback).toHaveBeenCalledTimes(1);
    expect(onReadyCallback.mock.calls[0][0].lcp).toBe(2500);
  });

  it("should no longer send on beforeunload", () => {
    collector.initialize();

    window.dispatchEvent(new Event("beforeunload"));

    expect(onReadyCallback).not.toHaveBeenCalled();
  });

  it("should handle initialization errors gracefully", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Make onLCP throw an error
    vi.mocked(onLCP).mockImplementation(() => {
      throw new Error("Test error");
    });

    collector.initialize();

    expect(consoleSpy).toHaveBeenCalledWith("Error initializing web vitals tracking:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});
