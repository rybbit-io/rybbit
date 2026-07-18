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

const industryBenchmarks: Record<string, number> = {
  "Search Ads": 3.17,
  "Display Ads": 0.46,
  "Social Media": 0.9,
  "Email Marketing": 2.6,
  "E-commerce": 2.69,
  "B2B": 2.41,
  "Other": 2.0,
};

export function CTRCalculatorForm() {
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
    <div className="space-y-6">
      <ToolField label="Total Impressions" htmlFor="ctr-impressions" required hint="How many times your ad was shown">
        <ToolInput
          id="ctr-impressions"
          type="number"
          value={impressions}
          onChange={e => setImpressions(e.target.value)}
          placeholder="10000"
        />
      </ToolField>

      <ToolField label="Total Clicks" htmlFor="ctr-clicks" required hint="How many clicks your ad received">
        <ToolInput
          id="ctr-clicks"
          type="number"
          value={clicks}
          onChange={e => setClicks(e.target.value)}
          placeholder="300"
        />
      </ToolField>

      <ToolField
        label="Industry / Channel"
        htmlFor="ctr-industry"
        hint="Select your industry to compare with benchmarks"
      >
        <ToolSelect id="ctr-industry" value={industry} onChange={e => setIndustry(e.target.value)}>
          {Object.keys(industryBenchmarks).map(ind => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {ctr !== null && (
        <ToolResultDivider>
          <ToolResult label="Your CTR" value={`${ctr.toFixed(2)}%`} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToolStat label={`${industry} Benchmark`} value={`${benchmark.toFixed(2)}%`} />
            <ToolStat
              label="vs. Benchmark"
              value={
                <span
                  className={
                    ctr >= benchmark ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"
                  }
                >
                  {ctr >= benchmark ? "+" : ""}
                  {(((ctr - benchmark) / benchmark) * 100).toFixed(1)}%
                </span>
              }
            />
          </div>

          <ToolCallout
            variant={ctr >= benchmark ? "success" : "warning"}
            icon={null}
            title={ctr >= benchmark ? "Great job!" : "Room for improvement"}
          >
            {ctr >= benchmark ? (
              <>
                Your CTR is{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {(((ctr - benchmark) / benchmark) * 100).toFixed(1)}%
                </span>{" "}
                higher than the {industry.toLowerCase()} benchmark.
              </>
            ) : (
              <>
                Your CTR is{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-500">
                  {Math.abs(((ctr - benchmark) / benchmark) * 100).toFixed(1)}%
                </span>{" "}
                below the {industry.toLowerCase()} benchmark. Consider improving your ad copy, targeting, or creative.
              </>
            )}
          </ToolCallout>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
