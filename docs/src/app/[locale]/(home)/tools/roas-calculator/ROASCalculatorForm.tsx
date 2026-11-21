"use client";

import { useMemo, useState } from "react";

const currencies = {
  USD: { label: "USD ($)", locale: "en-US" },
  EUR: { label: "EUR (€)", locale: "de-DE" },
  GBP: { label: "GBP (£)", locale: "en-GB" },
  CAD: { label: "CAD ($)", locale: "en-CA" },
  AUD: { label: "AUD ($)", locale: "en-AU" },
} as const;

type Currency = keyof typeof currencies;

function parseAmount(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function ROASCalculatorForm() {
  const [adSpend, setAdSpend] = useState("");
  const [attributedRevenue, setAttributedRevenue] = useState("");
  const [grossMargin, setGrossMargin] = useState("100");
  const [currency, setCurrency] = useState<Currency>("USD");

  const result = useMemo(() => {
    if (!adSpend && !attributedRevenue) return { error: null, metrics: null };

    const spend = parseAmount(adSpend);
    const revenue = parseAmount(attributedRevenue);
    const margin = parseAmount(grossMargin);

    if (spend === null || spend === 0) {
      return { error: "Ad spend must be a number greater than zero.", metrics: null };
    }
    if (revenue === null) {
      return { error: "Attributed revenue must be zero or more.", metrics: null };
    }
    if (margin === null || margin > 100) {
      return { error: "Gross margin must be between 0% and 100%.", metrics: null };
    }

    const marginRate = margin / 100;
    const roas = revenue / spend;
    const grossProfit = revenue * marginRate;
    const contributionAfterAds = grossProfit - spend;
    const breakEvenRoas = marginRate === 0 ? null : 1 / marginRate;

    if (
      !Number.isFinite(roas) ||
      !Number.isFinite(grossProfit) ||
      !Number.isFinite(contributionAfterAds) ||
      (breakEvenRoas !== null && !Number.isFinite(breakEvenRoas))
    ) {
      return { error: "The values are too large or small to calculate safely.", metrics: null };
    }

    return {
      error: null,
      metrics: {
        roas,
        grossProfit,
        contributionAfterAds,
        breakEvenRoas,
      },
    };
  }, [adSpend, attributedRevenue, grossMargin]);

  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencies[currency].locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency]
  );

  const clearForm = () => {
    setAdSpend("");
    setAttributedRevenue("");
    setGrossMargin("100");
    setCurrency("USD");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AmountField
          id="roas-ad-spend"
          label="Ad spend"
          value={adSpend}
          onChange={setAdSpend}
          placeholder="5000"
          hint="Advertising cost for the selected period"
        />
        <AmountField
          id="roas-revenue"
          label="Attributed revenue"
          value={attributedRevenue}
          onChange={setAttributedRevenue}
          placeholder="18000"
          hint="Revenue credited to the same ads and period"
        />
        <div>
          <label htmlFor="roas-margin" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Gross margin
          </label>
          <div className="relative">
            <input
              id="roas-margin"
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={grossMargin}
              onChange={event => setGrossMargin(event.target.value)}
              aria-describedby="roas-margin-hint"
              className="w-full border border-neutral-300 bg-white px-3 py-2 pr-9 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
              %
            </span>
          </div>
          <p id="roas-margin-hint" className="mt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Use 100% to calculate revenue ROAS only
          </p>
        </div>
        <div>
          <label htmlFor="roas-currency" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Currency
          </label>
          <select
            id="roas-currency"
            value={currency}
            onChange={event => setCurrency(event.target.value as Currency)}
            className="w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {Object.entries(currencies).map(([code, details]) => (
              <option key={code} value={code}>
                {details.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Formatting only; no exchange-rate conversion
          </p>
        </div>
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
          aria-label="ROAS results"
          aria-live="polite"
          className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800"
        >
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Return on ad spend</p>
                <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {result.metrics.roas.toFixed(2)}×
                </p>
              </div>
              <p className="max-w-xs text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                Every unit of ad spend produced {result.metrics.roas.toFixed(2)} units of attributed revenue.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ResultItem label="Gross profit" value={moneyFormatter.format(result.metrics.grossProfit)} />
            <ResultItem
              label="After ad spend"
              value={moneyFormatter.format(result.metrics.contributionAfterAds)}
              negative={result.metrics.contributionAfterAds < 0}
            />
            <ResultItem
              label="Break-even ROAS"
              value={
                result.metrics.breakEvenRoas === null ? "Not reachable" : `${result.metrics.breakEvenRoas.toFixed(2)}×`
              }
            />
          </dl>

          <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            The profitability view applies your gross margin before subtracting ad spend. It does not include overhead,
            returns, taxes, or attribution uncertainty.
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={clearForm}
        className="border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        Clear inputs
      </button>
    </div>
  );
}

interface AmountFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
}

function AmountField({ id, label, value, onChange, placeholder, hint }: AmountFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={`${id}-hint`}
        className="w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
      />
      <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        {hint}
      </p>
    </div>
  );
}

function ResultItem({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd
        className={`mt-2 break-words font-mono text-lg font-semibold tabular-nums ${negative ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}
