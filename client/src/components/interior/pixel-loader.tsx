// Adapted from Beautiful UI "Loading State" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatElapsed, useElapsedTime } from "./use-elapsed-time";

// The "Drive" pattern: a ">" chevron wavefront sweeping left to right. Each cell starts
// (column + |row − 1|) × 90 ms into a 650 ms loop; the loop is shorter than the sweep, so two
// fronts are always in flight.
const LOOP_MS = 650;
const STEP_MS = 90;
const CELL_DELAYS_MS = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * STEP_MS;
});

// globals.css freezes keyframes under reduced motion, which would leave a uniformly dim square.
// These cells stay lit instead, so the frozen grid still reads as a forward chevron.
const STATIC_CHEVRON_DELAY_MS = STEP_MS;

/** The 3×3 pixel grid on its own. Decorative: pair it with visible text. */
export function PixelGrid({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px] text-neutral-900 dark:text-neutral-100",
        className
      )}
    >
      {CELL_DELAYS_MS.map((delay, index) => (
        <span
          key={index}
          className={cn(
            "size-1 rounded-[1px] bg-current opacity-15",
            delay === STATIC_CHEVRON_DELAY_MS && "motion-reduce:opacity-100"
          )}
          style={{ animation: `rybbit-pixel-on ${LOOP_MS}ms ease-in-out ${delay}ms infinite` }}
        />
      ))}
    </span>
  );
}

type PixelLoaderProps = {
  /** Already translated, e.g. t("Running query"). */
  label: string;
  /** performance.now() when the work started. Shows a live elapsed timer when set. */
  startedAt?: number | null;
  className?: string;
};

/**
 * Pixel grid + shimmering label + elapsed timer for work that takes seconds.
 *
 * Deliberately not a live region: a timer inside one would be re-announced ten times a second.
 * Announce start and finish once from a persistent role="status" element instead.
 */
export function PixelLoader({ label, startedAt, className }: PixelLoaderProps) {
  const locale = useLocale();
  const elapsedMs = useElapsedTime(startedAt);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5 text-sm", className)}>
      <PixelGrid />
      <span
        className={cn(
          "truncate bg-clip-text font-medium text-transparent",
          "[--shimmer-base:var(--color-neutral-600)] [--shimmer-peak:var(--color-neutral-950)]",
          "dark:[--shimmer-base:var(--color-neutral-400)] dark:[--shimmer-peak:var(--color-neutral-50)]",
          "bg-[linear-gradient(90deg,var(--shimmer-base)_35%,var(--shimmer-peak)_50%,var(--shimmer-base)_65%)]",
          "animate-[rybbit-shimmer_1.4s_linear_infinite]",
          // A frozen shimmer would leave a bright band stuck on the text; use one solid color instead.
          "motion-reduce:bg-none motion-reduce:text-[color:var(--shimmer-base)]"
        )}
        style={{ backgroundSize: "200% 100%" }}
      >
        {label}
      </span>
      {startedAt != null && (
        <>
          <span aria-hidden className="text-neutral-400 dark:text-neutral-600">
            ·
          </span>
          <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
            {formatElapsed(elapsedMs, locale)}
          </span>
        </>
      )}
    </span>
  );
}
