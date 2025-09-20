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

  it("should trigger callback when all metrics are collected", () => {
    collector.initialize();

    // Simulate all metrics
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    mockMetricCallbacks.get(onCLS)!({ name: "CLS", value: 0.1 });
    mockMetricCallbacks.get(onINP)!({ name: "INP", value: 200 });
    mockMetricCallbacks.get(onFCP)!({ name: "FCP", value: 1800 });
    mockMetricCallbacks.get(onTTFB)!({ name: "TTFB", value: 800 });

    expect(onReadyCallback).toHaveBeenCalledWith({
      lcp: 2500,
      cls: 0.1,
      inp: 200,
      fcp: 1800,
      ttfb: 800,
    });
  });

  it("should only send data once", () => {
    collector.initialize();

    // Collect all metrics
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    mockMetricCallbacks.get(onCLS)!({ name: "CLS", value: 0.1 });
    mockMetricCallbacks.get(onINP)!({ name: "INP", value: 200 });
    mockMetricCallbacks.get(onFCP)!({ name: "FCP", value: 1800 });
    mockMetricCallbacks.get(onTTFB)!({ name: "TTFB", value: 800 });

    // Try to send another metric
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 3000 });

    expect(onReadyCallback).toHaveBeenCalledTimes(1);
    expect(collector.getData().lcp).toBe(2500); // Original value
  });

  it("should send data after timeout even if not all metrics collected", () => {
    collector.initialize();

    // Only collect some metrics
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });
    mockMetricCallbacks.get(onCLS)!({ name: "CLS", value: 0.1 });

    expect(onReadyCallback).not.toHaveBeenCalled();

    // Advance timer past 20 seconds
    vi.advanceTimersByTime(20000);

    expect(onReadyCallback).toHaveBeenCalledWith({
      lcp: 2500,
      cls: 0.1,
      inp: null,
      fcp: null,
      ttfb: null,
    });
  });

  it("should send data on beforeunload event", () => {
    collector.initialize();

    // Collect some metrics
    mockMetricCallbacks.get(onLCP)!({ name: "LCP", value: 2500 });

    // Trigger beforeunload
    window.dispatchEvent(new Event("beforeunload"));

    expect(onReadyCallback).toHaveBeenCalledWith({
      lcp: 2500,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    });
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
