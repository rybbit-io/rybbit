"use client";
import { Card, CardContent, CardLoader } from "@/components/ui/card";
import { DateTime } from "luxon";
import { Tilt_Warp } from "next/font/google";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useGetOverview } from "../../../../../api/analytics/hooks/useGetOverview";
import { useGetOverviewBucketed } from "../../../../../api/analytics/hooks/useGetOverviewBucketed";
import { BucketSelection } from "../../../../../components/BucketSelection";
import { RybbitTextLogo } from "../../../../../components/RybbitLogo";
import { useWhiteLabel } from "../../../../../hooks/useIsWhiteLabel";
import { authClient } from "../../../../../lib/auth";
import { getTimezone, useStore } from "../../../../../lib/store";
import { Chart } from "./Chart";
import { Overview } from "./Overview";

// Moved inside component to use static t() calls

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export function MainSection() {
  const { isWhiteLabel } = useWhiteLabel();
  const session = authClient.useSession();
  const t = useExtracted();

  const { selectedStat, time, site, bucket } = useStore();

  const getSelectedStatLabel = () => {
    switch (selectedStat) {
      case "pageviews": return t("Pageviews");
      case "sessions": return t("Sessions");
      case "pages_per_session": return t("Pages per Session");
      case "bounce_rate": return t("Bounce Rate");
      case "session_duration": return t("Session Duration");
      case "users": return t("Users");
      default: return selectedStat;
    }
  };

  // Current period data
  const { data, isFetching, isPlaceholderData, error } = useGetOverviewBucketed({
    site,
    bucket,
  });

  // Previous period data
  const {
    data: previousData,
    isFetching: isPreviousFetching,
    error: previousError,
  } = useGetOverviewBucketed({
    periodTime: "previous",
    site,
    bucket,
  });

  const { isFetching: isOverviewFetching } = useGetOverview({ site });
  const { isFetching: isOverviewFetchingPrevious } = useGetOverview({
    site,
    periodTime: "previous",
  });

  const maxOfDataAndPreviousData = Math.max(
    Math.max(...(data?.data?.map((d: any) => d[selectedStat]) ?? [])),
    Math.max(...(previousData?.data?.map((d: any) => d[selectedStat]) ?? []))
  );

  // For range mode (Last 7 / 14 / 30 Days, custom range) anchor both charts'
  // right edge to the last current bucket so the current line reaches it.
  // Named periods (this-week/month/year) keep the full-period span from
  // getChartTimeBounds — current line ends at "today", and the previous
  // overlay shows the full prior period as a backdrop.
  const timezone = getTimezone();
  const chartXMax = (() => {
    if (isPlaceholderData) return undefined;
    if (time.mode !== "range") return undefined;
    const points = data?.data;
    if (!points?.length) return undefined;
    const now = DateTime.now();
    for (let i = points.length - 1; i >= 0; i--) {
      const ts = DateTime.fromSQL(points[i].time, { zone: timezone }).toUTC();
      if (ts <= now) return ts.toJSDate();
    }
    return undefined;
  })();

  return (
    <>
      <Card>
        <CardContent className="p-0 w-full">
          <Overview />
        </CardContent>
        {(isOverviewFetching || isOverviewFetchingPrevious) && <CardLoader />}
      </Card>
      <Card>
        {(isFetching || isPreviousFetching) && <CardLoader />}
        <CardContent className="p-2 md:p-4 py-3 w-full">
          <div className="flex items-center justify-between px-2 md:px-0">
            <div className="flex items-center space-x-4">
              {!isWhiteLabel && (
                <Link
                  href={session.data ? "/" : "https://rybbit.com"}
                  className="opacity-75"
                >
                  <RybbitTextLogo width={80} />
                </Link>
              )}
            </div>
            <span className="text-sm text-neutral-700 dark:text-neutral-200">{getSelectedStatLabel()}</span>
            <BucketSelection />
          </div>
          <div className="h-[200px] md:h-[290px]">
            <Chart
              data={data}
              max={maxOfDataAndPreviousData}
              previousData={time.mode === "all-time" ? undefined : previousData}
              chartXMax={chartXMax}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
