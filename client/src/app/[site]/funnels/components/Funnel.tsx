"use client";

import { Clock, Rewind, Target, Video, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { Fragment, ReactNode, useState } from "react";
import { FunnelStep } from "@/api/analytics/endpoints";
import { useGetFunnelStepSessions } from "@/api/analytics/hooks/funnels/useGetFunnelStepSessions";
import { EventTypeIcon } from "@/components/EventIcons";
import { SessionsList } from "@/components/Sessions/SessionsList";
import { Delta } from "@/components/site/Delta";
import { PivotActions, PivotButton } from "@/components/site/PivotActions";
import { Button } from "@/components/ui/button";
import { useReplayAvailable } from "@/hooks/useReplayAvailable";
import { resolvePropertyFilters, targetTypeToEventType } from "@/lib/events";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatRate, formatStepDuration, FunnelMetrics, rateDelta, stepLabel, StepMetrics } from "./funnelMetrics";
import { useStepTypeLabels } from "./useStepTypeLabels";

const LIMIT = 25;

const MUTED = "text-neutral-500 dark:text-neutral-400";
const STRONG = "font-medium tabular-nums text-neutral-900 dark:text-neutral-100";

// Number, step, bar, sessions, share of start. The columns follow the width of
// the funnel itself (a container query), not the window: beside the sidebar or
// in the builder's preview pane it has far less room than the viewport
// suggests. When narrow, the bar drops to its own line.
const STEP_GRID =
  "grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 @2xl:grid-cols-[24px_208px_minmax(0,1fr)_76px_64px]";
// The line between two steps: what happened to the sessions that reached the step above.
const LINK_GRID = "grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3 @2xl:grid-cols-[24px_208px_minmax(0,1fr)]";

// The data hue in both encodings: solid for the share of the first step,
// hatched for the share of the step before. The hatch is stronger on the light
// theme's pale track.
const SOLID = "bg-dataviz";
const HATCH =
  "bg-[repeating-linear-gradient(45deg,hsl(var(--dataviz)/0.6)_0_5px,hsl(var(--dataviz)/0.3)_5px_10px)] dark:bg-[repeating-linear-gradient(45deg,hsl(var(--dataviz)/0.3)_0_5px,hsl(var(--dataviz)/0.14)_5px_10px)]";

/** Which sessions are listed under the chart: the ones that reached a step, or the ones that left after it. */
interface SessionsPanel {
  stepIndex: number;
  mode: "reached" | "dropped";
  replaysOnly: boolean;
}

const samePanel = (a: SessionsPanel | null, b: SessionsPanel) =>
  !!a && a.stepIndex === b.stepIndex && a.mode === b.mode && a.replaysOnly === b.replaysOnly;

function StepSessions({
  steps,
  panel,
  title,
  onClose,
}: {
  steps: FunnelStep[];
  panel: SessionsPanel;
  title: string;
  onClose: () => void;
}) {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const time = useStore(state => state.time);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetFunnelStepSessions({
    steps,
    stepNumber: panel.stepIndex + 1,
    siteId: Number(site),
    time,
    mode: panel.mode,
    page,
    limit: LIMIT + 1,
    replaysOnly: panel.replaysOnly,
    enabled: true,
  });

  const sessions = data ?? [];
  const emptyMessage = panel.replaysOnly
    ? t("None of these sessions has a replay in the selected time period.")
    : panel.mode === "reached"
      ? t("No sessions reached this step in the selected time period.")
      : t("No sessions dropped off after this step in the selected time period.");

  return (
    <div className="my-2 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800 @2xl:ml-9">
      <SessionsList
        sessions={sessions.slice(0, LIMIT)}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        hasNextPage={sessions.length > LIMIT}
        hasPrevPage={page > 1}
        emptyMessage={emptyMessage}
        pageSize={5}
        headerElement={
          <div className="flex min-w-0 items-center gap-1">
            <Button variant="ghost" size="smIcon" onClick={onClose} aria-label={t("Close sessions")}>
              <X />
            </Button>
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</span>
          </div>
        }
      />
    </div>
  );
}

function StepBar({ step, isFirst }: { step: StepMetrics; isFirst: boolean }) {
  return (
    <div className="relative col-span-2 col-start-2 row-start-2 mt-1 h-8 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800 @2xl:col-span-1 @2xl:col-start-auto @2xl:row-start-auto @2xl:mt-0">
      {!isFirst && step.sessions > 0 && (
        <div
          className={cn("absolute inset-y-0 left-0 rounded-md", HATCH)}
          style={{ width: `${(step.fromPrevious * 100).toFixed(2)}%` }}
        />
      )}
      {step.sessions > 0 && (
        <div
          className={cn("absolute inset-y-0 left-0 rounded-md", SOLID)}
          style={{ width: `${Math.max(0.5, step.ofStart * 100).toFixed(2)}%` }}
        />
      )}
    </div>
  );
}

function MedianTime({ seconds, children }: { seconds: number | null; children: (duration: string) => ReactNode }) {
  if (seconds === null) return null;
  return (
    <div className={cn("flex items-center gap-1 whitespace-nowrap tabular-nums", MUTED)}>
      <Clock className="h-3 w-3" aria-hidden="true" />
      {children(formatStepDuration(seconds))}
    </div>
  );
}

export interface FunnelProps {
  steps: FunnelStep[];
  /** The selected period. */
  metrics: FunnelMetrics;
  /** The comparison period. Step and conversion deltas are drawn against it. */
  previous?: FunnelMetrics | null;
  /** The comparison window in words, e.g. "Aug 2 – Aug 31". */
  comparisonLabel?: string | null;
  /** The goal that measures the same thing as the last step. */
  goal?: { name: string; href: string } | null;
  /** Buttons at the end of the legend row. */
  actions?: ReactNode;
}

/**
 * A funnel, step by step: how many sessions reached each step, what share went
 * on, and how many left at that step and how long the rest took, stated on the
 * line under the step they belong to. Every count opens the sessions behind it.
 */
export function Funnel({ steps, metrics, previous, comparisonLabel, goal, actions }: FunnelProps) {
  const t = useExtracted();
  const typeLabels = useStepTypeLabels();
  const replayAvailable = useReplayAvailable();
  const [panel, setPanel] = useState<SessionsPanel | null>(null);

  const toggle = (next: SessionsPanel) => setPanel(current => (samePanel(current, next) ? null : next));
  const lastIndex = metrics.steps.length - 1;

  const nameOf = (index: number) => {
    const step = steps[index];
    return step
      ? stepLabel(step, typeLabels[step.type] ?? typeLabels.event)
      : t("Step {number}", { number: String(index + 1) });
  };

  // What a step matches, for the line under its name: "Page · /pricing · plan = pro".
  const describe = (step: FunnelStep) =>
    [
      typeLabels[step.type] ?? typeLabels.event,
      step.hostname,
      step.value || t("any"),
      ...resolvePropertyFilters(step).map(filter => `${filter.key} = ${filter.value}`),
    ]
      .filter(Boolean)
      .join(" · ");

  const panelTitle = ({ stepIndex, mode, replaysOnly }: SessionsPanel) => {
    const step = nameOf(stepIndex);
    if (mode === "dropped") {
      return replaysOnly
        ? t("Replays of sessions that dropped off after {step}", { step })
        : t("Sessions that dropped off after {step}", { step });
    }
    if (stepIndex === lastIndex) {
      return replaysOnly ? t("Replays of sessions that converted") : t("Sessions that converted");
    }
    return replaysOnly
      ? t("Replays of sessions that reached {step}", { step })
      : t("Sessions that reached {step}", { step });
  };

  // Sessions and Replays behind a count. "Left at this step" cannot be written
  // as filters, so these open the step's own session list instead of linking
  // to the Sessions page.
  const pivots = (stepIndex: number, mode: SessionsPanel["mode"]) => {
    const active = "bg-neutral-100 dark:bg-neutral-800";
    const sessions = { stepIndex, mode, replaysOnly: false };
    const replays = { stepIndex, mode, replaysOnly: true };
    return (
      <PivotActions actions={[]}>
        <PivotButton
          icon={<Rewind />}
          label={t("Sessions")}
          onClick={() => toggle(sessions)}
          className={cn(samePanel(panel, sessions) && active)}
        />
        {replayAvailable && (
          <PivotButton
            icon={<Video />}
            label={t("Replays")}
            onClick={() => toggle(replays)}
            className={cn("hidden md:inline-flex", samePanel(panel, replays) && active)}
          />
        )}
      </PivotActions>
    );
  };

  const sessionsFor = (stepIndex: number, mode: SessionsPanel["mode"]) =>
    panel && panel.stepIndex === stepIndex && panel.mode === mode ? (
      <StepSessions
        key={`${stepIndex}-${mode}-${panel.replaysOnly}`}
        steps={steps}
        panel={panel}
        title={panelTitle(panel)}
        onClose={() => setPanel(null)}
      />
    ) : null;

  return (
    <div className="@container">
      <div className={cn(STEP_GRID, "hidden pb-1 text-xs @2xl:grid", MUTED)}>
        <div />
        <div>{t("Step")}</div>
        <div>{t("Sessions that reached it")}</div>
        <div className="text-right">{t("Sessions")}</div>
        <div className="text-right">{t("Of start")}</div>
      </div>

      {metrics.steps.map((step, index) => {
        const definition = steps[index];
        const isLast = index === lastIndex;
        // The last step's sessions are the converted ones, listed from the line under it.
        const reached = { stepIndex: index, mode: "reached" as const, replaysOnly: false };

        const rowContent = (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs tabular-nums dark:bg-neutral-800">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <EventTypeIcon
                  type={targetTypeToEventType(definition?.type || "event")}
                  className="h-3.5 w-3.5 shrink-0"
                  tooltip={false}
                />
                <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {nameOf(index)}
                </span>
              </div>
              {definition && <div className={cn("truncate text-xs", MUTED)}>{describe(definition)}</div>}
            </div>
            <StepBar step={step} isFirst={index === 0} />
            <div className="flex flex-col items-end @2xl:contents">
              <div className="text-right text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                {step.sessions.toLocaleString()}
              </div>
              <div className={cn("text-right text-xs tabular-nums @2xl:text-sm", MUTED)}>
                {metrics.entered > 0 ? formatRate(step.ofStart) : "—"}
              </div>
            </div>
          </>
        );

        return (
          <Fragment key={index}>
            {isLast ? (
              <div className={cn(STEP_GRID, "min-h-10 py-1")}>{rowContent}</div>
            ) : (
              <button
                type="button"
                className={cn(
                  STEP_GRID,
                  "min-h-10 w-full cursor-pointer rounded-md py-1 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:hover:bg-neutral-800/40 dark:focus-visible:ring-neutral-300"
                )}
                aria-expanded={samePanel(panel, reached)}
                title={t("Show the sessions that reached this step")}
                onClick={() => toggle(reached)}
              >
                {rowContent}
              </button>
            )}
            {!isLast && sessionsFor(index, "reached")}

            {isLast ? (
              <div className={cn(LINK_GRID, "min-h-9")}>
                <div className="row-span-2 @2xl:row-span-1" />
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={STRONG}>{metrics.conversion === null ? "—" : formatRate(metrics.conversion)}</span>
                  <span className={MUTED}>{t("overall")}</span>
                  <Delta value={rateDelta(metrics.conversion, previous?.conversion)} />
                </div>
                <div className="col-start-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs @2xl:col-start-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("tabular-nums", MUTED)}>
                      {t.rich("<count>{converted}</count> converted", {
                        converted: metrics.converted.toLocaleString(),
                        count: chunks => <span className={STRONG}>{chunks}</span>,
                      })}
                    </span>
                    {metrics.converted > 0 && pivots(index, "reached")}
                    {goal && (
                      <Link
                        href={goal.href}
                        prefetch={false}
                        className="inline-flex max-w-56 items-center gap-1 rounded-md border border-neutral-200 px-1.5 py-0.5 text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-50"
                      >
                        <Target className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t("Goal: {name}", { name: goal.name })}</span>
                      </Link>
                    )}
                  </div>
                  <MedianTime seconds={metrics.medianSecondsToConvert}>
                    {duration => t("{duration} median from first step", { duration })}
                  </MedianTime>
                </div>
              </div>
            ) : (
              <div className={cn(LINK_GRID, "min-h-9")}>
                <div className="row-span-2 flex h-full justify-center self-stretch @2xl:row-span-1">
                  <div className="w-px bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={STRONG}>{step.continueRate === null ? "—" : formatRate(step.continueRate)}</span>
                  <span className={MUTED}>{t("continue")}</span>
                  <Delta value={rateDelta(step.continueRate, previous?.steps[index]?.continueRate)} />
                </div>
                <div className="col-start-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-1 text-xs @2xl:col-start-auto @2xl:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("tabular-nums", MUTED)}>
                      {t.rich("<count>{dropped}</count> dropped here", {
                        dropped: step.dropped.toLocaleString(),
                        count: chunks => <span className={STRONG}>{chunks}</span>,
                      })}
                      {step.continueRate !== null && ` · ${formatRate(1 - step.continueRate)}`}
                    </span>
                    {step.dropped > 0 && pivots(index, "dropped")}
                  </div>
                  <MedianTime seconds={step.medianSecondsToNext}>
                    {duration => t("{duration} median to next step", { duration })}
                  </MedianTime>
                </div>
              </div>
            )}
            {sessionsFor(index, isLast ? "reached" : "dropped")}
          </Fragment>
        );
      })}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", MUTED)}>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", SOLID)} />
            {t("Share of first step")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", HATCH)} />
            {t("Conversion from previous step")}
          </span>
          {previous && comparisonLabel && <span>{t("Compared with {period}", { period: comparisonLabel })}</span>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </div>
  );
}
