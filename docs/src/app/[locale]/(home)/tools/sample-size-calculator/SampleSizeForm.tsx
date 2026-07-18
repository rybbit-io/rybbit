"use client";

import { useState } from "react";
import { ToolButton, ToolCallout, ToolField, ToolInput, ToolResult, ToolResultDivider, ToolSelect, ToolStat } from "../components/tool-ui";

export function SampleSizeForm() {
  const [baselineConversion, setBaselineConversion] = useState("");
  const [minimumDetectableEffect, setMinimumDetectableEffect] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("95");
  const [statisticalPower, setStatisticalPower] = useState("80");

  const calculateSampleSize = () => {
    const baseline = parseFloat(baselineConversion) / 100;
    const mde = parseFloat(minimumDetectableEffect) / 100;
    const alpha = confidenceLevel === "90" ? 0.10 : confidenceLevel === "95" ? 0.05 : 0.01;
    const beta = statisticalPower === "80" ? 0.20 : 0.10;

    if (!baseline || !mde || baseline <= 0 || baseline >= 1) return null;

    // Z-scores for different confidence levels and power
    const zAlpha = confidenceLevel === "90" ? 1.645 : confidenceLevel === "95" ? 1.96 : 2.576;
    const zBeta = statisticalPower === "80" ? 0.84 : 1.28;

    // Alternative conversion rate
    const p2 = baseline + mde;

    // Average of the two proportions
    const pBar = (baseline + p2) / 2;

    // Sample size formula for proportions
    const n = Math.pow((zAlpha + zBeta), 2) * 2 * pBar * (1 - pBar) / Math.pow(mde, 2);

    return Math.ceil(n);
  };

  const sampleSize = calculateSampleSize();
  const totalVisitors = sampleSize ? sampleSize * 2 : null; // Total for both variants

  const clearForm = () => {
    setBaselineConversion("");
    setMinimumDetectableEffect("");
    setConfidenceLevel("95");
    setStatisticalPower("80");
  };

  return (
    <div className="space-y-6">
      <ToolField
        label="Baseline Conversion Rate"
        htmlFor="ssc-baseline"
        required
        hint="Your current conversion rate (control variant)"
      >
        <div className="relative">
          <ToolInput
            id="ssc-baseline"
            type="number"
            step="0.1"
            value={baselineConversion}
            onChange={e => setBaselineConversion(e.target.value)}
            placeholder="2.5"
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            %
          </span>
        </div>
      </ToolField>

      <ToolField
        label="Minimum Detectable Effect (MDE)"
        htmlFor="ssc-mde"
        required
        hint="Smallest improvement you want to detect (e.g., 0.5% absolute increase)"
      >
        <div className="relative">
          <ToolInput
            id="ssc-mde"
            type="number"
            step="0.1"
            value={minimumDetectableEffect}
            onChange={e => setMinimumDetectableEffect(e.target.value)}
            placeholder="0.5"
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            %
          </span>
        </div>
      </ToolField>

      <ToolField
        label="Confidence Level"
        htmlFor="ssc-confidence"
        hint="How confident you want to be in your results"
      >
        <ToolSelect id="ssc-confidence" value={confidenceLevel} onChange={e => setConfidenceLevel(e.target.value)}>
          <option value="90">90% (10% chance of false positive)</option>
          <option value="95">95% (5% chance of false positive) - Recommended</option>
          <option value="99">99% (1% chance of false positive)</option>
        </ToolSelect>
      </ToolField>

      <ToolField
        label="Statistical Power"
        htmlFor="ssc-power"
        hint="Probability of detecting an effect if it exists"
      >
        <ToolSelect id="ssc-power" value={statisticalPower} onChange={e => setStatisticalPower(e.target.value)}>
          <option value="80">80% (20% chance of false negative) - Recommended</option>
          <option value="90">90% (10% chance of false negative)</option>
        </ToolSelect>
      </ToolField>

      {sampleSize !== null && totalVisitors !== null && (
        <ToolResultDivider>
          <ToolResult
            label="Sample Size Per Variant"
            value={sampleSize.toLocaleString()}
            sub="visitors per variant (A and B)"
          />

          <ToolStat label="Total Test Size" value={`${totalVisitors.toLocaleString()} total visitors needed`} />

          <ToolCallout variant="info" title="Test Duration">
            If you get 1,000 visitors per day, you&apos;ll need approximately{" "}
            <strong>{Math.ceil(totalVisitors / 1000)} days</strong> to complete this test. At 5,000 visitors per day,
            you&apos;ll need <strong>{Math.ceil(totalVisitors / 5000)} days</strong>.
          </ToolCallout>

          <ToolCallout variant="tip" title="What this means:">
            <ul className="space-y-1">
              <li>You need {sampleSize.toLocaleString()} visitors to see variant A (control)</li>
              <li>You need {sampleSize.toLocaleString()} visitors to see variant B (treatment)</li>
              <li>
                This gives you {confidenceLevel}% confidence in detecting a {minimumDetectableEffect}% improvement
              </li>
              <li>With {statisticalPower}% power to avoid false negatives</li>
            </ul>
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
