"use client";

import { FolderTree, LogIn, LogOut, Route, Target } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import { useGetSite } from "@/api/admin/hooks/useSites";
import { JourneyGrouping } from "@/api/analytics/endpoints";
import { useGetGoals } from "@/api/analytics/hooks/goals/useGetGoals";
import { JourneyShape, useJourneys, useJourneySummary } from "@/api/analytics/hooks/useGetJourneys";
import { useMetric } from "@/api/analytics/hooks/useGetMetric";
import { DisabledOverlay } from "@/components/DisabledOverlay";
import { ErrorState } from "@/components/ErrorState";
import { AnalysisBar } from "@/components/site/AnalysisBar";
import { ChartLegend } from "@/components/site/ChartLegend";
import { InsightRow } from "@/components/site/InsightRow";
import { Button } from "@/components/ui/button";
import { Card, CardLoader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanOnSite } from "@/hooks/usePermissions";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { JOURNEY_PAGE_FILTERS } from "@/lib/filterGroups";
import { useComparisonEnabled, useStore } from "@/lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import {
  OptionControl,
  PagePicker,
  PageSuggestion,
  StepFilterButton,
  StepsStepper,
} from "./components/JourneyControls";
import { JourneyStats } from "./components/JourneyStats";
import { formatShare, largestExit, pathKey, sectionOfPage } from "./components/journeyUtils";
import { PathActionHandlers, PathActions } from "./components/PathActions";
import { PathChips } from "./components/PathChips";
import { PathSessionsSheet, PathSessionsTarget } from "./components/PathSessionsSheet";
import { PinnedPath } from "./components/PinnedPath";
import { SankeyDiagram } from "./components/SankeyDiagram";
import { SaveAsFunnelDialog } from "./components/SaveAsFunnelDialog";
import { TopPaths } from "./components/TopPaths";
import { usePagesHref, useSiteHref } from "./components/useJourneyLinks";

// The server takes 2 to 10 steps and up to 500 paths.
const MIN_STEPS = 2;
const MAX_STEPS = 10;
const PATH_LIMITS = [10, 15, 25, 50, 100, 200, 500];
// The comparison period is asked for as many paths as the server gives, so a
// path that ranked lower then is still found.
const COMPARISON_LIMIT = 500;
// Below this column pitch a step header has room for its session count only.
const WIDE_STEP_HEADER = 216;
const NO_GOAL = "none";

// Sankey-shaped placeholder: columns of blocks thinning to the right.
const SKELETON_COLUMNS: string[][] = [
  ["h-24", "h-10", "h-8", "h-6"],
  ["h-16", "h-12", "h-8", "h-6", "h-4"],
  ["h-12", "h-8", "h-6"],
  ["h-8", "h-6", "h-4"],
];

function SankeySkeleton() {
  return (
    <div className="flex min-h-[320px] items-start gap-10 py-2" aria-hidden>
      {SKELETON_COLUMNS.map((column, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2.5">
          {column.map((height, j) => (
            <Skeleton key={j} className={`${height} w-2/3 rounded`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function JourneysPage() {
  const t = useExtracted();
  useSetPageTitle("Journeys");

  const [steps, setSteps] = useState(4);
  const [limit, setLimit] = useState(15);
  const [stepFilters, setStepFilters] = useState<Record<number, string>>({});
  const [endsAt, setEndsAt] = useState("");
  const [groupBy, setGroupBy] = useState<JourneyGrouping>("path");
  // A goal id, NO_GOAL, or null until the viewer chooses: the default goal then stands in.
  const [goalChoice, setGoalChoice] = useState<string | null>(null);
  const [defaultGoalId, setDefaultGoalId] = useState<number | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [sessionsTarget, setSessionsTarget] = useState<PathSessionsTarget | null>(null);
  const [funnelPath, setFunnelPath] = useState<string[] | null>(null);

  const { data: siteMetadata } = useGetSite();
  const privateKey = useStore(state => state.privateKey);
  const canWriteFunnels = useCanOnSite("funnels:write");
  const comparisonEnabled = useComparisonEnabled();
  const pageHref = usePagesHref();
  const siteHref = useSiteHref();

  const { data: goalsData, isLoading: isLoadingGoals } = useGetGoals({ pageSize: 100 });
  const goals = goalsData?.data ?? [];
  // The default is the goal with the most conversions when the list first
  // arrives. It is kept from then on, so a new date range (which reloads the
  // list with new counts) does not swap the goal under the viewer.
  const busiestGoal = goals.reduce<(typeof goals)[number] | undefined>(
    (best, goal) => (!best || goal.total_conversions > best.total_conversions ? goal : best),
    undefined
  );
  if (defaultGoalId === null && busiestGoal) setDefaultGoalId(busiestGoal.goalId);
  const defaultGoal = goals.find(candidate => candidate.goalId === defaultGoalId) ?? busiestGoal;
  const goal =
    goalChoice === NO_GOAL
      ? undefined
      : (goals.find(candidate => String(candidate.goalId) === goalChoice) ?? defaultGoal);
  const goalName = goal ? goal.name || t("Goal #{id}", { id: String(goal.goalId) }) : null;

  // A filter on a step that is no longer shown would match nothing.
  const activeStepFilters = Object.fromEntries(
    Object.entries(stepFilters).filter(([step, pattern]) => pattern && Number(step) < steps)
  );
  const shape: JourneyShape = { steps, stepFilters: activeStepFilters, endsAt, groupBy };
  const hasPathFilters = Object.keys(activeStepFilters).length > 0 || !!endsAt;
  // Paths cut at an end page stop where the page is reached, not where the session ended.
  const exitsKnown = !endsAt;

  // The goal is part of the request: wait for the goal list rather than ask twice.
  const journeysQuery = useJourneys({
    siteId: siteMetadata?.siteId,
    ...shape,
    limit,
    goalId: goal?.goalId,
    enabled: !isLoadingGoals,
  });
  const previousJourneysQuery = useJourneys({
    siteId: siteMetadata?.siteId,
    ...shape,
    limit: COMPARISON_LIMIT,
    periodTime: "previous",
    enabled: !isLoadingGoals,
  });
  const summaryQuery = useJourneySummary({ goalId: goal?.goalId, enabled: !isLoadingGoals });
  const previousSummaryQuery = useJourneySummary({
    goalId: goal?.goalId,
    periodTime: "previous",
    enabled: !isLoadingGoals,
  });

  const { data: pathsData } = useMetric({ parameter: "pathname", limit: 1000, useFilters: false });
  const pageSuggestions = useMemo(() => {
    const pages: PageSuggestion[] = pathsData?.data?.map(item => ({ value: item.value, count: item.count })) ?? [];
    if (groupBy === "path") return pages;
    // Grouped steps are sections, so that is what a step can be filtered to.
    const sections = new Map<string, number>();
    for (const page of pages) {
      const section = sectionOfPage(page.value);
      sections.set(section, (sections.get(section) ?? 0) + (page.count ?? 0));
    }
    return [...sections].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  }, [pathsData, groupBy]);

  const journeys = journeysQuery.data?.journeys ?? [];
  const totalSessions = journeysQuery.data?.totalSessions ?? 0;
  const isLoading = isLoadingGoals || journeysQuery.isLoading || !siteMetadata;
  const covered = journeys.reduce((total, journey) => total + journey.count, 0);
  const pinnedJourney = journeys.find(journey => pathKey(journey.path) === pinnedKey);
  const exit = exitsKnown && !isLoading ? largestExit(journeys, steps) : null;

  const previousJourneys = previousJourneysQuery.data?.journeys;
  const previousCounts = useMemo(
    () =>
      comparisonEnabled && previousJourneys
        ? new Map(previousJourneys.map(journey => [pathKey(journey.path), journey.count]))
        : null,
    [comparisonEnabled, previousJourneys]
  );

  const summary = summaryQuery.data;
  const overallReach =
    summary && summary.conversions !== null && summary.sessions > 0 ? summary.conversions / summary.sessions : null;

  const togglePin = (path: string[]) => {
    const key = pathKey(path);
    setPinnedKey(current => (current === key ? null : key));
  };
  const setStepFilter = (step: number, pattern: string) => {
    setStepFilters(current => {
      const next = { ...current };
      if (pattern) next[step] = pattern;
      else delete next[step];
      return next;
    });
  };
  const handlers: PathActionHandlers = {
    openSessions: (path, replaysOnly) => {
      const key = pathKey(path);
      const count = journeys.find(journey => pathKey(journey.path) === key)?.count;
      setSessionsTarget({ path, count, replaysOnly });
    },
    // Public and private-link viewers hold no permissions.
    saveAsFunnel: canWriteFunnels && !privateKey ? setFunnelPath : undefined,
  };

  const strong = (chunks: ReactNode) => (
    <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">{chunks}</span>
  );

  return (
    <DisabledOverlay message="User Journeys" featurePath="journeys">
      <div className="mx-auto max-w-[1300px] space-y-3 p-2 md:p-4">
        <SubHeader availableFilters={JOURNEY_PAGE_FILTERS} />

        <JourneyStats
          summary={summary}
          previous={comparisonEnabled ? previousSummaryQuery.data : undefined}
          isLoading={isLoadingGoals || summaryQuery.isLoading}
          goalName={goalName}
        />

        <AnalysisBar>
          <span className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" aria-hidden="true" />
          {goals.length > 0 && (
            <OptionControl
              icon={<Target />}
              label={t("Goal")}
              value={goal ? String(goal.goalId) : NO_GOAL}
              onChange={setGoalChoice}
              options={[
                { value: NO_GOAL, label: t("None") },
                ...goals.map(candidate => ({
                  value: String(candidate.goalId),
                  label: candidate.name || t("Goal #{id}", { id: String(candidate.goalId) }),
                })),
              ]}
            />
          )}
          <OptionControl<JourneyGrouping>
            icon={<FolderTree />}
            label={t("Group pages")}
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: "path", label: t("Exact path") },
              { value: "section", label: t("By section") },
            ]}
          />
        </AnalysisBar>

        {exit && (
          <InsightRow action={<PathActions path={exit.path} handlers={handlers} hideFunnel className="shrink-0" />}>
            {t.rich(
              "<b>{percent}</b> of sessions that start <path></path> end there ({exits} of {sessions}), the largest exit on the paths shown.",
              {
                percent: `${((exit.exits / exit.sessions) * 100).toFixed(1)}%`,
                exits: exit.exits.toLocaleString(),
                sessions: exit.sessions.toLocaleString(),
                b: strong,
                path: () => <PathChips path={exit.path} pageHref={pageHref} className="mx-0.5 align-middle" />,
              }
            )}
          </InsightRow>
        )}

        <Card>
          {journeysQuery.isFetching && !isLoading && <CardLoader />}
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between dark:border-neutral-850">
            <div className="min-w-0">
              <h2 className="font-semibold leading-none tracking-tight">{t("Paths from session start")}</h2>
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {journeys.length > 0 && totalSessions > 0
                  ? t.rich("Top {count} paths cover <b>{covered}</b> of {total} multi-page sessions ({percent})", {
                      count: String(journeys.length),
                      covered: covered.toLocaleString(),
                      total: totalSessions.toLocaleString(),
                      percent: `${((covered / totalSessions) * 100).toFixed(1)}%`,
                      b: chunks => (
                        <span className="tabular-nums text-neutral-700 dark:text-neutral-200">{chunks}</span>
                      ),
                    })
                  : t("The most common page sequences, from the first page of a session")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PagePicker
                icon={<LogIn />}
                label={t("Starts at")}
                value={stepFilters[0] ?? ""}
                onChange={pattern => setStepFilter(0, pattern)}
                suggestions={pageSuggestions}
              />
              <PagePicker
                icon={<LogOut />}
                label={t("Ends at")}
                value={endsAt}
                onChange={setEndsAt}
                suggestions={pageSuggestions}
              />
              <StepsStepper value={steps} onChange={setSteps} min={MIN_STEPS} max={MAX_STEPS} />
              <OptionControl
                label={t("Show")}
                value={String(limit)}
                onChange={value => setLimit(Number(value))}
                options={PATH_LIMITS.map(count => ({
                  value: String(count),
                  label: t("Top {count} paths", { count: String(count) }),
                }))}
              />
            </div>
          </div>

          <div className="px-4 pb-3 pt-3">
            {isLoading ? (
              <SankeySkeleton />
            ) : journeysQuery.error ? (
              <ErrorState
                title={t("Failed to load journeys")}
                message={journeysQuery.error.message}
                refetch={journeysQuery.refetch}
              />
            ) : journeys.length > 0 && siteMetadata?.domain ? (
              <>
                <SankeyDiagram
                  journeys={journeys}
                  steps={steps}
                  maxJourneys={limit}
                  domain={siteMetadata.domain}
                  pinnedPath={pinnedJourney?.path}
                  onPinPath={togglePin}
                  exitsKnown={exitsKnown}
                  pageHref={pageHref}
                  renderStepHeader={({ index, sessions, previousSessions, width }) => (
                    <>
                      <span className="whitespace-nowrap text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        {index === 0
                          ? t("Step {number} · entry", { number: "1" })
                          : t("Step {number}", { number: String(index + 1) })}
                      </span>
                      <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {width < WIDE_STEP_HEADER || sessions === 0
                          ? sessions.toLocaleString()
                          : previousSessions
                            ? t("{count} · {percent} of step {step}", {
                                count: sessions.toLocaleString(),
                                percent: formatShare(sessions / previousSessions),
                                step: String(index),
                              })
                            : t("{count} sessions", { count: sessions.toLocaleString() })}
                      </span>
                      <StepFilterButton
                        step={index + 1}
                        value={stepFilters[index] ?? ""}
                        onChange={pattern => setStepFilter(index, pattern)}
                        suggestions={pageSuggestions}
                      />
                    </>
                  )}
                  overlay={
                    pinnedJourney && (
                      <PinnedPath
                        journey={pinnedJourney}
                        journeys={journeys}
                        goal={goalName ? { name: goalName, overallRate: overallReach, href: siteHref("goals") } : null}
                        pageHref={pageHref}
                        handlers={handlers}
                        onUnpin={() => setPinnedKey(null)}
                      />
                    )
                  }
                />
                <div className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-3 md:flex-row md:items-center md:justify-between dark:border-neutral-850">
                  <ChartLegend
                    className="[--journey-exit:hsl(var(--neutral-400))] dark:[--journey-exit:hsl(var(--neutral-600))]"
                    items={
                      exitsKnown
                        ? [
                            { id: "continued", label: t("Continued to the next step"), color: "hsl(var(--dataviz))" },
                            { id: "ended", label: t("Ended the session there"), color: "var(--journey-exit)" },
                          ]
                        : [{ id: "sessions", label: t("Sessions on the path"), color: "hsl(var(--dataviz))" }]
                    }
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t.rich(
                      "Bar height is sessions on the paths shown. Click a path to pin it; a page name opens it in <link>Pages</link>.",
                      {
                        link: chunks => (
                          <Link
                            href={siteHref("pages")}
                            prefetch={false}
                            className="text-neutral-700 underline decoration-neutral-400 underline-offset-2 dark:text-neutral-200 dark:decoration-neutral-600"
                          >
                            {chunks}
                          </Link>
                        ),
                      }
                    )}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-1 py-6 text-center">
                <Route className="mb-1 h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                <p className="text-sm text-neutral-700 dark:text-neutral-200">
                  {hasPathFilters ? t("No paths match these steps") : t("No journeys in this range")}
                </p>
                <p className="max-w-[380px] text-xs text-neutral-500 dark:text-neutral-400">
                  {hasPathFilters
                    ? t("No session took a path with these start, end and step filters in the selected period.")
                    : t("Journeys map the paths of sessions that visit two or more pages. Try a wider date range.")}
                </p>
                {hasPathFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setStepFilters({});
                      setEndsAt("");
                    }}
                  >
                    {t("Clear path filters")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* With nothing to list, the card above already says so. */}
        {(isLoading || journeys.length > 0) && (
          <TopPaths
            journeys={journeys}
            isLoading={isLoading}
            steps={steps}
            previousCounts={previousCounts}
            goalName={goalName}
            pinnedKey={pinnedJourney ? pinnedKey : null}
            onPin={togglePin}
            pageHref={pageHref}
            handlers={handlers}
          />
        )}
      </div>

      <PathSessionsSheet target={sessionsTarget} shape={shape} onClose={() => setSessionsTarget(null)} />
      <SaveAsFunnelDialog path={funnelPath} onClose={() => setFunnelPath(null)} />
    </DisabledOverlay>
  );
}
