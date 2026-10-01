import { ReactNode } from "react";
import { Skeleton } from "../../../../../components/ui/skeleton";

// One block of the rail's facts ledger. The rail is a single card; sections
// are separated by its hairline dividers, not by cards of their own.
export function SidebarSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`p-4 ${className}`}>{children}</section>;
}

// Uniform section header: a sentence-case title on the left, optional control
// or hint on the right (edit button, "p75", ...)
export function SidebarHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{title}</h3>
      {right}
    </div>
  );
}

// The quiet note on the right of a section header: what the section's numbers are scoped to.
export function SidebarHint({ children }: { children: ReactNode }) {
  return <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{children}</span>;
}

// Info row component for consistent styling
export function InfoRow({ icon, label, value }: { icon?: ReactNode; label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-50 dark:border-neutral-850 last:border-0 text-xs">
      <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-neutral-700 dark:text-neutral-200 flex min-w-0 items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}

// Skeleton matching InfoRow's shape, for card loading states
export function InfoRowSkeleton({
  labelWidth = "w-14",
  valueWidth = "w-24",
  withIcon = false,
}: {
  labelWidth?: string;
  valueWidth?: string;
  withIcon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850 last:border-0">
      <Skeleton className={`h-3 ${labelWidth} rounded`} />
      <div className="flex items-center gap-1.5">
        {withIcon && <Skeleton className="w-4 h-4 rounded" />}
        <Skeleton className={`h-3 ${valueWidth} rounded`} />
      </div>
    </div>
  );
}
