"use client";

import { Pin, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShare as percent, JourneyRow, pathContinuation } from "./journeyUtils";
import { PathActionHandlers, PathActions } from "./PathActions";
import { PathChips } from "./PathChips";

export interface PinnedPathProps {
  journey: JourneyRow;
  /** The shown paths: the step-by-step figures are sums over them. */
  journeys: JourneyRow[];
  /** The selected goal and how many of all multi-page sessions reach it (0–1); null without a goal. */
  goal: { name: string; overallRate: number | null; href: string } | null;
  pageHref: (page: string) => string | undefined;
  handlers: PathActionHandlers;
  onUnpin: () => void;
}

/** The pinned path in detail: its size, its goal reach, and how sessions thin out page by page. */
export function PinnedPath({ journey, journeys, goal, pageHref, handlers, onUnpin }: PinnedPathProps) {
  const t = useExtracted();
  const continuation = pathContinuation(journeys, journey.path);
  const first = continuation[0]?.sessions ?? 0;
  const reach =
    goal && journey.conversions !== undefined && journey.count > 0 ? journey.conversions / journey.count : null;
  const goalLink = (chunks: ReactNode) => (
    <Link
      href={goal?.href ?? ""}
      prefetch={false}
      className="text-neutral-700 underline decoration-neutral-400 underline-offset-2 dark:text-neutral-200 dark:decoration-neutral-500"
    >
      {chunks}
    </Link>
  );

  return (
    <div className="rounded-md border border-neutral-100 bg-white p-3 text-neutral-950 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.06)] dark:border-transparent dark:bg-neutral-800 dark:text-neutral-50 dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.65),0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-2">
        <PathChips
          path={journey.path}
          pageHref={pageHref}
          chipClassName="dark:border-neutral-700 dark:bg-neutral-750 dark:hover:border-neutral-600"
        />
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className="dark:border-neutral-600">
            <Pin className="mr-1 h-3 w-3" />
            {t("Pinned")}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            className="h-6 w-6 dark:hover:bg-neutral-700"
            aria-label={t("Unpin path")}
            onClick={onUnpin}
          >
            <X />
          </Button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
        <div>
          <div className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
            {journey.count.toLocaleString()}
          </div>
          <div>{t("sessions")}</div>
        </div>
        <div>
          <div className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
            {`${journey.percentage.toFixed(1)}%`}
          </div>
          <div>{t("of multi-page sessions")}</div>
        </div>
        {goal && reach !== null && (
          <div className="min-w-0">
            <div className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
              {percent(reach)}
            </div>
            <div>
              {goal.overallRate === null
                ? t.rich("reach <goal>{name}</goal>", { name: goal.name, goal: goalLink })
                : t.rich("reach <goal>{name}</goal>, {overall} across all paths", {
                    name: goal.name,
                    overall: percent(goal.overallRate),
                    goal: goalLink,
                  })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-neutral-100 pt-1.5 dark:border-neutral-700">
        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(32px,1fr)_56px_64px] gap-2 pb-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>{t("Step")}</span>
          <span />
          <span className="text-right">{t("Sessions")}</span>
          <span className="text-right">{t("Continued")}</span>
        </div>
        {continuation.map((step, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1.5fr)_minmax(32px,1fr)_56px_64px] items-center gap-2 py-1 text-xs"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="w-3 shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">{index + 1}</span>
              <span className="truncate font-medium text-neutral-900 dark:text-neutral-100" title={step.page}>
                {step.page}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-dataviz"
                style={{ width: `${first > 0 ? Math.max(2, (step.sessions / first) * 100) : 0}%` }}
              />
            </div>
            <div className="text-right tabular-nums text-neutral-900 dark:text-neutral-100">
              {step.sessions.toLocaleString()}
            </div>
            <div className="text-right tabular-nums text-neutral-500 dark:text-neutral-400">
              {step.continued === null ? "" : percent(step.continued)}
            </div>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          {t("Sessions on the paths shown that got this far along the path.")}
        </p>
      </div>

      <div className="mt-1.5 border-t border-neutral-100 pt-2 dark:border-neutral-700">
        <PathActions path={journey.path} handlers={handlers} primaryFunnel />
      </div>
    </div>
  );
}
