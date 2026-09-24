"use client";

import { useState } from "react";

export function CustomerLifetimeValueForm() {
  const [averageValue, setAverageValue] = useState("");
  const [purchaseFrequency, setPurchaseFrequency] = useState("");
  const [customerLifespan, setCustomerLifespan] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [retentionRate, setRetentionRate] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("SaaS");
  const [clv, setClv] = useState<number | null>(null);

  const industryBenchmarks: Record<string, number> = {
    "SaaS": 1200,
    "E-commerce": 168,
    "Subscription Box": 420,
    "Financial Services": 5000,
    "Telecommunications": 3600,
    "Insurance": 7200,
    "Fitness/Gym": 1800,
    "Streaming Services": 850,
  };

  const calculateCLV = () => {
    const valueNum = parseFloat(averageValue);
    const frequencyNum = parseFloat(purchaseFrequency);
    const lifespanNum = parseFloat(customerLifespan);
    const marginNum = parseFloat(profitMargin) / 100;
    const retentionNum = parseFloat(retentionRate) / 100;

    if (
      isNaN(valueNum) ||
      isNaN(frequencyNum) ||
      isNaN(lifespanNum) ||
      isNaN(marginNum) ||
      isNaN(retentionNum)
    ) {
      setClv(null);
      return;
    }

    // Advanced CLV formula with retention rate adjustment
    // CLV = (Average Purchase Value × Purchase Frequency × Customer Lifespan × Profit Margin) × Retention Factor
    const retentionFactor = retentionNum > 0 ? 1 / (1 - retentionNum) : 1;
    const baseClv = valueNum * frequencyNum * lifespanNum * marginNum;
    const adjustedClv = baseClv * Math.min(retentionFactor, 3); // Cap retention multiplier at 3x

    setClv(adjustedClv);
  };

  const clearForm = () => {
    setAverageValue("");
    setPurchaseFrequency("");
    setCustomerLifespan("");
    setProfitMargin("");
    setRetentionRate("");
    setSelectedIndustry("SaaS");
    setClv(null);
  };

  const getBenchmarkComparison = () => {
    if (clv === null) return null;
    const benchmark = industryBenchmarks[selectedIndustry];
    const difference = ((clv - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  // Calculate churn rate for display
  const churnRate = retentionRate ? (100 - parseFloat(retentionRate)).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Average Purchase Value ($) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={averageValue}
          onChange={(e) => setAverageValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCLV()}
          placeholder="100"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Average amount a customer spends per purchase
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Purchase Frequency (per year) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={purchaseFrequency}
          onChange={(e) => setPurchaseFrequency(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCLV()}
          placeholder="12"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of purchases per customer per year
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Customer Lifespan (years) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={customerLifespan}
          onChange={(e) => setCustomerLifespan(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCLV()}
          placeholder="3"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Average number of years a customer stays with you
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Profit Margin (%) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={profitMargin}
          onChange={(e) => setProfitMargin(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCLV()}
          placeholder="20"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Average profit margin percentage
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Retention Rate (%) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={retentionRate}
          onChange={(e) => setRetentionRate(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCLV()}
          placeholder="85"
          max="100"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Percentage of customers retained annually
          {churnRate && ` (Churn rate: ${churnRate}%)`}
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

      {clv !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Customer Lifetime Value
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              ${clv.toFixed(2)}
            </div>
          </div>

          {comparison && (
            <div
              className={`px-4 py-4 rounded-lg border ${
                comparison.difference >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  : comparison.difference >= -20
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                  : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
              }`}
            >
              <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Industry Benchmark: {selectedIndustry}
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                ${comparison.benchmark.toLocaleString()}
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {comparison.difference >= 0 ? (
                  <>
                    Your CLV is{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {comparison.difference.toFixed(1)}% above
                    </span>{" "}
                    the industry average
                  </>
                ) : (
                  <>
                    Your CLV is{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {Math.abs(comparison.difference).toFixed(1)}% below
                    </span>{" "}
                    the industry average
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Annual Customer Value
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                $
                {(
                  parseFloat(averageValue) *
                  parseFloat(purchaseFrequency) *
                  (parseFloat(profitMargin) / 100)
                ).toFixed(2)}
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Total Revenue Potential
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                $
                {(
                  parseFloat(averageValue) *
                  parseFloat(purchaseFrequency) *
                  parseFloat(customerLifespan)
                ).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              CLV:CAC Ratio Guidance
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              A healthy business should have a CLV that's at least <strong>3x</strong> your
              Customer Acquisition Cost (CAC). With a CLV of ${clv.toFixed(2)}, your maximum
              sustainable CAC is approximately <strong>${(clv / 3).toFixed(2)}</strong>.
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateCLV}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate CLV
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
