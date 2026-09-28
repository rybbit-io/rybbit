// Adapted from interior.dev "SegmentedControl" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { animate, useIsomorphicLayoutEffect, useMotionValue, useReducedMotionConfig } from "framer-motion";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";

import { SPRING_CELL } from "@/lib/motion";
import { cn } from "@/lib/utils";

// A radio group drawn as a segmented control. One motion value (a fractional
// segment index) drives the thumb: it clips a second, active-coloured copy of
// the labels that sits over the muted ones, so the thumb fill and the label
// colour move as one and the colour wipes across a label as the thumb passes.
// Upstream used equal-width segments; these are measured, so labels of any
// length keep their natural width.
//
// The clip is written to the DOM from the motion value's change events rather
// than through a motion component's style: this install pairs framer-motion
// 12.11 with motion-dom 12.23, which no longer emits the "renderRequest" event
// that 12.11's motion components wait for, so a style motion value would only
// paint on the next React render. Writing it here also keeps the slide off
// React entirely.

export type SegmentedControlOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  // Accessible name for labels that are not plain text: icon-only segments,
  // or text hidden at some breakpoints.
  ariaLabel?: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string = string> = {
  options: readonly SegmentedControlOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  // sm matches the 28px compact controls, md the 36px default (ui/tabs).
  size?: "sm" | "md";
  // "overlay" floats over a map or image (the globe).
  variant?: "default" | "overlay";
  disabled?: boolean;
  className?: string;
};

type SegmentRect = { left: number; width: number };
type SegmentLayout = { width: number; rects: SegmentRect[] };

const SIZES = {
  sm: { track: "p-0.5", segment: "h-6 gap-1.5 px-2 text-xs" },
  md: { track: "p-1", segment: "h-7 gap-2 px-3 text-sm" },
} as const;

// Same palette as ui/tabs so every segmented surface reads the same. Neutral
// thumb: the selection is carried by tone, not by the emerald accent.
const VARIANTS = {
  default: {
    track: "bg-neutral-100 dark:bg-neutral-800",
    thumb: "bg-white dark:bg-neutral-950",
    label: "text-neutral-600 dark:text-neutral-400",
    hover: "hover:text-neutral-900 dark:hover:text-neutral-200",
    active: "text-neutral-950 dark:text-neutral-50",
    disabled: "text-neutral-400 dark:text-neutral-600",
    ring: "focus-visible:after:ring-neutral-950 dark:focus-visible:after:ring-neutral-300",
  },
  overlay: {
    track: "border border-neutral-800/50 bg-neutral-900/70 backdrop-blur-sm",
    thumb: "bg-neutral-800",
    label: "text-neutral-300",
    hover: "hover:text-white",
    active: "text-white",
    disabled: "text-neutral-600",
    ring: "focus-visible:after:ring-neutral-300",
  },
} as const;

const SEGMENT = "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium";
// rounded-md, the thumb's corner.
const THUMB_RADIUS = "calc(var(--radius) - 2px)";
const HIDDEN_CLIP = "inset(0px 100% 0px 0px)";
// Hundredths of a pixel: plenty, and no float noise like 2.8e-14px.
const toPx = (value: number) => `${Math.round(value * 100) / 100}px`;

// Thumb box at a fractional segment index: between two segments it blends
// their offsets and widths, so it also resizes as it travels.
export function interpolateSegment(rects: readonly SegmentRect[], position: number): SegmentRect {
  const last = rects.length - 1;
  if (last < 0) return { left: 0, width: 0 };
  const clamped = Math.min(Math.max(position, 0), last);
  const from = Math.floor(clamped);
  const to = Math.min(from + 1, last);
  const progress = clamped - from;
  return {
    left: rects[from].left + (rects[to].left - rects[from].left) * progress,
    width: rects[from].width + (rects[to].width - rects[from].width) * progress,
  };
}

// Next enabled index from `from` in `step` direction, wrapping; -1 if none.
export function seekEnabled(options: readonly { disabled?: boolean }[], from: number, step: 1 | -1): number {
  const count = options.length;
  for (let k = 1; k <= count; k++) {
    const i = (((from + step * k) % count) + count) % count;
    if (!options[i]?.disabled) return i;
  }
  return -1;
}

function sameLayout(a: SegmentLayout, b: SegmentLayout) {
  return (
    a.width === b.width &&
    a.rects.length === b.rects.length &&
    a.rects.every((rect, i) => rect.left === b.rects[i].left && rect.width === b.rects[i].width)
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  size = "md",
  variant = "default",
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const [internal, setInternal] = useState<T | undefined>(
    () => defaultValue ?? options.find(option => !option.disabled)?.value
  );
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const index = options.findIndex(option => option.value === current);
  // Roving tabindex: the checked radio, else the first enabled one.
  const firstEnabled = options.findIndex(option => !option.disabled);
  const tabStop = index >= 0 ? index : Math.max(0, firstEnabled);

  const rowRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [layout, setLayout] = useState<SegmentLayout | null>(null);
  // Unmeasured (server render, hidden parent): the checked segment paints its
  // own thumb until the sliding one can be placed.
  const ready = layout !== null && layout.width > 0 && layout.rects.length === options.length;

  const optionsKey = options.map(option => option.value).join("\u0000");
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const count = options.length;
    const measure = () => {
      // Fractional boxes (offset* round to whole pixels), with any transform
      // scale divided out so a control in a zooming popover measures true.
      const rowBox = row.getBoundingClientRect();
      const width = parseFloat(getComputedStyle(row).width) || row.offsetWidth;
      const scale = width > 0 && rowBox.width > 0 ? rowBox.width / width : 1;
      const rects = buttonsRef.current.slice(0, count).map(button => {
        if (!button) return { left: 0, width: 0 };
        const box = button.getBoundingClientRect();
        return { left: (box.left - rowBox.left) / scale, width: box.width / scale };
      });
      const next = { width, rects };
      setLayout(previous => (previous && sameLayout(previous, next) ? previous : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // Each segment too: a label can change width while the row does not.
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    buttonsRef.current.slice(0, count).forEach(button => button && observer.observe(button));
    return () => observer.disconnect();
  }, [optionsKey]);

  const reduceMotion = useReducedMotionConfig();
  const position = useMotionValue(Math.max(index, 0));

  // The overlay's clip at a fractional segment position, for this render's
  // measurements. React only ever renders HIDDEN_CLIP (server render, first
  // paint); from then on the clip is written here and React leaves it alone.
  const overlayRef = useRef<HTMLDivElement>(null);
  const paint = useRef<(latest: number) => void>(() => {});
  useIsomorphicLayoutEffect(() => {
    paint.current = latest => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      if (!ready || !layout || index < 0) {
        overlay.style.clipPath = HIDDEN_CLIP;
        return;
      }
      const { left, width } = interpolateSegment(layout.rects, latest);
      const right = Math.max(0, layout.width - left - width);
      overlay.style.clipPath = `inset(0px ${toPx(right)} 0px ${toPx(left)} round ${THUMB_RADIUS})`;
    };
    paint.current(position.get());
  });
  // Subscribing also keeps the spring running: motion values stop animating
  // once they have no change listeners.
  useIsomorphicLayoutEffect(() => position.on("change", latest => paint.current(latest)), [position]);

  const placedIndex = useRef(index);
  useIsomorphicLayoutEffect(() => {
    const from = placedIndex.current;
    placedIndex.current = index;
    if (index < 0) return;
    // First placement, a selection appearing from none, and reduced motion
    // jump; only a change from one segment to another slides.
    if (!ready || reduceMotion || from < 0 || position.get() === index) {
      position.jump(index);
      return;
    }
    const controls = animate(position, index, SPRING_CELL);
    return () => controls.stop();
  }, [index, ready, reduceMotion, position]);

  const select = (i: number) => {
    const option = options[i];
    if (!option || option.disabled || disabled || option.value === current) return;
    if (!isControlled) setInternal(option.value);
    onValueChange?.(option.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = seekEnabled(options, i, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = seekEnabled(options, i, -1);
        break;
      case "Home":
        next = seekEnabled(options, options.length - 1, 1);
        break;
      case "End":
        next = seekEnabled(options, 0, -1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (disabled || next < 0) return;
    // Radio semantics: selection follows focus.
    buttonsRef.current[next]?.focus();
    select(next);
  };

  const sizing = SIZES[size];
  const tone = VARIANTS[variant];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-disabled={disabled || undefined}
      className={cn(
        // isolate keeps the focus ring's z-index local to the control.
        "isolate inline-flex touch-manipulation select-none rounded-lg",
        sizing.track,
        tone.track,
        disabled && "opacity-50",
        className
      )}
    >
      <div ref={rowRef} className="relative flex">
        {options.map((option, i) => {
          const checked = i === index;
          const blocked = disabled || option.disabled;
          return (
            <button
              key={option.value}
              ref={node => {
                buttonsRef.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.ariaLabel}
              aria-disabled={blocked || undefined}
              tabIndex={i === tabStop ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={event => onKeyDown(event, i)}
              className={cn(
                SEGMENT,
                sizing.segment,
                // The focus ring is drawn by ::after above the thumb layer.
                "relative transition-colors after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-md after:content-[''] focus-visible:outline-none focus-visible:after:ring-1",
                tone.ring,
                option.disabled ? tone.disabled : tone.label,
                blocked ? "cursor-not-allowed" : checked ? "cursor-default" : cn("cursor-pointer", tone.hover),
                checked && !ready && cn(tone.thumb, tone.active)
              )}
            >
              {option.label}
            </button>
          );
        })}
        <div
          ref={overlayRef}
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 flex", tone.thumb)}
          style={{ clipPath: HIDDEN_CLIP }}
        >
          {options.map(option => (
            <span key={option.value} className={cn(SEGMENT, sizing.segment, tone.active)}>
              {option.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
