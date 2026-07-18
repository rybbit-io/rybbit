"use client";

import { useState } from "react";
import { ToolButton, ToolCallout, ToolField, ToolInput, ToolResult, ToolResultDivider, ToolStat } from "../components/tool-ui";

export interface Metrics {
  profit: number;
  roi: number;
  roas: number;
  profitMargin: number;
}

export function MarketingROIForm() {
  const [adSpend, setAdSpend] = useState("");
  const [revenue, setRevenue] = useState("");
  const [costOfGoodsSold, setCostOfGoodsSold] = useState("");

  const calculateMetrics = (): Metrics | null => {
    const spend = parseFloat(adSpend);
    const rev = parseFloat(revenue);
    const cogs = parseFloat(costOfGoodsSold) || 0;

    if (!spend || !rev || spend === 0) return null;

    const profit = rev - spend - cogs;
    const roi = (profit / spend) * 100;
    const roas = rev / spend;
    const profitMargin = (profit / rev) * 100;

    return { profit, roi, roas, profitMargin };
  };

  const metrics = calculateMetrics();

  const clearForm = () => {
    setAdSpend("");
    setRevenue("");
    setCostOfGoodsSold("");
  };

  return (
    <div className="space-y-6">
      <ToolField label="Ad Spend" htmlFor="mroi-ad-spend" required hint="Total amount spent on advertising">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            $
          </span>
          <ToolInput
            id="mroi-ad-spend"
            type="number"
            value={adSpend}
            onChange={e => setAdSpend(e.target.value)}
            placeholder="5000"
            className="pl-7 pr-3.5"
          />
        </div>
      </ToolField>

      <ToolField label="Revenue Generated" htmlFor="mroi-revenue" required hint="Total revenue from the campaign">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            $
          </span>
          <ToolInput
            id="mroi-revenue"
            type="number"
            value={revenue}
            onChange={e => setRevenue(e.target.value)}
            placeholder="15000"
            className="pl-7 pr-3.5"
          />
        </div>
      </ToolField>

      <ToolField
        label="Cost of Goods Sold (Optional)"
        htmlFor="mroi-cogs"
        hint="Direct costs of products sold (leave blank if not applicable)"
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
            $
          </span>
          <ToolInput
            id="mroi-cogs"
            type="number"
            value={costOfGoodsSold}
            onChange={e => setCostOfGoodsSold(e.target.value)}
            placeholder="3000"
            className="pl-7 pr-3.5"
          />
        </div>
      </ToolField>

      {metrics && (
        <ToolResultDivider>
          <ToolResult
            label="ROI (Return on Investment)"
            value={
              <span className={metrics.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {metrics.roi >= 0 ? "+" : ""}
                {metrics.roi.toFixed(1)}%
              </span>
            }
            accent={false}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ToolStat label="ROAS (Return on Ad Spend)" value={`${metrics.roas.toFixed(2)}x`} />
            <ToolStat
              label="Net Profit"
              value={
                <span className={metrics.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                  {metrics.profit >= 0 ? "+" : "-"}${Math.abs(metrics.profit).toLocaleString()}
                </span>
              }
            />
            <ToolStat label="Profit Margin" value={`${metrics.profitMargin.toFixed(1)}%`} />
          </div>

          <ToolCallout variant={metrics.roi >= 100 ? "success" : metrics.roi >= 0 ? "info" : "error"}>
            {metrics.roi >= 100 ? (
              <>
                <strong>Excellent ROI!</strong> You're generating ${metrics.roas.toFixed(2)} in revenue for every $1
                spent. Your campaign is highly profitable.
              </>
            ) : metrics.roi >= 0 ? (
              <>
                <strong>Positive ROI.</strong> You're making a profit, but there may be room for optimization to
                improve returns.
              </>
            ) : (
              <>
                <strong>Negative ROI.</strong> Your campaign is losing money. Consider reviewing your targeting,
                creative, or product-market fit.
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
