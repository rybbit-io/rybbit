"use client";

import { useExtracted } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkSelectionBarProps {
  selectedCount: number;
  /** Sites matching the current filters that the viewer may configure. */
  matchingCount: number;
  allMatchingSelected: boolean;
  onToggleAllMatching: () => void;
  onClear: () => void;
  onEdit: () => void;
}

/** Shown above the site list while picking sites to edit together. */
export function BulkSelectionBar({
  selectedCount,
  matchingCount,
  allMatchingSelected,
  onToggleAllMatching,
  onClear,
  onEdit,
}: BulkSelectionBarProps) {
  const t = useExtracted();
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-neutral-100 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <Checkbox
            checked={allMatchingSelected}
            disabled={matchingCount === 0}
            onCheckedChange={onToggleAllMatching}
          />
          {t("Select all {count}", { count: String(matchingCount) })}
        </label>
        <span className="tabular-nums text-muted-foreground" role="status">
          {t("{count} selected", { count: String(selectedCount) })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={selectedCount === 0} onClick={onClear}>
          {t("Clear")}
        </Button>
        <Button variant="success" size="sm" disabled={selectedCount === 0} onClick={onEdit}>
          {t("Edit settings")}
        </Button>
      </div>
    </div>
  );
}
