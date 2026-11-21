"use client";

import { useMemo, useState } from "react";

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function parseCount(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function NPSCalculatorForm() {
  const [promoters, setPromoters] = useState("");
  const [passives, setPassives] = useState("");
  const [detractors, setDetractors] = useState("");

  const result = useMemo(() => {
    const counts = [parseCount(promoters), parseCount(passives), parseCount(detractors)];
    if (counts.some(count => count === null)) {
      return { error: "Enter whole numbers of zero or more for every response group.", metrics: null };
    }

    const [promoterCount, passiveCount, detractorCount] = counts as number[];
    const total = promoterCount + passiveCount + detractorCount;

    if (!Number.isFinite(total)) {
      return { error: "The combined response count is too large to calculate safely.", metrics: null };
    }
    if (total === 0) return { error: null, metrics: null };

    const promoterShare = (promoterCount / total) * 100;
    const passiveShare = (passiveCount / total) * 100;
    const detractorShare = (detractorCount / total) * 100;

    return {
      error: null,
      metrics: {
        total,
        score: promoterShare - detractorShare,
        promoterShare,
        passiveShare,
        detractorShare,
      },
    };
  }, [detractors, passives, promoters]);

  const clearForm = () => {
    setPromoters("");
    setPassives("");
    setDetractors("");
  };

  const scoreMessage = result.metrics
    ? result.metrics.score > 0
      ? "Your survey has more promoters than detractors."
      : result.metrics.score < 0
        ? "Your survey has more detractors than promoters."
        : "Your promoter and detractor shares are equal."
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CountField
          id="promoters"
          label="Promoters (9–10)"
          value={promoters}
          onChange={setPromoters}
          hint="Responses most likely to recommend"
        />
        <CountField
          id="passives"
          label="Passives (7–8)"
          value={passives}
          onChange={setPassives}
          hint="Satisfied but neutral responses"
        />
        <CountField
          id="detractors"
          label="Detractors (0–6)"
          value={detractors}
          onChange={setDetractors}
          hint="Responses unlikely to recommend"
        />
      </div>

      {result.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {result.error}
        </div>
      )}

      {result.metrics && (
        <section
          aria-label="NPS calculation results"
          aria-live="polite"
          className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Net Promoter Score</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {result.metrics.score > 0 ? "+" : ""}
                {numberFormatter.format(result.metrics.score)}
              </p>
              <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200">
                From {result.metrics.total.toLocaleString()} responses
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Response mix</p>
              <div
                className="mt-4 flex h-3 w-full overflow-hidden rounded-[2px] bg-neutral-200 dark:bg-neutral-800"
                aria-hidden="true"
              >
                <span className="bg-emerald-500" style={{ width: `${result.metrics.promoterShare}%` }} />
                <span
                  className="bg-neutral-400 dark:bg-neutral-500"
                  style={{ width: `${result.metrics.passiveShare}%` }}
                />
                <span className="bg-red-500" style={{ width: `${result.metrics.detractorShare}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Promoters</dt>
                  <dd className="mt-1 font-mono font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {numberFormatter.format(result.metrics.promoterShare)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Passives</dt>
                  <dd className="mt-1 font-mono font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {numberFormatter.format(result.metrics.passiveShare)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Detractors</dt>
                  <dd className="mt-1 font-mono font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {numberFormatter.format(result.metrics.detractorShare)}%
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            {scoreMessage} Compare this score with your own past surveys or segments rather than treating a generic
            benchmark as a target.
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={clearForm}
        className="border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        Clear inputs
      </button>
    </div>
  );
}

interface CountFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}

function CountField({ id, label, value, onChange, hint }: CountFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="0"
        aria-describedby={`${id}-hint`}
        className="w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
      />
      <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        {hint}
      </p>
    </div>
  );
}
