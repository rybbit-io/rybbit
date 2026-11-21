import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ChartTooltipProps {
  children: ReactNode;
  className?: string;
}

export function ChartTooltip({ children, className }: ChartTooltipProps) {
  return (
    <div
      className={cn(
        "text-sm bg-white dark:bg-neutral-850 rounded-lg border border-neutral-100 dark:border-neutral-750 shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
