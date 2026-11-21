"use client";

import { useMemo, useState } from "react";

function parseNonNegative(value: string, defaultValue?: number) {
  if (value.trim() === "") return defaultValue ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function PaybackPeriodCalculatorForm() {
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [grossMargin, setGrossMargin] = useState("");
  const [monthlyVariableCost, setMonthlyVariableCost] = useState("");

  const result = useMemo(() => {
    if (!acquisitionCost && !monthlyRevenue && !grossMargin && !monthlyVariableCost) {
      return { error: null, metrics: null };
    }

    const cac = parseNonNegative(acquisitionCost);
    const revenue = parseNonNegative(monthlyRevenue);
    const margin = parseNonNegative(grossMargin);
    const variableCost = parseNonNegative(monthlyVariableCost, 0);

    if (cac === null || cac === 0) {
      return { error: "Customer acquisition cost must be greater than zero.", metrics: null };
    }
    if (revenue === null || revenue === 0) {
      return { error: "Monthly revenue per customer must be greater than zero.", metrics: null };
    }
    if (margin === null || margin > 100) {
      return { error: "Gross margin must be between 0% and 100%.", metrics: null };
    }
    if (variableCost === null) {
      return { error: "Monthly variable cost must be zero or more.", metrics: null };
    }

    const grossProfit = revenue * (margin / 100);
    const monthlyContribution = grossProfit - variableCost;
    const paybackMonths = monthlyContribution > 0 ? cac / monthlyContribution : null;
    const approximateDays = paybackMonths === null ? null : Math.ceil(paybackMonths * 30.4375);

    if (
      !Number.isFinite(grossProfit) ||
      !Number.isFinite(monthlyContribution) ||
      (paybackMonths !== null && !Number.isFinite(paybackMonths)) ||
      (approximateDays !== null && !Number.isFinite(approximateDays))
    ) {
      return { error: "The values are too large or small to calculate safely.", metrics: null };
    }

    return {
      error: null,
      metrics: {
        grossProfit,
        monthlyContribution,
        paybackMonths,
        approximateDays,
      },
    };
  }, [acquisitionCost, grossMargin, monthlyRevenue, monthlyVariableCost]);

  const clearForm = () => {
    setAcquisitionCost("");
    setMonthlyRevenue("");
    setGrossMargin("");
    setMonthlyVariableCost("");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="payback-cac"
          label="Customer acquisition cost"
          value={acquisitionCost}
          onChange={setAcquisitionCost}
          placeholder="600"
          hint="Average cost to acquire one new customer"
          prefix="$"
        />
        <Field
          id="payback-revenue"
          label="Monthly revenue per customer"
          value={monthlyRevenue}
          onChange={setMonthlyRevenue}
          placeholder="120"
          hint="Recurring revenue in a typical month"
          prefix="$"
        />
        <Field
          id="payback-margin"
          label="Gross margin"
          value={grossMargin}
          onChange={setGrossMargin}
          placeholder="80"
          hint="Revenue remaining after cost of service"
          suffix="%"
          max="100"
        />
        <Field
          id="payback-variable-cost"
          label="Other monthly variable cost"
          value={monthlyVariableCost}
          onChange={setMonthlyVariableCost}
          placeholder="0"
          hint="Optional per-customer cost not in gross margin"
          prefix="$"
        />
      </div>

      <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        Enter all monetary amounts in US dollars so the inputs and formatted results use the same currency.
      </p>

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
          aria-label="Payback period results"
          aria-live="polite"
          className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800"
        >
          <div
            className={`rounded-lg border p-5 ${
              result.metrics.paybackMonths === null
                ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            }`}
          >
            <p
              className={`text-sm font-medium ${result.metrics.paybackMonths === null ? "text-amber-800 dark:text-amber-200" : "text-emerald-800 dark:text-emerald-200"}`}
            >
              Estimated CAC payback period
            </p>
            {result.metrics.paybackMonths === null ? (
              <>
                <p className="mt-2 text-2xl font-semibold text-amber-800 dark:text-amber-200">
                  No payback at these inputs
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-amber-800 dark:text-amber-200">
                  Monthly contribution is zero or negative, so it cannot recover acquisition cost.
                </p>
              </>
            ) : (
              <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p className="font-mono text-4xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {result.metrics.paybackMonths.toFixed(1)} months
                </p>
                <p className="pb-1 text-sm text-emerald-800 dark:text-emerald-200">
                  About {result.metrics.approximateDays?.toLocaleString()} days
                </p>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultItem label="Monthly gross profit" value={moneyFormatter.format(result.metrics.grossProfit)} />
            <ResultItem
              label="Monthly contribution"
              value={moneyFormatter.format(result.metrics.monthlyContribution)}
              negative={result.metrics.monthlyContribution <= 0}
            />
          </dl>

          <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            This is a simple, undiscounted estimate. It assumes monthly contribution stays constant and does not model
            churn, expansion revenue, payment timing, or the time value of money.
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

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
  prefix?: string;
  suffix?: string;
  max?: string;
}

function Field({ id, label, value, onChange, placeholder, hint, prefix, suffix, max }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          min="0"
          max={max}
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          className={`w-full border border-neutral-300 bg-white py-2 text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-9" : "pr-3"}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            {suffix}
          </span>
        )}
      </div>
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
        className={`mt-2 font-mono text-lg font-semibold tabular-nums ${negative ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}
