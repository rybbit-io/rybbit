"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import Link from "next/link";
import { useState } from "react";

export default function PageSpeedCalculatorPage() {
  const [currentLoadTime, setCurrentLoadTime] = useState("");
  const [targetLoadTime, setTargetLoadTime] = useState("");
  const [monthlyVisitors, setMonthlyVisitors] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [averageOrderValue, setAverageOrderValue] = useState("");

  const calculateImpact = () => {
    const current = parseFloat(currentLoadTime);
    const target = parseFloat(targetLoadTime);
    const visitors = parseFloat(monthlyVisitors);
    const cr = parseFloat(conversionRate) / 100;
    const aov = parseFloat(averageOrderValue);

    if (!current || !target || !visitors || !cr || !aov) return null;

    // Research shows that for every 1 second delay:
    // - Bounce rate increases by ~7%
    // - Conversion rate decreases by ~7%
    const timeDifference = current - target;

    // Calculate conversion impact (0.07 = 7% per second)
    const conversionImpact = timeDifference * 0.07;
    const newConversionRate = cr * (1 + conversionImpact);

    // Calculate bounce rate impact
    const bounceRateIncrease = Math.abs(timeDifference) * 7; // Percentage points

    // Calculate revenue impact
    const currentRevenue = visitors * cr * aov;
    const newRevenue = visitors * newConversionRate * aov;
    const monthlyImpact = newRevenue - currentRevenue;
    const annualImpact = monthlyImpact * 12;

    // Bounce rate calculation (assume current is 50% baseline)
    const currentBounceRate = 50;
    const newBounceRate = timeDifference < 0
      ? Math.max(currentBounceRate + bounceRateIncrease, 0)
      : Math.min(currentBounceRate + bounceRateIncrease, 100);

    return {
      conversionImpact: conversionImpact * 100,
      newConversionRate: newConversionRate * 100,
      currentRevenue,
      newRevenue,
      monthlyImpact,
      annualImpact,
      bounceRateChange: bounceRateIncrease,
      currentBounceRate,
      newBounceRate,
      timeDifference
    };
  };

  const metrics = calculateImpact();

  const clearForm = () => {
    setCurrentLoadTime("");
    setTargetLoadTime("");
    setMonthlyVisitors("");
    setConversionRate("");
    setAverageOrderValue("");
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
            Page Speed Impact Calculator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Calculate how page load time affects your conversions and revenue. See the real cost of a slow website.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-16">
          <div className="space-y-6">
            {/* Current Load Time */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Current Page Load Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={currentLoadTime}
                  onChange={e => setCurrentLoadTime(e.target.value)}
                  placeholder="4.5"
                  className="w-full pl-4 pr-20 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">seconds</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Your current page load time (check with PageSpeed Insights)</p>
            </div>

            {/* Target Load Time */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Target Page Load Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={targetLoadTime}
                  onChange={e => setTargetLoadTime(e.target.value)}
                  placeholder="2.0"
                  className="w-full pl-4 pr-20 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">seconds</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Your target load time (recommended: under 3 seconds)</p>
            </div>

            {/* Monthly Visitors */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Monthly Visitors <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={monthlyVisitors}
                onChange={e => setMonthlyVisitors(e.target.value)}
                placeholder="50000"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Total monthly visitors</p>
            </div>

            {/* Conversion Rate */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Current Conversion Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={conversionRate}
                  onChange={e => setConversionRate(e.target.value)}
                  placeholder="2.5"
                  className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">%</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Your current conversion rate</p>
            </div>

            {/* Average Order Value */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Average Order Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={averageOrderValue}
                  onChange={e => setAverageOrderValue(e.target.value)}
                  placeholder="75.00"
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Average value per conversion</p>
            </div>

            {/* Results */}
            {metrics && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    {metrics.monthlyImpact >= 0 ? "Monthly Revenue Gain" : "Monthly Revenue Loss"}
                  </label>
                  <div className={`px-4 py-6 border rounded-lg text-center ${
                    metrics.monthlyImpact >= 0
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                  }`}>
                    <div className={`text-4xl font-bold ${
                      metrics.monthlyImpact >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {metrics.monthlyImpact >= 0 ? "+" : "-"}${Math.abs(metrics.monthlyImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">per month</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Annual Impact
                    </label>
                    <div className={`px-4 py-4 border rounded-lg text-center ${
                      metrics.annualImpact >= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                    }`}>
                      <div className={`text-2xl font-bold ${
                        metrics.annualImpact >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {metrics.annualImpact >= 0 ? "+" : "-"}${Math.abs(metrics.annualImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Conversion Rate Change
                    </label>
                    <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {metrics.conversionImpact >= 0 ? "+" : ""}{metrics.conversionImpact.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      New Conversion Rate
                    </label>
                    <div className="px-4 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {metrics.newConversionRate.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Bounce Rate Impact
                    </label>
                    <div className="px-4 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {metrics.timeDifference > 0 ? "+" : ""}{metrics.bounceRateChange.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${
                  metrics.monthlyImpact >= 0
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
                    : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-200"
                }`}>
                  <h3 className="font-semibold mb-2">Impact Summary:</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Improving load time from <strong>{currentLoadTime}s</strong> to <strong>{targetLoadTime}s</strong></li>
                    <li>• Conversion rate changes from <strong>{parseFloat(conversionRate).toFixed(2)}%</strong> to <strong>{metrics.newConversionRate.toFixed(2)}%</strong></li>
                    <li>• Potential revenue impact: <strong>${Math.abs(metrics.monthlyImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</strong> ({metrics.monthlyImpact >= 0 ? "gain" : "loss"})</li>
                    <li>• Based on industry research: 7% conversion impact per second of load time</li>
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
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding Page Speed Impact</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How much does page speed really matter?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Studies show that for every 1 second delay in page load time, conversions decrease by approximately 7%, bounce rate increases by 7%, and customer satisfaction drops by 16%. A 2-second delay can result in abandonment rates up to 87% for e-commerce sites.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What's a good page load time?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Google recommends pages load in under 3 seconds on mobile. However, the faster the better—pages that load in under 1 second see significantly higher engagement. Amazon found that every 100ms improvement in load time increased revenue by 1%.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How can I improve my page speed?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Key improvements include: optimizing images (compress and use modern formats), minifying CSS/JS, enabling browser caching, using a CDN, reducing server response time, eliminating render-blocking resources, and choosing lightweight analytics like{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit
                  </Link>{" "}
                  which adds minimal overhead.
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
            Lightning-fast analytics that won't slow you down
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Rybbit's tiny 3KB script loads asynchronously and won't impact your page speed. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "page_speed_calculator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
