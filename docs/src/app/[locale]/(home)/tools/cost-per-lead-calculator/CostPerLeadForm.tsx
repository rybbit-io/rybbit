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
      <ToolField
        label="Total Marketing Spend ($)"
        htmlFor="cpl-spend"
        required
        hint="Total amount spent on lead generation"
      >
        <ToolInput
          id="cpl-spend"
          type="number"
          value={spend}
          onChange={e => setSpend(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPL()}
          placeholder="5000"
        />
      </ToolField>

      <ToolField
        label="Number of Leads Generated"
        htmlFor="cpl-leads"
        required
        hint="Total number of qualified leads acquired"
      >
        <ToolInput
          id="cpl-leads"
          type="number"
          value={leads}
          onChange={e => setLeads(e.target.value)}
          onKeyDown={e => e.key === "Enter" && calculateCPL()}
          placeholder="50"
        />
      </ToolField>

      <ToolField label="Marketing Channel" htmlFor="cpl-channel" hint="Select channel to compare against benchmarks">
        <ToolSelect id="cpl-channel" value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)}>
          {Object.keys(channelBenchmarks).map(channel => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {cpl !== null && (
        <ToolResultDivider>
          <ToolResult label="Cost Per Lead" value={`$${cpl.toFixed(2)}`} />

          {comparison && (
            <ToolCallout
              variant={comparison.difference <= 0 ? "success" : comparison.difference <= 20 ? "info" : "warning"}
              icon={null}
              title={`Channel Benchmark: ${selectedChannel} — $${comparison.benchmark.toFixed(2)}`}
            >
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
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {comparison.difference.toFixed(1)}% above
                  </span>{" "}
                  the channel average
                </>
              )}
            </ToolCallout>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToolStat label="Total Spend" value={`$${parseFloat(spend).toLocaleString()}`} />
            <ToolStat label="Leads Generated" value={parseFloat(leads).toLocaleString()} />
          </div>

          <ToolCallout variant="info" title="Lead to Customer Conversion">
            If your lead-to-customer conversion rate is <strong>20%</strong>, your cost per acquisition would be
            approximately <strong>${(cpl / 0.2).toFixed(2)}</strong>. Improving your conversion rate directly reduces
            acquisition costs.
          </ToolCallout>
        </ToolResultDivider>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton onClick={calculateCPL} className="flex-1">
          Calculate CPL
        </ToolButton>
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
