"use client";

import { useState } from "react";

export function CostPerViewForm() {
  const [spend, setSpend] = useState("");
  const [views, setViews] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("YouTube");
  const [cpv, setCpv] = useState<number | null>(null);

  const platformBenchmarks: Record<string, number> = {
    "YouTube": 0.06,
    "Facebook Video": 0.02,
    "Instagram Video": 0.05,
    "TikTok": 0.07,
    "LinkedIn Video": 0.15,
    "Twitter Video": 0.03,
    "Pinterest Video": 0.04,
    "Snapchat": 0.08,
  };

  const calculateCPV = () => {
    const spendNum = parseFloat(spend);
    const viewsNum = parseFloat(views);

    if (isNaN(spendNum) || isNaN(viewsNum) || viewsNum === 0) {
      setCpv(null);
      return;
    }

    const result = spendNum / viewsNum;
    setCpv(result);
  };

  const clearForm = () => {
    setSpend("");
    setViews("");
    setSelectedPlatform("YouTube");
    setCpv(null);
  };

  const getBenchmarkComparison = () => {
    if (cpv === null) return null;
    const benchmark = platformBenchmarks[selectedPlatform];
    const difference = ((cpv - benchmark) / benchmark) * 100;
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
          onKeyPress={(e) => e.key === "Enter" && calculateCPV()}
          placeholder="1000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total amount spent on video advertising
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Video Views <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={views}
          onChange={(e) => setViews(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPV()}
          placeholder="15000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Number of times your video ad was viewed
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
          Select platform to compare against benchmarks
        </p>
      </div>

      {cpv !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Cost Per View
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              ${cpv.toFixed(3)}
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
                ${comparison.benchmark.toFixed(3)}
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {comparison.difference <= 0 ? (
                  <>
                    Your CPV is{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.abs(comparison.difference).toFixed(1)}% below
                    </span>{" "}
                    the platform average
                  </>
                ) : (
                  <>
                    Your CPV is{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {comparison.difference.toFixed(1)}% above
                    </span>{" "}
                    the platform average
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Total Views
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(views).toLocaleString()}
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Cost Per 1K Views
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                ${(cpv * 1000).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              View-Through Rate (VTR)
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              If you received {parseFloat(views).toLocaleString()} views from{" "}
              {Math.round(parseFloat(views) * 2).toLocaleString()} impressions, your
              view-through rate would be <strong>50%</strong>. Higher VTR indicates more
              engaging content and better targeting.
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateCPV}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate CPV
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
