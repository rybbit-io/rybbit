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

export function CostPerAcquisitionForm() {
  const [spend, setSpend] = useState("");
  const [conversions, setConversions] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("E-commerce");
  const [cpa, setCpa] = useState<number | null>(null);

  const industryBenchmarks: Record<string, number> = {
    "E-commerce": 45.27,
    "SaaS": 205,
    "B2B": 197,
    "Finance": 44,
    "Healthcare": 189,
    "Education": 116,
    "Real Estate": 213,
    "Travel": 7.19,
    "Legal Services": 135,
    "Home Services": 81,
  };

  const calculateCPA = () => {
    const spendNum = parseFloat(spend);
    const conversionsNum = parseFloat(conversions);

    if (isNaN(spendNum) || isNaN(conversionsNum) || conversionsNum === 0) {
      setCpa(null);
      return;
    }

    const result = spendNum / conversionsNum;
    setCpa(result);
  };

  const clearForm = () => {
    setSpend("");
    setConversions("");
    setSelectedIndustry("E-commerce");
    setCpa(null);
  };

  const getBenchmarkComparison = () => {
    if (cpa === null) return null;
    const benchmark = industryBenchmarks[selectedIndustry];
    const difference = ((cpa - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  return (
    <div className="space-y-6">
      <ToolField
        label="Total Marketing Spend ($)"
        htmlFor="cpa-spend"
        required
        hint="Total amount spent on marketing campaigns"
      >
        <ToolInput
          id="cpa-spend"
          type="number"
          value={spend}
          onChange={e => setSpend(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPA()}
          placeholder="10000"
        />
      </ToolField>

      <ToolField
        label="Number of Conversions"
        htmlFor="cpa-conversions"
        required
        hint="Total number of acquisitions or conversions achieved"
      >
        <ToolInput
          id="cpa-conversions"
          type="number"
          value={conversions}
          onChange={e => setConversions(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPA()}
          placeholder="150"
        />
      </ToolField>

      <ToolField label="Industry" htmlFor="cpa-industry" hint="Select your industry to compare against benchmarks">
        <ToolSelect id="cpa-industry" value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}>
          {Object.keys(industryBenchmarks).map(industry => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {cpa !== null && (
        <ToolResultDivider>
          <ToolResult label="Cost Per Acquisition" value={`$${cpa.toFixed(2)}`} />

          {comparison && (
            <ToolCallout
              variant={comparison.difference <= 0 ? "success" : comparison.difference <= 20 ? "info" : "warning"}
              icon={null}
              title={`Industry Benchmark: ${selectedIndustry} — $${comparison.benchmark.toFixed(2)}`}
            >
              {comparison.difference <= 0 ? (
                <>
                  Your CPA is{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.abs(comparison.difference).toFixed(1)}% below
                  </span>{" "}
                  the industry average
                </>
              ) : (
                <>
                  Your CPA is{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {comparison.difference.toFixed(1)}% above
                  </span>{" "}
                  the industry average
                </>
              )}
            </ToolCallout>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToolStat label="Total Spend" value={`$${parseFloat(spend).toLocaleString()}`} />
            <ToolStat label="Conversions" value={parseFloat(conversions).toLocaleString()} />
          </div>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateCPA} className="flex-1">
          Calculate CPA
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
