"use client";

import type { VariantStats } from "@rybbit/shared";
import { AlertTriangle, CheckCircle2, Info, Rocket, Target, TrendingUp, Trophy } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { type ReactNode, useState } from "react";

import type { Experiment, ExperimentVariantResult, ExperimentWindow, ExperimentWindowMode } from "@/api/analytics/endpoints";
import { useExperimentResults, useExperimentTimeseries } from "@/api/analytics/hooks/experiments/useExperiments";
import { useTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  formatCompactNumber,
  formatPercent,
  getExperimentVerdict,
  getVariantKeys,
  MIN_CONVERSIONS,
  MIN_UNITS_PER_VARIANT,
} from "../lib/experimentHelpers";
import { ExperimentConversionChart, hasTrend } from "./ExperimentConversionChart";

const formatSignedPercent = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

function formatBoundedPercent(value: number, digits: number) {
  const floor = 10 ** -digits;
  const percent = value * 100;
  if (percent > 0 && percent < floor) return `<${floor.toFixed(digits)}`;
  if (percent < 100 && percent > 100 - floor) return `>${(100 - floor).toFixed(digits)}`;
  return percent.toFixed(digits);
}

function LiftIntervalBar({ interval, lift, domain }: { interval: [number, number]; lift: number; domain: number }) {
  const toPercent = (value: number) => ((Math.max(-domain, Math.min(domain, value)) + domain) / (2 * domain)) * 100;
  const left = toPercent(interval[0]);
  const right = toPercent(interval[1]);

  return (
    <div className="relative h-3 flex-1">
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
  onChange,
}: {
  mode: ExperimentWindowMode;
  window: ExperimentWindow | undefined;
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
    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      {description && <span className="tabular-nums">{description}</span>}
      <div role="radiogroup" className="inline-flex rounded-md border border-neutral-150 p-0.5 dark:border-neutral-800">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-2 py-0.5 transition-colors",
              mode === option.value
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                : "hover:text-neutral-700 dark:hover:text-neutral-200"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function VariantTag({ tone, children }: { tone: VariantTone; children: ReactNode }) {
  const icon =
    tone === "winner" ? (
      <Trophy className="h-3 w-3" />
    ) : tone === "leading" ? (
      <TrendingUp className="h-3 w-3" />
    ) : tone === "rolledOut" ? (
      <Rocket className="h-3 w-3" />
    ) : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        tone === "winner" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        tone === "leading" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        (tone === "control" || tone === "rolledOut") &&
          "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function VariantResultRow({
  result,
  tone,
  widthPercent,
  stats,
  liftDomain,
  controlRate,
  showLift,
}: {
  result: ExperimentVariantResult;
  tone: VariantTone;
  widthPercent: number;
  stats: VariantStats | null;
  liftDomain: number;
  controlRate: number;
  showLift: boolean;
}) {
  const t = useExtracted();
  const emphasized = tone === "winner" || tone === "leading";

  return (
    <div
      className={cn(
        "rounded-md border p-3 transition-colors",
        emphasized
          ? "border-emerald-500/30 bg-emerald-500/[0.04] dark:border-emerald-500/25 dark:bg-emerald-500/[0.07]"
          : "border-neutral-100 bg-neutral-50/60 dark:border-neutral-850 dark:bg-neutral-950/40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-sm text-neutral-900 dark:text-neutral-50">{result.variant}</span>
            {result.isControl && <VariantTag tone="control">{t("Control")}</VariantTag>}
            {tone === "winner" && <VariantTag tone="winner">{t("Winner")}</VariantTag>}
            {tone === "leading" && <VariantTag tone="leading">{t("Winning")}</VariantTag>}
            {tone === "rolledOut" && <VariantTag tone="rolledOut">{t("Rolled out")}</VariantTag>}
          </div>
          <div className="mt-1 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {t("{visitors} visitors · {conversions} conv.", {
              visitors: formatCompactNumber(result.units),
              conversions: formatCompactNumber(result.conversions),
            })}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold tabular-nums leading-none text-neutral-900 dark:text-neutral-50">
            {formatPercent(result.conversionRate)}
          </div>
          {result.isControl ? (
            <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{t("Baseline")}</div>
          ) : !showLift ? null : (
            <div
              className={cn(
                "mt-1 text-xs font-medium tabular-nums",
                result.lift === null
                  ? "text-neutral-400 dark:text-neutral-500"
                  : result.lift >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
              )}
            >
              {result.lift === null ? "—" : `${result.lift >= 0 ? "+" : ""}${formatPercent(result.lift)}`}
            </div>
          )}
          {stats && (
            <div className="mt-0.5 text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
              {t("{chance}% chance to beat control", { chance: formatBoundedPercent(stats.chanceToBeatControl, 1) })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-neutral-150 dark:bg-neutral-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            result.isControl
              ? "bg-neutral-400 dark:bg-neutral-600"
              : emphasized
                ? "bg-accent-500"
                : "bg-accent-500/45"
          )}
          style={{ width: `${widthPercent}%` }}
        />
      </div>

      {stats && (
        <div className="mt-2.5 flex items-center gap-3 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
          <span className="w-8 shrink-0">{t("Lift")}</span>
          <LiftIntervalBar interval={stats.liftInterval} lift={stats.lift} domain={liftDomain} />
          <span className="w-32 shrink-0 whitespace-nowrap text-right">
            {formatSignedPercent(stats.liftInterval[0])} … {formatSignedPercent(stats.liftInterval[1])}
          </span>
          <span className="w-20 shrink-0 text-right">
            {t("Risk {risk}", { risk: `${formatBoundedPercent(controlRate > 0 ? stats.riskVariant / controlRate : 0, 2)}%` })}
          </span>
        </div>
      )}
    </div>
  );
}

export function ExperimentResultsPanel({ experiment }: { experiment: Experiment }) {
  const t = useExtracted();
  const [windowMode, setWindowMode] = useState<ExperimentWindowMode>("experiment");
  const effectiveMode: ExperimentWindowMode = experiment.startedAt ? windowMode : "range";
  const { data, isLoading } = useExperimentResults(experiment.experimentId, !!experiment.primaryGoalId, effectiveMode);
  const { data: timeseries } = useExperimentTimeseries(experiment.experimentId, !!experiment.primaryGoalId, effectiveMode);
  const fallbackVariants = getVariantKeys(experiment);

  if (!experiment.primaryGoalId) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-neutral-200 px-4 py-3.5 dark:border-neutral-800">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400">
          <Target className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{t("No goal connected")}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("Add a primary goal to measure conversions for each variant.")}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-2">
        {[0, 1].map(index => (
          <div
            key={index}
            className="rounded-md border border-neutral-100 bg-neutral-50/60 p-3 dark:border-neutral-850 dark:bg-neutral-950/40"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-neutral-100 dark:bg-neutral-850" />
              <div className="h-5 w-12 rounded bg-neutral-100 dark:bg-neutral-850" />
            </div>
            <div className="mt-3 h-2 rounded-full bg-neutral-100 dark:bg-neutral-850" />
          </div>
        ))}
      </div>
    );
  }

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
  const maxRate = Math.max(...results.map(result => result.conversionRate), 0);
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

  const verdict: { tone: "win" | "neutral"; icon: ReactNode; label: string; detail?: string } = rolledOut
    ? confirmedWinner
      ? { tone: "win", icon: <Trophy className="h-3.5 w-3.5" />, label: t("Winner: {variant}", { variant: rolledOut }) }
      : {
          tone: "neutral",
          icon: <Rocket className="h-3.5 w-3.5" />,
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
          icon: null,
          label: t("Not enough data yet"),
          detail: t("Results appear once every variant has {visitors} visitors and there are {conversions} conversions.", {
            visitors: String(MIN_UNITS_PER_VARIANT),
            conversions: String(MIN_CONVERSIONS),
          }),
        }
      : leader
        ? {
            tone: "win",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            label: t("{variant} wins", { variant: leader.variant }),
            detail:
              experiment.status === "completed"
                ? undefined
                : leader.isControl
                  ? t("Every variant does worse than control. Complete the experiment to keep control.")
                  : t("Ready to call. Complete the experiment to roll it out."),
          }
        : experiment.status === "completed"
          ? { tone: "neutral", icon: null, label: t("No clear winner") }
          : {
              tone: "neutral",
              icon: null,
              label: t("Gathering data"),
              detail:
                remainingUnits !== null
                  ? t("If the current difference holds, about {visitors} more visitors are needed to call it.", {
                      visitors: formatCompactNumber(Number(remainingUnits.toPrecision(2))),
                    })
                  : t("No clear difference between the variants yet."),
            };

  return (
    <div className="grid gap-2.5">
      {experiment.startedAt && (
        <div className="flex justify-end">
          <WindowSwitch mode={windowMode} window={data?.window} onChange={setWindowMode} />
        </div>
      )}

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

      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
            verdict.tone === "win"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-850 dark:text-neutral-300"
          )}
        >
          {verdict.icon}
          {verdict.label}
        </span>
        <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
          {t("{visitors} visitors · {conversions} conversions", {
            visitors: formatCompactNumber(totalUnits),
            conversions: formatCompactNumber(totalConversions),
          })}
        </span>
      </div>
      {verdict.detail && <p className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">{verdict.detail}</p>}

      <div className="grid gap-2">
        {results.map(result => {
          const tone = toneFor(result);
          const widthPercent =
            result.conversionRate <= 0 || maxRate <= 0 ? 0 : Math.max(3, (result.conversionRate / maxRate) * 100);

          return (
            <VariantResultRow
              key={result.variant}
              result={result}
              tone={tone}
              widthPercent={widthPercent}
              stats={statsByVariant.get(result.variant) ?? null}
              liftDomain={liftDomain}
              controlRate={controlRate}
              showLift={enoughData}
            />
          );
        })}
      </div>

      {enoughData && timeseries && hasTrend(timeseries) && (
        <div className="rounded-md border border-neutral-100 p-3 dark:border-neutral-850">
          <ExperimentConversionChart
            data={timeseries}
            variants={results.map(result => result.variant)}
            controlVariant={control?.variant}
          />
        </div>
      )}

      {measurement === "assignment" && (
        <div className="flex items-start gap-2 rounded-md border border-neutral-100 bg-neutral-50/60 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-850 dark:bg-neutral-950/40 dark:text-neutral-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t(
              'Showing assigned visitors. Call rybbit.flag("{flagKey}") where the variant renders to measure visitors actually exposed to it.',
              { flagKey: experiment.featureFlag.key }
            )}
          </span>
        </div>
      )}
    </div>
  );
}
