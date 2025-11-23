import { ReactNode } from "react";

interface ChartTooltipProps {
  children: ReactNode;
}

export function ChartTooltip({ children }: ChartTooltipProps) {
  return (
    <div className="text-sm bg-white dark:bg-neutral-850 rounded-lg border border-neutral-100 dark:border-neutral-750 shadow-md">
      {children}
    </div>
  );
}
