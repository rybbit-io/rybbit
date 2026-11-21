"use client";

import { useState } from "react";

const industryBenchmarks: Record<string, { low: number; average: number; high: number }> = {
  "E-commerce": { low: 20, average: 45, high: 70 },
  "Blog/Content": { low: 40, average: 65, high: 90 },
  "Lead Generation": { low: 30, average: 50, high: 70 },
  "SaaS": { low: 10, average: 35, high: 60 },
  "Landing Pages": { low: 60, average: 75, high: 90 },
  "News/Media": { low: 40, average: 60, high: 80 },
  "Other": { low: 26, average: 55, high: 80 },
};

export function BounceRateForm() {
  const [totalSessions, setTotalSessions] = useState("");
  const [bouncedSessions, setBouncedSessions] = useState("");
  const [industry, setIndustry] = useState("E-commerce");

  const calculateBounceRate = () => {
    const total = parseFloat(totalSessions);
    const bounced = parseFloat(bouncedSessions);
    if (!total || !bounced || total === 0) return null;
    return (bounced / total) * 100;
  };

  const bounceRate = calculateBounceRate();
  const benchmark = industryBenchmarks[industry];

  const getPerformanceLevel = (rate: number) => {
    if (rate <= benchmark.low) return { label: "Excellent", color: "emerald" };
    if (rate <= benchmark.average) return { label: "Good", color: "blue" };
    if (rate <= benchmark.high) return { label: "Needs Improvement", color: "orange" };
    return { label: "Poor", color: "red" };
  };

  const clearForm = () => {
    setTotalSessions("");
    setBouncedSessions("");
    setIndustry("E-commerce");
  };

  return (
    <>
      {/* Tool Section */}
      <div className="mb-16">
        <div className="space-y-6">
          {/* Total Sessions */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Total Sessions <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={totalSessions}
              onChange={e => setTotalSessions(e.target.value)}
              placeholder="10000"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Total number of sessions in the time period</p>
          </div>

          {/* Bounced Sessions */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Bounced Sessions <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={bouncedSessions}
              onChange={e => setBouncedSessions(e.target.value)}
              placeholder="4500"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Sessions with only one pageview (single-page visits)</p>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Industry Type</label>
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
          {bounceRate !== null && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Your Bounce Rate</label>
                <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{bounceRate.toFixed(2)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Excellent
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">≤{benchmark.low}%</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Average
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">~{benchmark.average}%</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Needs Work
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">≥{benchmark.high}%</div>
                  </div>
                </div>
              </div>

              {(() => {
                const perf = getPerformanceLevel(bounceRate);
                const colorClasses = {
                  emerald: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200",
                  blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200",
                  orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-200",
                  red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
                };

                return (
                  <div className={`p-4 rounded-lg border ${colorClasses[perf.color as keyof typeof colorClasses]}`}>
                    <p className="text-sm">
                      <strong>{perf.label}!</strong> {
                        perf.label === "Excellent" ? `Your bounce rate is well below the ${industry.toLowerCase()} average of ${benchmark.average}%. You're doing great at keeping visitors engaged!` :
                        perf.label === "Good" ? `Your bounce rate is close to the ${industry.toLowerCase()} average of ${benchmark.average}%. There's room for improvement.` :
                        perf.label === "Needs Improvement" ? `Your bounce rate is above the ${industry.toLowerCase()} average of ${benchmark.average}%. Consider improving page load speed, content quality, or user experience.` :
                        `Your bounce rate is significantly higher than the ${industry.toLowerCase()} average of ${benchmark.average}%. Focus on improving content relevance, page speed, and user experience.`
                      }
                    </p>
                  </div>
                );
              })()}
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
