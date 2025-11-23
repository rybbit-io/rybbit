"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import Link from "next/link";
import { useState } from "react";

export default function TrafficValueCalculatorPage() {
  const [monthlyVisitors, setMonthlyVisitors] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [averageOrderValue, setAverageOrderValue] = useState("");
  const [profitMargin, setProfitMargin] = useState("");

  const calculateValue = () => {
    const visitors = parseFloat(monthlyVisitors);
    const cr = parseFloat(conversionRate) / 100;
    const aov = parseFloat(averageOrderValue);
    const margin = parseFloat(profitMargin) / 100;

    if (!visitors || !cr || !aov || !margin) return null;

    const conversions = visitors * cr;
    const revenue = conversions * aov;
    const profit = revenue * margin;
    const valuePerVisitor = profit / visitors;
    const annualProfit = profit * 12;

    return {
      conversions,
      revenue,
      profit,
      valuePerVisitor,
      annualProfit
    };
  };

  const metrics = calculateValue();

  const clearForm = () => {
    setMonthlyVisitors("");
    setConversionRate("");
    setAverageOrderValue("");
    setProfitMargin("");
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
            Traffic Value Calculator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Estimate the monetary value of your website traffic. Understand what each visitor is worth to your business.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-16">
          <div className="space-y-6">
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Total visitors per month</p>
            </div>

            {/* Conversion Rate */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Conversion Rate <span className="text-red-500">*</span>
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Percentage of visitors who convert</p>
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Average revenue per conversion</p>
            </div>

            {/* Profit Margin */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Profit Margin <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={profitMargin}
                  onChange={e => setProfitMargin(e.target.value)}
                  placeholder="30"
                  className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">%</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Net profit margin per sale</p>
            </div>

            {/* Results */}
            {metrics && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Value Per Visitor
                  </label>
                  <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
                    <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                      ${metrics.valuePerVisitor.toFixed(2)}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">per visitor</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Monthly Conversions
                    </label>
                    <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {Math.round(metrics.conversions).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Monthly Revenue
                    </label>
                    <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        ${metrics.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Monthly Profit
                    </label>
                    <div className="px-4 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${metrics.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Annual Profit
                    </label>
                    <div className="px-4 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${metrics.annualProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">What this means:</h3>
                  <ul className="text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
                    <li>• Each visitor is worth <strong>${metrics.valuePerVisitor.toFixed(2)}</strong> in profit</li>
                    <li>• A <strong>10% traffic increase</strong> would add <strong>${(metrics.profit * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</strong> in profit</li>
                    <li>• A <strong>1% conversion rate improvement</strong> would add <strong>${((parseFloat(monthlyVisitors) * 0.01 * parseFloat(averageOrderValue) * parseFloat(profitMargin) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</strong> in profit</li>
                    <li>• You can afford to spend up to <strong>${metrics.valuePerVisitor.toFixed(2)}</strong> per visitor on acquisition</li>
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
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding Traffic Value</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Why is knowing visitor value important?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Understanding visitor value helps you make informed decisions about marketing spend, SEO investments, and website optimization. If each visitor is worth $2, you can confidently spend up to $2 per visitor on advertising while breaking even, and anything less is profitable.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How can I increase visitor value?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  You can increase visitor value by: improving conversion rate (better UX, faster site, clearer CTAs), increasing average order value (upsells, cross-sells, bundles), improving profit margins (better pricing, lower costs), or attracting higher-intent traffic (better targeting, SEO for buyer keywords).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Should I include customer lifetime value?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  This calculator shows immediate value per visitor. For businesses with repeat customers, your actual visitor value is higher when including lifetime value (LTV). Track customer behavior over time with{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to understand true LTV.
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
            Maximize your traffic value with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Track conversions, revenue, and visitor sources to optimize your most valuable traffic. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "traffic_value_calculator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
