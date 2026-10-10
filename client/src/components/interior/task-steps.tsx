// Adapted from interior.dev "Task Steps" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { INSTANT, SPRING_CELL, SPRING_POP } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type TaskStep = {
  id: string;
  label: string;
  /** Secondary detail, revealed once the step is done. */
  meta?: string;
};

export type TaskStepStatus = "pending" | "active" | "done" | "error";

export type UseTaskStepsOptions = {
  steps: TaskStep[];
  /** Index of the step in progress: earlier steps are done, `steps.length` means all of them are. */
  current: number;
  failed?: boolean;
};

// Gap between the checks of steps that are already done when the list first renders with `appear`.
const APPEAR_STAGGER = 0.08;
// Upstream waits this long before speaking, so a burst of quick steps is announced once, not per step.
const ANNOUNCE_DELAY_MS = 500;

export function taskStepStatus(index: number, current: number, failed: boolean, stepCount: number): TaskStepStatus {
  if (index < current) return "done";
  if (index === current && failed) return "error";
  if (index === current && current < stepCount) return "active";
  return "pending";
}

export function useTaskSteps({ steps, current, failed = false }: UseTaskStepsOptions) {
  const t = useExtracted();
  const complete = !failed && current >= steps.length;
  const rows = steps.map((step, index) => ({ ...step, status: taskStepStatus(index, current, failed, steps.length) }));
  const active = rows.find(row => row.status === "active");

  const sentence = failed
    ? t("Failed at {step}", { step: steps[Math.min(current, steps.length - 1)]?.label ?? "" })
    : complete
      ? t("All {count, number} steps complete", { count: steps.length })
      : active
        ? t("{step}, step {current, number} of {total, number}", {
            step: active.label,
            current: current + 1,
            total: steps.length,
          })
        : "";

  return { rows, complete, failed, sentence };
}

const LABEL_TONE: Record<TaskStepStatus, string> = {
  done: "text-neutral-700 dark:text-neutral-200",
  active: "font-medium text-neutral-900 dark:text-neutral-50",
  pending: "text-neutral-600 dark:text-neutral-400",
  error: "font-medium text-red-600 dark:text-red-400",
};

function StepIcon({ status, delay }: { status: TaskStepStatus; delay: number }) {
  const cell = "col-start-1 row-start-1";

  if (status === "done" || status === "error") {
    const done = status === "done";
    return (
      <motion.span
        className={cn(
          cell,
          "grid size-4 place-items-center rounded-md",
          done
            ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400"
            : "bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-400"
        )}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, transition: INSTANT }}
        transition={{ ...SPRING_POP, delay }}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
      </motion.span>
    );
  }

  if (status === "active") {
    return (
      <motion.span
        className={cn(cell, "text-neutral-500 dark:text-neutral-400")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: INSTANT }}
        transition={SPRING_CELL}
      >
        {/* Upstream spun this with a JS animation that ignored reduced motion; a CSS spin gated on
            motion-safe simply stays still for those users. */}
        <svg viewBox="0 0 16 16" className="size-3 motion-safe:animate-spin">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M8 2 a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.span>
    );
  }

  return (
    <motion.span
      className={cn(cell, "size-[5px] rounded-[1px] bg-neutral-300 dark:bg-neutral-600")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: INSTANT }}
      transition={INSTANT}
    />
  );
}

export type TaskStepsProps = UseTaskStepsOptions & {
  /** Accessible name of the list. */
  label?: string;
  /** Pop in the checks of steps that are already done on the first render, staggered. */
  appear?: boolean;
  /** Seconds before that first stagger starts, e.g. to wait for the surrounding card to fade in. */
  appearDelay?: number;
  /** Speak progress in a polite live region. Turn off when the caller announces the outcome itself. */
  announce?: boolean;
  className?: string;
};

export function TaskSteps({
  steps,
  current,
  failed = false,
  label,
  appear = false,
  appearDelay = 0,
  announce = true,
  className,
}: TaskStepsProps) {
  const t = useExtracted();
  const { rows, sentence } = useTaskSteps({ steps, current, failed });
  // Steps done at first render are the ones that stagger in; a step that finishes later pops at once.
  const [doneOnMount] = useState(() => new Set(rows.filter(row => row.status === "done").map(row => row.id)));

  // One live region, always mounted, fed after a short settle. Upstream flipped a second region's
  // aria-live on in the same update as its text, so completion was announced twice.
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    if (!announce || !sentence) return;
    const timeout = window.setTimeout(() => setSpoken(sentence), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [announce, sentence]);

  const statusText: Record<TaskStepStatus, string> = {
    done: t("Done:"),
    active: t("In progress:"),
    pending: t("Not started:"),
    error: t("Failed:"),
  };

  return (
    <div className={cn("w-full", className)}>
      <ol aria-label={label ?? t("Progress")} className="flex flex-col">
        {rows.map((row, index) => (
          // Hanging indent: when the detail doesn't fit beside the label it wraps under it, instead of
          // squeezing the label into an ellipsis on narrow screens.
          <li
            key={row.id}
            aria-current={row.status === "active" ? "step" : undefined}
            className="relative flex flex-wrap items-baseline gap-x-2 py-1 pl-6"
          >
            <span aria-hidden="true" className="absolute left-0 top-1.5 grid size-4 place-items-center">
              <AnimatePresence initial={appear}>
                <StepIcon
                  key={row.status}
                  status={row.status}
                  delay={appear && doneOnMount.has(row.id) ? appearDelay + index * APPEAR_STAGGER : 0}
                />
              </AnimatePresence>
            </span>
            <span
              className={cn("min-w-0 max-w-full truncate text-sm leading-5 transition-colors", LABEL_TONE[row.status])}
            >
              <span className="sr-only">{statusText[row.status]} </span>
              {row.label}
            </span>
            {/* Always mounted, so a detail that turns up after the step is done still fades in. */}
            <span
              aria-hidden={row.status !== "done" || !row.meta}
              className={cn(
                "min-w-0 max-w-full truncate text-xs leading-4 text-neutral-600 transition-opacity duration-200 dark:text-neutral-400",
                row.status === "done" && row.meta ? "opacity-100" : "opacity-0"
              )}
            >
              {row.meta}
            </span>
          </li>
        ))}
      </ol>
      {announce ? (
        <span role="status" className="sr-only">
          {spoken}
        </span>
      ) : null}
    </div>
  );
}
