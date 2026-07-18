import { cn } from "@/lib/utils";

interface SectionBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionBadge({ children, className }: SectionBadgeProps) {
  return (
    <div className={cn("inline-block text-[13px] font-medium text-emerald-700 dark:text-emerald-400", className)}>
      {children}
    </div>
  );
}
