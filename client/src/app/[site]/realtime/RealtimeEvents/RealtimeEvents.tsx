import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Laptop, Smartphone } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { Event, useGetEvents } from "../../../../api/analytics/events/useGetEvents";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";
import { Skeleton } from "../../../../components/ui/skeleton";
import { cn, getCountryName } from "../../../../lib/utils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";

// DeviceIcon component for displaying mobile/desktop icons
function DeviceIcon({ deviceType }: { deviceType: string }) {
  const type = deviceType.toLowerCase();

  if (type.includes("mobile") || type.includes("tablet")) {
    return <Smartphone className="w-4 h-4" />;
  }

  return <Laptop className="w-4 h-4" />;
}

// Function to truncate path for display
function truncatePath(path: string, maxLength: number = 31) {
  if (!path) return "-";
  if (path.length <= maxLength) return path;

  // Keep the beginning of the path with ellipsis
  return `${path.substring(0, maxLength)}...`;
}

function EventCard({ event }: { event: Event }) {
  // Parse event timestamp
  const eventTime = DateTime.fromSQL(event.timestamp, {
    zone: "utc",
  }).toLocal();

  // Determine if it's a pageview or custom event
  const isPageview = event.type === "pageview";

  const fullPath = `https://${event.hostname}${event.pathname}${event.querystring ? `${event.querystring}` : ""}`;

  return (
    <Link href={`user/${event.user_id}`} target="_blank" rel="noopener noreferrer">
      <div className="mb-3 rounded-lg bg-neutral-850/50 border border-neutral-800 overflow-hidden p-3 flex flex-col filter backdrop-blur-sm hover:bg-neutral-800/70 transition-all duration-200">
        <div className="flex items-center gap-2 text-sm text-neutral-100 mb-2">
          <div className="flex items-center gap-2">{isPageview ? <PageviewIcon /> : <EventIcon />}</div>

          {event.type === "pageview" ? (
            <div>
              <Link href={fullPath} target="_blank" rel="noopener noreferrer">
                <div
                  className="text-sm truncate hover:underline "
                  title={event.pathname}
                  style={{
                    maxWidth: "calc(min(100vw, 1150px) - 250px)",
                  }}
                >
                  {truncatePath(`${event.pathname}${event.querystring ? `${event.querystring}` : ""}`)}
                </div>
              </Link>
            </div>
          ) : (
            <div>{event.event_name}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex space-x-2 items-center ml-6">
            {event.country && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <CountryFlag country={event.country} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getCountryName(event.country)}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Browser browser={event.browser || "Unknown"} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{event.browser || "Unknown browser"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <OperatingSystem os={event.operating_system || ""} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{event.operating_system || "Unknown OS"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DeviceIcon deviceType={event.device_type || ""} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{event.device_type || "Unknown device"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Path with tooltip for long paths */}
          {/* <div className="flex items-center ml-3 flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-neutral-400 truncate max-w-[200px] inline-block">
                  {truncatePath(
                    isPageview && event.page_title
                      ? event.page_title
                      : event.pathname
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isPageview && event.page_title
                    ? `${event.page_title} (${event.pathname})`
                    : event.pathname || "-"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div> */}

          {/* Time information */}
          <div className="flex items-center text-xs text-neutral-300">
            <span className="text-neutral-400">{eventTime.toRelative()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function RealtimeEvents() {
  const { data, isLoading } = useGetEvents(100);

  if (isLoading) {
    return <EventCardSkeleton />;
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-neutral-400 p-4 text-center">No events recorded yet</div>;
  }

  return (
    <div className="overflow-y-auto p-2" style={{ height: "100vh" }}>
      {data.map((event: Event, index: number) => (
        <EventCard key={`${event.timestamp}-${index}`} event={event} />
      ))}
    </div>
  );
}

function EventCardSkeleton() {
  // Function to get a random width class for skeletons
  const getRandomWidth = () => {
    const widths = ["w-16", "w-20", "w-24", "w-28", "w-32", "w-36", "w-40"];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  // Create multiple skeletons for a realistic loading state
  const skeletons = Array.from({ length: 5 }).map((_, index) => (
    <div
      className="mb-3 rounded-lg bg-neutral-850/50 border border-neutral-800 overflow-hidden p-3 flex flex-col filter backdrop-blur-sm"
      key={index}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 text-sm text-neutral-100 mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-sm" />
        </div>
        <Skeleton className={cn("h-4", getRandomWidth())} />
      </div>

      {/* Details row */}
      <div className="flex items-center gap-2">
        <div className="flex space-x-2 items-center ml-6">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
        </div>

        {/* Time */}
        <div className="flex items-center text-xs">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  ));

  return (
    <div className="overflow-y-auto p-2" style={{ height: "100vh" }}>
      {skeletons}
    </div>
  );
}
