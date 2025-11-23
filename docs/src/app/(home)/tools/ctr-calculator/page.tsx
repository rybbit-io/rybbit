"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import Link from "next/link";
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

export default function CTRCalculatorPage() {
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Free Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
            CTR Calculator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Calculate your click-through rate and compare it to industry benchmarks. See how your campaigns perform against the competition.
          </p>
        </div>

        {/* Tool */}
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

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding CTR</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is CTR (Click-Through Rate)?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  CTR is the percentage of people who click on your ad or link after seeing it. It's calculated by dividing the number of clicks by the number of impressions and multiplying by 100. For example, if your ad was shown 10,000 times and received 300 clicks, your CTR is 3%.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is a good CTR?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  A "good" CTR varies by industry and channel. Generally, search ads average around 3.17%, display ads around 0.46%, and social media ads around 0.90%. Email marketing typically sees higher CTRs around 2.6%. Compare your results to industry benchmarks to gauge performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How can I improve my CTR?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  To improve CTR, focus on: writing compelling ad copy with clear value propositions, using strong calls-to-action, targeting the right audience, testing different creatives and headlines, ensuring ad relevance to search intent, and using ad extensions (for search ads). Track your results with{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to see what works best.
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
            Track your campaign performance with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Monitor CTR, conversions, and other key metrics in real-time. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "ctr_calculator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
