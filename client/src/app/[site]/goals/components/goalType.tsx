"use client";

import { Copy, ExternalLink, Eye, FileInput, LucideIcon, MousePointerClick, SquareMousePointer } from "lucide-react";
import { useExtracted } from "next-intl";
import { GoalType } from "@/api/analytics/endpoints";
import { cn } from "@/lib/utils";

// The same icons the event log uses for these types (components/EventIcons),
// drawn neutral: in the ledger the type is a label, not a data series.
const GOAL_TYPE_ICONS: Record<GoalType, LucideIcon> = {
  path: Eye,
  event: MousePointerClick,
  outbound: ExternalLink,
  button_click: SquareMousePointer,
  form_submit: FileInput,
  copy: Copy,
};

export function GoalTypeIcon({ type, className }: { type: GoalType; className?: string }) {
  const Icon = GOAL_TYPE_ICONS[type] ?? MousePointerClick;
  return (
    <Icon className={cn("h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400", className)} aria-hidden="true" />
  );
}

/** What each goal type is called on the page. */
export function useGoalTypeLabels(): Record<GoalType, string> {
  const t = useExtracted();
  return {
    path: t("Page"),
    event: t("Event"),
    outbound: t("Outbound link"),
    button_click: t("Button click"),
    form_submit: t("Form submit"),
    copy: t("Copy"),
  };
}
