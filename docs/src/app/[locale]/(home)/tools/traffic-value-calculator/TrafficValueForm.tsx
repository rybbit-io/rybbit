"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";

export function TrafficValueForm() {
  const t = useExtracted();
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
      annualProfit,
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
    <>
      {/* Tool Section */}
      <div className="mb-16">
        <div className="space-y-6">
          {/* Monthly Visitors */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Monthly Visitors ")}
              <span className="text-red-500">*</span>
            </label>
            <input
              required
              aria-label={t("Monthly Visitors")}
              type="number"
              value={monthlyVisitors}
              onChange={e => setMonthlyVisitors(e.target.value)}
              placeholder={t("50000")}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t("Total visitors per month")}</p>
          </div>

          {/* Conversion Rate */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Conversion Rate ")}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                required
                aria-label={t("Conversion Rate")}
                type="number"
                step="0.01"
                value={conversionRate}
                onChange={e => setConversionRate(e.target.value)}
                placeholder={t("2.5")}
                className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                {t("%")}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t("Percentage of visitors who convert")}
            </p>
          </div>

          {/* Average Order Value */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Average Order Value ")}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                {t("$")}
              </span>
              <input
                required
                aria-label={t("Average Order Value")}
                type="number"
                step="0.01"
                value={averageOrderValue}
                onChange={e => setAverageOrderValue(e.target.value)}
                placeholder={t("75.00")}
                className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t("Average revenue per conversion")}</p>
          </div>

          {/* Profit Margin */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Profit Margin ")}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                required
                aria-label={t("Profit Margin")}
                type="number"
                step="0.1"
                value={profitMargin}
                onChange={e => setProfitMargin(e.target.value)}
                placeholder={t("30")}
                className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                {t("%")}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t("Net profit margin per sale")}</p>
          </div>

          {/* Results */}
          {metrics && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  {t("Value Per Visitor")}
                </label>
                <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                    {t("$")}
                    {metrics.valuePerVisitor.toFixed(2)}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{t("per visitor")}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    {t("Monthly Conversions")}
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {Math.round(metrics.conversions).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    {t("Monthly Revenue")}
                  </label>
                  <div className="px-4 py-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {t("$")}
                      {metrics.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    {t("Monthly Profit")}
                  </label>
                  <div className="px-4 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {t("$")}
                      {metrics.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    {t("Annual Profit")}
                  </label>
                  <div className="px-4 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {t("$")}
                      {metrics.annualProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">{t("What this means:")}</h3>
                <ul className="text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
                  <li>
                    {t("Each visitor is worth ")}
                    <strong>
                      {t("$")}
                      {metrics.valuePerVisitor.toFixed(2)}
                    </strong>{" "}
                    {t(" in profit")}
                  </li>
                  <li>
                    {t("A ")}
                    <strong>{t("10% traffic increase")}</strong> {t(" would add")}{" "}
                    <strong>
                      {t("$")}
                      {(metrics.profit * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      {t("/month")}
                    </strong>{" "}
                    {t("in profit")}
                  </li>
                  <li>
                    {t("A ")}
                    <strong>{t("1% conversion rate improvement")}</strong> {t(" would add")}{" "}
                    <strong>
                      {t("$")}
                      {(
                        (parseFloat(monthlyVisitors) *
                          0.01 *
                          parseFloat(averageOrderValue) *
                          parseFloat(profitMargin)) /
                        100
                      ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      {t("/month")}
                    </strong>{" "}
                    {t("in profit")}
                  </li>
                  <li>
                    {t("You can afford to spend up to ")}
                    <strong>
                      {t("$")}
                      {metrics.valuePerVisitor.toFixed(2)}
                    </strong>{" "}
                    {t(" per visitor on acquisition")}
                  </li>
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
              {t("Clear")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
