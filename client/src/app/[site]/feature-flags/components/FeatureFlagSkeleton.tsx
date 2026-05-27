export function FeatureFlagSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-neutral-100 p-4 last:border-0 dark:border-neutral-850"
        >
          <div className="h-5 w-48 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-5 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-5 flex-1 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-5 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}
