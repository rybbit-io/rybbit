import { Card } from "./Card";
import {
  Activity,
  Zap,
  Timer,
  MousePointer,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import React from "react";

// Web Vitals thresholds
const vitals = {
  LCP: {
    name: "Largest Contentful Paint",
    abbr: "LCP",
    value: 2.4,
    unit: "s",
    status: "good", // good < 2.5s, needs improvement 2.5-4s, poor > 4s
    change: -0.2,
    icon: <Activity className="w-4 h-4" />,
    color: "emerald" as const,
  },
  FID: {
    name: "First Input Delay",
    abbr: "FID",
    value: 95,
    unit: "ms",
    status: "good", // good < 100ms, needs improvement 100-300ms, poor > 300ms
    change: -5,
    icon: <MousePointer className="w-4 h-4" />,
    color: "emerald" as const,
  },
  CLS: {
    name: "Cumulative Layout Shift",
    abbr: "CLS",
    value: 0.08,
    unit: "",
    status: "good", // good < 0.1, needs improvement 0.1-0.25, poor > 0.25
    change: 0.01,
    icon: <Zap className="w-4 h-4" />,
    color: "emerald" as const,
  },
  FCP: {
    name: "First Contentful Paint",
    abbr: "FCP",
    value: 1.8,
    unit: "s",
    status: "needs-improvement", // good < 1.8s, needs improvement 1.8-3s, poor > 3s
    change: 0.3,
    icon: <Timer className="w-4 h-4" />,
    color: "amber" as const,
  },
};

type MetricType = typeof vitals[keyof typeof vitals];

function MetricCard({ metric }: { metric: MetricType }) {
  const isImproved = metric.change < 0;
  const colorMap = {
    emerald: {
      bg: "bg-emerald-900/30",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
    },
    amber: {
      bg: "bg-amber-900/30",
      border: "border-amber-500/40",
      text: "text-amber-400",
    },
    red: {
      bg: "bg-red-900/30",
      border: "border-red-500/40",
      text: "text-red-400",
    },
  };

  const colors = colorMap[metric.color];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-3`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={colors.text}>{metric.icon}</div>
          <span className="text-sm font-medium">{metric.abbr}</span>
        </div>
        <div
          className={`flex items-center gap-1 text-xs ${
            isImproved ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isImproved ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <TrendingUp className="w-3 h-3" />
          )}
          <span>
            {Math.abs(metric.change)}
            {metric.unit}
          </span>
        </div>
      </div>

      <div className="mb-2">
        <span className="text-2xl font-semibold">{metric.value}</span>
        <span className="text-sm text-neutral-400 ml-1">{metric.unit}</span>
      </div>

      {/* Mini bar chart */}
      <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            metric.color === "emerald"
              ? "bg-emerald-500"
              : metric.color === "amber"
              ? "bg-amber-500"
              : "bg-red-500"
          }`}
          style={{
            width:
              metric.abbr === "CLS"
                ? `${(metric.value / 0.25) * 100}%`
                : metric.abbr === "FID"
                ? `${(metric.value / 300) * 100}%`
                : metric.abbr === "LCP"
                ? `${(metric.value / 4) * 100}%`
                : `${(metric.value / 3) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export function WebVitals() {
  return (
    <Card
      title="Web Vitals"
      description="Monitor Core Web Vitals and performance metrics to ensure a great user experience."
    >
      <div className="space-y-4">
        {/* Score overview */}
        <div className="bg-neutral-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Performance Score</h4>
            <span className="text-xs text-neutral-400">Last 28 days</span>
          </div>

          {/* Overall score */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-neutral-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.82)}`}
                  className="text-emerald-500 transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">82</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-emerald-400">Good</div>
              <div className="text-xs text-neutral-400">
                Above 90 is excellent
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            {Object.values(vitals).map((vital) => (
              <MetricCard key={vital.abbr} metric={vital} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default WebVitals;