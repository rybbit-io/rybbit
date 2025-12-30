"use client";

import { useState } from "react";

export function ConversionRateForm() {
  const [visitors, setVisitors] = useState("");
  const [conversions, setConversions] = useState("");
  const [selectedSource, setSelectedSource] = useState("Overall Website");
  const [conversionRate, setConversionRate] = useState<number | null>(null);

  const sourceBenchmarks: Record<string, number> = {
    "Overall Website": 2.35,
    "E-commerce": 2.86,
    "B2B": 2.23,
    "SaaS": 3.0,
    "Landing Pages": 4.02,
    "Email Campaigns": 3.2,
    "Social Media": 1.85,
    "Paid Search": 3.75,
    "Organic Search": 2.4,
    "Display Ads": 0.77,
  };

  const calculateConversionRate = () => {
    const visitorsNum = parseFloat(visitors);
    const conversionsNum = parseFloat(conversions);

    if (isNaN(visitorsNum) || isNaN(conversionsNum) || visitorsNum === 0) {
      setConversionRate(null);
      return;
    }

    const result = (conversionsNum / visitorsNum) * 100;
    setConversionRate(result);
  };

  const clearForm = () => {
    setVisitors("");
    setConversions("");
    setSelectedSource("Overall Website");
    setConversionRate(null);
  };

  const getBenchmarkComparison = () => {
    if (conversionRate === null) return null;
    const benchmark = sourceBenchmarks[selectedSource];
    const difference = conversionRate - benchmark;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Visitors <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={visitors}
          onChange={(e) => setVisitors(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateConversionRate()}
          placeholder="10000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total number of visitors or sessions
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Conversions <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={conversions}
          onChange={(e) => setConversions(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateConversionRate()}
          placeholder="235"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of successful conversions (purchases, sign-ups, etc.)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Traffic Source / Type
        </label>
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {Object.keys(sourceBenchmarks).map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Select traffic source to compare against benchmarks
        </p>
      </div>

      {conversionRate !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Conversion Rate
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {conversionRate.toFixed(2)}%
            </div>
          </div>

          {comparison && (
            <div
              className={`px-4 py-4 rounded-lg border ${
                comparison.difference >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  : comparison.difference >= -0.5
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                  : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
              }`}
            >
              <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Benchmark: {selectedSource}
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                {comparison.benchmark.toFixed(2)}%
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {comparison.difference >= 0 ? (
                  <>
                    Your conversion rate is{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {comparison.difference.toFixed(2)}%
                    </span>{" "}
                    above the benchmark
                  </>
                ) : (
                  <>
                    Your conversion rate is{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {Math.abs(comparison.difference).toFixed(2)}%
                    </span>{" "}
                    below the benchmark
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Total Visitors
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(visitors).toLocaleString()}
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
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Non-Conversions
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {(parseFloat(visitors) - parseFloat(conversions)).toLocaleString()}
              </div>
            </div>
          </div>

          {conversionRate < 1 && (
            <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg">
              <div className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                Low Conversion Rate
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-300">
                Consider optimizing your landing page, improving your value proposition, or
                refining your targeting to improve conversions.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateConversionRate}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate Conversion Rate
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
