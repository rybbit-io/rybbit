"use client";

import { useExtracted } from "next-intl";
import { UsersSummary } from "@/api/analytics/endpoints";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuickFilterState {
  identified: boolean;
  isNew: boolean;
  power: boolean;
}

export const NO_QUICK_FILTERS: QuickFilterState = { identified: false, isNew: false, power: false };

function Chip({
  label,
  count,
  pressed,
  title,
  disabled,
  onToggle,
}: {
  label: string;
  count: number | undefined;
  pressed: boolean;
  title?: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={pressed}
      title={title}
      disabled={disabled}
      className={cn(
        "gap-1.5 font-normal",
        pressed &&
          "border-neutral-300 bg-neutral-100 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800"
      )}
      onClick={onToggle}
    >
      {label}
      {count !== undefined && (
        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{count.toLocaleString()}</span>
      )}
    </Button>
  );
}

/**
 * One-click cohorts for the table. Each count is the stat band's figure for
 * the same period and filters, so a chip never promises more than it lists.
 */
export function QuickFilters({
  value,
  onChange,
  summary,
}: {
  value: QuickFilterState;
  onChange: (value: QuickFilterState) => void;
  summary: UsersSummary | undefined;
}) {
  const t = useExtracted();
  const days = String(summary?.lookback_days ?? 0);

  return (
    <>
      <Chip
        label={t("Identified")}
        count={summary?.identified_users}
        pressed={value.identified}
        onToggle={() => onChange({ ...value, identified: !value.identified })}
      />
      {/* An all-time period has no "before" for anyone to be new against. */}
      {summary?.new_users !== null && (
        <Chip
          label={t("New")}
          count={summary?.new_users ?? undefined}
          pressed={value.isNew}
          title={t("Users with no visit in the {days} days before this period", { days })}
          disabled={!summary}
          onToggle={() => onChange({ ...value, isNew: !value.isNew })}
        />
      )}
      <Chip
        label={t("Power users")}
        count={summary?.power_users}
        pressed={value.power}
        title={
          summary
            ? t("Users with {count} or more sessions in this period", { count: String(summary.power_min_sessions) })
            : undefined
        }
        disabled={!summary}
        onToggle={() => onChange({ ...value, power: !value.power })}
      />
    </>
  );
}
