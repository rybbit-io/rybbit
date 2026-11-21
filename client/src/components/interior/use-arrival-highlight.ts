"use client";

// Companion to the New Items Pill: a brief neutral wash on rows that just arrived in a live list.
// Rybbit's own; not adapted from a third-party source.

import { type RefObject, useEffect, useLayoutEffect } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** How long an arrived row stays marked, in ms: a short hold, then a fade to nothing. */
export const ARRIVAL_MS = 1000;
// Only the top of a large flushed batch is on screen after a jump; stamping thousands buys nothing.
const MAX_STAMPED = 200;

/** Row key → performance.now() at arrival. */
export type Arrivals = ReadonlyMap<string, number>;

export const NO_ARRIVALS: Arrivals = new Map();

/**
 * Stamps `keys` (newest first) as arrived at `now` and drops stamps whose highlight has finished, so
 * the map only ever holds the last second's worth of rows.
 */
export function recordArrivals(previous: Arrivals, keys: readonly string[], now: number): Arrivals {
  const next = new Map<string, number>();
  for (const [key, at] of previous) {
    if (now - at < ARRIVAL_MS) next.set(key, at);
  }
  for (const key of keys.slice(0, MAX_STAMPED)) next.set(key, now);
  return next;
}

/**
 * Fades a neutral wash off an element that arrived at `arrivedAt` (a performance.now() stamp).
 *
 * Keyed to the arrival time, not to mount: a virtualized row that remounts mid-fade picks up where it
 * was instead of starting over, and one that scrolls into view after the fade stays plain. The color
 * comes from the element's `--arrival-bg` custom property, so the tokens (and dark mode) stay in CSS.
 */
export function useArrivalHighlight(ref: RefObject<HTMLElement | null>, arrivedAt: number | undefined) {
  useIsoLayoutEffect(() => {
    const element = ref.current;
    if (arrivedAt === undefined || !element || typeof element.animate !== "function") return;

    const elapsed = performance.now() - arrivedAt;
    if (elapsed >= ARRIVAL_MS) return;

    const wash = getComputedStyle(element).getPropertyValue("--arrival-bg").trim();
    if (!wash) return;

    // Reduced motion: the same mark for the same time, dropped at the end instead of faded (the
    // global reduced-motion CSS rule can't reach a Web Animation).
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const animation = element.animate(
      reduced
        ? [{ backgroundColor: wash }, { backgroundColor: wash }]
        : [
            { backgroundColor: wash },
            // Hold long enough to be seen, then fade.
            { backgroundColor: wash, offset: 0.2, easing: "ease-in-out" },
            { backgroundColor: "transparent" },
          ],
      { duration: ARRIVAL_MS, delay: -elapsed }
    );
    return () => animation.cancel();
  }, [ref, arrivedAt]);
}
