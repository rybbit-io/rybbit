import { memo } from "react";

export const StandardSkeleton = memo(() => {
  // Generate widths following Pareto principle with top item at 100%
  const widths = Array.from({ length: 10 }, (_, i) => {
    if (i === 0) {
      // First item always has 100% width
      return 100;
    } else if (i === 1) {
      // Second item gets large width (60-80%)
      return 60 + Math.random() * 20;
    } else {
      // Remaining 8 items get progressively smaller widths (10-40%)
      const factor = 1 - (i - 2) / 8; // Creates a declining factor from 1 to 0.125
      return 10 + factor * 30; // Creates widths from ~40% down to ~15%
    }
  });

  // Generate random widths for label and value placeholders
  const labelWidths = Array.from({ length: 10 }, (_, i) => {
    // First few items get wider labels (increased by 2.5x)
    return i < 3 ? 75 + Math.random() * 100 : 40 + Math.random() * 60;
  });

  const valueWidths = Array.from(
    { length: 10 },
    () => 20 + Math.random() * 40 // Between 20px and 60px (increased by 2.5x)
  );

  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="relative h-6 flex items-center">
          <div
            className="absolute inset-0 bg-neutral-150/50 dark:bg-neutral-800 py-2 rounded-md animate-pulse"
            style={{ width: `${widths[index]}%` }}
          ></div>
          <div className="z-5 mx-2 flex justify-between items-center text-sm w-full">
            <div className="flex items-center gap-1">
              <div
                className="h-4 bg-neutral-150 dark:bg-neutral-800 rounded animate-pulse"
                style={{ width: `${labelWidths[index]}px` }}
              ></div>
            </div>
            <div className="text-sm flex gap-2">
              <div
                className="h-4 bg-neutral-150 dark:bg-neutral-800 rounded animate-pulse"
                style={{ width: `${valueWidths[index]}px` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
});
