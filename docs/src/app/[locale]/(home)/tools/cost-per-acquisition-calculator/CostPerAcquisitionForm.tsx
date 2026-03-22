"use client";

import { useState } from "react";

export function CostPerAcquisitionForm() {
  const [spend, setSpend] = useState("");
  const [conversions, setConversions] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("E-commerce");
  const [cpa, setCpa] = useState<number | null>(null);

  const industryBenchmarks: Record<string, number> = {
    "E-commerce": 45.27,
    "SaaS": 205,
    "B2B": 197,
    "Finance": 44,
    "Healthcare": 189,
    "Education": 116,
    "Real Estate": 213,
    "Travel": 7.19,
    "Legal Services": 135,
    "Home Services": 81,
  };

  const calculateCPA = () => {
    const spendNum = parseFloat(spend);
    const conversionsNum = parseFloat(conversions);

    if (isNaN(spendNum) || isNaN(conversionsNum) || conversionsNum === 0) {
      setCpa(null);
      return;
    }

    const result = spendNum / conversionsNum;
    setCpa(result);
  };

  const clearForm = () => {
    setSpend("");
    setConversions("");
    setSelectedIndustry("E-commerce");
    setCpa(null);
  };

  const getBenchmarkComparison = () => {
    if (cpa === null) return null;
    const benchmark = industryBenchmarks[selectedIndustry];
    const difference = ((cpa - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Marketing Spend ($) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={spend}
          onChange={(e) => setSpend(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPA()}
          placeholder="10000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total amount spent on marketing campaigns
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Number of Conversions <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={conversions}
          onChange={(e) => setConversions(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPA()}
          placeholder="150"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total number of acquisitions or conversions achieved
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

      {cpa !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Cost Per Acquisition
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              ${cpa.toFixed(2)}
            </div>
          </div>

          {comparison && (
            <div
              className={`px-4 py-4 rounded-lg border ${
                comparison.difference <= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  : comparison.difference <= 20
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                  : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
              }`}
            >
              <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Industry Benchmark: {selectedIndustry}
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                ${comparison.benchmark.toFixed(2)}
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {comparison.difference <= 0 ? (
                  <>
                    Your CPA is{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.abs(comparison.difference).toFixed(1)}% below
                    </span>{" "}
                    the industry average
                  </>
                ) : (
                  <>
                    Your CPA is{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {comparison.difference.toFixed(1)}% above
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
                Total Spend
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                ${parseFloat(spend).toLocaleString()}
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Conversions
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(conversions).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateCPA}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate CPA
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
