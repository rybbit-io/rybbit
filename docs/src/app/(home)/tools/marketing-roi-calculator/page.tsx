"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import Link from "next/link";
import { useState } from "react";

export default function MarketingROICalculatorPage() {
  const [adSpend, setAdSpend] = useState("");
  const [revenue, setRevenue] = useState("");
  const [costOfGoodsSold, setCostOfGoodsSold] = useState("");

  const calculateMetrics = () => {
    const spend = parseFloat(adSpend);
    const rev = parseFloat(revenue);
    const cogs = parseFloat(costOfGoodsSold) || 0;

    if (!spend || !rev || spend === 0) return null;

    const profit = rev - spend - cogs;
    const roi = (profit / spend) * 100;
    const roas = rev / spend;
    const profitMargin = (profit / rev) * 100;

    return { profit, roi, roas, profitMargin };
  };

  const metrics = calculateMetrics();

  const clearForm = () => {
    setAdSpend("");
    setRevenue("");
    setCostOfGoodsSold("");
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
            Marketing ROI Calculator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Calculate ROI, ROAS, and profit margins for your marketing campaigns. Make data-driven decisions about your ad spend.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-16">
          <div className="space-y-6">
            {/* Ad Spend */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Ad Spend <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                <input
                  type="number"
                  value={adSpend}
                  onChange={e => setAdSpend(e.target.value)}
                  placeholder="5000"
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Total amount spent on advertising</p>
            </div>

            {/* Revenue */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Revenue Generated <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                <input
                  type="number"
                  value={revenue}
                  onChange={e => setRevenue(e.target.value)}
                  placeholder="15000"
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Total revenue from the campaign</p>
            </div>

            {/* Cost of Goods Sold */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Cost of Goods Sold (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                <input
                  type="number"
                  value={costOfGoodsSold}
                  onChange={e => setCostOfGoodsSold(e.target.value)}
                  placeholder="3000"
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Direct costs of products sold (leave blank if not applicable)
              </p>
            </div>

            {/* Results */}
            {metrics && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ROI */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      ROI (Return on Investment)
                    </label>
                    <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
                      <div
                        className={`text-4xl font-bold ${
                          metrics.roi >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {metrics.roi >= 0 ? "+" : ""}
                        {metrics.roi.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* ROAS */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      ROAS (Return on Ad Spend)
                    </label>
                    <div className="px-4 py-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                      <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                        {metrics.roas.toFixed(2)}x
                      </div>
                    </div>
                  </div>

                  {/* Profit */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Net Profit
                    </label>
                    <div className="px-4 py-6 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                      <div
                        className={`text-3xl font-bold ${
                          metrics.profit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {metrics.profit >= 0 ? "+" : "-"}${Math.abs(metrics.profit).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Profit Margin */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Profit Margin
                    </label>
                    <div className="px-4 py-6 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                      <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                        {metrics.profitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border ${
                    metrics.roi >= 100
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                      : metrics.roi >= 0
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      metrics.roi >= 100
                        ? "text-emerald-900 dark:text-emerald-200"
                        : metrics.roi >= 0
                          ? "text-blue-900 dark:text-blue-200"
                          : "text-red-900 dark:text-red-200"
                    }`}
                  >
                    {metrics.roi >= 100 ? (
                      <>
                        <strong>Excellent ROI!</strong> You're generating ${metrics.roas.toFixed(2)} in revenue for every $1 spent. Your campaign is highly profitable.
                      </>
                    ) : metrics.roi >= 0 ? (
                      <>
                        <strong>Positive ROI.</strong> You're making a profit, but there may be room for optimization to improve returns.
                      </>
                    ) : (
                      <>
                        <strong>Negative ROI.</strong> Your campaign is losing money. Consider reviewing your targeting, creative, or product-market fit.
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
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding Marketing ROI</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is ROI vs ROAS?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  ROI (Return on Investment) measures your profit as a percentage of your investment, calculated as (Revenue - Cost) / Cost × 100. ROAS (Return on Ad Spend) measures revenue per dollar spent on advertising, calculated as Revenue / Ad Spend. ROI focuses on profitability, while ROAS focuses on revenue efficiency.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What is a good marketing ROI?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  A good marketing ROI varies by industry, but generally, a 5:1 ratio (500% ROI) is considered strong, meaning you earn $5 for every $1 spent. The average marketing ROI across industries is around 100-200%. For ROAS, 4:1 or higher is typically considered good, though this depends on your profit margins and business model.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How can I improve my marketing ROI?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  To improve ROI, focus on: targeting high-intent audiences, optimizing conversion rates, reducing customer acquisition costs, improving ad creative and messaging, A/B testing campaigns, focusing on high-performing channels, and tracking performance with analytics. Use{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to identify which campaigns and channels drive the best returns.
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
            Track your marketing ROI with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            See which campaigns generate the best ROI and optimize your marketing spend. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "roi_calculator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
