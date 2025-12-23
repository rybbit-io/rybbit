"use client";

import { useGetSite } from "@/api/admin/sites";
import { useGetOverviewBucketed } from "@/api/analytics/hooks/useGetOverviewBucketed";
import { MetricResponse } from "@/api/analytics/endpoints";
import { usePageMetadata } from "@/api/usePageMetadata";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "@rybbit/shared";
import { useStore } from "@/lib/store";
import { MINUTES_IN_24_HOURS } from "@/lib/const";
import { truncateString } from "@/lib/utils";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageSparklineChart } from "./PageSparklineChart";

// Maximum length for page titles
const MAX_TITLE_LENGTH = 90;

type PageListItemProps = {
  pageData: MetricResponse;
  isLoading?: boolean;
};

export function PageListItem({ pageData, isLoading = false }: PageListItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const { data: siteMetadata } = useGetSite();
  const { site, time, bucket } = useStore(); // Get time and bucket from store

  const isPastMinutesMode = time.mode === "past-minutes";

  // Create a pathname filter for this specific page
  const pageSpecificFilter: Filter = {
    parameter: "page_title",
    value: [pageData.title ?? ""],
    type: "equals",
  };

  // Regular bucketed data for sparklines
  const { data: regularData, isLoading: isLoadingRegular } = useGetOverviewBucketed({
    site,
    bucket,
    dynamicFilters: [pageSpecificFilter],
    props: {
      enabled: !isPastMinutesMode,
    },
  });

  // Past minutes data for sparklines
  const { data: pastMinutesData, isLoading: isLoadingPastMinutes } = useGetOverviewBucketed({
    site,
    bucket,
    dynamicFilters: [
      {
        parameter: "pathname",
        type: "equals",
        value: [pageData.value],
      },
    ],
    props: {
      enabled: isPastMinutesMode,
    },
  });

  // Use the appropriate data source based on mode
  const pageTrafficData = isPastMinutesMode ? pastMinutesData : regularData;
  const isLoadingTrafficData = isPastMinutesMode ? isLoadingPastMinutes : isLoadingRegular;

  // External URL for the page
  const pageUrl = siteMetadata?.domain ? `https://${siteMetadata.domain}${pageData.value}` : "";

  // Fetch page metadata using TanStack Query
  const { data: metadata, isLoading: isLoadingMetadata, isError: isMetadataError } = usePageMetadata(pageUrl);

  // Get thumbnail URL from metadata
  const thumbnailUrl = !thumbnailError && !isMetadataError ? metadata?.image : null;

  // Handle image error
  const handleImageError = () => {
    setThumbnailError(true);
  };

  return (
    <Card className="w-full mb-3" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <CardContent className="p-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
          {/* Left side: Page title/path with thumbnail */}
          <div className="flex gap-3 flex-1 min-w-0">
            {thumbnailUrl && !isLoadingMetadata && (
              <div className="hidden sm:block shrink-0 h-12 w-16 relative rounded-md overflow-hidden border border-neutral-100 dark:border-neutral-800">
                <img
                  src={thumbnailUrl}
                  alt={`Thumbnail for ${pageData.title || pageData.value}`}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium truncate">
                  {truncateString(pageData.title || pageData.value, MAX_TITLE_LENGTH)}
                </h3>
                {pageUrl && (
                  <Link
                    href={pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{pageData.value}</p>
            </div>
          </div>

          {/* Right side: Sparkline chart and session count */}
          <div className="flex items-center gap-0 w-full md:w-auto">
            {/* Sparkline chart */}
            <div className="h-12 w-40">
              <PageSparklineChart
                data={pageTrafficData}
                isHovering={isHovering}
                pageTitle={pageData.title || pageData.value}
                isLoading={isLoadingTrafficData}
              />
            </div>

            {/* Session count and duration */}
            <div className="text-right min-w-[120px]">
              <div>
                <span className="text-base font-semibold">{pageData.count.toLocaleString()}</span>
                <span className="text-xs text-foreground/70"> sessions</span>
              </div>
              {pageData.time_on_page_seconds !== undefined && (
                <div>
                  <span className="text-base font-semibold">{formatShortDuration(pageData.time_on_page_seconds)} </span>
                  <span className="text-xs text-foreground/70">avg time</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
