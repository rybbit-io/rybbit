import { CopyText } from "@/components/CopyText";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, Clock, ExternalLink, Loader2, Monitor, Smartphone, Tablet, TriangleAlert } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { memo, useMemo } from "react";
import { GetSessionsResponse, SessionEvent, useGetSessionDetailsInfinite } from "../../api/analytics/userSessions";
import { Browser } from "../../app/[site]/components/shared/icons/Browser";
import { CountryFlag } from "../../app/[site]/components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../app/[site]/components/shared/icons/OperatingSystem";
import { formatDuration, hour12 } from "../../lib/dateTimeUtils";
import { useGetRegionName } from "../../lib/geo";
import { cn, getCountryName, getLanguageName } from "../../lib/utils";
import { Avatar } from "../Avatar";
import { EventIcon, PageviewIcon } from "../EventIcons";
import { Button } from "../ui/button";

// Component to display a single pageview or event
function PageviewItem({
  item,
  index,
  isLast = false,
  nextTimestamp,
}: {
  item: SessionEvent;
  index: number;
  isLast?: boolean;
  nextTimestamp?: string; // Timestamp of the next event for duration calculation
}) {
  const isError = item.type === "error";
  const isEvent = item.type === "custom_event";
  const isPageview = item.type === "pageview";
  const isOutbound = item.type === "outbound";
  const timestamp = DateTime.fromSQL(item.timestamp, { zone: "utc" }).toLocal();
  const formattedTime = timestamp.toFormat(hour12 ? "h:mm:ss a" : "HH:mm:ss");

  // Calculate duration if this is a pageview and we have the next timestamp
  let duration = null;
  if (isPageview && nextTimestamp) {
    const nextTime = DateTime.fromSQL(nextTimestamp, { zone: "utc" }).toLocal();
    const totalSeconds = Math.floor(nextTime.diff(timestamp).milliseconds / 1000);
    duration = formatDuration(totalSeconds);
  }

  return (
    <div className="flex mb-3">
      {/* Timeline circle with number */}
      <div className="relative flex-shrink-0">
        {!isLast && (
          <div
            className="absolute top-8 left-4 w-[1px] bg-neutral-700"
            style={{
              height: "calc(100% - 20px)",
            }}
          />
        )}
        {/* Connecting line */}
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border",
            isEvent
              ? "bg-amber-900/30 border-amber-500/50"
              : isError
                ? "bg-red-900/30 border-red-500/50"
                : isOutbound
                  ? "bg-purple-900/30 border-purple-500/50"
                  : "bg-blue-900/30 border-blue-500/50"
          )}
        >
          <span className="text-sm font-medium">{index + 1}</span>
        </div>
      </div>

      <div className="flex flex-col ml-3 flex-1">
        <div className="flex items-center flex-1 py-1">
          <div className="flex-shrink-0 mr-3">
            {isEvent ? (
              <EventIcon />
            ) : isError ? (
              <TriangleAlert className="w-4 h-4 text-red-500" />
            ) : isOutbound ? (
              <ExternalLink className="w-4 h-4 text-purple-500" />
            ) : (
              <PageviewIcon />
            )}
          </div>

          <div className="flex-1 min-w-0 mr-4">
            {isPageview ? (
              <Link
                href={`https://${item.hostname}${item.pathname}${item.querystring ? `${item.querystring}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className="text-sm truncate hover:underline "
                  title={item.pathname}
                  style={{
                    maxWidth: "calc(min(100vw, 1150px) - 250px)",
                  }}
                >
                  {item.pathname}
                  {item.querystring ? `${item.querystring}` : ""}
                </div>
              </Link>
            ) : isOutbound && item.props?.url ? (
              <Link href={String(item.props.url)} target="_blank" rel="noopener noreferrer">
                <div
                  className="text-sm truncate hover:underline text-purple-400"
                  title={String(item.props.url)}
                  style={{
                    maxWidth: "calc(min(100vw, 1150px) - 250px)",
                  }}
                >
                  {String(item.props.url)}
                </div>
              </Link>
            ) : (
              <div className="text-sm truncate">{item.event_name || "Outbound Click"}</div>
            )}
          </div>

          <div className="text-xs text-neutral-400 flex-shrink-0">{formattedTime}</div>
        </div>
        {isPageview && duration && (
          <div className="flex items-center pl-7 mt-1">
            <div className="text-xs text-neutral-400">
              <Clock className="w-3 h-3 inline mr-1 text-neutral-400" />
              {duration}
            </div>
          </div>
        )}
        {isEvent && (
          <div className="flex items-center pl-7 mt-1">
            <div className="text-xs text-neutral-400">
              {item.props && Object.keys(item.props).length > 0 ? (
                <span className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(item.props).map(([key, value]) => (
                    <Badge
                      key={key}
                      variant="outline"
                      className="px-1.5 py-0 h-5 text-xs bg-neutral-800 text-neutral-100 font-medium"
                    >
                      <span className="text-neutral-300 font-light mr-1">{key}:</span>{" "}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="max-w-7xl">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </Badge>
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        )}
        {isOutbound && (
          <div className="flex items-center pl-7 mt-1">
            <div className="text-xs text-neutral-400">
              {item.props && Object.keys(item.props).length > 0 ? (
                <span className="flex flex-wrap gap-2 mt-1">
                  {item.props.text ? (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 h-5 text-xs bg-neutral-800 text-neutral-100 font-medium"
                    >
                      <span className="text-neutral-300 font-light mr-1">text:</span> {String(item.props.text)}
                    </Badge>
                  ) : null}
                  {item.props.target ? (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 h-5 text-xs bg-neutral-800 text-neutral-100 font-medium"
                    >
                      <span className="text-neutral-300 font-light mr-1">target:</span> {String(item.props.target)}
                    </Badge>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        )}
        {isError && (
          <div className="flex items-center pl-7 mt-1">
            <div className="text-xs text-neutral-400">
              {item.props ? (
                <span>
                  {item.props.message && (
                    <Badge
                      key="message"
                      variant="outline"
                      className="px-1.5 py-0 h-5 text-xs bg-neutral-800 text-neutral-100 font-medium"
                    >
                      <span className="text-neutral-300 font-light mr-1">message:</span> {String(item.props.message)}
                    </Badge>
                  )}

                  {item.props.stack && (
                    <div>
                      <p className="mt-2 mb-1 text-neutral-300 font-light">Stack Trace:</p>
                      <pre className="text-xs text-neutral-100 bg-neutral-800 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                        {item.props.stack}
                      </pre>
                    </div>
                  )}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized skeleton component for the session details timeline
const SessionDetailsTimelineSkeleton = memo(({ itemCount }: { itemCount: number }) => {
  // Function to get a random width class for skeletons
  const getRandomWidth = () => {
    const widths = ["w-28", "w-36", "w-44", "w-52", "w-60", "w-72", "w-80", "w-96", "w-full"];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  return (
    <div className="py-4">
      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Timeline tab skeleton */}
      <div className="mb-4">
        {/* Timeline items skeleton */}
        {Array.from({ length: Math.min(itemCount, 100) }).map((_, i) => (
          <div key={i} className="flex mb-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-3" />
                <Skeleton className={cn("h-4", getRandomWidth(), "max-w-md mr-4")} />
                <Skeleton className="h-3 w-16 flex-shrink-0 ml-auto" />
              </div>
              <div className="mt-1 pl-7">
                {Math.random() > 0.5 && <Skeleton className={cn("h-3", Math.random() > 0.7 ? "w-48" : "w-32")} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

interface SessionDetailsProps {
  session: GetSessionsResponse[number];
  userId?: string;
}

export function SessionDetails({ session, userId }: SessionDetailsProps) {
  const {
    data: sessionDetailsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetSessionDetailsInfinite(session.session_id);
  const { site } = useParams();

  // Flatten all events into a single array
  const allEvents = useMemo(() => {
    if (!sessionDetailsData?.pages) return [];
    return sessionDetailsData.pages.flatMap(page => page.data?.events || []);
  }, [sessionDetailsData?.pages]);

  // Get session details from the first page
  const sessionDetails = sessionDetailsData?.pages[0]?.data?.session;

  // Calculate total pageviews and events
  const totalPageviews = useMemo(() => {
    return allEvents.filter((p: SessionEvent) => p.type === "pageview").length;
  }, [allEvents]);

  const totalEvents = useMemo(() => {
    return allEvents.filter((p: SessionEvent) => p.type === "custom_event").length;
  }, [allEvents]);

  const totalErrors = useMemo(() => {
    return allEvents.filter((p: SessionEvent) => p.type === "error").length;
  }, [allEvents]);

  const totalOutbound = useMemo(() => {
    return allEvents.filter((p: SessionEvent) => p.type === "outbound").length;
  }, [allEvents]);

  const { getRegionName } = useGetRegionName();

  return (
    <div className="px-4 bg-neutral-900 border-t border-neutral-800">
      {isLoading ? (
        <SessionDetailsTimelineSkeleton itemCount={session.pageviews + session.events} />
      ) : error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>Error loading session details. Please try again.</AlertDescription>
        </Alert>
      ) : sessionDetailsData?.pages[0]?.data ? (
        <Tabs defaultValue="timeline" className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-neutral-800">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="info">Session Info</TabsTrigger>
            </TabsList>
            {!userId && (
              <Link href={`/${site}/user/${session.user_id}`}>
                <Button size={"sm"} variant={"success"}>
                  View User <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          <TabsContent value="timeline" className="mt-4">
            <div className="mb-4 px-1">
              {allEvents.map((pageview: SessionEvent, index: number) => {
                // Determine the next timestamp for duration calculation
                // For the last item, use the session end time
                let nextTimestamp;
                if (index < allEvents.length - 1) {
                  nextTimestamp = allEvents[index + 1].timestamp;
                } else if (sessionDetails) {
                  nextTimestamp = sessionDetails.session_end;
                }

                return (
                  <PageviewItem
                    key={`${pageview.timestamp}-${index}`}
                    item={pageview}
                    index={index}
                    isLast={index === allEvents.length - 1 && !hasNextPage}
                    nextTimestamp={nextTimestamp}
                  />
                );
              })}

              {hasNextPage && (
                <div className="flex justify-center mt-6 mb-4">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More</span>
                    )}
                  </Button>
                </div>
              )}

              {sessionDetailsData.pages[0]?.data?.pagination?.total > 0 && (
                <div className="text-center text-xs text-neutral-500 mt-2">
                  Showing {allEvents.length} of {sessionDetailsData.pages[0]?.data?.pagination?.total} events
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-[auto_auto_auto] gap-8 mb-6">
              {/* User Information */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-neutral-300 border-b border-neutral-800 pb-2">
                  User Information
                </h4>
                <div className="space-y-3">
                  {sessionDetails?.user_id && (
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <Avatar size={40} id={sessionDetails.user_id} />
                      </div>
                      <div>
                        <div className="text-sm text-neutral-400 flex items-center">
                          <span className="font-medium text-neutral-300">User ID:</span>
                          <CopyText text={sessionDetails.user_id} maxLength={24} className="inline-flex ml-2" />
                        </div>
                        <div className="text-sm text-neutral-400 flex items-center">
                          <span className="font-medium text-neutral-300">Session ID:</span>
                          <CopyText text={sessionDetails.session_id} maxLength={20} className="inline-flex ml-2" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {sessionDetails?.language && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="font-medium text-neutral-300 min-w-[80px]">Language:</span>
                        <span className="text-neutral-400">
                          {sessionDetails.language ? getLanguageName(sessionDetails.language) : "N/A"}
                        </span>
                      </div>
                    )}

                    {sessionDetails?.country && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-neutral-300 min-w-[80px]">Country:</span>
                        <div className="flex items-center gap-1 text-neutral-400">
                          <CountryFlag country={sessionDetails.country} />
                          <span>{getCountryName(sessionDetails.country)}</span>
                          {sessionDetails.region && <span>({sessionDetails.region})</span>}
                        </div>
                      </div>
                    )}
                    {sessionDetails?.region && getRegionName(sessionDetails.region) && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-neutral-300 min-w-[80px]">Region:</span>
                        <span className="text-neutral-400">{getRegionName(sessionDetails.region)}</span>
                      </div>
                    )}
                    {sessionDetails?.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-neutral-300 min-w-[80px]">City:</span>
                        <span className="text-neutral-400">{sessionDetails.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Device Information */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-neutral-300 border-b border-neutral-800 pb-2">
                  Device Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-300 min-w-[80px]">Device:</span>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      {sessionDetails?.device_type === "Desktop" && <Monitor className="w-4 h-4" />}
                      {sessionDetails?.device_type === "Mobile" && <Smartphone className="w-4 h-4" />}
                      {sessionDetails?.device_type === "Tablet" && <Tablet className="w-4 h-4" />}
                      <span>{sessionDetails?.device_type || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-300 min-w-[80px]">Browser:</span>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Browser browser={sessionDetails?.browser || "Unknown"} />
                      <span>
                        {sessionDetails?.browser || "Unknown"}
                        {sessionDetails?.browser_version && (
                          <span className="ml-1">v{sessionDetails.browser_version}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-300 min-w-[80px]">OS:</span>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <OperatingSystem os={sessionDetails?.operating_system || ""} />
                      <span>
                        {sessionDetails?.operating_system || "Unknown"}
                        {sessionDetails?.operating_system_version && (
                          <span className="ml-1">{sessionDetails.operating_system_version}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {sessionDetails?.screen_width && sessionDetails?.screen_height ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-neutral-300 min-w-[80px]">Screen:</span>
                      <span className="text-neutral-400">
                        {sessionDetails.screen_width} × {sessionDetails.screen_height}
                      </span>
                    </div>
                  ) : null}
                  {sessionDetails?.ip && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-neutral-300 min-w-[80px]">IP:</span>
                      <span className="text-neutral-400">{sessionDetails.ip}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Source Information */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-neutral-300 border-b border-neutral-800 pb-2">
                  Source Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-300 min-w-[80px]">Channel:</span>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <span>{sessionDetails?.channel || "None"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-300 min-w-[80px]">Referrer:</span>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <span>{sessionDetails?.referrer || "None"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-300 min-w-[80px]">Entry Page:</span>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <span>{sessionDetails?.entry_page || "None"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="py-4 text-center text-neutral-400">No data available</div>
      )}
    </div>
  );
}
