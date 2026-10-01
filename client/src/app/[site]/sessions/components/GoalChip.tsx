"use client";

import { Target } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { SessionGoal } from "@/api/analytics/endpoints";
import { cn } from "@/lib/utils";
import { useSitePath } from "./useSitePath";

/** The goals page names an unnamed goal by its number; so does this. */
export function useGoalName(): (goal: SessionGoal) => string {
  const t = useExtracted();
  return goal => goal.name || t("Goal #{goalId}", { goalId: String(goal.id) });
}

/** A completed goal, as a link to the Goals page for the same period. */
export function GoalChip({ goal, className }: { goal: SessionGoal; className?: string }) {
  const goalName = useGoalName();
  const sitePath = useSitePath();
  const name = goalName(goal);

  return (
    <Link
      href={sitePath("goals", { keepQuery: true })}
      prefetch={false}
      title={name}
      // Rows toggle on click; following the link must not.
      onClick={event => event.stopPropagation()}
      className={cn(
        "inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md border border-neutral-150 px-1.5 py-0.5 text-xs font-medium text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-650",
        className
      )}
    >
      <Target className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="truncate">{name}</span>
    </Link>
  );
}
