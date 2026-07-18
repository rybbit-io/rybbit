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

export function ConversionRateForm() {
  const [visitors, setVisitors] = useState("");
  const [conversions, setConversions] = useState("");
  const [selectedSource, setSelectedSource] = useState("Overall Website");
  const [conversionRate, setConversionRate] = useState<number | null>(null);

  const sourceBenchmarks: Record<string, number> = {
    "Overall Website": 2.35,
    "E-commerce": 2.86,
    "B2B": 2.23,
    "SaaS": 3.0,
    "Landing Pages": 4.02,
    "Email Campaigns": 3.2,
    "Social Media": 1.85,
    "Paid Search": 3.75,
    "Organic Search": 2.4,
    "Display Ads": 0.77,
  };

  const calculateConversionRate = () => {
    const visitorsNum = parseFloat(visitors);
    const conversionsNum = parseFloat(conversions);

    if (isNaN(visitorsNum) || isNaN(conversionsNum) || visitorsNum === 0) {
      setConversionRate(null);
      return;
    }

    const result = (conversionsNum / visitorsNum) * 100;
    setConversionRate(result);
  };

  const clearForm = () => {
    setVisitors("");
    setConversions("");
    setSelectedSource("Overall Website");
    setConversionRate(null);
  };

  const getBenchmarkComparison = () => {
    if (conversionRate === null) return null;
    const benchmark = sourceBenchmarks[selectedSource];
    const difference = conversionRate - benchmark;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <ToolField label="Total Visitors" htmlFor="crc-visitors" required hint="Total number of visitors or sessions">
        <ToolInput
          id="crc-visitors"
          type="number"
          value={visitors}
          onChange={e => setVisitors(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateConversionRate()}
          placeholder="10000"
        />
      </ToolField>

      <ToolField
        label="Total Conversions"
        htmlFor="crc-conversions"
        required
        hint="Number of successful conversions (purchases, sign-ups, etc.)"
      >
        <ToolInput
          id="crc-conversions"
          type="number"
          value={conversions}
          onChange={e => setConversions(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateConversionRate()}
          placeholder="235"
        />
      </ToolField>

      <ToolField
        label="Traffic Source / Type"
        htmlFor="crc-source"
        hint="Select traffic source to compare against benchmarks"
      >
        <ToolSelect id="crc-source" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
          {Object.keys(sourceBenchmarks).map(source => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {conversionRate !== null && (
        <ToolResultDivider>
          <ToolResult label="Conversion Rate" value={`${conversionRate.toFixed(2)}%`} />

          {comparison && (
            <ToolCallout
              variant={comparison.difference >= 0 ? "success" : comparison.difference >= -0.5 ? "info" : "warning"}
              icon={null}
              title={`Benchmark: ${selectedSource} — ${comparison.benchmark.toFixed(2)}%`}
            >
              {comparison.difference >= 0 ? (
                <>
                  Your conversion rate is{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {comparison.difference.toFixed(2)}%
                  </span>{" "}
                  above the benchmark.
                </>
              ) : (
                <>
                  Your conversion rate is{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {Math.abs(comparison.difference).toFixed(2)}%
                  </span>{" "}
                  below the benchmark.
                </>
              )}
            </ToolCallout>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ToolStat label="Total Visitors" value={parseFloat(visitors).toLocaleString()} />
            <ToolStat label="Conversions" value={parseFloat(conversions).toLocaleString()} />
            <ToolStat
              label="Non-Conversions"
              value={(parseFloat(visitors) - parseFloat(conversions)).toLocaleString()}
            />
          </div>

          {conversionRate < 1 && (
            <ToolCallout variant="warning" title="Low conversion rate">
              Consider optimizing your landing page, improving your value proposition, or refining your targeting to
              improve conversions.
            </ToolCallout>
          )}
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateConversionRate} className="flex-1">
          Calculate Conversion Rate
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
