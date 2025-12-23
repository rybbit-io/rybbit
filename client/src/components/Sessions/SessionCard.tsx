import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTimezone } from "@/lib/store";
import { ArrowRight, ChevronDown, ChevronRight, Video } from "lucide-react";
import { DateTime } from "luxon";
import { memo, useState } from "react";
import { GetSessionsResponse } from "../../api/analytics/endpoints";
import { formatShortDuration, hour12, userLocale } from "../../lib/dateTimeUtils";
import { cn, formatter, getUserDisplayName } from "../../lib/utils";
import { Avatar } from "../Avatar";
import { Channel } from "../Channel";
import { EventIcon, PageviewIcon } from "../EventIcons";
import { IdentifiedBadge } from "../IdentifiedBadge";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "../TooltipIcons/TooltipIcons";
import { Badge } from "../ui/badge";
import { SessionDetails } from "./SessionDetails";
import { ReplayDrawer } from "./ReplayDrawer";

interface SessionCardProps {
  session: GetSessionsResponse[number];
  userId?: string;
  onClick?: () => void;
  expandedByDefault?: boolean;
}

// Function to truncate path for display
function truncatePath(path: string, maxLength: number = 32) {
  if (!path) return "-";
  if (path.length <= maxLength) return path;

  // Keep the beginning of the path with ellipsis
  return `${path.substring(0, maxLength)}...`;
}

export function SessionCard({ session, onClick, userId, expandedByDefault }: SessionCardProps) {
  const [expanded, setExpanded] = useState(expandedByDefault || false);
  const [replayDrawerOpen, setReplayDrawerOpen] = useState(false);
  // Calculate session duration in minutes
  const start = DateTime.fromSQL(session.session_start);
  const end = DateTime.fromSQL(session.session_end);
  const totalSeconds = Math.floor(end.diff(start).milliseconds / 1000);
  const duration = formatShortDuration(totalSeconds);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-850 overflow-hidden">
      <div className="p-3 cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-center gap-2">
          {!userId && (
            <div className="hidden md:flex items-center gap-2">
              <Avatar
                size={24}
                id={session.user_id}
                lastActiveTime={DateTime.fromSQL(session.session_end, { zone: "utc" })}
              />
              <span className="text-xs text-neutral-600 dark:text-neutral-200 w-24 truncate">
                {getUserDisplayName(session)}
              </span>
              {!!session.identified_user_id && <IdentifiedBadge traits={session.traits} />}
            </div>
          )}

          {/* Icons section */}
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
            {session.has_replay === 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="success"
                    onClick={e => {
                      e.stopPropagation();
                      setReplayDrawerOpen(true);
                    }}
                  >
                    <Video className="w-4 h-4" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Watch Session Replay</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  <PageviewIcon />
                  <span>{formatter(session.pageviews)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Pageviews</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  <EventIcon />
                  <span>{formatter(session.events)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Events</TooltipContent>
            </Tooltip>

            <Channel channel={session.channel} referrer={session.referrer} />
          </div>

          {/* Pages section with tooltips for long paths */}
          <div className="items-center ml-3 flex-1 min-w-0 hidden md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px] inline-block">
                  {truncatePath(session.entry_page)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{session.entry_page || "-"}</p>
              </TooltipContent>
            </Tooltip>

            <ArrowRight className="mx-2 w-3 h-3 shrink-0 text-neutral-500 dark:text-neutral-400" />

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px] inline-block">
                  {truncatePath(session.exit_page)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{session.exit_page || "-"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Time information */}

          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <span className="text-neutral-500 dark:text-neutral-400">
              {DateTime.fromSQL(session.session_start, {
                zone: "utc",
              })
                .setLocale(userLocale)
                .setZone(getTimezone())
                .toFormat(hour12 ? "MMM d, h:mm a" : "dd MMM, HH:mm")}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">•</span>
            <span className="hidden md:block">{duration}</span>
          </div>

          {/* Expand/Collapse icon */}
          <div className="ml-2 shrink-0 hidden md:flex">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={3} />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={3} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content using SessionDetails component */}
      {expanded && <SessionDetails session={session} userId={userId} />}

      {/* Replay Drawer */}
      {session.has_replay === 1 && (
        <ReplayDrawer sessionId={session.session_id} open={replayDrawerOpen} onOpenChange={setReplayDrawerOpen} />
      )}
    </div>
  );
}

export const SessionCardSkeleton = memo(({ userId, count }: { userId?: string; count?: number }) => {
  // Function to get a random width class for skeletons
  const getRandomWidth = () => {
    const widths = ["w-16", "w-20", "w-24", "w-28", "w-32", "w-36", "w-40", "w-44", "w-48"];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  // Get random width for time displays
  const getRandomTimeWidth = () => {
    const widths = ["w-20", "w-24", "w-28", "w-32"];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  // Get random width for duration displays
  const getRandomDurationWidth = () => {
    const widths = ["w-10", "w-12", "w-14"];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  // Create multiple skeletons for a realistic loading state
  const skeletons = Array.from({ length: count || 25 }).map((_, index) => (
    <div
      className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-850 overflow-hidden"
      key={index}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Avatar and User ID */}
          {!userId && (
            <div className="hidden md:flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          )}

          {/* Icons section - matching actual component structure */}
          <div className="flex space-x-2 items-center">
            {/* Country, Browser, OS, Device icons */}
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-4 rounded-sm" />
            {/* Pageviews badge */}
            <Skeleton className="h-[21px] w-12 rounded-sm" />
            {/* Events badge */}
            <Skeleton className="h-[21px] w-12 rounded-sm" />
            {/* Channel badge */}
            <Skeleton className="h-[21px] w-16 rounded-sm" />
          </div>

          {/* Entry/Exit paths with randomized widths */}
          <div className="items-center ml-3 flex-1 min-w-0 hidden md:flex">
            <Skeleton className={cn("h-3 max-w-[200px]", getRandomWidth())} />
            <ArrowRight className="mx-2 w-3 h-3 shrink-0 text-neutral-500 dark:text-neutral-400 opacity-20" />
            <Skeleton className={cn("h-3 max-w-[200px]", getRandomWidth())} />
          </div>

          {/* Time information */}
          <div className="flex items-center gap-1.5">
            <Skeleton className={cn("h-3", getRandomTimeWidth())} />
            <span className="text-neutral-500 dark:text-neutral-400 opacity-20">•</span>
            <Skeleton className={cn("h-3 hidden md:block", getRandomDurationWidth())} />
          </div>

          {/* Expand icon */}
          <div className="ml-2 shrink-0 hidden md:flex">
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  ));

  return <>{skeletons}</>;
});
