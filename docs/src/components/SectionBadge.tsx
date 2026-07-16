import { cn } from "@/lib/utils";

interface SectionBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionBadge({ children, className }: SectionBadgeProps) {
  return (
    <div
      className={cn(
        "inline-block bg-gradient-to-br from-emerald-600/20 to-emerald-700/15 dark:from-emerald-600/15 dark:to-emerald-700/10 border border-emerald-600/30 dark:border-emerald-600/20 shadow-md shadow-emerald-600/10 dark:shadow-emerald-600/5 text-emerald-600 dark:text-emerald-300 px-3 py-1 rounded-sm text-sm font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}
