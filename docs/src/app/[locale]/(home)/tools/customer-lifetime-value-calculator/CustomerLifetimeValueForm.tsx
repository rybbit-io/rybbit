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

export function CustomerLifetimeValueForm() {
  const [averageValue, setAverageValue] = useState("");
  const [purchaseFrequency, setPurchaseFrequency] = useState("");
  const [customerLifespan, setCustomerLifespan] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [retentionRate, setRetentionRate] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("SaaS");
  const [clv, setClv] = useState<number | null>(null);

  const industryBenchmarks: Record<string, number> = {
    "SaaS": 1200,
    "E-commerce": 168,
    "Subscription Box": 420,
    "Financial Services": 5000,
    "Telecommunications": 3600,
    "Insurance": 7200,
    "Fitness/Gym": 1800,
    "Streaming Services": 850,
  };

  const calculateCLV = () => {
    const valueNum = parseFloat(averageValue);
    const frequencyNum = parseFloat(purchaseFrequency);
    const lifespanNum = parseFloat(customerLifespan);
    const marginNum = parseFloat(profitMargin) / 100;
    const retentionNum = parseFloat(retentionRate) / 100;

    if (
      isNaN(valueNum) ||
      isNaN(frequencyNum) ||
      isNaN(lifespanNum) ||
      isNaN(marginNum) ||
      isNaN(retentionNum)
    ) {
      setClv(null);
      return;
    }

    // Advanced CLV formula with retention rate adjustment
    // CLV = (Average Purchase Value × Purchase Frequency × Customer Lifespan × Profit Margin) × Retention Factor
    const retentionFactor = retentionNum > 0 ? 1 / (1 - retentionNum) : 1;
    const baseClv = valueNum * frequencyNum * lifespanNum * marginNum;
    const adjustedClv = baseClv * Math.min(retentionFactor, 3); // Cap retention multiplier at 3x

    setClv(adjustedClv);
  };

  const clearForm = () => {
    setAverageValue("");
    setPurchaseFrequency("");
    setCustomerLifespan("");
    setProfitMargin("");
    setRetentionRate("");
    setSelectedIndustry("SaaS");
    setClv(null);
  };

  const getBenchmarkComparison = () => {
    if (clv === null) return null;
    const benchmark = industryBenchmarks[selectedIndustry];
    const difference = ((clv - benchmark) / benchmark) * 100;
    return { benchmark, difference };
  };

  const comparison = getBenchmarkComparison();

  // Calculate churn rate for display
  const churnRate = retentionRate ? (100 - parseFloat(retentionRate)).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <ToolField
        label="Average Purchase Value ($)"
        htmlFor="clv-average-value"
        required
        hint="Average amount a customer spends per purchase"
      >
        <ToolInput
          id="clv-average-value"
          type="number"
          value={averageValue}
          onChange={e => setAverageValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCLV()}
          placeholder="100"
        />
      </ToolField>

      <ToolField
        label="Purchase Frequency (per year)"
        htmlFor="clv-purchase-frequency"
        required
        hint="Number of purchases per customer per year"
      >
        <ToolInput
          id="clv-purchase-frequency"
          type="number"
          value={purchaseFrequency}
          onChange={e => setPurchaseFrequency(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCLV()}
          placeholder="12"
        />
      </ToolField>

      <ToolField
        label="Customer Lifespan (years)"
        htmlFor="clv-lifespan"
        required
        hint="Average number of years a customer stays with you"
      >
        <ToolInput
          id="clv-lifespan"
          type="number"
          value={customerLifespan}
          onChange={e => setCustomerLifespan(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCLV()}
          placeholder="3"
        />
      </ToolField>

      <ToolField
        label="Profit Margin (%)"
        htmlFor="clv-margin"
        required
        hint="Average profit margin percentage"
      >
        <ToolInput
          id="clv-margin"
          type="number"
          value={profitMargin}
          onChange={e => setProfitMargin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCLV()}
          placeholder="20"
        />
      </ToolField>

      <ToolField
        label="Retention Rate (%)"
        htmlFor="clv-retention"
        required
        hint={
          <>
            Percentage of customers retained annually
            {churnRate && ` (Churn rate: ${churnRate}%)`}
          </>
        }
      >
        <ToolInput
          id="clv-retention"
          type="number"
          value={retentionRate}
          onChange={e => setRetentionRate(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCLV()}
          placeholder="85"
          max="100"
        />
      </ToolField>

      <ToolField label="Industry" htmlFor="clv-industry" hint="Select your industry to compare against benchmarks">
        <ToolSelect id="clv-industry" value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}>
          {Object.keys(industryBenchmarks).map(industry => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {clv !== null && (
        <ToolResultDivider>
          <ToolResult label="Customer Lifetime Value" value={`$${clv.toFixed(2)}`} />

          {comparison && (
            <ToolCallout
              variant={comparison.difference >= 0 ? "success" : comparison.difference >= -20 ? "info" : "warning"}
              icon={null}
              title={`Industry Benchmark: ${selectedIndustry} — $${comparison.benchmark.toLocaleString()}`}
            >
              {comparison.difference >= 0 ? (
                <>
                  Your CLV is{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {comparison.difference.toFixed(1)}% above
                  </span>{" "}
                  the industry average
                </>
              ) : (
                <>
                  Your CLV is{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {Math.abs(comparison.difference).toFixed(1)}% below
                  </span>{" "}
                  the industry average
                </>
              )}
            </ToolCallout>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToolStat
              label="Annual Customer Value"
              value={`$${(
                parseFloat(averageValue) *
                parseFloat(purchaseFrequency) *
                (parseFloat(profitMargin) / 100)
              ).toFixed(2)}`}
            />
            <ToolStat
              label="Total Revenue Potential"
              value={`$${(
                parseFloat(averageValue) *
                parseFloat(purchaseFrequency) *
                parseFloat(customerLifespan)
              ).toFixed(2)}`}
            />
          </div>

          <ToolCallout variant="info" title="CLV:CAC Ratio Guidance">
            A healthy business should have a CLV that's at least <strong>3x</strong> your Customer Acquisition Cost
            (CAC). With a CLV of ${clv.toFixed(2)}, your maximum sustainable CAC is approximately{" "}
            <strong>${(clv / 3).toFixed(2)}</strong>.
          </ToolCallout>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateCLV} className="flex-1">
          Calculate CLV
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
