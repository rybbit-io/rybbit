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

export function CostPerViewForm() {
  const [spend, setSpend] = useState("");
  const [views, setViews] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("YouTube");
  const [cpv, setCpv] = useState<number | null>(null);

  const platformBenchmarks: Record<string, number> = {
    "YouTube": 0.06,
    "Facebook Video": 0.02,
    "Instagram Video": 0.05,
    "TikTok": 0.07,
    "LinkedIn Video": 0.15,
    "Twitter Video": 0.03,
    "Pinterest Video": 0.04,
    "Snapchat": 0.08,
  };

  const calculateCPV = () => {
    const spendNum = parseFloat(spend);
    const viewsNum = parseFloat(views);

    if (isNaN(spendNum) || isNaN(viewsNum) || viewsNum === 0) {
      setCpv(null);
      return;
    }

    const result = spendNum / viewsNum;
    setCpv(result);
  };

  const clearForm = () => {
    setSpend("");
    setViews("");
    setSelectedPlatform("YouTube");
    setCpv(null);
  };

  const getBenchmarkComparison = () => {
    if (cpv === null) return null;
    const benchmark = platformBenchmarks[selectedPlatform];
    const difference = ((cpv - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <ToolField
        label="Total Ad Spend ($)"
        htmlFor="cpv-spend"
        required
        hint="Total amount spent on video advertising"
      >
        <ToolInput
          id="cpv-spend"
          type="number"
          value={spend}
          onChange={e => setSpend(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPV()}
          placeholder="1000"
        />
      </ToolField>

      <ToolField
        label="Total Video Views"
        htmlFor="cpv-views"
        required
        hint="Number of times your video ad was viewed"
      >
        <ToolInput
          id="cpv-views"
          type="number"
          value={views}
          onChange={e => setViews(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPV()}
          placeholder="15000"
        />
      </ToolField>

      <ToolField label="Platform" htmlFor="cpv-platform" hint="Select platform to compare against benchmarks">
        <ToolSelect id="cpv-platform" value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)}>
          {Object.keys(platformBenchmarks).map(platform => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {cpv !== null && (
        <ToolResultDivider>
          <ToolResult label="Cost Per View" value={`$${cpv.toFixed(3)}`} />

          {comparison && (
            <ToolCallout
              variant={comparison.difference <= 0 ? "success" : comparison.difference <= 20 ? "info" : "warning"}
              icon={null}
              title={`Platform Benchmark: ${selectedPlatform} — $${comparison.benchmark.toFixed(3)}`}
            >
              {comparison.difference <= 0 ? (
                <>
                  Your CPV is{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.abs(comparison.difference).toFixed(1)}% below
                  </span>{" "}
                  the platform average
                </>
              ) : (
                <>
                  Your CPV is{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {comparison.difference.toFixed(1)}% above
                  </span>{" "}
                  the platform average
                </>
              )}
            </ToolCallout>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ToolStat label="Total Spend" value={`$${parseFloat(spend).toLocaleString()}`} />
            <ToolStat label="Total Views" value={parseFloat(views).toLocaleString()} />
            <ToolStat label="Cost Per 1K Views" value={`$${(cpv * 1000).toFixed(2)}`} />
          </div>

          <ToolCallout variant="info" title="View-Through Rate (VTR)">
            If you received {parseFloat(views).toLocaleString()} views from{" "}
            {Math.round(parseFloat(views) * 2).toLocaleString()} impressions, your view-through rate would be{" "}
            <strong>50%</strong>. Higher VTR indicates more engaging content and better targeting.
          </ToolCallout>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateCPV} className="flex-1">
          Calculate CPV
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
