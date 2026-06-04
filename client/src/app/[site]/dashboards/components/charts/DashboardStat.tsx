"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import NumberFlow from "@number-flow/react";
import { useMemo } from "react";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { ChangePercentage } from "../../../main/components/MainSection/Overview";
import { formatValue, getStatValue } from "../../utils";
import { ChartEmpty } from "./shared";

type DashboardStatProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

/** Single big-number KPI with an optional delta against a comparison column. */
export function DashboardStat({ rows, mapping }: DashboardStatProps) {
  const stat = useMemo(() => getStatValue(rows, mapping), [rows, mapping]);
  const format = mapping.valueFormat ?? "number";

  if (!stat) return <ChartEmpty />;

  const display =
    format === "number" ? (
      <NumberFlow respectMotionPreference={false} value={stat.value} format={{ notation: "compact" }} />
    ) : (
      formatValue(stat.value, format)
    );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
      <div className="text-4xl font-semibold leading-none tabular-nums text-neutral-900 dark:text-neutral-50">
        {display}
      </div>
      {(stat.label || stat.previous !== null) && (
        <div className="flex items-center gap-2">
          {stat.label && (
            <span className="max-w-[180px] truncate text-xs text-neutral-500 dark:text-neutral-400">
              {stat.label}
            </span>
          )}
          {stat.previous !== null && <ChangePercentage current={stat.value} previous={stat.previous} />}
        </div>
      )}
    </div>
  );
}
