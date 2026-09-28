// Adapted from interior.dev "Hold to Confirm" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { motion, useMotionValue, useTransform, type Transition } from "framer-motion";
import { useExtracted } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { FADE_IN, FADE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type HoldPhase = "idle" | "holding" | "releasing" | "committed";

// Long enough to be deliberate, short enough not to feel like a punishment.
export const HOLD_TO_CONFIRM_DURATION = 1600;
// Letting go drains the fill this many times faster than holding fills it.
const RELEASE_RATE = 2.5;
// A pointer that wanders further than this (px) from where it pressed is not holding any more.
const MOVE_TOLERANCE = 10;
// The most a single frame may add, so a janky or throttled frame can't jump the fill.
const MAX_FRAME_MS = 64;
// A commit the caller never marks as pending re-arms the button after this long.
const RESET_AFTER_MS = 1500;
// Label swaps are sequential: the incoming label only starts once the outgoing one has fully faded, so the two
// never show on top of each other in their shared cell.
const LABEL_OUT: Transition = FADE_OUT;
const LABEL_IN: Transition = { ...FADE_IN, delay: FADE_OUT.duration };

export type UseHoldToConfirmOptions = {
  onConfirm: () => void;
  onAbort?: () => void;
  duration?: number;
  releaseRate?: number;
  moveTolerance?: number;
  haptic?: boolean;
  disabled?: boolean;
};

/**
 * The hold clock. `progress` (0–1) is written from a rAF loop that accumulates held time and drains
 * `releaseRate`× faster after release; pressing again mid-drain resumes from the current fill. The fill is
 * the clock itself, so it stays linear and time-driven under reduced motion too (upstream jumped straight
 * to 100% on press, which hid the progress).
 */
export function useHoldToConfirm({
  onConfirm,
  onAbort,
  duration = HOLD_TO_CONFIRM_DURATION,
  releaseRate = RELEASE_RATE,
  moveTolerance = MOVE_TOLERANCE,
  haptic = true,
  disabled = false,
}: UseHoldToConfirmOptions) {
  const [phase, setPhase] = useState<HoldPhase>("idle");
  const progress = useMotionValue(0);

  const phaseRef = useRef<HoldPhase>("idle");
  const down = useRef(false);
  const elapsed = useRef(0);
  const last = useRef<number | null>(null);
  const raf = useRef(0);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const confirmRef = useRef(onConfirm);
  const abortRef = useRef(onAbort);
  useEffect(() => {
    confirmRef.current = onConfirm;
    abortRef.current = onAbort;
  });

  const goTo = useCallback((next: HoldPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    last.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    down.current = false;
    elapsed.current = 0;
    origin.current = null;
    progress.set(0);
    goTo("idle");
  }, [goTo, progress, stop]);

  const begin = useCallback(
    (point?: { x: number; y: number }) => {
      if (disabled || phaseRef.current === "holding" || phaseRef.current === "committed") return;
      origin.current = point ?? null;
      down.current = true;
      goTo("holding");
      // Pressed again mid-drain: the clock is still running and picks the hold back up.
      if (raf.current) return;

      const loop = (now: number) => {
        // Only rAF timestamps are compared, so the first frame just starts the clock.
        const dt = last.current === null ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, now - last.current));
        last.current = now;
        elapsed.current += down.current ? dt : -dt * releaseRate;

        if (elapsed.current >= duration) {
          stop();
          elapsed.current = duration;
          down.current = false;
          origin.current = null;
          progress.set(1);
          goTo("committed");
          if (haptic) navigator.vibrate?.(14);
          confirmRef.current();
          return;
        }

        if (!down.current && elapsed.current <= 0) {
          stop();
          elapsed.current = 0;
          origin.current = null;
          progress.set(0);
          goTo("idle");
          return;
        }

        progress.set(elapsed.current / duration);
        raf.current = requestAnimationFrame(loop);
      };

      raf.current = requestAnimationFrame(loop);
    },
    [disabled, duration, releaseRate, haptic, goTo, progress, stop]
  );

  const release = useCallback(() => {
    if (phaseRef.current !== "holding") return;
    down.current = false;
    origin.current = null;
    goTo("releasing");
    abortRef.current?.();
  }, [goTo]);

  // Leaving the window or tab lets go. Escape cancels outright, wherever focus is (Safari doesn't focus a
  // clicked button, so a mouse hold never sees the key on the button itself).
  useEffect(() => {
    const onWindowBlur = () => release();
    const onVisibilityChange = () => {
      if (document.hidden) release();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (phaseRef.current === "holding" || phaseRef.current === "releasing") reset();
    };
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [release, reset]);

  // Disabled mid-hold (e.g. the typed confirmation stopped matching): drop the hold.
  useEffect(() => {
    if (disabled && (phaseRef.current === "holding" || phaseRef.current === "releasing")) reset();
  }, [disabled, reset]);

  // Never leave a clock running after unmount (e.g. the dialog closed mid-hold).
  useEffect(() => stop, [stop]);

  const bind = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      begin({ x: event.clientX, y: event.clientY });
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const from = origin.current;
      if (phaseRef.current !== "holding" || !from) return;
      if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > moveTolerance) release();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
    onLostPointerCapture: release,
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key !== " " && event.key !== "Enter") return;
      // Swallow the key so it never becomes a click. A held key auto-repeats; only a fresh press starts a hold.
      event.preventDefault();
      if (!event.repeat) begin();
    },
    onKeyUp: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === " " || event.key === "Enter") release();
    },
    onBlur: release,
    // Holding is the only way to confirm; a click does nothing (and never reaches a parent once committed).
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      if (phaseRef.current === "committed") event.stopPropagation();
    },
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => event.preventDefault(),
  };

  return { bind, phase, progress, reset };
}

export type HoldToConfirmProps = {
  /** Runs once, when a hold completes. Handle errors inside it and reflect the work in `pending`. */
  onConfirm: () => void;
  /** The visible label, e.g. "Hold to delete site". */
  children: ReactNode;
  /** The confirmed action is running: the button stays full and inert. When it turns false again while the
   * button is still mounted (the action failed), the button re-arms. */
  pending?: boolean;
  /** Replaces the label, and is announced, once the hold commits, e.g. "Deleting...". */
  pendingLabel?: string;
  duration?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * A destructive button that confirms by being pressed and held (pointer, or Space/Enter). Render it as a plain
 * child of an AlertDialog footer, not as an AlertDialogAction, so the dialog stays open until the hold commits.
 */
export function HoldToConfirm({
  onConfirm,
  children,
  pending = false,
  pendingLabel,
  duration = HOLD_TO_CONFIRM_DURATION,
  disabled = false,
  className,
}: HoldToConfirmProps) {
  const t = useExtracted();
  const hintId = useId();
  const { bind, phase, progress, reset } = useHoldToConfirm({ onConfirm, duration, disabled: disabled || pending });
  const clipPath = useTransform(progress, value => `inset(0 ${(1 - value) * 100}% 0 0)`);

  const committed = phase === "committed";
  const busy = committed || pending;

  // After a commit the caller's `pending` takes over. If it falls again while we're still mounted, the action
  // failed (or finished without navigating away), so re-arm. If it never rises, re-arm after a beat.
  const sawPending = useRef(false);
  useEffect(() => {
    if (pending) {
      sawPending.current = true;
      return;
    }
    if (!committed) {
      sawPending.current = false;
      return;
    }
    if (sawPending.current) {
      sawPending.current = false;
      reset();
      return;
    }
    const timer = setTimeout(reset, RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [committed, pending, reset]);

  return (
    <>
      {/* Outside the button so they stay out of its accessible name. */}
      <span id={hintId} className="sr-only">
        {t("Press and hold to confirm. Releasing early cancels.")}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {committed ? (pendingLabel ?? t("Confirmed")) : ""}
      </span>
      <button
        type="button"
        aria-describedby={hintId}
        aria-disabled={disabled || busy || undefined}
        data-phase={phase}
        {...bind}
        style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
        className={cn(
          "relative isolate inline-grid h-9 select-none place-items-center overflow-hidden whitespace-nowrap rounded-lg border bg-transparent px-3 text-sm font-medium text-red-600 transition-colors dark:text-red-400",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
          // The edge darkens to the fill color once armed, so the unfilled part reads as "in progress".
          phase !== "idle" || pending
            ? "border-red-600"
            : cn(
                "border-red-300 dark:border-red-500/40",
                !disabled && "hover:border-red-400 dark:hover:border-red-500/60"
              ),
          disabled
            ? "cursor-not-allowed opacity-50"
            : busy
              ? "cursor-default"
              : "cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10",
          className
        )}
      >
        <Faces busy={busy} pendingLabel={pendingLabel}>
          {children}
        </Faces>
        {/* The fill: the same faces in inverted colors, revealed left to right as the hold progresses. */}
        <motion.span
          aria-hidden
          style={{ clipPath }}
          className="absolute inset-0 grid place-items-center bg-red-600 px-3 text-white dark:bg-red-700 dark:text-neutral-50"
        >
          <Faces busy={busy} pendingLabel={pendingLabel}>
            {children}
          </Faces>
        </motion.span>
      </button>
    </>
  );
}

function Faces({ busy, pendingLabel, children }: { busy: boolean; pendingLabel?: string; children: ReactNode }) {
  const swapped = busy && pendingLabel !== undefined;

  // Both faces share one grid cell, so the button is as wide as the longer label and never jumps. Whichever face
  // is leaving fades out first; the arriving one waits for it (LABEL_IN's delay), so they never overlap.
  return (
    <span className="col-start-1 row-start-1 grid">
      <motion.span
        initial={false}
        animate={{ opacity: swapped ? 0 : 1 }}
        transition={swapped ? LABEL_OUT : LABEL_IN}
        aria-hidden={swapped || undefined}
        data-face="label"
        className="col-start-1 row-start-1 flex items-center justify-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0"
      >
        {children}
      </motion.span>
      {pendingLabel !== undefined && (
        <motion.span
          initial={false}
          animate={{ opacity: swapped ? 1 : 0 }}
          transition={swapped ? LABEL_IN : LABEL_OUT}
          aria-hidden={!swapped || undefined}
          data-face="pending"
          className="col-start-1 row-start-1 flex items-center justify-center"
        >
          {pendingLabel}
        </motion.span>
      )}
    </span>
  );
}
