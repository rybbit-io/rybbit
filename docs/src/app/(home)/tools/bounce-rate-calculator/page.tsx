"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import Link from "next/link";
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

export default function BounceRateCalculatorPage() {
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Free Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
            Bounce Rate Calculator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Calculate your website's bounce rate and compare it to industry benchmarks. See how well you're keeping visitors engaged.
          </p>
        </div>

        {/* Tool */}
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

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding Bounce Rate</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is bounce rate?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Bounce rate is the percentage of visitors who leave your website after viewing only one page without any interaction. A high bounce rate might indicate that your landing pages aren't relevant to visitors or your site has usability issues.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What's a good bounce rate?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  A "good" bounce rate varies by industry and page type. E-commerce sites typically aim for 20-45%, while blogs may see 65-90% and still be healthy. Landing pages naturally have higher bounce rates (60-90%) since they're designed for a single action.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How can I reduce my bounce rate?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  To reduce bounce rate: improve page load speed, ensure mobile responsiveness, create compelling content, add clear calls-to-action, use internal linking, improve content readability, and ensure your pages match visitor intent. Track your improvements with{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to see what works.
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
            Track bounce rate in real-time with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Monitor bounce rate by page, source, and device. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "bounce_rate_calculator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
