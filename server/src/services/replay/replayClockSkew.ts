// Replay event timestamps come from the browser, not the server, so they carry
// whatever the device's clock says. Most are fine; a handful of devices are
// years out. Those events landed in partitions dated 2032, 2064, 2076 and 2090,
// which grows the partition list without bound and — because the table's TTL is
// `start_time + 30 DAY` — leaves rows that never expire.
//
// Individual timestamps cannot simply be pinned to `now`: rrweb reconstructs
// playback from the gaps between them, so flattening a batch would destroy the
// recording. The skew is a property of the device, not of any one event, so
// correct it as one offset applied to the whole batch and keep every delta.

// A day of tolerance absorbs ordinary clock drift and timezone-confused
// devices without reshaping their batches.
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

// Matches the replay TTL: anything older than this is already unreadable, so
// there is nothing to preserve by keeping its original date.
export const MAX_PAST_SKEW_MS = 30 * 24 * 60 * 60 * 1000;

// A browser can put a non-finite value on the wire: JSON `1e400` parses as
// Infinity and `z.number()` admits it. Left alone it poisons the median and
// then every corrected timestamp with NaN — which ClickHouse cannot encode, so
// one bad event would fail the whole batch and the recorder would retry it
// forever. Treat it as the most extreme possible skew and let the clamp below
// pull it back to a bound, the same as any other unusable clock.
function sanitize(timestamp: number, nowMs: number, lowerBound: number, upperBound: number): number {
  if (Number.isFinite(timestamp)) return timestamp;
  if (timestamp === Infinity) return upperBound;
  if (timestamp === -Infinity) return lowerBound;
  // NaN carries no ordering at all, so there is no bound to prefer.
  return nowMs;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export type ClockSkewCorrection<T> = {
  events: T[];
  /** How far the device's clock was off, in ms. 0 when nothing was corrected. */
  skewMs: number;
};

/**
 * Shifts a batch of client-timestamped events onto the server's clock when the
 * device is implausibly far off, preserving the interval between every pair of
 * events.
 *
 * The offset is taken from the median rather than the max so that one corrupt
 * timestamp cannot drag an otherwise healthy batch backwards; a per-event clamp
 * afterwards catches those stragglers individually.
 */
export function correctReplayClockSkew<T extends { timestamp: number }>(
  events: T[],
  nowMs: number
): ClockSkewCorrection<T> {
  if (events.length === 0) return { events, skewMs: 0 };

  const upperBound = nowMs + MAX_FUTURE_SKEW_MS;
  const lowerBound = nowMs - MAX_PAST_SKEW_MS;

  const timestamps = events.map(event => sanitize(event.timestamp, nowMs, lowerBound, upperBound));
  const anchor = median(timestamps);

  let skewMs = 0;
  if (anchor > upperBound) skewMs = anchor - nowMs;
  else if (anchor < lowerBound) skewMs = anchor - nowMs;

  // Returning the original array is only safe when nothing needed sanitizing;
  // otherwise the caller would get the non-finite values straight back.
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
