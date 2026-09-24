import { ReactNode } from "react";
import { Skeleton } from "../../../../../components/ui/skeleton";

// Reusable card wrapper for sidebar sections
export function SidebarCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-850 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// Uniform section header: micro-label title on the left, optional control or
// hint on the right (edit button, "p75", ...)
export function SidebarHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </h3>
      {right}
    </div>
  );
}

// Info row component for consistent styling
export function InfoRow({ icon, label, value }: { icon?: ReactNode; label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850 last:border-0 text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}

// Skeleton matching InfoRow's shape, for card loading states
export function InfoRowSkeleton({ labelWidth = "w-14", valueWidth = "w-24", withIcon = false }: {
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
