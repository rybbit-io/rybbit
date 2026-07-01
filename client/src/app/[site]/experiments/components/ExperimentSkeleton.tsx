function ExperimentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-850">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-40 rounded bg-neutral-100 dark:bg-neutral-850" />
            <div className="h-5 w-16 rounded-md bg-neutral-100 dark:bg-neutral-850" />
          </div>
          <div className="flex gap-3">
            <div className="h-3.5 w-24 rounded bg-neutral-100 dark:bg-neutral-850" />
            <div className="h-3.5 w-20 rounded bg-neutral-100 dark:bg-neutral-850" />
          </div>
        </div>
        <div className="h-8 w-20 rounded-md bg-neutral-100 dark:bg-neutral-850" />
      </div>
      <div className="grid gap-2 p-4">
        {[0, 1].map(index => (
          <div
            key={index}
            className="rounded-md border border-neutral-100 bg-neutral-50/60 p-3 dark:border-neutral-850 dark:bg-neutral-950/40"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-neutral-100 dark:bg-neutral-850" />
              <div className="h-5 w-12 rounded bg-neutral-100 dark:bg-neutral-850" />
            </div>
            <div className="mt-3 h-2 rounded-full bg-neutral-100 dark:bg-neutral-850" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExperimentSkeleton() {
  return (
    <div className="grid animate-pulse gap-3">
      <ExperimentCardSkeleton />
      <ExperimentCardSkeleton />
    </div>
  );
}
