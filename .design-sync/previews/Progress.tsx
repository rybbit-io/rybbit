import * as React from "react";
import { Progress } from "@rybbit/ui";

/** The value axis: empty, partial, and full. The bar is 8px tall, emerald fill on a neutral-800 track. */
export function Values() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4 p-4">
      {[0, 25, 66, 100].map((v) => (
        <div key={v} className="flex items-center gap-3">
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{v}%</span>
          <Progress value={v} className="flex-1" />
        </div>
      ))}
    </div>
  );
}

/** A labeled usage meter, as on the billing page: label + figure above, the bar below. */
export function UsageBar() {
  return (
    <div className="w-full max-w-md p-4">
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Events this month</span>
          <span className="tabular-nums text-neutral-400">812K / 1M</span>
        </div>
        <Progress value={81} />
        <div className="text-xs text-muted-foreground">Resets in 9 days · Pro plan</div>
      </div>
    </div>
  );
}

/** Thinner bars for inline rows: pass a height class to shrink the track. */
export function InlineRows() {
  const rows = [
    { name: "United States", value: 48 },
    { name: "Germany", value: 21 },
    { name: "United Kingdom", value: 14 },
    { name: "Japan", value: 9 },
  ];
  return (
    <div className="flex w-full max-w-md flex-col gap-3 p-4 text-sm">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className="w-32 truncate">{r.name}</span>
          <Progress value={r.value} className="h-1.5 flex-1" />
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{r.value}%</span>
        </div>
      ))}
    </div>
  );
}
