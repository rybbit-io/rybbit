"use client";

import { useState } from "react";

export function CostPerMilleForm() {
  const [spend, setSpend] = useState("");
  const [impressions, setImpressions] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("Google Display");
  const [cpm, setCpm] = useState<number | null>(null);

  const platformBenchmarks: Record<string, number> = {
    "Google Display": 2.8,
    "Google Search": 38.4,
    "Facebook Feed": 11.2,
    "Instagram Feed": 7.91,
    "Instagram Stories": 6.7,
    "LinkedIn": 33.8,
    "Twitter": 6.46,
    "TikTok": 9.42,
    "YouTube": 9.68,
    "Pinterest": 30,
  };

  const calculateCPM = () => {
    const spendNum = parseFloat(spend);
    const impressionsNum = parseFloat(impressions);

    if (isNaN(spendNum) || isNaN(impressionsNum) || impressionsNum === 0) {
      setCpm(null);
      return;
    }

    const result = (spendNum / impressionsNum) * 1000;
    setCpm(result);
  };

  const clearForm = () => {
    setSpend("");
    setImpressions("");
    setSelectedPlatform("Google Display");
    setCpm(null);
  };

  const getBenchmarkComparison = () => {
    if (cpm === null) return null;
    const benchmark = platformBenchmarks[selectedPlatform];
    const difference = ((cpm - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Ad Spend ($) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={spend}
          onChange={(e) => setSpend(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPM()}
          placeholder="5000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total amount spent on advertising
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Impressions <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={impressions}
          onChange={(e) => setImpressions(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPM()}
          placeholder="500000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of times your ad was displayed
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Platform
        </label>
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {Object.keys(platformBenchmarks).map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Select advertising platform to compare against benchmarks
        </p>
      </div>

      {cpm !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Cost Per Mille (CPM)
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              ${cpm.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
              Cost per 1,000 impressions
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
                Platform Benchmark: {selectedPlatform}
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                ${comparison.benchmark.toFixed(2)}
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {comparison.difference <= 0 ? (
                  <>
                    Your CPM is{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.abs(comparison.difference).toFixed(1)}% below
                    </span>{" "}
                    the platform average
                  </>
                ) : (
                  <>
                    Your CPM is{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {comparison.difference.toFixed(1)}% above
                    </span>{" "}
                    the platform average
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
                Total Impressions
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(impressions).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Estimated Reach
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              At an average frequency of 3, your {parseFloat(impressions).toLocaleString()}{" "}
              impressions reached approximately{" "}
              <strong>{Math.round(parseFloat(impressions) / 3).toLocaleString()}</strong>{" "}
              unique users.
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateCPM}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate CPM
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
