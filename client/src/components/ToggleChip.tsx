"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ToggleChipProps {
  isSelected: boolean;
  onClick: () => void;
  label: ReactNode;
  // Convenience for the standard 12×12 rounded color swatch.
  swatchColor?: string;
  // Use indicator for arbitrary leading content (e.g. an icon). Takes
  // precedence over swatchColor.
  indicator?: ReactNode;
  rightAdornment?: ReactNode;
  className?: string;
}

export function ToggleChip({
  isSelected,
  onClick,
  label,
  swatchColor,
  indicator,
  rightAdornment,
  className,
}: ToggleChipProps) {
  const indicatorNode =
    indicator ??
    (swatchColor !== undefined ? (
      <div
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: swatchColor }}
      />
    ) : null);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
        // Unselected sits one step above the neutral-900 card with an inset hairline (no layout shift), so it
        // still reads as a chip in dark mode; its label keeps ≥4.5:1 on that fill.
        isSelected
          ? "bg-neutral-150 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "bg-neutral-50 dark:bg-neutral-850 dark:ring-1 dark:ring-inset dark:ring-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
        className
      )}
    >
      {indicatorNode && (
        <div
          className={cn(
            "transition-opacity",
            isSelected ? "opacity-100" : "opacity-30"
          )}
        >
          {indicatorNode}
        </div>
      )}
      <span>{label}</span>
      {rightAdornment}
    </button>
  );
}
