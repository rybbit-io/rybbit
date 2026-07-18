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

export function TrafficValueForm() {
  const [monthlyVisitors, setMonthlyVisitors] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [averageOrderValue, setAverageOrderValue] = useState("");
  const [profitMargin, setProfitMargin] = useState("");

  const calculateValue = () => {
    const visitors = parseFloat(monthlyVisitors);
    const cr = parseFloat(conversionRate) / 100;
    const aov = parseFloat(averageOrderValue);
    const margin = parseFloat(profitMargin) / 100;

    if (!visitors || !cr || !aov || !margin) return null;

    const conversions = visitors * cr;
    const revenue = conversions * aov;
    const profit = revenue * margin;
    const valuePerVisitor = profit / visitors;
    const annualProfit = profit * 12;

    return {
      conversions,
      revenue,
      profit,
      valuePerVisitor,
      annualProfit,
    };
  };

  const metrics = calculateValue();

  const clearForm = () => {
    setMonthlyVisitors("");
    setConversionRate("");
    setAverageOrderValue("");
    setProfitMargin("");
  };

  return (
    <div className="space-y-6">
      <ToolField label="Monthly Visitors" htmlFor="tvc-visitors" required hint="Total visitors per month">
        <ToolInput
          id="tvc-visitors"
          type="number"
          value={monthlyVisitors}
          onChange={e => setMonthlyVisitors(e.target.value)}
          placeholder="50000"
        />
      </ToolField>

      <ToolField
        label="Conversion Rate"
        htmlFor="tvc-conversion-rate"
        required
        hint="Percentage of visitors who convert"
      >
        <div className="relative">
          <ToolInput
            id="tvc-conversion-rate"
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
        htmlFor="tvc-aov"
        required
        hint="Average revenue per conversion"
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            $
          </span>
          <ToolInput
            id="tvc-aov"
            type="number"
            step="0.01"
            value={averageOrderValue}
            onChange={e => setAverageOrderValue(e.target.value)}
            placeholder="75.00"
            className="pl-7 pr-3.5"
          />
        </div>
      </ToolField>

      <ToolField label="Profit Margin" htmlFor="tvc-margin" required hint="Net profit margin per sale">
        <div className="relative">
          <ToolInput
            id="tvc-margin"
            type="number"
            step="0.1"
            value={profitMargin}
            onChange={e => setProfitMargin(e.target.value)}
            placeholder="30"
            className="pl-3.5 pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            %
          </span>
        </div>
      </ToolField>

      {metrics && (
        <ToolResultDivider>
          <ToolResult label="Value Per Visitor" value={`$${metrics.valuePerVisitor.toFixed(2)}`} sub="per visitor" />

          <div className="grid grid-cols-2 gap-3">
            <ToolStat label="Monthly Conversions" value={Math.round(metrics.conversions).toLocaleString()} />
            <ToolStat
              label="Monthly Revenue"
              value={`$${metrics.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <ToolStat
              label="Monthly Profit"
              value={`$${metrics.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <ToolStat
              label="Annual Profit"
              value={`$${metrics.annualProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
          </div>

          <ToolCallout variant="tip" title="What this means:">
            <ul className="space-y-1">
              <li>
                Each visitor is worth <strong>${metrics.valuePerVisitor.toFixed(2)}</strong> in profit
              </li>
              <li>
                A <strong>10% traffic increase</strong> would add{" "}
                <strong>
                  ${(metrics.profit * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  /month
                </strong>{" "}
                in profit
              </li>
              <li>
                A <strong>1% conversion rate improvement</strong> would add{" "}
                <strong>
                  $
                  {(
                    (parseFloat(monthlyVisitors) *
                      0.01 *
                      parseFloat(averageOrderValue) *
                      parseFloat(profitMargin)) /
                    100
                  ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  /month
                </strong>{" "}
                in profit
              </li>
              <li>
                You can afford to spend up to <strong>${metrics.valuePerVisitor.toFixed(2)}</strong> per visitor on
                acquisition
              </li>
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
