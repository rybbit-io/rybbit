import { ResultsSkeleton } from "./ExperimentResultsPanel";

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
      <div className="p-4">
        <ResultsSkeleton />
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
