import * as React from "react";
import { Skeleton } from "@rybbit/ui";

/** The overview tiles while the query runs: label stays, figure and delta become blocks. */
export function StatCards() {
  return (
    <div className="flex w-full max-w-xl gap-3 p-4">
      {["Unique visitors", "Sessions", "Bounce rate"].map((label) => (
        <div key={label} className="flex flex-1 flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-[60px] rounded-md" />
            <Skeleton className="h-5 w-[50px] rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A loading list: one bar per row, name on the left and a short figure on the right. */
export function TableRows() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Page</span>
        <span>Visitors</span>
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Text placeholders: a title line and three body lines, the last one shorter. */
export function TextLines() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 p-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

/** Avatar + two lines, as in a session row or a member list. */
export function AvatarRow() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
