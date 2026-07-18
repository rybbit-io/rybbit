"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolCallout,
  ToolField,
  ToolInput,
  ToolResult,
  ToolResultDivider,
  ToolSelect,
  ToolStat,
} from "../components/tool-ui";

export function CostPerMilleForm() {
  const [spend, setSpend] = useState("");
  const [impressions, setImpressions] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("Google Display");
  const [cpm, setCpm] = useState<number | null>(null);

  const platformBenchmarks: Record<string, number> = {
    "Google Display": 2.8,
    "Google Search": 38.4,
    "Facebook Feed": 11.2,
    "Instagram Feed": 7.91,
    "Instagram Stories": 6.7,
    "LinkedIn": 33.8,
    "Twitter": 6.46,
    "TikTok": 9.42,
    "YouTube": 9.68,
    "Pinterest": 30,
  };

  const calculateCPM = () => {
    const spendNum = parseFloat(spend);
    const impressionsNum = parseFloat(impressions);

    if (isNaN(spendNum) || isNaN(impressionsNum) || impressionsNum === 0) {
      setCpm(null);
      return;
    }

    const result = (spendNum / impressionsNum) * 1000;
    setCpm(result);
  };

  const clearForm = () => {
    setSpend("");
    setImpressions("");
    setSelectedPlatform("Google Display");
    setCpm(null);
  };

  const getBenchmarkComparison = () => {
    if (cpm === null) return null;
    const benchmark = platformBenchmarks[selectedPlatform];
    const difference = ((cpm - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <ToolField
        label="Total Ad Spend ($)"
        htmlFor="cpm-spend"
        required
        hint="Total amount spent on advertising"
      >
        <ToolInput
          id="cpm-spend"
          type="number"
          value={spend}
          onChange={e => setSpend(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPM()}
          placeholder="5000"
        />
      </ToolField>

      <ToolField
        label="Total Impressions"
        htmlFor="cpm-impressions"
        required
        hint="Number of times your ad was displayed"
      >
        <ToolInput
          id="cpm-impressions"
          type="number"
          value={impressions}
          onChange={e => setImpressions(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPM()}
          placeholder="500000"
        />
      </ToolField>

      <ToolField
        label="Platform"
        htmlFor="cpm-platform"
        hint="Select advertising platform to compare against benchmarks"
      >
        <ToolSelect id="cpm-platform" value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)}>
          {Object.keys(platformBenchmarks).map(platform => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {cpm !== null && (
        <ToolResultDivider>
          <ToolResult label="Cost Per Mille (CPM)" value={`$${cpm.toFixed(2)}`} sub="Cost per 1,000 impressions" />

          {comparison && (
            <ToolCallout
              variant={comparison.difference <= 0 ? "success" : comparison.difference <= 20 ? "info" : "warning"}
              icon={null}
              title={`Platform Benchmark: ${selectedPlatform} — $${comparison.benchmark.toFixed(2)}`}
            >
              {comparison.difference <= 0 ? (
                <>
                  Your CPM is{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.abs(comparison.difference).toFixed(1)}% below
                  </span>{" "}
                  the platform average
                </>
              ) : (
                <>
                  Your CPM is{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {comparison.difference.toFixed(1)}% above
                  </span>{" "}
                  the platform average
                </>
              )}
            </ToolCallout>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToolStat label="Total Spend" value={`$${parseFloat(spend).toLocaleString()}`} />
            <ToolStat label="Total Impressions" value={parseFloat(impressions).toLocaleString()} />
          </div>

          <ToolCallout variant="info" title="Estimated Reach">
            At an average frequency of 3, your {parseFloat(impressions).toLocaleString()} impressions reached
            approximately <strong>{Math.round(parseFloat(impressions) / 3).toLocaleString()}</strong> unique users.
          </ToolCallout>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateCPM} className="flex-1">
          Calculate CPM
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
