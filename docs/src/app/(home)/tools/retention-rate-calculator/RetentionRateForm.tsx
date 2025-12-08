"use client";

import { useState } from "react";

export function RetentionRateForm() {
  const [customersStart, setCustomersStart] = useState("");
  const [customersEnd, setCustomersEnd] = useState("");
  const [newCustomers, setNewCustomers] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("SaaS");
  const [retentionRate, setRetentionRate] = useState<number | null>(null);

  const industryBenchmarks: Record<string, { monthly: number; annual: number }> = {
    "SaaS": { monthly: 93, annual: 35 },
    "E-commerce": { monthly: 38, annual: 30 },
    "Subscription Box": { monthly: 72, annual: 40 },
    "Media/Publishing": { monthly: 84, annual: 55 },
    "Financial Services": { monthly: 95, annual: 75 },
    "Telecom": { monthly: 97, annual: 78 },
    "Mobile Apps": { monthly: 42, annual: 15 },
    "Fitness/Wellness": { monthly: 71, annual: 45 },
  };

  const calculateRetentionRate = () => {
    const startNum = parseFloat(customersStart);
    const endNum = parseFloat(customersEnd);
    const newNum = parseFloat(newCustomers);

    if (isNaN(startNum) || isNaN(endNum) || isNaN(newNum) || startNum === 0) {
      setRetentionRate(null);
      return;
    }

    const result = ((endNum - newNum) / startNum) * 100;
    setRetentionRate(Math.max(0, result)); // Ensure non-negative
  };

  const clearForm = () => {
    setCustomersStart("");
    setCustomersEnd("");
    setNewCustomers("");
    setSelectedIndustry("SaaS");
    setRetentionRate(null);
  };

  const getBenchmarkComparison = (period: "monthly" | "annual") => {
    if (retentionRate === null) return null;
    const benchmark = industryBenchmarks[selectedIndustry][period];
    const difference = retentionRate - benchmark;
    return { benchmark, difference };
  };

  const monthlyComparison = getBenchmarkComparison("monthly");
  const annualComparison = getBenchmarkComparison("annual");

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Customers at Start of Period <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={customersStart}
          onChange={(e) => setCustomersStart(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateRetentionRate()}
          placeholder="1000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of customers at the beginning of the period
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Customers at End of Period <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={customersEnd}
          onChange={(e) => setCustomersEnd(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateRetentionRate()}
          placeholder="920"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of customers at the end of the period
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          New Customers Acquired <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={newCustomers}
          onChange={(e) => setNewCustomers(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateRetentionRate()}
          placeholder="150"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of new customers acquired during the period
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Industry
        </label>
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {Object.keys(industryBenchmarks).map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Select your industry to compare against benchmarks
        </p>
      </div>

      {retentionRate !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Retention Rate
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {retentionRate.toFixed(2)}%
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
              Churn Rate: {(100 - retentionRate).toFixed(2)}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthlyComparison && (
              <div
                className={`px-4 py-4 rounded-lg border ${
                  monthlyComparison.difference >= 0
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                    : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
                }`}
              >
                <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Monthly Benchmark
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  {monthlyComparison.benchmark}%
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-300">
                  {monthlyComparison.difference >= 0 ? (
                    <>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {monthlyComparison.difference.toFixed(1)}%
                      </span>{" "}
                      above average
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {Math.abs(monthlyComparison.difference).toFixed(1)}%
                      </span>{" "}
                      below average
                    </>
                  )}
                </div>
              </div>
            )}

            {annualComparison && (
              <div
                className={`px-4 py-4 rounded-lg border ${
                  annualComparison.difference >= 0
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                    : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
                }`}
              >
                <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Annual Benchmark
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  {annualComparison.benchmark}%
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-300">
                  {annualComparison.difference >= 0 ? (
                    <>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {annualComparison.difference.toFixed(1)}%
                      </span>{" "}
                      above average
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {Math.abs(annualComparison.difference).toFixed(1)}%
                      </span>{" "}
                      below average
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Starting Customers
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(customersStart).toLocaleString()}
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Ending Customers
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(customersEnd).toLocaleString()}
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Retained Customers
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {(parseFloat(customersEnd) - parseFloat(newCustomers)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateRetentionRate}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate Retention Rate
        </button>
        <button
          onClick={clearForm}
          className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
