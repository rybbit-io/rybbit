"use client";

import { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Shared visual vocabulary for the SiteSettings dialog tabs.
 * Two ranks only: SettingsSection (group: 16px/600 title, 14px muted
 * description, hairline divider between siblings) and SettingRow
 * (field: 14px/500 label, 12px muted description, control on the right).
 */

export function SettingsSections({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-neutral-150 dark:divide-neutral-850", className)}>{children}</div>;
}

interface SettingsSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, action, children, className }: SettingsSectionProps) {
  const hasHeader = Boolean(title || description || action);
  return (
    <section className={cn("py-5 first:pt-0 last:pb-0", className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 space-y-1">
            {title && <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>}
            {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && <div className={cn("space-y-4", hasHeader && "mt-4")}>{children}</div>}
    </section>
  );
}

interface SettingRowProps {
  label: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SettingRow({ label, htmlFor, description, badge, children, className }: SettingRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-6", className)}>
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-foreground">
          {label}
          {badge}
        </Label>
        {description && <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}
