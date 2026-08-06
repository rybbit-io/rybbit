"use client";

import { useMemo, useState } from "react";

const currencyOptions = {
  USD: { label: "USD ($)", locale: "en-US" },
  EUR: { label: "EUR (€)", locale: "de-DE" },
  GBP: { label: "GBP (£)", locale: "en-GB" },
  CAD: { label: "CAD ($)", locale: "en-CA" },
} as const;

type Currency = keyof typeof currencyOptions;

function parseCost(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function CACCalculatorForm() {
  const [marketingSpend, setMarketingSpend] = useState("");
  const [salesSpend, setSalesSpend] = useState("");
  const [toolsAndAgencies, setToolsAndAgencies] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [newCustomers, setNewCustomers] = useState("");
  const [period, setPeriod] = useState("Month");
  const [currency, setCurrency] = useState<Currency>("USD");

  const result = useMemo(() => {
    const hasInput = [marketingSpend, salesSpend, toolsAndAgencies, otherCosts, newCustomers].some(
      value => value !== ""
    );
    if (!hasInput) return { error: null, metrics: null };

    const costs = [
      parseCost(marketingSpend),
      parseCost(salesSpend),
      parseCost(toolsAndAgencies),
      parseCost(otherCosts),
    ];
    if (costs.some(cost => cost === null)) {
      return { error: "Acquisition costs must be numbers of zero or more.", metrics: null };
    }

    const customerCount = Number(newCustomers);
    if (!Number.isInteger(customerCount) || customerCount <= 0) {
      return { error: "New customers must be a whole number greater than zero.", metrics: null };
    }

    const [marketing, sales, tools, other] = costs as number[];
    const totalCost = marketing + sales + tools + other;
    const cac = totalCost / customerCount;

    if (!Number.isFinite(totalCost) || !Number.isFinite(cac)) {
      return { error: "The combined acquisition cost is too large to calculate safely.", metrics: null };
    }

    return {
      error: null,
      metrics: {
        totalCost,
        cac,
        customerCount,
        breakdown: [
          { label: "Marketing", amount: marketing },
          { label: "Sales", amount: sales },
          { label: "Tools & agencies", amount: tools },
          { label: "Other", amount: other },
        ],
      },
    };
  }, [marketingSpend, newCustomers, otherCosts, salesSpend, toolsAndAgencies]);

  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyOptions[currency].locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency]
  );

  const clearForm = () => {
    setMarketingSpend("");
    setSalesSpend("");
    setToolsAndAgencies("");
    setOtherCosts("");
    setNewCustomers("");
    setPeriod("Month");
    setCurrency("USD");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CostField
          id="cac-marketing"
          label="Marketing spend"
          value={marketingSpend}
          onChange={setMarketingSpend}
          placeholder="12000"
          hint="Ads, content, events, and campaign production"
        />
        <CostField
          id="cac-sales"
          label="Sales costs"
          value={salesSpend}
          onChange={setSalesSpend}
          placeholder="8000"
          hint="Allocated compensation and sales commissions"
        />
        <CostField
          id="cac-tools"
          label="Tools and agency costs"
          value={toolsAndAgencies}
          onChange={setToolsAndAgencies}
          placeholder="2500"
          hint="Acquisition software, contractors, and retainers"
        />
        <CostField
          id="cac-other"
          label="Other acquisition costs"
          value={otherCosts}
          onChange={setOtherCosts}
          placeholder="500"
          hint="Any other cost directly tied to acquisition"
        />
        <div>
          <label htmlFor="cac-customers" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            New customers acquired
          </label>
          <input
            id="cac-customers"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={newCustomers}
            onChange={event => setNewCustomers(event.target.value)}
            placeholder="100"
            aria-describedby="cac-customers-hint"
            className="w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
          <p id="cac-customers-hint" className="mt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            First-time customers in the selected period
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cac-period" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
              Period
            </label>
            <select
              id="cac-period"
              value={period}
              onChange={event => setPeriod(event.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
              <option>Month</option>
              <option>Quarter</option>
              <option>Year</option>
              <option>Campaign</option>
            </select>
          </div>
          <div>
            <label htmlFor="cac-currency" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
              Currency
            </label>
            <select
              id="cac-currency"
              value={currency}
              onChange={event => setCurrency(event.target.value as Currency)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
              {Object.entries(currencyOptions).map(([code, details]) => (
                <option key={code} value={code}>
                  {details.label}
                </option>
              ))}
            </select>
          </div>
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
          aria-label="CAC calculation results"
          aria-live="polite"
          className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800"
        >
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Customer acquisition cost</p>
            <p className="mt-2 break-words font-mono text-4xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {moneyFormatter.format(result.metrics.cac)}
            </p>
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
              per new customer across this {period.toLowerCase()}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Acquisition cost breakdown</h3>
              <p className="font-mono text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                {moneyFormatter.format(result.metrics.totalCost)} total
              </p>
            </div>
            <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {result.metrics.breakdown.map(item => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3 text-sm"
                >
                  <dt className="text-neutral-600 dark:text-neutral-300">{item.label}</dt>
                  <dd className="font-mono tabular-nums text-neutral-900 dark:text-white">
                    {moneyFormatter.format(item.amount)}
                  </dd>
                  <dd className="w-12 text-right font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {result.metrics.totalCost === 0
                      ? "0%"
                      : `${((item.amount / result.metrics.totalCost) * 100).toFixed(0)}%`}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            This is blended CAC for {result.metrics.customerCount.toLocaleString()} new customers. Use the same
            cost-allocation method each period and segment by channel only when costs and customers can be assigned
            consistently.
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

interface CostFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
}

function CostField({ id, label, value, onChange, placeholder, hint }: CostFieldProps) {
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
