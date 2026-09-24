"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type CalculationMode = "subscribers" | "mrr";
type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

const currencies: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD"];
const inputClass =
  "w-full border border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-400";

export function MRRARRCalculatorForm() {
  const [mode, setMode] = useState<CalculationMode>("subscribers");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [customers, setCustomers] = useState("");
  const [monthlyRevenuePerCustomer, setMonthlyRevenuePerCustomer] = useState("");
  const [existingMrr, setExistingMrr] = useState("");
  const [expansionMrr, setExpansionMrr] = useState("");
  const [contractionMrr, setContractionMrr] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculation = useMemo(() => {
    const customerCount = Number(customers);
    const arpa = Number(monthlyRevenuePerCustomer);
    const currentMrr = Number(existingMrr);
    const expansion = expansionMrr === "" ? 0 : Number(expansionMrr);
    const contraction = contractionMrr === "" ? 0 : Number(contractionMrr);
    const baseMrr = mode === "subscribers" ? customerCount * arpa : currentMrr;

    if (
      !Number.isFinite(baseMrr) ||
      baseMrr <= 0 ||
      (mode === "subscribers" && (!Number.isInteger(customerCount) || customerCount <= 0)) ||
      !Number.isFinite(expansion) ||
      expansion < 0 ||
      !Number.isFinite(contraction) ||
      contraction < 0
    ) {
      return null;
    }

    const netMrr = baseMrr + expansion - contraction;
    const arr = netMrr * 12;
    const quarterlyRecurringRevenue = netMrr * 3;
    if (
      !Number.isFinite(netMrr) ||
      netMrr < 0 ||
      !Number.isFinite(arr) ||
      !Number.isFinite(quarterlyRecurringRevenue)
    ) {
      return null;
    }

    return {
      baseMrr,
      netMrr,
      arr,
      quarterlyRecurringRevenue,
      netMonthlyChange: expansion - contraction,
    };
  }, [customers, existingMrr, expansionMrr, contractionMrr, mode, monthlyRevenuePerCustomer]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "subscribers" && (!Number.isInteger(Number(customers)) || Number(customers) <= 0)) {
      setError("Enter active subscribers as a positive whole number.");
      setHasCalculated(false);
      return;
    }

    if (
      mode === "subscribers" &&
      (!Number.isFinite(Number(monthlyRevenuePerCustomer)) || Number(monthlyRevenuePerCustomer) <= 0)
    ) {
      setError("Enter monthly recurring revenue per subscriber greater than zero.");
      setHasCalculated(false);
      return;
    }

    if (mode === "mrr" && (!Number.isFinite(Number(existingMrr)) || Number(existingMrr) <= 0)) {
      setError("Enter starting MRR greater than zero.");
      setHasCalculated(false);
      return;
    }

    if (
      !Number.isFinite(Number(expansionMrr || 0)) ||
      !Number.isFinite(Number(contractionMrr || 0)) ||
      Number(expansionMrr || 0) < 0 ||
      Number(contractionMrr || 0) < 0
    ) {
      setError("Expansion and contraction must be zero or more.");
      setHasCalculated(false);
      return;
    }

    if (!calculation) {
      setError("Contraction cannot make recurring revenue negative. Check the values and try again.");
      setHasCalculated(false);
      return;
    }

    setError(null);
    setHasCalculated(true);
  };

  const clearForm = () => {
    setMode("subscribers");
    setCurrency("USD");
    setCustomers("");
    setMonthlyRevenuePerCustomer("");
    setExistingMrr("");
    setExpansionMrr("");
    setContractionMrr("");
    setHasCalculated(false);
    setError(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  const handleModeChange = (nextMode: CalculationMode) => {
    setMode(nextMode);
    setHasCalculated(false);
    setError(null);
  };

  const result = hasCalculated ? calculation : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">Starting point</legend>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-300 bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-700 sm:grid-cols-2">
          <label
            className={`cursor-pointer bg-white p-3 text-sm dark:bg-neutral-900 ${mode === "subscribers" ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"}`}
          >
            <input
              type="radio"
              name="mrr-mode"
              value="subscribers"
              checked={mode === "subscribers"}
              onChange={() => handleModeChange("subscribers")}
              className="mr-2 accent-emerald-600"
            />
            Subscribers × monthly revenue
          </label>
          <label
            className={`cursor-pointer bg-white p-3 text-sm dark:bg-neutral-900 ${mode === "mrr" ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"}`}
          >
            <input
              type="radio"
              name="mrr-mode"
              value="mrr"
              checked={mode === "mrr"}
              onChange={() => handleModeChange("mrr")}
              className="mr-2 accent-emerald-600"
            />
            Starting MRR
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="mrr-currency" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
          Currency
        </label>
        <select
          id="mrr-currency"
          value={currency}
          onChange={event => setCurrency(event.target.value as Currency)}
          className={inputClass}
        >
          {currencies.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {mode === "subscribers" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mrr-customers" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
              Starting active subscribers
            </label>
            <input
              id="mrr-customers"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={customers}
              onChange={event => {
                setCustomers(event.target.value);
                setError(null);
              }}
              placeholder="250"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mrr-arpa" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
              Monthly revenue per subscriber
            </label>
            <input
              id="mrr-arpa"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={monthlyRevenuePerCustomer}
              onChange={event => {
                setMonthlyRevenuePerCustomer(event.target.value);
                setError(null);
              }}
              placeholder="49"
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="mrr-existing" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Starting monthly recurring revenue
          </label>
          <input
            id="mrr-existing"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={existingMrr}
            onChange={event => {
              setExistingMrr(event.target.value);
              setError(null);
            }}
            placeholder="12250"
            className={inputClass}
          />
        </div>
      )}

      <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">Optional monthly movement</p>
        <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
          Add recurring upgrades and subtract recurring cancellations or downgrades. Exclude one-time revenue.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mrr-expansion" className="mb-2 block text-sm text-neutral-700 dark:text-neutral-300">
              Expansion MRR
            </label>
            <input
              id="mrr-expansion"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={expansionMrr}
              onChange={event => {
                setExpansionMrr(event.target.value);
                setError(null);
              }}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mrr-contraction" className="mb-2 block text-sm text-neutral-700 dark:text-neutral-300">
              Churned or contraction MRR
            </label>
            <input
              id="mrr-contraction"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={contractionMrr}
              onChange={event => {
                setContractionMrr(event.target.value);
                setError(null);
              }}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

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
          aria-label="Recurring revenue result"
          className="border-y border-neutral-200 py-5 dark:border-neutral-800"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Ending monthly recurring revenue
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white">
                {formatCurrency(result.netMrr)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Annualized ending revenue</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white">
                {formatCurrency(result.arr)}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-3">
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Starting MRR</dt>
              <dd className="mt-1 font-semibold tabular-nums text-neutral-950 dark:text-white">
                {formatCurrency(result.baseMrr)}
              </dd>
            </div>
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Net monthly change</dt>
              <dd
                className={`mt-1 font-semibold tabular-nums ${result.netMonthlyChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
              >
                {result.netMonthlyChange > 0 ? "+" : ""}
                {formatCurrency(result.netMonthlyChange)}
              </dd>
            </div>
            <div className="bg-white p-3 dark:bg-neutral-900">
              <dt className="text-xs text-neutral-600 dark:text-neutral-400">Quarterly recurring revenue</dt>
              <dd className="mt-1 font-semibold tabular-nums text-neutral-950 dark:text-white">
                {formatCurrency(result.quarterlyRecurringRevenue)}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex gap-4 pt-1">
        <button type="submit" className="flex-1 bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500">
          Calculate ending MRR and ARR
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
