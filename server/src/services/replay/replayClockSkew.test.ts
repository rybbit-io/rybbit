import { describe, expect, it } from "vitest";
import { correctReplayClockSkew, MAX_FUTURE_SKEW_MS, MAX_PAST_SKEW_MS } from "./replayClockSkew.js";

const NOW = Date.UTC(2026, 7, 19, 12, 0, 0);
const batch = (...offsets: number[]) => offsets.map(timestamp => ({ timestamp, type: "2" }));

describe("correctReplayClockSkew", () => {
  it("leaves a healthy batch untouched", () => {
    const events = batch(NOW - 3000, NOW - 2000, NOW - 1000);
    const result = correctReplayClockSkew(events, NOW);
    expect(result.skewMs).toBe(0);
    expect(result.events).toBe(events);
  });

  it("shifts a batch from a device whose clock is decades ahead", () => {
    const year2090 = Date.UTC(2090, 6, 2, 21, 31, 45);
    const events = batch(year2090, year2090 + 1000, year2090 + 5000);
    const result = correctReplayClockSkew(events, NOW);

    expect(result.skewMs).toBeGreaterThan(0);
    for (const event of result.events) {
      expect(event.timestamp).toBeLessThanOrEqual(NOW + MAX_FUTURE_SKEW_MS);
      expect(event.timestamp).toBeGreaterThanOrEqual(NOW - MAX_PAST_SKEW_MS);
    }
  });

  it("preserves the gaps between events, so playback timing survives", () => {
    const year2076 = Date.UTC(2076, 1, 3, 12, 56, 50);
    const gaps = [0, 250, 1750, 187_000];
    const { events } = correctReplayClockSkew(
      batch(...gaps.map(g => year2076 + g)),
      NOW
    );

    const shifted = events.map(e => e.timestamp - events[0].timestamp);
    expect(shifted).toEqual(gaps);
  });

  it("is not dragged off by a single corrupt timestamp in a healthy batch", () => {
    const events = batch(NOW - 3000, NOW - 2000, NOW - 1000, Date.UTC(2064, 0, 5));
    const { events: corrected, skewMs } = correctReplayClockSkew(events, NOW);

    expect(skewMs).toBe(0);
    expect(corrected.slice(0, 3).map(e => e.timestamp)).toEqual([NOW - 3000, NOW - 2000, NOW - 1000]);
    // the outlier alone is clamped back into range
    expect(corrected[3].timestamp).toBe(NOW + MAX_FUTURE_SKEW_MS);
  });

  it("pulls forward a batch older than the replay TTL", () => {
    const ancient = NOW - MAX_PAST_SKEW_MS - 90 * 24 * 60 * 60 * 1000;
    const { events, skewMs } = correctReplayClockSkew(batch(ancient, ancient + 1000), NOW);

    expect(skewMs).toBeLessThan(0);
    expect(events[0].timestamp).toBeGreaterThanOrEqual(NOW - MAX_PAST_SKEW_MS);
  });

  it("handles an empty batch", () => {
    expect(correctReplayClockSkew([], NOW)).toEqual({ events: [], skewMs: 0 });
  });
});
