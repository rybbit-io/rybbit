"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolCallout,
  ToolField,
  ToolInput,
  ToolResult,
  ToolResultDivider,
  ToolStat,
} from "../components/tool-ui";

interface CalculateImpactResult {
  conversionImpact: number;
  newConversionRate: number;
  currentRevenue: number;
  newRevenue: number;
  monthlyImpact: number;
  annualImpact: number;
  bounceRateChange: number;
  currentBounceRate: number;
  newBounceRate: number;
  timeDifference: number;
}

export function PageSpeedForm() {
  const [currentLoadTime, setCurrentLoadTime] = useState("");
  const [targetLoadTime, setTargetLoadTime] = useState("");
  const [monthlyVisitors, setMonthlyVisitors] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [averageOrderValue, setAverageOrderValue] = useState("");

  const calculateImpact = (): CalculateImpactResult | null => {
    const current = parseFloat(currentLoadTime);
    const target = parseFloat(targetLoadTime);
    const visitors = parseFloat(monthlyVisitors);
    const cr = parseFloat(conversionRate) / 100;
    const aov = parseFloat(averageOrderValue);

    if (!current || !target || !visitors || !cr || !aov) return null;

    // Research shows that for every 1 second delay:
    // - Bounce rate increases by ~7%
    // - Conversion rate decreases by ~7%
    const timeDifference = current - target;

    // Calculate conversion impact (0.07 = 7% per second)
    const conversionImpact = timeDifference * 0.07;
    const newConversionRate = cr * (1 + conversionImpact);

    // Calculate bounce rate impact
    const bounceRateIncrease = Math.abs(timeDifference) * 7; // Percentage points

    // Calculate revenue impact
    const currentRevenue = visitors * cr * aov;
    const newRevenue = visitors * newConversionRate * aov;
    const monthlyImpact = newRevenue - currentRevenue;
    const annualImpact = monthlyImpact * 12;

    // Bounce rate calculation (assume current is 50% baseline)
    const currentBounceRate = 50;
    const newBounceRate =
      timeDifference < 0
        ? Math.max(currentBounceRate + bounceRateIncrease, 0)
        : Math.min(currentBounceRate + bounceRateIncrease, 100);

    return {
      conversionImpact: conversionImpact * 100,
      newConversionRate: newConversionRate * 100,
      currentRevenue,
      newRevenue,
      monthlyImpact,
      annualImpact,
      bounceRateChange: bounceRateIncrease,
      currentBounceRate,
      newBounceRate,
      timeDifference,
    };
  };

  const metrics = calculateImpact();

  const clearForm = () => {
    setCurrentLoadTime("");
    setTargetLoadTime("");
    setMonthlyVisitors("");
    setConversionRate("");
    setAverageOrderValue("");
  };

  return (
    <div className="space-y-6">
      <ToolField
        label="Current Page Load Time"
        htmlFor="psc-current-load-time"
        required
        hint="Your current page load time (check with PageSpeed Insights)"
      >
        <div className="relative">
          <ToolInput
            id="psc-current-load-time"
            type="number"
            step="0.1"
            value={currentLoadTime}
            onChange={e => setCurrentLoadTime(e.target.value)}
            placeholder="4.5"
            className="pl-3.5 pr-16"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            seconds
          </span>
        </div>
      </ToolField>

      <ToolField
        label="Target Page Load Time"
        htmlFor="psc-target-load-time"
        required
        hint="Your target load time (recommended: under 3 seconds)"
      >
        <div className="relative">
          <ToolInput
            id="psc-target-load-time"
            type="number"
            step="0.1"
            value={targetLoadTime}
            onChange={e => setTargetLoadTime(e.target.value)}
            placeholder="2.0"
            className="pl-3.5 pr-16"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            seconds
          </span>
        </div>
      </ToolField>

      <ToolField label="Monthly Visitors" htmlFor="psc-visitors" required hint="Total monthly visitors">
        <ToolInput
          id="psc-visitors"
          type="number"
          value={monthlyVisitors}
          onChange={e => setMonthlyVisitors(e.target.value)}
          placeholder="50000"
        />
      </ToolField>

      <ToolField
        label="Current Conversion Rate"
        htmlFor="psc-conversion-rate"
        required
        hint="Your current conversion rate"
      >
        <div className="relative">
          <ToolInput
            id="psc-conversion-rate"
            type="number"
            step="0.01"
            value={conversionRate}
            onChange={e => setConversionRate(e.target.value)}
            placeholder="2.5"
            className="pl-3.5 pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            %
          </span>
        </div>
      </ToolField>

      <ToolField
        label="Average Order Value"
        htmlFor="psc-aov"
        required
        hint="Average value per conversion"
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            $
          </span>
          <ToolInput
            id="psc-aov"
            type="number"
            step="0.01"
            value={averageOrderValue}
            onChange={e => setAverageOrderValue(e.target.value)}
            placeholder="75.00"
            className="pl-7 pr-3.5"
          />
        </div>
      </ToolField>

      {metrics && (
        <ToolResultDivider>
          <ToolResult
            label={metrics.monthlyImpact >= 0 ? "Monthly Revenue Gain" : "Monthly Revenue Loss"}
            value={
              <span
                className={
                  metrics.monthlyImpact >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {metrics.monthlyImpact >= 0 ? "+" : "-"}$
                {Math.abs(metrics.monthlyImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            }
            sub="per month"
            accent={false}
          />

          <div className="grid grid-cols-2 gap-3">
            <ToolStat
              label="Annual Impact"
              value={
                <span
                  className={
                    metrics.annualImpact >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {metrics.annualImpact >= 0 ? "+" : "-"}$
                  {Math.abs(metrics.annualImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              }
            />
            <ToolStat
              label="Conversion Rate Change"
              value={`${metrics.conversionImpact >= 0 ? "+" : ""}${metrics.conversionImpact.toFixed(1)}%`}
            />
            <ToolStat label="New Conversion Rate" value={`${metrics.newConversionRate.toFixed(2)}%`} />
            <ToolStat
              label="Bounce Rate Impact"
              value={`${metrics.timeDifference > 0 ? "+" : ""}${metrics.bounceRateChange.toFixed(1)}%`}
            />
          </div>

          <ToolCallout variant={metrics.monthlyImpact >= 0 ? "success" : "warning"} title="Impact Summary:">
            <ul className="space-y-1">
              <li>
                Improving load time from <strong>{currentLoadTime}s</strong> to <strong>{targetLoadTime}s</strong>
              </li>
              <li>
                Conversion rate changes from <strong>{parseFloat(conversionRate).toFixed(2)}%</strong> to{" "}
                <strong>{metrics.newConversionRate.toFixed(2)}%</strong>
              </li>
              <li>
                Potential revenue impact:{" "}
                <strong>
                  ${Math.abs(metrics.monthlyImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                </strong>{" "}
                ({metrics.monthlyImpact >= 0 ? "gain" : "loss"})
              </li>
              <li>Based on industry research: 7% conversion impact per second of load time</li>
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
