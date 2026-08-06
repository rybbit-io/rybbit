"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type ChurnType = "customer" | "revenue";
type Period = "month" | "quarter" | "year";

const inputClass =
  "w-full border border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-400";

const periodLabels: Record<Period, string> = {
  month: "Monthly",
  quarter: "Quarterly",
  year: "Annual",
};

export function ChurnRateForm() {
  const [churnType, setChurnType] = useState<ChurnType>("customer");
  const [period, setPeriod] = useState<Period>("month");
  const [startingValue, setStartingValue] = useState("");
  const [lostValue, setLostValue] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculation = useMemo(() => {
    const start = Number(startingValue);
    const lost = Number(lostValue);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(lost) ||
      start <= 0 ||
      lost < 0 ||
      lost > start ||
      (churnType === "customer" && (!Number.isInteger(start) || !Number.isInteger(lost)))
    ) {
      return null;
    }

    const churnRate = (lost / start) * 100;
    return {
      churnRate,
      retentionRate: 100 - churnRate,
      remaining: start - lost,
    };
  }, [churnType, lostValue, startingValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const start = Number(startingValue);
    const lost = Number(lostValue);

    if (!startingValue || !Number.isFinite(start) || start <= 0) {
      setError(`Enter starting ${churnType === "customer" ? "customers" : "recurring revenue"} greater than zero.`);
      setHasCalculated(false);
      return;
    }

    if (lostValue === "" || !Number.isFinite(lost) || lost < 0) {
      setError(`Enter ${churnType === "customer" ? "customers lost" : "recurring revenue lost"} as zero or more.`);
      setHasCalculated(false);
      return;
    }

    if (lost > start) {
      setError("The amount lost cannot be greater than the amount at the start of the period.");
      setHasCalculated(false);
      return;
    }

    if (churnType === "customer" && (!Number.isInteger(start) || !Number.isInteger(lost))) {
      setError("Customer counts must be whole numbers.");
      setHasCalculated(false);
      return;
    }

    setError(null);
    setHasCalculated(true);
  };

  const clearForm = () => {
    setChurnType("customer");
    setPeriod("month");
    setStartingValue("");
    setLostValue("");
    setHasCalculated(false);
    setError(null);
  };

  const formatValue = (value: number) =>
    churnType === "revenue"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const noun = churnType === "customer" ? "customers" : "recurring revenue";
  const result = hasCalculated ? calculation : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="churn-type" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Churn type
          </label>
          <select
            id="churn-type"
            value={churnType}
            onChange={event => {
              setChurnType(event.target.value as ChurnType);
              setStartingValue("");
              setLostValue("");
              setHasCalculated(false);
              setError(null);
            }}
            className={inputClass}
          >
            <option value="customer">Customer churn</option>
            <option value="revenue">Revenue churn</option>
          </select>
        </div>

        <div>
          <label htmlFor="churn-period" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Reporting period
          </label>
          <select
            id="churn-period"
            value={period}
            onChange={event => setPeriod(event.target.value as Period)}
            className={inputClass}
          >
            {(Object.keys(periodLabels) as Period[]).map(key => (
              <option key={key} value={key}>
                {periodLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="churn-start" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            {churnType === "customer" ? "Customers at start" : "Recurring revenue at start"}
          </label>
          <div className="relative">
            {churnType === "revenue" && (
              <span
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              >
                $
              </span>
            )}
            <input
              id="churn-start"
              type="number"
              inputMode="decimal"
              min="0"
              step={churnType === "customer" ? "1" : "0.01"}
              value={startingValue}
              onChange={event => {
                setStartingValue(event.target.value);
                setError(null);
              }}
              placeholder={churnType === "customer" ? "1000" : "50000"}
              className={`${inputClass} ${churnType === "revenue" ? "pl-7" : ""}`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="churn-lost" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            {churnType === "customer" ? "Customers lost" : "Recurring revenue lost"}
          </label>
          <div className="relative">
            {churnType === "revenue" && (
              <span
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              >
                $
              </span>
            )}
            <input
              id="churn-lost"
              type="number"
              inputMode="decimal"
              min="0"
              step={churnType === "customer" ? "1" : "0.01"}
              value={lostValue}
              onChange={event => {
                setLostValue(event.target.value);
                setError(null);
              }}
              placeholder={churnType === "customer" ? "45" : "2500"}
              className={`${inputClass} ${churnType === "revenue" ? "pl-7" : ""}`}
            />
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
        Use values from the same cohort and {period} so the numerator and denominator cover a consistent period.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {result && (
        <section
          aria-live="polite"
          aria-label="Churn rate result"
          className="border-y border-neutral-200 py-5 dark:border-neutral-800"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {periodLabels[period]} {churnType} churn
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white">
                {result.churnRate.toFixed(2)}%
              </p>
            </div>
            <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {result.retentionRate.toFixed(2)}% retained
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2">
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Starting {noun}</dt>
              <dd className="mt-1 font-semibold tabular-nums text-neutral-950 dark:text-white">
                {formatValue(Number(startingValue))}
              </dd>
            </div>
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Remaining {noun}</dt>
              <dd className="mt-1 font-semibold tabular-nums text-neutral-950 dark:text-white">
                {formatValue(result.remaining)}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex gap-4 pt-1">
        <button type="submit" className="flex-1 bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500">
          Calculate churn
        </button>
        <button
          type="button"
          onClick={clearForm}
          className="border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
