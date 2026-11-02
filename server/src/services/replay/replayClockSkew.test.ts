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

  // Non-finite timestamps land on the bound they were heading for, never NaN.
  it("clamps a lone Infinity timestamp instead of returning NaN", () => {
    const { events, skewMs } = correctReplayClockSkew([{ timestamp: Infinity }], NOW);

    expect(events[0].timestamp).toBe(NOW + MAX_FUTURE_SKEW_MS);
    expect(Number.isFinite(skewMs)).toBe(true);
  });

  it("clamps a lone -Infinity timestamp", () => {
    const { events } = correctReplayClockSkew([{ timestamp: -Infinity }], NOW);

    expect(events[0].timestamp).toBe(NOW - MAX_PAST_SKEW_MS);
  });

  it("does not let one non-finite timestamp shift its healthy neighbours", () => {
    const { events } = correctReplayClockSkew(
      [{ timestamp: NOW }, { timestamp: NOW + 100 }, { timestamp: Infinity }, { timestamp: NOW + 300 }],
      NOW
    );

    expect(events.map(event => event.timestamp)).toEqual([NOW, NOW + 100, NOW + MAX_FUTURE_SKEW_MS, NOW + 300]);
  });

  it("falls back to now for a NaN timestamp", () => {
    const { events } = correctReplayClockSkew([{ timestamp: NaN }], NOW);

    expect(events[0].timestamp).toBe(NOW);
  });
});

// The implementation before the single-pass fast path, kept verbatim so the
// optimisation is checked against it rather than against hand-written cases.
function referenceCorrection<T extends { timestamp: number }>(events: T[], nowMs: number) {
  if (events.length === 0) return { events, skewMs: 0 };
  const upperBound = nowMs + MAX_FUTURE_SKEW_MS;
  const lowerBound = nowMs - MAX_PAST_SKEW_MS;
  const sanitize = (t: number) =>
    Number.isFinite(t) ? t : t === Infinity ? upperBound : t === -Infinity ? lowerBound : nowMs;
  const timestamps = events.map(event => sanitize(event.timestamp));
  const sorted = [...timestamps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const anchor = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  let skewMs = 0;
  if (anchor > upperBound) skewMs = anchor - nowMs;
  else if (anchor < lowerBound) skewMs = anchor - nowMs;
  const allFinite = events.every(event => Number.isFinite(event.timestamp));
  if (skewMs === 0 && allFinite && timestamps.every(t => t <= upperBound && t >= lowerBound)) {
    return { events, skewMs: 0 };
  }
  return {
    events: events.map((event, index) => ({
      ...event,
      timestamp: Math.min(Math.max(timestamps[index] - skewMs, lowerBound), upperBound),
    })),
    skewMs,
  };
}

describe("correctReplayClockSkew matches the reference implementation", () => {
  const upper = NOW + MAX_FUTURE_SKEW_MS;
  const lower = NOW - MAX_PAST_SKEW_MS;
  const pool = [
    NOW,
    NOW - 1,
    upper,
    lower,
    upper + 1,
    lower - 1,
    NOW + 10 * MAX_FUTURE_SKEW_MS,
    NOW - 10 * MAX_PAST_SKEW_MS,
    Date.UTC(2090, 6, 2),
    0,
    Infinity,
    -Infinity,
    NaN,
  ];

  function check(timestamps: number[]) {
    const events = batch(...timestamps);
    const actual = correctReplayClockSkew(events, NOW);
    const expected = referenceCorrection(events, NOW);
    expect(actual).toEqual(expected);
    // Same identity contract: the input array comes back only when untouched.
    expect(actual.events === events).toBe(expected.events === events);
  }

  it("keeps the input array for a batch sitting exactly on both bounds", () => {
    const events = batch(lower, NOW, upper);
    expect(correctReplayClockSkew(events, NOW).events).toBe(events);
  });

  it("agrees on every one- and two-event combination of edge values", () => {
    for (const a of pool) {
      check([a]);
      for (const b of pool) check([a, b]);
    }
  });

  it("agrees on random mixed batches", () => {
    // Deterministic LCG so a failure reproduces.
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let round = 0; round < 2000; round++) {
      const length = 1 + Math.floor(next() * 9);
      const timestamps = Array.from({ length }, () =>
        next() < 0.7 ? NOW - Math.floor(next() * MAX_PAST_SKEW_MS) : pool[Math.floor(next() * pool.length)]
      );
      check(timestamps);
    }
  });
});
