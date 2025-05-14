import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useGetOverviewPastMinutes } from "../api/analytics/useGetOverview";
import { useGetOverviewBucketedPastMinutes } from "../api/analytics/useGetOverviewBucketed";
import { SiteSessionChart } from "./SiteSessionChart";
import { SiteSettings } from "./SiteSettings/SiteSettings";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Favicon } from "./Favicon";

interface SiteCardProps {
  siteId: number;
  domain: string;
}

export function SiteCard({ siteId, domain }: SiteCardProps) {
  const { data, isLoading } = useGetOverviewBucketedPastMinutes({
    pastMinutes: 24 * 60,
    site: siteId,
    bucket: "hour",
  });

  const { data: overviewData, isLoading: isOverviewLoading } =
    useGetOverviewPastMinutes({
      site: siteId,
      pastMinutes: 24 * 60,
    });

  const hasData = (overviewData?.data?.sessions || 0) > 0;

  if (isLoading || isOverviewLoading) {
    return (
      <div
        className="flex flex-col rounded-lg bg-neutral-900/70 p-4 border border-neutral-800 shadow-lg transition-all duration-300"
        key={siteId}
      >
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <Skeleton className="w-6 h-6 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
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
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg bg-neutral-900/70 p-4 border border-neutral-800 shadow-lg hover:shadow-xl hover:border-neutral-700 transition-all duration-300 hover:translate-y-[-2px]">
      <div className="flex justify-between items-center">
        <Link
          href={`/${siteId}`}
          className="group flex gap-3 items-center duration-200"
        >
          <Favicon domain={domain} className="w-6 h-6" />
          <span className="text-lg font-medium truncate group-hover:underline transition-all">
            {domain}
          </span>
        </Link>
        <SiteSettings siteId={siteId} />
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
          <div className="font-semibold">
            {overviewData?.data?.sessions?.toLocaleString() || "0"}
          </div>
        </div>

        <div className="flex flex-col gap-1 items-center bg-neutral-800/50 rounded-md p-2 hover:bg-neutral-800 transition-colors">
          <div className="text-xs text-neutral-400">Users</div>
          <div className="font-semibold">
            {overviewData?.data?.users?.toLocaleString() || "0"}
          </div>
        </div>

        <Link href={`/${siteId}`} className="flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-full border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:text-blue-400 transition-all"
          >
            <span className="mr-1">View</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Button>
        </Link>
      </div>
    </div>
  );
}
