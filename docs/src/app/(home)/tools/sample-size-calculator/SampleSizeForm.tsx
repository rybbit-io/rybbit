"use client";

import { useState } from "react";

export function SampleSizeForm() {
  const [baselineConversion, setBaselineConversion] = useState("");
  const [minimumDetectableEffect, setMinimumDetectableEffect] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("95");
  const [statisticalPower, setStatisticalPower] = useState("80");

  const calculateSampleSize = () => {
    const baseline = parseFloat(baselineConversion) / 100;
    const mde = parseFloat(minimumDetectableEffect) / 100;
    const alpha = confidenceLevel === "90" ? 0.10 : confidenceLevel === "95" ? 0.05 : 0.01;
    const beta = statisticalPower === "80" ? 0.20 : 0.10;

    if (!baseline || !mde || baseline <= 0 || baseline >= 1) return null;

    // Z-scores for different confidence levels and power
    const zAlpha = confidenceLevel === "90" ? 1.645 : confidenceLevel === "95" ? 1.96 : 2.576;
    const zBeta = statisticalPower === "80" ? 0.84 : 1.28;

    // Alternative conversion rate
    const p2 = baseline + mde;

    // Average of the two proportions
    const pBar = (baseline + p2) / 2;

    // Sample size formula for proportions
    const n = Math.pow((zAlpha + zBeta), 2) * 2 * pBar * (1 - pBar) / Math.pow(mde, 2);

    return Math.ceil(n);
  };

  const sampleSize = calculateSampleSize();
  const totalVisitors = sampleSize ? sampleSize * 2 : null; // Total for both variants

  const clearForm = () => {
    setBaselineConversion("");
    setMinimumDetectableEffect("");
    setConfidenceLevel("95");
    setStatisticalPower("80");
  };

  return (
    <div className="space-y-6">
      {/* Baseline Conversion Rate */}
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Baseline Conversion Rate <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            value={baselineConversion}
            onChange={e => setBaselineConversion(e.target.value)}
            placeholder="2.5"
            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">%</span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Your current conversion rate (control variant)</p>
      </div>

      {/* Minimum Detectable Effect */}
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Minimum Detectable Effect (MDE) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            value={minimumDetectableEffect}
            onChange={e => setMinimumDetectableEffect(e.target.value)}
            placeholder="0.5"
            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">%</span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Smallest improvement you want to detect (e.g., 0.5% absolute increase)
        </p>
      </div>

      {/* Confidence Level */}
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Confidence Level</label>
        <select
          value={confidenceLevel}
          onChange={e => setConfidenceLevel(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="90">90% (10% chance of false positive)</option>
          <option value="95">95% (5% chance of false positive) - Recommended</option>
          <option value="99">99% (1% chance of false positive)</option>
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          How confident you want to be in your results
        </p>
      </div>

      {/* Statistical Power */}
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Statistical Power</label>
        <select
          value={statisticalPower}
          onChange={e => setStatisticalPower(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="80">80% (20% chance of false negative) - Recommended</option>
          <option value="90">90% (10% chance of false negative)</option>
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Probability of detecting an effect if it exists
        </p>
      </div>

      {/* Results */}
      {sampleSize !== null && totalVisitors !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Sample Size Per Variant
            </label>
            <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                {sampleSize.toLocaleString()}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">visitors per variant (A and B)</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Total Test Size
            </label>
            <div className="px-4 py-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {totalVisitors.toLocaleString()}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">total visitors needed</div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Test Duration:</strong> If you get 1,000 visitors per day, you'll need approximately{" "}
              <strong>{Math.ceil(totalVisitors / 1000)} days</strong> to complete this test. At 5,000 visitors per day,
              you'll need <strong>{Math.ceil(totalVisitors / 5000)} days</strong>.
            </p>
          </div>

          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">What this means:</h3>
            <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <li>You need {sampleSize.toLocaleString()} visitors to see variant A (control)</li>
              <li>You need {sampleSize.toLocaleString()} visitors to see variant B (treatment)</li>
              <li>This gives you {confidenceLevel}% confidence in detecting a {minimumDetectableEffect}% improvement</li>
              <li>With {statisticalPower}% power to avoid false negatives</li>
            </ul>
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
  );
}
