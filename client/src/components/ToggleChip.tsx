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
      onClick={onClick}
      className={cn(
        "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all whitespace-nowrap",
        isSelected
          ? "bg-neutral-150 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400",
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
