import { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SidebarSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-t border-neutral-100 py-4 first:border-t-0 first:pt-0 last:pb-0 dark:border-neutral-850",
        className
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InfoRow({ icon, label, value }: { icon?: ReactNode; label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 border-b border-neutral-100 py-2 text-xs last:border-0 dark:border-neutral-850">
      <span className="min-w-0 text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right font-medium text-neutral-800 dark:text-neutral-200">
        {icon}
        {value}
      </span>
    </div>
  );
}

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
    <div className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-850">
      <Skeleton className={`h-3 ${labelWidth} motion-reduce:animate-none`} />
      <div className="flex items-center gap-1.5">
        {withIcon && <Skeleton className="h-4 w-4 motion-reduce:animate-none" />}
        <Skeleton className={`h-3 ${valueWidth} motion-reduce:animate-none`} />
      </div>
    </div>
  );
}
