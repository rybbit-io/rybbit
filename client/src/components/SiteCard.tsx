import Link from "next/link";
import { useRef } from "react";
import { useGetOverview } from "../api/analytics/hooks/useGetOverview";
import { useGetOverviewBucketed } from "../api/analytics/hooks/useGetOverviewBucketed";
import { ChangePercentage } from "../app/[site]/main/components/MainSection/Overview";
import { useInView } from "../hooks/useInView";
import { useStore } from "../lib/store";
import { formatter } from "../lib/utils";
import { Favicon } from "./Favicon";
import { SiteSessionChart } from "./SiteSessionChart";
import { Skeleton } from "./ui/skeleton";

interface SiteCardProps {
  siteId: number;
  domain: string;
}

export function SiteCard({ siteId, domain }: SiteCardProps) {
  const { ref, isInView } = useInView({
    // Start loading slightly before the card comes into view
    rootMargin: "200px",
    // Once data is loaded, keep it loaded even when scrolling away
    persistVisibility: true,
  });

  // Track if we've ever loaded data successfully
  const hasLoadedData = useRef(false);

  const { bucket } = useStore();

  const { data, isLoading, isSuccess } = useGetOverviewBucketed({
    site: siteId,
    bucket,
    props: {
      enabled: isInView,
    },
  });

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    isSuccess: isOverviewSuccess,
  } = useGetOverview({
    site: siteId,
  });

  // Previous period - automatically handles both regular time-based and past-minutes queries
  const { data: overviewDataPrevious, isLoading: isOverviewLoadingPrevious } = useGetOverview({
    site: siteId,
    periodTime: "previous",
  });

  // Update the hasLoadedData ref when data loads successfully
  if (isSuccess && isOverviewSuccess && !hasLoadedData.current) {
    hasLoadedData.current = true;
  }

  const hasData = (overviewData?.data?.sessions || 0) > 0;

  // Show skeleton when loading or not yet in view, but not if we've already loaded data previously
  const showSkeleton = (isLoading || isOverviewLoading || !isInView) && !hasLoadedData.current;

  return (
    <Link href={`/${siteId}`}>
      <div
        ref={ref}
        className="flex flex-col md:flex-row md:justify-between gap-3 rounded-lg bg-white dark:bg-neutral-900/70 px-4 py-3 border border-neutral-100 dark:border-neutral-850 transition-all duration-300 hover:translate-y-[-2px] w-full"
      >
        {showSkeleton ? (
          <>
            <div className="flex gap-2 items-center">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-2 items-center">
              <Skeleton className="h-[64px] w-[200px] rounded-md" />
              <div className="grid grid-cols-2 gap-2 w-[250px]">
                <div className="flex flex-col gap-1 p-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex flex-col gap-1 p-2">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2 items-center">
              <Favicon domain={domain} className="w-6 h-6" />
              <span className="text-lg font-medium truncate group-hover:underline transition-all">{domain}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center justify-between">
              <div className="relative rounded-md w-[200px] h-[50px]">
                <SiteSessionChart data={data?.data ?? []} />
                {!hasData && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">No data available</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-[250px]">
                <div className="flex flex-col items-start gap-1 rounded-md p-2 transition-colors">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Sessions</div>
                  <div className="font-semibold text-xl flex gap-2">
                    {formatter(overviewData?.data?.sessions ?? 0)}{" "}
                    {overviewData?.data?.sessions && overviewDataPrevious?.data?.sessions ? (
                      <ChangePercentage
                        current={overviewData?.data?.sessions}
                        previous={overviewDataPrevious?.data?.sessions}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-1 rounded-md p-2 transition-colors">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Users</div>
                  <div className="font-semibold text-xl flex gap-2">
                    {formatter(overviewData?.data?.users ?? 0)}{" "}
                    {overviewData?.data?.users && overviewDataPrevious?.data?.users ? (
                      <ChangePercentage
                        current={overviewData?.data?.users}
                        previous={overviewDataPrevious?.data?.users}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
