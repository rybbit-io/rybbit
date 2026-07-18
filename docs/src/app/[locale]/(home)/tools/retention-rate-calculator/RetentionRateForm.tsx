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

export function RetentionRateForm() {
  const [customersStart, setCustomersStart] = useState("");
  const [customersEnd, setCustomersEnd] = useState("");
  const [newCustomers, setNewCustomers] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("SaaS");
  const [retentionRate, setRetentionRate] = useState<number | null>(null);

  const industryBenchmarks: Record<string, { monthly: number; annual: number }> = {
    "SaaS": { monthly: 93, annual: 35 },
    "E-commerce": { monthly: 38, annual: 30 },
    "Subscription Box": { monthly: 72, annual: 40 },
    "Media/Publishing": { monthly: 84, annual: 55 },
    "Financial Services": { monthly: 95, annual: 75 },
    "Telecom": { monthly: 97, annual: 78 },
    "Mobile Apps": { monthly: 42, annual: 15 },
    "Fitness/Wellness": { monthly: 71, annual: 45 },
  };

  const calculateRetentionRate = () => {
    const startNum = parseFloat(customersStart);
    const endNum = parseFloat(customersEnd);
    const newNum = parseFloat(newCustomers);

    if (isNaN(startNum) || isNaN(endNum) || isNaN(newNum) || startNum === 0) {
      setRetentionRate(null);
      return;
    }

    const result = ((endNum - newNum) / startNum) * 100;
    setRetentionRate(Math.max(0, result)); // Ensure non-negative
  };

  const clearForm = () => {
    setCustomersStart("");
    setCustomersEnd("");
    setNewCustomers("");
    setSelectedIndustry("SaaS");
    setRetentionRate(null);
  };

  const getBenchmarkComparison = (period: "monthly" | "annual") => {
    if (retentionRate === null) return null;
    const benchmark = industryBenchmarks[selectedIndustry][period];
    const difference = retentionRate - benchmark;
    return { benchmark, difference };
  };

  const monthlyComparison = getBenchmarkComparison("monthly");
  const annualComparison = getBenchmarkComparison("annual");

  return (
    <div className="space-y-6">
      <ToolField
        label="Customers at Start of Period"
        htmlFor="rr-start"
        required
        hint="Number of customers at the beginning of the period"
      >
        <ToolInput
          id="rr-start"
          type="number"
          value={customersStart}
          onChange={e => setCustomersStart(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateRetentionRate()}
          placeholder="1000"
        />
      </ToolField>

      <ToolField
        label="Customers at End of Period"
        htmlFor="rr-end"
        required
        hint="Number of customers at the end of the period"
      >
        <ToolInput
          id="rr-end"
          type="number"
          value={customersEnd}
          onChange={e => setCustomersEnd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateRetentionRate()}
          placeholder="920"
        />
      </ToolField>

      <ToolField
        label="New Customers Acquired"
        htmlFor="rr-new"
        required
        hint="Number of new customers acquired during the period"
      >
        <ToolInput
          id="rr-new"
          type="number"
          value={newCustomers}
          onChange={e => setNewCustomers(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateRetentionRate()}
          placeholder="150"
        />
      </ToolField>

      <ToolField label="Industry" htmlFor="rr-industry" hint="Select your industry to compare against benchmarks">
        <ToolSelect id="rr-industry" value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}>
          {Object.keys(industryBenchmarks).map(industry => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {retentionRate !== null && (
        <ToolResultDivider>
          <ToolResult
            label="Retention Rate"
            value={`${retentionRate.toFixed(2)}%`}
            sub={`Churn Rate: ${(100 - retentionRate).toFixed(2)}%`}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {monthlyComparison && (
              <ToolCallout
                variant={monthlyComparison.difference >= 0 ? "success" : "warning"}
                icon={null}
                title={`Monthly Benchmark — ${monthlyComparison.benchmark}%`}
              >
                {monthlyComparison.difference >= 0 ? (
                  <>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {monthlyComparison.difference.toFixed(1)}%
                    </span>{" "}
                    above average
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-amber-600 dark:text-amber-500">
                      {Math.abs(monthlyComparison.difference).toFixed(1)}%
                    </span>{" "}
                    below average
                  </>
                )}
              </ToolCallout>
            )}

            {annualComparison && (
              <ToolCallout
                variant={annualComparison.difference >= 0 ? "success" : "warning"}
                icon={null}
                title={`Annual Benchmark — ${annualComparison.benchmark}%`}
              >
                {annualComparison.difference >= 0 ? (
                  <>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {annualComparison.difference.toFixed(1)}%
                    </span>{" "}
                    above average
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-amber-600 dark:text-amber-500">
                      {Math.abs(annualComparison.difference).toFixed(1)}%
                    </span>{" "}
                    below average
                  </>
                )}
              </ToolCallout>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ToolStat label="Starting Customers" value={parseFloat(customersStart).toLocaleString()} />
            <ToolStat label="Ending Customers" value={parseFloat(customersEnd).toLocaleString()} />
            <ToolStat
              label="Retained Customers"
              value={(parseFloat(customersEnd) - parseFloat(newCustomers)).toLocaleString()}
            />
          </div>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateRetentionRate} className="flex-1">
          Calculate Retention Rate
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
