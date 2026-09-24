"use client";

import { useState } from "react";

export function CostPerLeadForm() {
  const [spend, setSpend] = useState("");
  const [leads, setLeads] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("Overall");
  const [cpl, setCpl] = useState<number | null>(null);

  const channelBenchmarks: Record<string, number> = {
    "Overall": 198,
    "Google Ads": 116,
    "Facebook Ads": 97,
    "LinkedIn Ads": 75,
    "Instagram Ads": 94,
    "Content Marketing": 92,
    "Email Marketing": 53,
    "SEO/Organic": 31,
    "Webinars": 72,
    "Trade Shows": 811,
  };

  const calculateCPL = () => {
    const spendNum = parseFloat(spend);
    const leadsNum = parseFloat(leads);

    if (isNaN(spendNum) || isNaN(leadsNum) || leadsNum === 0) {
      setCpl(null);
      return;
    }

    const result = spendNum / leadsNum;
    setCpl(result);
  };

  const clearForm = () => {
    setSpend("");
    setLeads("");
    setSelectedChannel("Overall");
    setCpl(null);
  };

  const getBenchmarkComparison = () => {
    if (cpl === null) return null;
    const benchmark = channelBenchmarks[selectedChannel];
    const difference = ((cpl - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Total Marketing Spend ($) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={spend}
          onChange={(e) => setSpend(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPL()}
          placeholder="5000"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total amount spent on lead generation
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Number of Leads Generated <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={leads}
          onChange={(e) => setLeads(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && calculateCPL()}
          placeholder="50"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Total number of qualified leads acquired
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Marketing Channel
        </label>
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {Object.keys(channelBenchmarks).map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Select channel to compare against benchmarks
        </p>
      </div>

      {cpl !== null && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="px-4 py-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-center">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
              Cost Per Lead
            </div>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              ${cpl.toFixed(2)}
            </div>
          </div>

          {comparison && (
            <div
              className={`px-4 py-4 rounded-lg border ${
                comparison.difference <= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  : comparison.difference <= 20
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                  : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
              }`}
            >
              <div className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Channel Benchmark: {selectedChannel}
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                ${comparison.benchmark.toFixed(2)}
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {comparison.difference <= 0 ? (
                  <>
                    Your CPL is{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.abs(comparison.difference).toFixed(1)}% below
                    </span>{" "}
                    the channel average
                  </>
                ) : (
                  <>
                    Your CPL is{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {comparison.difference.toFixed(1)}% above
                    </span>{" "}
                    the channel average
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Total Spend
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                ${parseFloat(spend).toLocaleString()}
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Leads Generated
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {parseFloat(leads).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Lead to Customer Conversion
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              If your lead-to-customer conversion rate is <strong>20%</strong>, your cost per
              acquisition would be approximately{" "}
              <strong>${(cpl / 0.2).toFixed(2)}</strong>. Improving your conversion rate
              directly reduces acquisition costs.
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={calculateCPL}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
        >
          Calculate CPL
        </button>
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
