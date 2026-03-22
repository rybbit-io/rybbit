import { Tag, Settings } from "lucide-react";
import { useExtracted } from "next-intl";
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
import { SiteSettings } from "./SiteSettings/SiteSettings";
import { TagEditor } from "./TagEditor";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface SiteCardProps {
  siteId: number;
  domain: string;
  tags?: string[];
  allTags?: string[];
  onTagsUpdated?: () => void;
  selectedTags?: string[];
  onTagClick?: (tag: string) => void;
}

export function SiteCard({ siteId, domain, tags = [], allTags = [], onTagsUpdated, selectedTags = [], onTagClick }: SiteCardProps) {
  const t = useExtracted();
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
    useFilters: false,
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
    useFilters: false,
  });

  // Previous period - automatically handles both regular time-based and past-minutes queries
  const { data: overviewDataPrevious } = useGetOverview({
    site: siteId,
    periodTime: "previous",
    useFilters: false,
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
        className="flex flex-col md:flex-row md:justify-between gap-3 rounded-lg bg-white dark:bg-neutral-900/70 px-3 py-2 border border-neutral-100 dark:border-neutral-850 transition-all duration-300 hover:translate-y-[-2px] w-full"
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
              <div onClick={(e) => e.preventDefault()}>
                <Tooltip>
                  <SiteSettings
                    siteId={siteId}
                    trigger={
                      <TooltipTrigger asChild>
                        <button className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                          <Settings className="h-4 w-4 text-neutral-400" />
                        </button>
                      </TooltipTrigger>
                    }
                  />
                  <TooltipContent>{t("Site Settings")}</TooltipContent>
                </Tooltip>
              </div>
              {/* Tags display */}
              <div onClick={(e) => e.preventDefault()} className="flex items-center gap-1">
                {tags.slice(0, 3).map(tag => {
                  return (
                    <Badge
                      key={tag}
                      variant={"default"}
                      className={`text-xs ${onTagClick ? "cursor-pointer" : ""}`}
                      onClick={onTagClick ? () => onTagClick(tag) : undefined}
                    >
                      {tag}
                    </Badge>
                  );
                })}
                {tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 3}
                  </Badge>
                )}
                {onTagsUpdated && (
                  <Tooltip>
                    <TagEditor
                      siteId={siteId}
                      currentTags={tags}
                      allTags={allTags}
                      onTagsUpdated={onTagsUpdated}
                      trigger={
                        <TooltipTrigger asChild>
                          <button className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                            <Tag className="h-4 w-4 text-neutral-400" />
                          </button>
                        </TooltipTrigger>
                      }
                    />
                    <TooltipContent>{t("Edit Tags")}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center justify-between">
              <div className="relative rounded-md w-40 h-12.5">
                <SiteSessionChart data={data?.data ?? []} />
                {!hasData && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{t("No data available")}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-75">
                <div className="flex flex-col items-start gap-1 rounded-md p-2 transition-colors">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("Sessions")}</div>
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
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("Users")}</div>
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
