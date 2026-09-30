"use client";

import { useExtracted } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Settings pages are laid out as a ledger: one continuous sheet where each setting is a row with
// its name and a line of help on the left and its control on the right, hairlines between rows.
// Collections (people, keys, invoices) break out to full width under their section heading.

export function SettingsPageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Wraps a page's sections so the first one sits closer to the page header than the rest sit to each other. */
export function SettingsPage({ children }: { children: React.ReactNode }) {
  return <div className="flex max-w-5xl flex-col gap-12 pb-16 [&>header+section]:-mt-3">{children}</div>;
}

export function LedgerSection({
  title,
  count,
  description,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  /** A quiet figure after the title, e.g. how many rows the section holds. */
  count?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5 pb-3">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 className="text-base font-semibold leading-5">
            {title}
            {count !== undefined && (
              <span className="ml-2 text-sm font-normal tabular-nums text-neutral-500 dark:text-neutral-400">
                {count}
              </span>
            )}
          </h2>
          {description && (
            <p className="mt-0.5 max-w-[76ch] text-sm leading-5 text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** A run of ledger rows, ruled above and below. */
export function LedgerRows({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "divide-y divide-neutral-100 border-y border-neutral-100 dark:divide-neutral-850 dark:border-neutral-850",
        className
      )}
    >
      {children}
    </div>
  );
}

export function LedgerRow({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Points the label at the row's input, when there is one. */
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div className={cn("grid gap-x-10 gap-y-2 py-4 md:grid-cols-[260px_minmax(0,1fr)]", className)}>
      <div className="min-w-0 md:pt-2">
        <Label htmlFor={htmlFor} className="block text-sm font-medium leading-5">
          {label}
        </Label>
        {description && (
          <p className="mt-0.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A full-width block (usually a table) ruled above and below, for collections under a section heading. */
export function LedgerTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-x-auto border-y border-neutral-100 dark:border-neutral-850",
        "[&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Shown under a section only while it has unsaved edits, so saving is per section and a clean
 * section carries no buttons.
 */
export function LedgerSaveBar({
  dirty,
  saving,
  onCancel,
  onSave,
  message,
}: {
  dirty: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  message?: React.ReactNode;
}) {
  const t = useExtracted();
  if (!dirty) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border border-neutral-150 bg-white py-1.5 pl-3.5 pr-1.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <span className="font-medium">{message ?? t("Unsaved changes")}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {t("Cancel")}
        </Button>
        <Button variant="success" size="sm" onClick={onSave} loading={saving} loadingLabel={t("Saving...")}>
          {t("Save changes")}
        </Button>
      </div>
    </div>
  );
}

/** The closing section of a page, for actions that can't be undone. */
export function DangerZone({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  return (
    <LedgerSection title={t("Danger zone")}>
      <LedgerRows>{children}</LedgerRows>
    </LedgerSection>
  );
}

/** One destructive action in the danger zone: what it does on the left, the consequence and the button on the right. */
export function DangerRow({
  label,
  description,
  consequence,
  action,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  consequence: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <LedgerRow label={label} description={description}>
      <div className="grid items-start gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <p className="max-w-[58ch] text-sm text-neutral-700 sm:pt-2 dark:text-neutral-300">{consequence}</p>
        <div className="sm:pt-0.5">{action}</div>
      </div>
    </LedgerRow>
  );
}
