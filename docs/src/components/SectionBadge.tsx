import { cn } from "@/lib/utils";

interface SectionBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionBadge({ children, className }: SectionBadgeProps) {
  return (
    <div
      className={cn(
        "inline-block bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 dark:from-emerald-500/20 dark:to-emerald-600/10 border border-emerald-500/40 dark:border-emerald-500/30 shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}
