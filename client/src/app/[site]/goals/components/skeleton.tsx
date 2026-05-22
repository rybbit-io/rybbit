export const GoalBarChartSkeleton = () => (
  <div className="h-8 w-48 shrink-0 flex items-end gap-px">
    {[12, 20, 14, 26, 18, 30, 22, 16, 28, 24, 18, 32].map((height, index) => (
      <div
        key={`${height}-${index}`}
        className="flex-1 min-w-px rounded-t-sm bg-neutral-200 dark:bg-neutral-800"
        style={{ height }}
      />
    ))}
  </div>
);
