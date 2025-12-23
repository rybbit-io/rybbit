import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { PerformanceMetric } from "../../performanceStore";

interface MetricInfo {
  importance: string;
  description: string;
  threshold: string;
}

// Metric explanations with importance and structured content
const getMetricInfo = (metric: PerformanceMetric): MetricInfo => {
  switch (metric) {
    case "lcp":
      return {
        importance: "Core Web Vital",
        description:
          "Measures loading performance. LCP marks the time when the largest content element becomes visible in the viewport.",
        threshold: "Good LCP scores are 2.5 seconds or faster.",
      };
    case "cls":
      return {
        importance: "Core Web Vital",
        description: "Measures visual stability. CLS quantifies how much visible content shifts during page load.",
        threshold: "Good CLS scores are 0.1 or less.",
      };
    case "inp":
      return {
        importance: "Core Web Vital",
        description:
          "Measures interactivity. INP assesses responsiveness by measuring the time from user interaction to the next paint.",
        threshold: "Good INP scores are 200ms or faster.",
      };
    case "fcp":
      return {
        importance: "Supporting Metric",
        description: "Measures perceived loading speed. FCP marks when the first content element becomes visible.",
        threshold: "Good FCP scores are 1.8 seconds or faster.",
      };
    case "ttfb":
      return {
        importance: "Supporting Metric",
        description:
          "Measures server response time. TTFB is the time from request start to when the first byte is received.",
        threshold: "Good TTFB scores are 800ms or faster.",
      };
    default:
      return {
        importance: "Web Vital",
        description: "Web Vitals metric for measuring website performance.",
        threshold: "Check Google's Web Vitals documentation for thresholds.",
      };
  }
};

interface MetricTooltipProps {
  metric: PerformanceMetric;
  children?: React.ReactNode;
}

export function MetricTooltip({ metric, children }: MetricTooltipProps) {
  const metricInfo = getMetricInfo(metric);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || <HelpCircle className="h-3 w-3 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-help" />}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              {metricInfo.importance}
            </span>
            {metricInfo.importance === "Core Web Vital" && <div className="w-2 h-2 bg-blue-400 rounded-full"></div>}
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-200 leading-relaxed">{metricInfo.description}</p>
          <div className="pt-1 border-t border-neutral-300 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">{metricInfo.threshold}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
