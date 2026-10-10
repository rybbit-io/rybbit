// Adapted from interior.dev "Value Flash" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Runs before paint in the browser, so the tint lands in the same frame as the new number.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Nothing has been seen yet: the first settled value becomes the baseline without a flash.
const UNSEEN = Symbol("value-flash:unseen");

export type FlashDirection = "up" | "down";

export type UseValueFlashOptions<T> = {
  /**
   * Identity of the question the value answers: site, time range, filters, bucket. When it changes,
   * the next settled value becomes the baseline silently. A number that moved because the user asked
   * something else is not news. Compared with Object.is, so pass a string, not a fresh object.
   */
  resetKey?: unknown;
  /** False while the value is not real data yet: loading, placeholder data from the previous query, an error. */
  ready?: boolean;
  /**
   * The value has nothing behind it yet: a range with no sessions reads 0 on every tile, and its bounce
   * rate is 0 only because there is nothing to divide. Entering or leaving this state re-baselines
   * silently, like a resetKey change: a site's first data is a first paint, not a rise (and a first
   * visit's 100% bounce rate is not bad news).
   */
  empty?: boolean;
  /**
   * A request for the value is in flight. After a resetKey change (or on mount) the hook waits for it
   * to land, so a stale cache being refreshed right after navigation doesn't flash.
   */
  fetching?: boolean;
  /**
   * Signed size of the change: positive is up, negative is down, 0 means nothing visible changed (for
   * example 12,345 → 12,351 both rendered as "12K"). Defaults to next - previous for numbers.
   */
  compare?: (next: T, previous: T) => number;
  /** How long the mark holds before it fades, in ms. */
  hold?: number;
  /** Minimum time between two flashes, in ms. A faster change moves the baseline without flashing. */
  cooldown?: number;
};

export type ValueFlashState = {
  /** Direction of the latest flash; kept after it ends so the mark can fade out in place. */
  direction: FlashDirection | null;
  flashing: boolean;
  /** Increments once per flash. */
  changeId: number;
};

/**
 * Marks a value that changed while the user was looking at the same question: a background refetch,
 * a poll. It never flashes on first render, on a resetKey change, into or out of `empty`, or while
 * `ready` is false, and it flashes at most once per change.
 */
export function useValueFlash<T>(
  value: T,
  {
    resetKey,
    ready = true,
    fetching = false,
    empty = false,
    compare,
    hold = 900,
    cooldown = 2000,
  }: UseValueFlashOptions<T> = {}
): ValueFlashState {
  const [state, setState] = useState<ValueFlashState>({ direction: null, flashing: false, changeId: 0 });

  const seen = useRef<{
    key: unknown;
    empty: boolean;
    settling: boolean;
    baseline: T;
    lastFlashAt: number;
    rising: boolean;
  }>({
    key: UNSEEN,
    empty,
    settling: true,
    baseline: value,
    lastFlashAt: Number.NEGATIVE_INFINITY,
    rising: true,
  });
  const measure = useRef(compare);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useIsoLayoutEffect(() => {
    measure.current = compare;
  });

  useIsoLayoutEffect(() => {
    const current = seen.current;
    // A new question, or the first data for this one (or its data vanishing): nothing to compare with.
    if (!Object.is(current.key, resetKey) || current.empty !== empty) {
      current.key = resetKey;
      current.empty = empty;
      current.settling = true;
    }
    if (!ready) return;

    const previous = current.baseline;
    current.baseline = value;

    // First answer to a new question: take it as the baseline. Stay in this state until no request
    // is in flight, so a cached value refreshed right after the change is absorbed too.
    if (current.settling) {
      if (!fetching) current.settling = false;
      return;
    }

    if (Object.is(previous, value)) return;
    const delta = measure.current
      ? measure.current(value, previous)
      : typeof value === "number" && typeof previous === "number"
        ? value - previous
        : 0;
    if (!delta) return;

    const end = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setState(prev => (prev.flashing ? { ...prev, flashing: false } : prev));
    };

    const now = Date.now();
    const rising = delta > 0;
    if (now - current.lastFlashAt < cooldown) {
      // Throttled: no new flash. If the mark still showing now points the wrong way, drop it early.
      if (timer.current && rising !== current.rising) end();
      return;
    }
    current.lastFlashAt = now;
    current.rising = rising;

    setState(prev => ({ direction: rising ? "up" : "down", flashing: true, changeId: prev.changeId + 1 }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(end, hold);
  }, [value, resetKey, ready, fetching, empty, hold, cooldown]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return state;
}
