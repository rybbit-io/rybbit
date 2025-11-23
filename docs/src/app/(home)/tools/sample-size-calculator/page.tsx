"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import Link from "next/link";
import { useState } from "react";

export default function SampleSizeCalculatorPage() {
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Free Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
            A/B Test Sample Size Calculator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Calculate how many visitors you need for statistically significant A/B test results. Never run underpowered tests again.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-16">
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
                    <li>• You need {sampleSize.toLocaleString()} visitors to see variant A (control)</li>
                    <li>• You need {sampleSize.toLocaleString()} visitors to see variant B (treatment)</li>
                    <li>• This gives you {confidenceLevel}% confidence in detecting a {minimumDetectableEffect}% improvement</li>
                    <li>• With {statisticalPower}% power to avoid false negatives</li>
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
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding A/B Test Sample Sizes</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is minimum detectable effect (MDE)?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  MDE is the smallest change in conversion rate that you want to reliably detect. A smaller MDE requires a larger sample size. For example, detecting a 0.5% improvement requires many more visitors than detecting a 5% improvement.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Why do I need so many visitors?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Statistical significance requires enough data to distinguish real effects from random variation. Small sample sizes can lead to false positives (thinking something works when it doesn't) or false negatives (missing real improvements). Running tests to completion ensures reliable results.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  When should I stop my A/B test?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Run your test until you've reached the calculated sample size, even if you see early "winners." Stopping tests early increases the risk of false positives. Use{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to track your test progress and know when you've reached statistical significance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Run better A/B tests with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Track conversions, variants, and statistical significance in real-time. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "sample_size_calculator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
