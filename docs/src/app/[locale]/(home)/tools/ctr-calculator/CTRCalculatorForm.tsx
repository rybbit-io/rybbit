"use client";

import { useState } from "react";

const industryBenchmarks: Record<string, number> = {
  "Search Ads": 3.17,
  "Display Ads": 0.46,
  "Social Media": 0.90,
  "Email Marketing": 2.6,
  "E-commerce": 2.69,
  "B2B": 2.41,
  "Other": 2.0,
};

export function CTRCalculatorForm() {
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [industry, setIndustry] = useState("Search Ads");

  const calculateCTR = () => {
    const imp = parseFloat(impressions);
    const clk = parseFloat(clicks);
    if (!imp || !clk || imp === 0) return null;
    return (clk / imp) * 100;
  };

  const ctr = calculateCTR();
  const benchmark = industryBenchmarks[industry];

  const clearForm = () => {
    setImpressions("");
    setClicks("");
    setIndustry("Search Ads");
  };

  return (
    <>
      {/* Tool Section */}
      <div className="mb-16">
        <div className="space-y-6">
          {/* Impressions */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Total Impressions <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={impressions}
              onChange={e => setImpressions(e.target.value)}
              placeholder="10000"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">How many times your ad was shown</p>
          </div>

          {/* Clicks */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Total Clicks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={clicks}
              onChange={e => setClicks(e.target.value)}
              placeholder="300"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">How many clicks your ad received</p>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Industry / Channel</label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.keys(industryBenchmarks).map(ind => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Select your industry to compare with benchmarks
            </p>
          </div>

          {/* Results */}
          {ctr !== null && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Your CTR</label>
                <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{ctr.toFixed(2)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    {industry} Benchmark
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">{benchmark.toFixed(2)}%</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    vs. Benchmark
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div
                      className={`text-2xl font-bold ${
                        ctr >= benchmark
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {ctr >= benchmark ? "+" : ""}
                      {((ctr - benchmark) / benchmark * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  {ctr >= benchmark ? (
                    <>
                      <strong>Great job!</strong> Your CTR is {((ctr - benchmark) / benchmark * 100).toFixed(1)}% higher than the {industry.toLowerCase()} benchmark.
                    </>
                  ) : (
                    <>
                      <strong>Room for improvement.</strong> Your CTR is {Math.abs((ctr - benchmark) / benchmark * 100).toFixed(1)}% below the {industry.toLowerCase()} benchmark. Consider improving your ad copy, targeting, or creative.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={clearForm}
              className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
