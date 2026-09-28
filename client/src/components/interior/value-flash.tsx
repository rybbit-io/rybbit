// Adapted from interior.dev "Value Flash" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import { type ReactNode, useMemo } from "react";

import { cn } from "@/lib/utils";

import { type UseValueFlashOptions, useValueFlash } from "./use-value-flash";

// Upstream's solid ▲ / ▼, drawn as a clipped span that the triangle fills edge to edge. A span rather
// than an <svg> so a parent's [&_svg] sizing (every Button has one) can't resize it.
const GLYPH = {
  up: "polygon(50% 0, 100% 100%, 0 100%)",
  down: "polygon(0 0, 100% 0, 50% 100%)",
} as const;

const GOOD = "text-accent-600 dark:text-accent-400";
const BAD = "text-red-600 dark:text-red-400";

export type ValueFlashProps = Omit<UseValueFlashOptions<number>, "compare"> & {
  /** The number on screen. Its change sets the direction. */
  value: number;
  /** The value as the user reads it. When given, only a change in this text flashes. */
  format?: (value: number) => string;
  /** A rise is bad news (bounce rate): tint it red and a fall emerald. The glyph still points the way it moved. */
  invert?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Marks a number that just changed under the user: its text takes the delta color and a ▲/▼ appears
 * beside it, then both fade back. No scale bump (too loud for a data tool). The glyph is absolutely
 * positioned so the mark never shifts the layout, and it is decorative: the number itself is the content.
 */
export function ValueFlash({ value, format, invert = false, className, children, ...options }: ValueFlashProps) {
  const { direction, flashing } = useValueFlash(value, {
    ...options,
    compare: format ? (next, previous) => (format(next) === format(previous) ? 0 : next - previous) : undefined,
  });
  const tone = (direction === "up") !== invert ? GOOD : BAD;

  return (
    <span
      className={cn(
        "relative inline-flex items-baseline transition-colors ease-out",
        // Arrive fast, leave slowly.
        flashing ? cn("duration-150", tone) : "duration-700",
        className
      )}
    >
      {children}
      {direction && (
        <span
          aria-hidden="true"
          data-slot="value-flash-glyph"
          style={{ clipPath: GLYPH[direction] }}
          className={cn(
            "pointer-events-none absolute top-[0.2em] left-full ml-[0.15em] h-[0.4em] w-[0.5em] bg-current transition-opacity ease-out",
            tone,
            flashing ? "opacity-100 duration-150" : "opacity-0 duration-700"
          )}
        />
      )}
    </span>
  );
}

export type FlashNumberProps = Omit<ValueFlashProps, "children" | "format"> & {
  /** NumberFlow's Intl options. Pass a stable object; it also decides when a change is visible. */
  format?: Format;
  locales?: Intl.LocalesArgument;
};

/** NumberFlow that flashes when the number it shows changes in place. */
export function FlashNumber({ value, format, locales, ...flash }: FlashNumberProps) {
  const formatter = useMemo(() => new Intl.NumberFormat(locales, format), [locales, format]);

  return (
    <ValueFlash value={value} format={formatter.format} {...flash}>
      <NumberFlow value={value} format={format} locales={locales} />
    </ValueFlash>
  );
}
