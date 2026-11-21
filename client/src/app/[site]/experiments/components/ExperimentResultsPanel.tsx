"use client";

import type { VariantStats } from "@rybbit/shared";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

import type {
  Experiment,
  ExperimentVariantResult,
  ExperimentWindow,
  ExperimentWindowMode,
} from "@/api/analytics/endpoints";
import { useExperimentResults, useExperimentTimeseries } from "@/api/analytics/hooks/experiments/useExperiments";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { Badge } from "@/components/ui/badge";
import { useTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  formatBoundedPercent,
  formatCompactNumber,
  formatPercent,
  getExperimentVerdict,
  getVariantKeys,
  MIN_CONVERSIONS,
  MIN_UNITS_PER_VARIANT,
} from "../lib/experimentHelpers";
import { ExperimentConversionChart, getVariantColor, hasTrend } from "./ExperimentConversionChart";

const formatSignedPercent = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

function LiftIntervalBar({ interval, lift, domain }: { interval: [number, number]; lift: number; domain: number }) {
  const toPercent = (value: number) => ((Math.max(-domain, Math.min(domain, value)) + domain) / (2 * domain)) * 100;
  const left = toPercent(interval[0]);
  const right = toPercent(interval[1]);

  return (
    <div className="relative h-3 w-40 shrink-0">
      <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-200 dark:bg-neutral-800" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-300 dark:bg-neutral-700" />
      <div
        className={cn(
          "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full",
          interval[0] > 0
            ? "bg-emerald-500/70"
            : interval[1] < 0
              ? "bg-red-500/70"
              : "bg-neutral-400/70 dark:bg-neutral-500/70"
        )}
        style={{ left: `${left}%`, width: `${Math.max(right - left, 0.5)}%` }}
      />
      <div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-neutral-50"
        style={{ left: `${toPercent(lift)}%` }}
      />
    </div>
  );
}

type VariantTone = "winner" | "leading" | "rolledOut" | "control" | "variant";

function formatWindowInstant(value: string, timeZone: string) {
  return DateTime.fromSQL(value, { zone: "utc" }).setZone(timeZone).toFormat("MMM d, HH:mm");
}

function WindowSwitch({
  mode,
  window,
  totals,
  showSwitch,
  onChange,
}: {
  mode: ExperimentWindowMode;
  window: ExperimentWindow | undefined;
  totals: string;
  /** Only a started experiment has a run to switch to. */
  showSwitch: boolean;
  onChange: (mode: ExperimentWindowMode) => void;
}) {
  const t = useExtracted();
  const timeZone = useTimezone();
  const options: { value: ExperimentWindowMode; label: string }[] = [
    { value: "experiment", label: t("Experiment run") },
    { value: "range", label: t("Date filter") },
  ];

  const description =
    window?.mode === "experiment" && window.start
      ? window.end
        ? `${formatWindowInstant(window.start, timeZone)} – ${formatWindowInstant(window.end, timeZone)}`
        : t("Since {start}", { start: formatWindowInstant(window.start, timeZone) })
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      {totals && <span className="tabular-nums">{totals}</span>}
      {description && <span className="tabular-nums">{description}</span>}
      {showSwitch && (
        <SegmentedControl<ExperimentWindowMode>
          aria-label={t("Time Window")}
          size="sm"
          options={options}
          value={mode}
          onValueChange={onChange}
        />
      )}
    </div>
  );
}

const NUMERIC_CELL = "px-3 py-2.5 text-right tabular-nums";
const HEADER_CELL = "h-8 whitespace-nowrap px-3 font-medium";

function VariantResultRow({
  result,
  tone,
  stats,
  liftDomain,
  controlRate,
  showStats,
  color,
}: {
  result: ExperimentVariantResult;
  tone: VariantTone;
  stats: VariantStats | null;
  liftDomain: number;
  controlRate: number;
  /** The lift, chance and risk columns exist only once there is enough data to compare. */
  showStats: boolean;
  /** The variant's line in the chart below, when there is one. */
  color: string | null;
}) {
  const t = useExtracted();
  // Color means the interval has cleared zero, not just that the point estimate has a sign.
  const liftTone = !stats
    ? "text-neutral-500 dark:text-neutral-400"
    : stats.liftInterval[0] > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : stats.liftInterval[1] < 0
        ? "text-red-600 dark:text-red-400"
        : "text-neutral-900 dark:text-neutral-100";

  return (
    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-850">
      <td className="py-2.5 pl-0 pr-3">
        <div className="flex items-center gap-2">
          {color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
          <span className="truncate font-mono text-neutral-900 dark:text-neutral-50">{result.variant}</span>
          {result.isControl && <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("Control")}</span>}
          {tone === "winner" && <Badge variant="success">{t("Winner")}</Badge>}
          {tone === "leading" && <Badge variant="success">{t("Winning")}</Badge>}
          {tone === "rolledOut" && <Badge variant="secondary">{t("Rolled out")}</Badge>}
        </div>
      </td>
      <td className={NUMERIC_CELL}>{formatCompactNumber(result.units)}</td>
      <td className={NUMERIC_CELL}>{formatCompactNumber(result.conversions)}</td>
      <td className={cn(NUMERIC_CELL, "font-medium text-neutral-900 dark:text-neutral-50")}>
        {formatPercent(result.conversionRate)}
      </td>
      {showStats && (
        <>
          <td className="px-3 py-2.5">
            {result.isControl ? (
              <span className="text-neutral-500 dark:text-neutral-400">{t("Baseline")}</span>
            ) : stats ? (
              <div className="flex items-center gap-3">
                <span className={cn("w-16 shrink-0 text-right font-medium tabular-nums", liftTone)}>
                  {result.lift === null ? "-" : `${result.lift >= 0 ? "+" : ""}${formatPercent(result.lift)}`}
                </span>
                <LiftIntervalBar interval={stats.liftInterval} lift={stats.lift} domain={liftDomain} />
                <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  {formatSignedPercent(stats.liftInterval[0])} … {formatSignedPercent(stats.liftInterval[1])}
                </span>
              </div>
            ) : (
              <span className="text-neutral-400 dark:text-neutral-500">-</span>
            )}
          </td>
          <td className={NUMERIC_CELL}>{stats ? `${formatBoundedPercent(stats.chanceToBeatControl, 1)}%` : ""}</td>
          <td className={cn(NUMERIC_CELL, "pr-0")}>
            {stats ? `${formatBoundedPercent(controlRate > 0 ? stats.riskVariant / controlRate : 0, 2)}%` : ""}
          </td>
        </>
      )}
    </tr>
  );
}

export function ExperimentResultsPanel({ experiment }: { experiment: Experiment }) {
  const t = useExtracted();
  const [windowMode, setWindowMode] = useState<ExperimentWindowMode>("experiment");
  const effectiveMode: ExperimentWindowMode = experiment.startedAt ? windowMode : "range";
  const { data, isLoading } = useExperimentResults(experiment.experimentId, !!experiment.primaryGoalId, effectiveMode);
  const { data: timeseries } = useExperimentTimeseries(
    experiment.experimentId,
    !!experiment.primaryGoalId,
    effectiveMode
  );
  const fallbackVariants = getVariantKeys(experiment);

  if (!experiment.primaryGoalId) {
    return (
      <div className="grid gap-0.5">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{t("No goal connected")}</div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {t("Add a primary goal to measure conversions for each variant.")}
        </div>
      </div>
    );
  }

  if (isLoading) return <ResultsSkeleton />;

  const results =
    data?.variants ||
    fallbackVariants.map(variant => ({
      variant,
      units: 0,
      sessions: 0,
      exposures: 0,
      conversions: 0,
      conversionRate: 0,
      lift: null,
      isControl: variant === "control",
    }));

  const { control, enoughData, statsByVariant, comparisons, weights, srm, leader, remainingUnits } =
    getExperimentVerdict(experiment, results);

  const liftDomain = Math.min(
    1,
    Math.max(0.05, ...comparisons.flatMap(({ stats }) => stats.liftInterval.map(value => Math.abs(value))))
  );
  const controlRate = control?.conversionRate ?? 0;

  const formatSplit = (values: number[]) => {
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    return values.map(value => `${((value / total) * 100).toFixed(1)}%`).join(" / ");
  };
  const totalUnits = data?.totalUnits ?? results.reduce((sum, result) => sum + result.units, 0);
  const totalConversions = data?.totalConversions ?? results.reduce((sum, result) => sum + result.conversions, 0);
  const measurement = data?.measurement ?? "exposure";

  const rolledOut = experiment.winningVariant || null;
  const confirmedWinner = !!rolledOut && leader?.variant === rolledOut;

  const toneFor = (result: ExperimentVariantResult): VariantTone => {
    if (rolledOut && result.variant === rolledOut) return confirmedWinner ? "winner" : "rolledOut";
    if (!rolledOut && leader && result.variant === leader.variant) return "leading";
    if (result.isControl) return "control";
    return "variant";
  };

  const verdict: { tone: "win" | "neutral"; label: string; detail?: string } = rolledOut
    ? confirmedWinner
      ? { tone: "win", label: t("Winner: {variant}", { variant: rolledOut }) }
      : {
          tone: "neutral",
          label: t("Rolled out: {variant}", { variant: rolledOut }),
          detail: leader
            ? t("{variant} was ahead when the experiment ended.", { variant: leader.variant })
            : enoughData
              ? t("The results didn't show a clear winner.")
              : t("There wasn't enough data to pick a winner."),
        }
    : !enoughData
      ? {
          tone: "neutral",
          label: t("Not enough data yet"),
          detail: t(
            "Results appear once every variant has {visitors} visitors and there are {conversions} conversions.",
            {
              visitors: String(MIN_UNITS_PER_VARIANT),
              conversions: String(MIN_CONVERSIONS),
            }
          ),
        }
      : leader
        ? {
            tone: "win",
            label: t("{variant} wins", { variant: leader.variant }),
            detail:
              experiment.status === "completed"
                ? undefined
                : leader.isControl
                  ? t("Every variant does worse than control. Complete the experiment to keep control.")
                  : t("Ready to call. Complete the experiment to roll it out."),
          }
        : experiment.status === "completed"
          ? { tone: "neutral", label: t("No clear winner") }
          : {
              tone: "neutral",
              label: t("Gathering data"),
              detail:
                remainingUnits !== null
                  ? t("If the current difference holds, about {visitors} more visitors are needed to call it.", {
                      visitors: formatCompactNumber(Number(remainingUnits.toPrecision(2))),
                    })
                  : t("No clear difference between the variants yet."),
            };

  const showChart = enoughData && !!timeseries && hasTrend(timeseries);
  const variantKeys = results.map(result => result.variant);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="grid gap-0.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {verdict.tone === "win" && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            )}
            {verdict.label}
          </div>
          {verdict.detail && <p className="text-sm text-neutral-500 dark:text-neutral-400">{verdict.detail}</p>}
        </div>
        <WindowSwitch
          mode={windowMode}
          window={data?.window}
          showSwitch={!!experiment.startedAt}
          totals={t("{visitors} visitors · {conversions} conversions", {
            visitors: formatCompactNumber(totalUnits),
            conversions: formatCompactNumber(totalConversions),
          })}
          onChange={setWindowMode}
        />
      </div>

      {srm?.mismatch && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium">{t("Sample ratio mismatch.")}</span>{" "}
            {t(
              "Visitors split {observed} across variants, but the flag is set to {expected} (p = {pValue}). Assignment or exposure tracking is likely broken, so these results can't be trusted yet.",
              {
                observed: formatSplit(results.map(result => result.units)),
                expected: formatSplit(results.map(result => weights?.[result.variant] ?? 0)),
                pValue: srm.pValue < 0.0001 ? "<0.0001" : srm.pValue.toFixed(4),
              }
            )}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        {/* With no comparison columns there is nothing to fill the width, so the table stays compact. */}
        <table
          className={cn("text-left text-sm text-neutral-700 dark:text-neutral-200", enoughData ? "w-full" : "min-w-96")}
        >
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500 dark:border-neutral-850 dark:text-neutral-400">
              <th scope="col" className={cn(HEADER_CELL, "min-w-44 pl-0")}>
                {t("Variant")}
              </th>
              <th scope="col" className={cn(HEADER_CELL, "text-right")}>
                {t("Visitors")}
              </th>
              <th scope="col" className={cn(HEADER_CELL, "text-right")}>
                {t("Conversions")}
              </th>
              <th scope="col" className={cn(HEADER_CELL, "text-right")}>
                {t("Rate")}
              </th>
              {enoughData && (
                <>
                  <th scope="col" className={HEADER_CELL}>
                    {t("Lift")}
                  </th>
                  <th scope="col" className={cn(HEADER_CELL, "text-right")}>
                    {t("Chance to beat control")}
                  </th>
                  <th scope="col" className={cn(HEADER_CELL, "pr-0 text-right")}>
                    {t("Risk")}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map(result => (
              <VariantResultRow
                key={result.variant}
                result={result}
                tone={toneFor(result)}
                stats={statsByVariant.get(result.variant) ?? null}
                liftDomain={liftDomain}
                controlRate={controlRate}
                showStats={enoughData}
                color={showChart ? getVariantColor(result.variant, variantKeys, control?.variant) : null}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showChart && (
        <div className="border-t border-neutral-100 pt-3 dark:border-neutral-850">
          <ExperimentConversionChart data={timeseries} variants={variantKeys} controlVariant={control?.variant} />
        </div>
      )}

      {measurement === "assignment" && (
        <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {t(
              'Showing assigned visitors. Call rybbit.flag("{flagKey}") where the variant renders to measure visitors actually exposed to it.',
              { flagKey: experiment.featureFlag.key }
            )}
          </span>
        </p>
      )}
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="h-5 w-40 rounded bg-neutral-100 dark:bg-neutral-850" />
      <div className="grid">
        {[0, 1, 2].map(index => (
          <div
            key={index}
            className="flex h-10 items-center justify-between border-b border-neutral-100 last:border-0 dark:border-neutral-850"
          >
            <div className="h-4 w-28 rounded bg-neutral-100 dark:bg-neutral-850" />
            <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-850" />
          </div>
        ))}
      </div>
    </div>
  );
}
