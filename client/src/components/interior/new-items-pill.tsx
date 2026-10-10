// Adapted from interior.dev "New Items Pill" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useLocale } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FADE_IN, FADE_OUT, SPRING_PANEL } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Let a burst settle before speaking (upstream's delay)...
export const ANNOUNCE_DELAY_MS = 700;
// ...and on a feed that polls every couple of seconds, speak at most this often, always the latest count.
export const ANNOUNCE_INTERVAL_MS = 10_000;

export type NewItemsPillProps = {
  /** Items waiting out of view. The pill shows while this is above zero. */
  count: number;
  /** Bring the new items into view (and put focus somewhere sensible: the pill leaves with the click). */
  onJump: () => void;
  /** The count as a plain phrase ("3 new events"): the button's accessible name and the polite announcement. */
  describe: (count: number) => string;
  /** Visible label. `ticker` is the count as a ticking NumberFlow; place it where the locale puts numbers. */
  label: (count: number, ticker: ReactNode) => ReactNode;
  /** Position the pill inside its `relative` container, e.g. "top-10". */
  className?: string;
};

/**
 * "N new items" above a list the user has scrolled away from. It springs in, its count ticks as more
 * arrive, it is a real button (Tab reaches it), and it announces politely without chattering.
 */
export function NewItemsPill({ count, onJump, describe, label, className }: NewItemsPillProps) {
  const locale = useLocale();
  const announced = usePoliteCount(count);

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 z-30 flex justify-center", className)}>
      <AnimatePresence initial={false}>
        {count > 0 && (
          <motion.button
            key="new-items-pill"
            type="button"
            onClick={onJump}
            aria-label={describe(count)}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: FADE_OUT }}
            transition={{ ...SPRING_PANEL, opacity: FADE_IN }}
            className={cn(
              buttonVariants({ variant: "accent", size: "xs" }),
              "pointer-events-auto h-7 gap-1.5 rounded-full pr-2.5 pl-2 [&_svg]:size-3.5"
            )}
          >
            <ArrowUp aria-hidden="true" strokeWidth={2.5} />
            <span aria-hidden="true" className="tabular-nums">
              {label(count, <NumberFlow value={count} locales={locale} />)}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <span role="status" aria-live="polite" className="sr-only">
        {announced > 0 ? describe(announced) : ""}
      </span>
    </div>
  );
}

// The count to announce: settles for ANNOUNCE_DELAY_MS, then speaks at most once per
// ANNOUNCE_INTERVAL_MS. Clears as soon as the count drops to zero.
function usePoliteCount(count: number) {
  const [announced, setAnnounced] = useState(0);
  const lastSpokenAt = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    if (count === 0) {
      setAnnounced(0);
      lastSpokenAt.current = Number.NEGATIVE_INFINITY;
      return;
    }
    const wait = Math.max(ANNOUNCE_DELAY_MS, lastSpokenAt.current + ANNOUNCE_INTERVAL_MS - Date.now());
    const timer = setTimeout(() => {
      lastSpokenAt.current = Date.now();
      setAnnounced(count);
    }, wait);
    return () => clearTimeout(timer);
  }, [count]);

  return announced;
}
