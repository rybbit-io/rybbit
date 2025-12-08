"use client";

import { useState } from "react";

export interface Metrics {
  profit: number;
  roi: number;
  roas: number;
  profitMargin: number;
}

export function MarketingROIForm() {
  const [adSpend, setAdSpend] = useState("");
  const [revenue, setRevenue] = useState("");
  const [costOfGoodsSold, setCostOfGoodsSold] = useState("");

  const calculateMetrics = (): Metrics | null => {
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
  );
}
