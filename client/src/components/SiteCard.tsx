import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useGetOverview } from "../api/analytics/useGetOverview";
import { useGetOverviewBucketed } from "../api/analytics/useGetOverviewBucketed";
import { useInView } from "../hooks/useInView";
import { MINUTES_IN_24_HOURS } from "../lib/const";
import { Favicon } from "./Favicon";
import { SiteSessionChart } from "./SiteSessionChart";
import { Button } from "./ui/button";
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

  const { data, isLoading, isSuccess } = useGetOverviewBucketed({
    site: siteId,
    bucket: "hour",
    overrideTime: {
      mode: "past-minutes",
      pastMinutesStart: 1440,
      pastMinutesEnd: 0,
    },
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
    overrideTime: {
      mode: "past-minutes",
      pastMinutesStart: 1440,
      pastMinutesEnd: 0,
    },
  });

  // Update the hasLoadedData ref when data loads successfully
  if (isSuccess && isOverviewSuccess && !hasLoadedData.current) {
    hasLoadedData.current = true;
  }

  const hasData = (overviewData?.data?.sessions || 0) > 0;

  // Show skeleton when loading or not yet in view, but not if we've already loaded data previously
  const showSkeleton = (isLoading || isOverviewLoading || !isInView) && !hasLoadedData.current;

  return (
    <div
      ref={ref}
      className="flex flex-col rounded-lg bg-neutral-900/70 p-4 border border-neutral-850 shadow-lg hover:shadow-xl hover:border-neutral-800 transition-all duration-300 hover:translate-y-[-2px]"
    >
      {showSkeleton ? (
        <>
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>

          <div className="relative mt-1 mb-1 rounded-md p-2 overflow-hidden">
            <Skeleton className="h-[110px] w-full rounded-md" />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="flex flex-col gap-1 items-center bg-neutral-800/50 rounded-md p-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-10 rounded mt-1" />
            </div>

            <div className="flex flex-col gap-1 items-center bg-neutral-800/50 rounded-md p-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-10 rounded mt-1" />
            </div>

            <div className="flex items-center justify-center">
              <Skeleton className="h-[38px] w-full rounded" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <Link href={`/${siteId}`} className="group flex gap-3 items-center duration-200">
              <Favicon domain={domain} className="w-6 h-6" />
              <span className="text-lg font-medium truncate group-hover:underline transition-all">{domain}</span>
            </Link>
          </div>

          <div className="relative mt-1 mb-1 rounded-md p-2 overflow-hidden">
            <SiteSessionChart data={data?.data ?? []} height={110} />
            {!hasData && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/70 backdrop-blur-sm">
                <span className="text-sm text-neutral-400">No data available</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="flex flex-col gap-1 items-center bg-neutral-800/50 rounded-md p-2 hover:bg-neutral-800 transition-colors">
              <div className="text-xs text-neutral-400">Sessions</div>
              <div className="font-semibold">{overviewData?.data?.sessions?.toLocaleString() || "0"}</div>
            </div>

            <div className="flex flex-col gap-1 items-center bg-neutral-800/50 rounded-md p-2 hover:bg-neutral-800 transition-colors">
              <div className="text-xs text-neutral-400">Users</div>
              <div className="font-semibold">{overviewData?.data?.users?.toLocaleString() || "0"}</div>
            </div>

            <Link href={`/${siteId}`} className="flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-full border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:text-blue-400 transition-all"
              >
                <span className="mr-1">View</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
