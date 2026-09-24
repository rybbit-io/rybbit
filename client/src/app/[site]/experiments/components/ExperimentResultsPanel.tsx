"use client";

import type { Experiment, ExperimentVariantResult } from "@/api/analytics/endpoints";
import { useExperimentResults } from "@/api/analytics/hooks/experiments/useExperiments";
import { cn } from "@/lib/utils";
import { Info, Target, TrendingUp, Trophy } from "lucide-react";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";
import {
  formatCompactNumber,
  formatPercent,
  getControlResult,
  getLeadingResult,
  getVariantConfidence,
  getVariantKeys,
} from "../lib/experimentHelpers";

type VariantTone = "winner" | "leading" | "control" | "variant";

function VariantTag({ tone, children }: { tone: VariantTone; children: ReactNode }) {
  const icon =
    tone === "winner" ? <Trophy className="h-3 w-3" /> : tone === "leading" ? <TrendingUp className="h-3 w-3" /> : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        tone === "winner" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        tone === "leading" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        tone === "control" && "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
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
  liftConfidence,
}: {
  result: ExperimentVariantResult;
  tone: VariantTone;
  widthPercent: number;
  liftConfidence: string | null;
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
            {tone === "winner" && <VariantTag tone="winner">{t("Winner")}</VariantTag>}
            {tone === "leading" && <VariantTag tone="leading">{t("Leading")}</VariantTag>}
            {tone === "control" && <VariantTag tone="control">{t("Control")}</VariantTag>}
          </div>
          <div className="mt-1 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {t("{sessions} sessions · {conversions} conv.", {
              sessions: formatCompactNumber(result.sessions),
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
          ) : (
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
          {liftConfidence && (
            <div className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{liftConfidence}</div>
          )}
        </div>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-neutral-150 dark:bg-neutral-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "control"
              ? "bg-neutral-400 dark:bg-neutral-600"
              : emphasized
                ? "bg-accent-500"
                : "bg-accent-500/45"
          )}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

export function ExperimentResultsPanel({ experiment }: { experiment: Experiment }) {
  const t = useExtracted();
  const { data, isLoading } = useExperimentResults(experiment.experimentId, !!experiment.primaryGoalId);
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
      sessions: 0,
      exposures: 0,
      conversions: 0,
      conversionRate: 0,
      lift: null,
      isControl: variant === "control",
    }));

  const control = getControlResult(results);
  const leader = getLeadingResult(results);
  const leaderConfidence = leader && !leader.isControl ? getVariantConfidence(control, leader) : null;
  const maxRate = Math.max(...results.map(result => result.conversionRate), 0);
  const totalSessions = data?.totalExposureSessions ?? results.reduce((sum, result) => sum + result.sessions, 0);
  const totalConversions = data?.totalConversions ?? results.reduce((sum, result) => sum + result.conversions, 0);
  const measurement = data?.measurement ?? "exposure";

  const officialWinner = experiment.winningVariant || null;
  const isLeaderSignificant = !!leader && !!leaderConfidence?.isSignificant;

  const toneFor = (result: ExperimentVariantResult): VariantTone => {
    if (officialWinner && result.variant === officialWinner) return "winner";
    if (!officialWinner && isLeaderSignificant && leader && result.variant === leader.variant) return "leading";
    if (result.isControl) return "control";
    return "variant";
  };

  const verdict: { tone: "win" | "neutral"; icon: ReactNode; label: string } = officialWinner
    ? {
        tone: "win",
        icon: <Trophy className="h-3.5 w-3.5" />,
        label: t("Winner: {variant}", { variant: officialWinner }),
      }
    : totalConversions === 0
      ? { tone: "neutral", icon: null, label: t("No conversions yet") }
      : isLeaderSignificant && leader
        ? {
            tone: "win",
            icon: <TrendingUp className="h-3.5 w-3.5" />,
            label: t("{variant} leading", { variant: leader.variant }),
          }
        : {
            tone: "neutral",
            icon: null,
            label: experiment.status === "completed" ? t("No clear winner") : t("Gathering data"),
          };

  return (
    <div className="grid gap-2.5">
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
          {t("{sessions} sessions · {conversions} conversions", {
            sessions: formatCompactNumber(totalSessions),
            conversions: formatCompactNumber(totalConversions),
          })}
        </span>
      </div>

      <div className="grid gap-2">
        {results.map(result => {
          const tone = toneFor(result);
          const widthPercent =
            result.conversionRate <= 0 || maxRate <= 0 ? 0 : Math.max(3, (result.conversionRate / maxRate) * 100);
          const confidence = result.isControl ? null : getVariantConfidence(control, result);
          const liftConfidence = result.isControl
            ? null
            : confidence
              ? confidence.isSignificant
                ? t("{confidence}% confidence", { confidence: (confidence.confidence * 100).toFixed(0) })
                : t("Not yet significant")
              : result.conversions > 0
                ? t("Gathering data")
                : null;

          return (
            <VariantResultRow
              key={result.variant}
              result={result}
              tone={tone}
              widthPercent={widthPercent}
              liftConfidence={liftConfidence}
            />
          );
        })}
      </div>

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
