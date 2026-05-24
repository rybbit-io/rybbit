"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { ViewportBreakpoint } from "../../../../api/analytics/endpoints/heatmap";
import { cn } from "../../../../lib/utils";

interface HeatmapControlsProps {
  viewportBreakpoint: ViewportBreakpoint;
  onViewportChange: (breakpoint: ViewportBreakpoint) => void;
}

const VIEWPORT_OPTIONS: { value: ViewportBreakpoint; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "desktop", label: "Desktop", icon: <Monitor className="w-4 h-4" /> },
  { value: "tablet", label: "Tablet", icon: <Tablet className="w-4 h-4" /> },
  { value: "mobile", label: "Mobile", icon: <Smartphone className="w-4 h-4" /> },
];

export function HeatmapControls({ viewportBreakpoint, onViewportChange }: HeatmapControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">Viewport:</span>
      <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
        {VIEWPORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onViewportChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
              viewportBreakpoint === option.value
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
