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

const industryBenchmarks: Record<string, { low: number; average: number; high: number }> = {
  "E-commerce": { low: 20, average: 45, high: 70 },
  "Blog/Content": { low: 40, average: 65, high: 90 },
  "Lead Generation": { low: 30, average: 50, high: 70 },
  "SaaS": { low: 10, average: 35, high: 60 },
  "Landing Pages": { low: 60, average: 75, high: 90 },
  "News/Media": { low: 40, average: 60, high: 80 },
  "Other": { low: 26, average: 55, high: 80 },
};

export function BounceRateForm() {
  const [totalSessions, setTotalSessions] = useState("");
  const [bouncedSessions, setBouncedSessions] = useState("");
  const [industry, setIndustry] = useState("E-commerce");

  const calculateBounceRate = () => {
    const total = parseFloat(totalSessions);
    const bounced = parseFloat(bouncedSessions);
    if (!total || !bounced || total === 0) return null;
    return (bounced / total) * 100;
  };

  const bounceRate = calculateBounceRate();
  const benchmark = industryBenchmarks[industry];

  const getPerformanceLevel = (rate: number) => {
    if (rate <= benchmark.low) return { label: "Excellent", variant: "success" as const };
    if (rate <= benchmark.average) return { label: "Good", variant: "info" as const };
    if (rate <= benchmark.high) return { label: "Needs Improvement", variant: "warning" as const };
    return { label: "Poor", variant: "error" as const };
  };

  const clearForm = () => {
    setTotalSessions("");
    setBouncedSessions("");
    setIndustry("E-commerce");
  };

  return (
    <div className="space-y-6">
      <ToolField
        label="Total Sessions"
        htmlFor="brc-total-sessions"
        required
        hint="Total number of sessions in the time period"
      >
        <ToolInput
          id="brc-total-sessions"
          type="number"
          value={totalSessions}
          onChange={e => setTotalSessions(e.target.value)}
          placeholder="10000"
        />
      </ToolField>

      <ToolField
        label="Bounced Sessions"
        htmlFor="brc-bounced-sessions"
        required
        hint="Sessions with only one pageview (single-page visits)"
      >
        <ToolInput
          id="brc-bounced-sessions"
          type="number"
          value={bouncedSessions}
          onChange={e => setBouncedSessions(e.target.value)}
          placeholder="4500"
        />
      </ToolField>

      <ToolField label="Industry Type" htmlFor="brc-industry" hint="Select your industry to compare with benchmarks">
        <ToolSelect id="brc-industry" value={industry} onChange={e => setIndustry(e.target.value)}>
          {Object.keys(industryBenchmarks).map(ind => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      {bounceRate !== null && (
        <ToolResultDivider>
          <ToolResult label="Your Bounce Rate" value={`${bounceRate.toFixed(2)}%`} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ToolStat label="Excellent" value={`≤${benchmark.low}%`} />
            <ToolStat label="Average" value={`~${benchmark.average}%`} />
            <ToolStat label="Needs Work" value={`≥${benchmark.high}%`} />
          </div>

          {(() => {
            const perf = getPerformanceLevel(bounceRate);
            return (
              <ToolCallout variant={perf.variant} title={`${perf.label}!`}>
                {perf.label === "Excellent"
                  ? `Your bounce rate is well below the ${industry.toLowerCase()} average of ${benchmark.average}%. You're doing great at keeping visitors engaged!`
                  : perf.label === "Good"
                    ? `Your bounce rate is close to the ${industry.toLowerCase()} average of ${benchmark.average}%. There's room for improvement.`
                    : perf.label === "Needs Improvement"
                      ? `Your bounce rate is above the ${industry.toLowerCase()} average of ${benchmark.average}%. Consider improving page load speed, content quality, or user experience.`
                      : `Your bounce rate is significantly higher than the ${industry.toLowerCase()} average of ${benchmark.average}%. Focus on improving content relevance, page speed, and user experience.`}
              </ToolCallout>
            );
          })()}
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
