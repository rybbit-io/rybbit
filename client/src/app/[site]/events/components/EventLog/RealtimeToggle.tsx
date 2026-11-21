"use client";

import { useExtracted } from "next-intl";
import { useId } from "react";
import { Switch } from "../../../../../components/ui/switch";

/** Switches the log between following new events as they arrive and reading the selected period. */
export function RealtimeToggle({ isRealtime, onToggle }: { isRealtime: boolean; onToggle: () => void }) {
  const t = useExtracted();
  const id = useId();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Switch id={id} checked={isRealtime} onCheckedChange={onToggle} />
      <label htmlFor={id} className="cursor-pointer text-xs font-medium text-neutral-700 dark:text-neutral-200">
        {t("Live")}
      </label>
    </div>
  );
}
