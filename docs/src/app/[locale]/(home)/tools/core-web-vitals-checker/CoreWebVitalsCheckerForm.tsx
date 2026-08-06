"use client";

import { AlertCircle, CheckCircle2, ExternalLink, Gauge, Monitor, Smartphone } from "lucide-react";
import { FormEvent, useState } from "react";

type Rating = "good" | "needs-improvement" | "poor";
type Metric = {
  key: string;
  label: string;
  value: number;
  unit: "ms" | "score";
  rating: Rating;
  displayValue?: string;
};

interface VitalsResult {
  finalUrl: string;
  strategy: "mobile" | "desktop";
  analyzedAt: string;
  lighthouseVersion?: string;
  performanceScore: number | null;
  field: {
    scope: "url" | "origin" | null;
    id?: string;
    assessment: "passed" | "failed" | "unavailable";
    metrics: Metric[];
  };
  lab: {
    metrics: Metric[];
    opportunities: Array<{ id: string; title: string; displayValue?: string; savingsMs: number }>;
  };
  warnings: string[];
}

const ratingStyles: Record<Rating, string> = {
  good: "bg-emerald-500",
  "needs-improvement": "bg-amber-500",
  poor: "bg-red-500",
};

const ratingLabels: Record<Rating, string> = {
  good: "Good",
  "needs-improvement": "Needs improvement",
  poor: "Poor",
};

function formatMetric(metric: Metric) {
  if (metric.unit === "score") return metric.value.toFixed(metric.key === "cls" ? 2 : 1);
  if (metric.value >= 1000) return `${(metric.value / 1000).toFixed(1)} s`;
  return `${Math.round(metric.value)} ms`;
}

function MetricRows({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {metrics.map(metric => (
        <div key={metric.key} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{metric.label}</p>
          <p className="text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50">
            {formatMetric(metric)}
          </p>
          <p className="flex min-w-32 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <span className={`size-2 rounded-full ${ratingStyles[metric.rating]}`} aria-hidden="true" />
            {ratingLabels[metric.rating]}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CoreWebVitalsCheckerForm() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [result, setResult] = useState<VitalsResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function checkVitals(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      setError("Enter a complete public URL beginning with http:// or https://.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/tools/core-web-vitals-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, strategy }),
      });
      const data = (await response.json()) as VitalsResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "The performance check could not be completed.");
      setResult(data);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "The performance check could not be completed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={checkVitals} className="space-y-4">
        <div>
          <label htmlFor="vitals-url" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Public page URL
          </label>
          <input
            id="vitals-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://example.com"
            disabled={isLoading}
            className="w-full border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-900 dark:text-white">Test profile</legend>
          <div className="flex gap-2">
            {(["mobile", "desktop"] as const).map(option => {
              const selected = strategy === option;
              const Icon = option === "mobile" ? Smartphone : Monitor;
              return (
                <label
                  key={option}
                  className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 border px-3 text-sm font-medium transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-neutral-950 ${
                    selected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={option}
                    checked={selected}
                    onChange={() => setStrategy(option)}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="capitalize">{option}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="inline-flex w-full items-center justify-center gap-2 bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-400 dark:disabled:bg-neutral-700"
        >
          <Gauge className="size-4" aria-hidden="true" />
          {isLoading ? "Running PageSpeed test…" : "Check Core Web Vitals"}
        </button>
        <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
          A Lighthouse run can take up to a minute. Field data appears only when Chrome has enough real-user samples.
        </p>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="border-y border-neutral-200 py-5 dark:border-neutral-800">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            PageSpeed Insights is testing the page…
          </p>
          <div className="mt-4 space-y-3" aria-hidden="true">
            <div className="h-3 w-4/5 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-3/5 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-2/3 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-7" aria-live="polite">
          <div className="border-y border-neutral-200 py-5 dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                  {result.strategy === "mobile" ? "Mobile" : "Desktop"} performance report
                </p>
                <a
                  href={result.finalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex max-w-xl items-center gap-1.5 truncate text-sm text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <span className="truncate">{result.finalUrl}</span>
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
              {result.performanceScore !== null && (
                <div className="flex items-baseline gap-2 text-right">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Lighthouse performance</span>
                  <span className="text-xl font-semibold tabular-nums text-neutral-950 dark:text-neutral-50">
                    {result.performanceScore}/100
                  </span>
                </div>
              )}
            </div>
          </div>

          <section aria-labelledby="field-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="field-heading" className="font-semibold text-neutral-950 dark:text-neutral-50">
                  Field data
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  75th-percentile Chrome user experience
                  {result.field.scope === "origin"
                    ? " · origin fallback"
                    : result.field.scope === "url"
                      ? " · this URL"
                      : " · no public sample"}
                </p>
              </div>
              {result.field.assessment !== "unavailable" && (
                <span className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {result.field.assessment === "passed" ? (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="size-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                  )}
                  Core Web Vitals {result.field.assessment}
                </span>
              )}
            </div>
            {result.field.metrics.length > 0 ? (
              <div className="mt-3">
                <MetricRows metrics={result.field.metrics} />
              </div>
            ) : (
              <div className="mt-3 border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Not enough field data</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                  Chrome does not have a sufficient public sample for this URL or origin. The lab test below is still
                  available.
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="lab-heading">
            <h3 id="lab-heading" className="font-semibold text-neutral-950 dark:text-neutral-50">
              Lighthouse lab data
            </h3>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              One simulated load under controlled conditions. INP needs real interactions, so it is not included in this
              lab run.
            </p>
            <div className="mt-3">
              <MetricRows metrics={result.lab.metrics} />
            </div>
          </section>

          {result.lab.opportunities.length > 0 && (
            <section aria-labelledby="opportunities-heading">
              <h3 id="opportunities-heading" className="font-semibold text-neutral-950 dark:text-neutral-50">
                Largest opportunities
              </h3>
              <div className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {result.lab.opportunities.map(opportunity => (
                  <div key={opportunity.id} className="flex items-start justify-between gap-5 py-3">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">{opportunity.title}</p>
                    <p className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {opportunity.displayValue || `Save ~${Math.round(opportunity.savingsMs)} ms`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.warnings.length > 0 && (
            <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-amber-950 dark:text-amber-100">Run notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-900 dark:text-amber-200">
                  {result.warnings.map(warning => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
