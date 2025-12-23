import { getTimezone } from "@/lib/store";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { useCurrentSite } from "../../../../api/admin/sites";
import { useGetSessionsInfinite } from "../../../../api/analytics/hooks/useGetUserSessions";
import { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { Avatar, generateName } from "../../../../components/Avatar";
import { Channel } from "../../../../components/Channel";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";
import { SessionCard as FullSessionCard } from "../../../../components/Sessions/SessionCard";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "../../../../components/TooltipIcons/TooltipIcons";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { formatShortDuration, hour12, userLocale } from "../../../../lib/dateTimeUtils";
import { cn, formatter } from "../../../../lib/utils";

// Function to truncate path for display
function truncatePath(path: string, maxLength: number = 32) {
  if (!path) return "-";
  if (path.length <= maxLength) return path;

  // Keep the beginning of the path with ellipsis
  return `${path.substring(0, maxLength)}...`;
}

function SessionCardSkeleton() {
  return (
    <div className="rounded-lg bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 overflow-hidden p-2 space-y-2 animate-pulse">
      <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 bg-neutral-150 dark:bg-neutral-700 rounded-full" />
          <div className="h-3 w-24 bg-neutral-150 dark:bg-neutral-700 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-20 bg-neutral-150 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-1 bg-neutral-150 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-10 bg-neutral-150 dark:bg-neutral-700 rounded hidden md:block" />
        </div>
      </div>
      <div className="flex space-x-2 items-center">
        <div className="h-4 w-4 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
        <div className="h-4 w-4 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
        <div className="h-4 w-4 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
        <div className="h-4 w-4 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
        <div className="h-[21px] w-12 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
        <div className="h-[21px] w-12 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
        <div className="h-[21px] w-16 bg-neutral-150 dark:bg-neutral-700 rounded-sm" />
      </div>
      <div className="items-center flex-1 min-w-0 hidden md:flex gap-2">
        <div className="h-3 w-32 bg-neutral-150 dark:bg-neutral-700 rounded" />
        <div className="h-3 w-3 bg-neutral-150 dark:bg-neutral-700 rounded" />
        <div className="h-3 w-32 bg-neutral-150 dark:bg-neutral-700 rounded" />
      </div>
    </div>
  );
}

function SessionCard({ session, onClick }: { session: GetSessionsResponse[number]; onClick?: () => void }) {
  // Calculate session duration in minutes
  const start = DateTime.fromSQL(session.session_start, { zone: "utc" });
  const end = DateTime.fromSQL(session.session_end, { zone: "utc" });
  const totalSeconds = Math.floor(end.diff(start).milliseconds / 1000);
  const duration = formatShortDuration(totalSeconds);
  const siteId = useCurrentSite();

  const name = generateName(session.user_id);

  return (
    <div
      className="rounded-lg bg-neutral-850 border border-neutral-800 overflow-hidden p-2 space-y-2 cursor-pointer hover:bg-neutral-800 transition-colors"
      onClick={onClick}
    >
      <div className="flex justify-between border-b border-neutral-700 pb-2">
        <div className="text-sm text-neutral-100 flex items-center gap-1.5">
          <Avatar id={session.user_id} size={16} />
          <span className="text-xs text-neutral-200 max-w-32 truncate hover:underline">{name}</span>
        </div>
        <div className="flex space-x-2 items-center pr-2">
          <div className="flex items-center gap-1.5 text-xs text-neutral-300">
            <span className="text-neutral-400">
              {DateTime.fromSQL(session.session_start, {
                zone: "utc",
              })
                .setLocale(userLocale)
                .setZone(getTimezone())
                .toFormat(hour12 ? "MMM d, h:mm a" : "dd MMM, HH:mm")}
            </span>
            <span className="text-neutral-400">•</span>
            <span className="hidden md:block">{duration}</span>
          </div>
        </div>
      </div>
      <div className="flex space-x-2 items-center">
        {session.country && (
          <CountryFlagTooltipIcon country={session.country} city={session.city} region={session.region} />
        )}
        <BrowserTooltipIcon browser={session.browser || "Unknown"} browser_version={session.browser_version} />
        <OperatingSystemTooltipIcon
          operating_system={session.operating_system || ""}
          operating_system_version={session.operating_system_version}
        />
        <DeviceTypeTooltipIcon
          device_type={session.device_type || ""}
          screen_width={session.screen_width}
          screen_height={session.screen_height}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="flex items-center gap-1 bg-neutral-800 text-neutral-300">
              <PageviewIcon />
              <span>{formatter(session.pageviews)}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Pageviews</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="flex items-center gap-1 bg-neutral-800 text-neutral-300">
              <EventIcon />
              <span>{formatter(session.events)}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Events</TooltipContent>
        </Tooltip>
        <Channel channel={session.channel} referrer={session.referrer} />
      </div>
      <div className="items-center flex-1 min-w-0 hidden md:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-neutral-400 truncate max-w-[200px] inline-block">
              {truncatePath(session.entry_page)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{session.entry_page || "-"}</p>
          </TooltipContent>
        </Tooltip>

        <ArrowRight className="mx-2 w-3 h-3 shrink-0 text-neutral-400" />

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-neutral-400 truncate max-w-[200px] inline-block">
              {truncatePath(session.exit_page)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{session.exit_page || "-"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function GlobeSessions() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetSessionsInfinite({});

  const [expanded, setExpanded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GetSessionsResponse[number] | null>(null);

  // Combine all pages of data
  const flattenedData = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  return (
    <>
      <div className="space-y-2 bg-neutral-850/60 p-2 rounded-lg w-[371px] backdrop-blur-sm border border-neutral-800">
        <div className="text-sm text-neutral-200 font-medium flex items-center justify-between">
          SESSIONS
          <Button variant="ghost" size="smIcon" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
        <div className={cn("space-y-2 overflow-y-auto", expanded ? "max-h-[calc(100vh-210px)]" : "max-h-[210px]")}>
          {isLoading ? (
            <>
              <SessionCardSkeleton />
              <SessionCardSkeleton />
              <SessionCardSkeleton />
            </>
          ) : (
            flattenedData.map(session => (
              <SessionCard key={session.session_id} session={session} onClick={() => setSelectedSession(session)} />
            ))
          )}
          {isFetchingNextPage && <SessionCardSkeleton />}
        </div>
        {/* Load more button */}
        {hasNextPage && expanded && !isLoading && (
          <Button onClick={() => fetchNextPage()} className="w-full" variant="ghost" size="sm">
            Load more
          </Button>
        )}
      </div>

      <Dialog open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <VisuallyHidden>
          <DialogTitle>Session Details</DialogTitle>
        </VisuallyHidden>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-transparent border-0 p-0 shadow-none gap-0 [&>button]:hidden">
          {selectedSession && <FullSessionCard session={selectedSession} expandedByDefault />}
        </DialogContent>
      </Dialog>
    </>
  );
}
