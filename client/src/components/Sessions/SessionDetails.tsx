import CopyText from "@/components/CopyText";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Avatar from "boring-avatars";
import {
  ArrowRight,
  Clock,
  FileText,
  Loader2,
  Monitor,
  MousePointerClick,
  Smartphone,
  Tablet
} from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { memo, useMemo } from "react";
import {
  GetSessionsResponse,
  PageviewEvent,
  useGetSessionDetailsInfinite,
} from "../../api/analytics/userSessions";
import { Browser } from "../../app/[site]/components/shared/icons/Browser";
import { CountryFlag } from "../../app/[site]/components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../app/[site]/components/shared/icons/OperatingSystem";
import { cn, getCountryName, getLanguageName } from "../../lib/utils";
import { Button } from "../ui/button";

// Component to display a single pageview or event
function PageviewItem({
  item,
  index,
  isLast = false,
  nextTimestamp,
}: {
  item: PageviewEvent;
  index: number;
  isLast?: boolean;
  nextTimestamp?: string; // Timestamp of the next event for duration calculation
}) {
  const isEvent = item.type !== "pageview";
  const timestamp = DateTime.fromSQL(item.timestamp, { zone: "utc" }).toLocal();
  const formattedTime = timestamp.toFormat("h:mm:ss a");

  // Calculate duration if this is a pageview and we have the next timestamp
  let duration = null;
  if (!isEvent && nextTimestamp) {
    const nextTime = DateTime.fromSQL(nextTimestamp, { zone: "utc" }).toLocal();
    const diff = nextTime.diff(timestamp, ["minutes", "seconds"]);
    const minutes = Math.floor(diff.minutes);
    const seconds = Math.floor(diff.seconds);

    if (minutes > 0 || seconds > 0) {
      duration = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
    }
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
          className={cn("flex items-center justify-center w-8 h-8 rounded-full border", isEvent ? "bg-amber-900/30 border-amber-500/50" : "bg-blue-900/30 border-blue-500/50")}
        >
          <span className="text-sm font-medium">{index + 1}</span>
        </div>
      </div>

      <div className="flex flex-col ml-3 flex-1">
        <div className="flex items-center flex-1 py-1">
          <div className="flex-shrink-0 mr-3">
            {isEvent ? (
              <MousePointerClick className="w-4 h-4 text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-blue-500" />
            )}
          </div>

          <div className="flex-1 min-w-0 mr-4">
            {item.type === "pageview" ? (
              <Link
                href={`https://${item.hostname}${item.pathname}${
                  item.querystring ? `${item.querystring}` : ""
                }`}
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
            ) : (
              <div className="text-sm truncate">{item.event_name}</div>
            )}
          </div>

          <div className="text-xs text-gray-400 flex-shrink-0">
            {formattedTime}
          </div>
        </div>
        {!isEvent && duration && (
          <div className="flex items-center pl-7 mt-1">
            <div className="text-xs text-gray-400">
              <Clock className="w-3 h-3 inline mr-1 text-gray-400" />
              {duration}
            </div>
          </div>
        )}
        {isEvent && (
          <div className="flex items-center pl-7 mt-1">
            <div className="text-xs text-gray-400">
              {item.properties &&
              Object.keys(JSON.parse(item.properties)).length > 0 ? (
                <span className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(JSON.parse(item.properties)).map(
                    ([key, value]) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className="px-1.5 py-0 h-5 text-xs bg-neutral-800 text-gray-100 font-medium"
                      >
                        <span className="text-gray-300 font-light mr-1">
                          {key}:
                        </span>{" "}
                        {String(value)}
                      </Badge>
                    )
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
const SessionDetailsTimelineSkeleton = memo(
  ({ itemCount }: { itemCount: number }) => {
    // Function to get a random width class for skeletons
    const getRandomWidth = () => {
      const widths = [
        "w-28",
        "w-36",
        "w-44",
        "w-52",
        "w-60",
        "w-72",
        "w-80",
        "w-96",
        "w-full",
      ];
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
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>

          {/* Timeline items skeleton */}
          {Array.from({ length: Math.min(itemCount, 100) }).map((_, i) => (
            <div key={i} className="flex mb-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-3" />
                  <Skeleton
                    className={cn("h-4", getRandomWidth(), "max-w-md mr-4")}
                  />
                  <Skeleton className="h-3 w-16 flex-shrink-0 ml-auto" />
                </div>
                <div className="mt-1 pl-7">
                  {Math.random() > 0.5 && (
                    <Skeleton
                      className={cn("h-3", Math.random() > 0.7 ? "w-48" : "w-32")}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

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

  // Flatten all pageview pages into a single array
  const allPageviews = useMemo(() => {
    if (!sessionDetailsData?.pages) return [];
    return sessionDetailsData.pages.flatMap(
      (page) => page.data?.pageviews || []
    );
  }, [sessionDetailsData?.pages]);

  // Get session details from the first page
  const sessionDetails = sessionDetailsData?.pages[0]?.data?.session;

  // Calculate total pageviews and events
  const totalPageviews = useMemo(() => {
    return allPageviews.filter((p: PageviewEvent) => p.type === "pageview")
      .length;
  }, [allPageviews]);

  const totalEvents = useMemo(() => {
    return allPageviews.filter((p: PageviewEvent) => p.type !== "pageview")
      .length;
  }, [allPageviews]);

  return (
    <div className="px-4 bg-neutral-900 border-t border-neutral-800">
      {isLoading ? (
        <SessionDetailsTimelineSkeleton
          itemCount={session.pageviews + session.events}
        />
      ) : error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Error loading session details. Please try again.
          </AlertDescription>
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
                <Button variant={"accent"}>
                  View User <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          <TabsContent value="timeline" className="mt-4">
            <div className="mb-3">
              <div className="flex gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-gray-300 bg-blue-500/60"
                >
                  <FileText className="w-3 h-3" />
                  <span>
                    Pageviews: {totalPageviews}
                    {sessionDetailsData.pages[0]?.data?.pagination?.total >
                      allPageviews.length &&
                      ` of ${sessionDetailsData.pages[0]?.data?.pagination?.total}`}
                  </span>
                </Badge>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-gray-300 bg-amber-500/60"
                >
                  <MousePointerClick className="w-3 h-3" />
                  <span>Events: {totalEvents}</span>
                </Badge>
              </div>
              <div className="px-1 pt-2 pb-1">
                {allPageviews.map((pageview: PageviewEvent, index: number) => {
                  // Determine the next timestamp for duration calculation
                  // For the last item, use the session end time
                  let nextTimestamp;
                  if (index < allPageviews.length - 1) {
                    nextTimestamp = allPageviews[index + 1].timestamp;
                  } else if (sessionDetails) {
                    nextTimestamp = sessionDetails.session_end;
                  }

                  return (
                    <PageviewItem
                      key={`${pageview.timestamp}-${index}`}
                      item={pageview}
                      index={index}
                      isLast={index === allPageviews.length - 1 && !hasNextPage}
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
                  <div className="text-center text-xs text-gray-500 mt-2">
                    Showing {allPageviews.length} of{" "}
                    {sessionDetailsData.pages[0]?.data?.pagination?.total}{" "}
                    events
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              {/* User Information */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-300 border-b border-neutral-800 pb-2">
                  User Information
                </h4>
                <div className="space-y-3">
                  {sessionDetails?.user_id && (
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <Avatar
                          size={24}
                          name={sessionDetails.user_id}
                          variant="marble"
                          colors={[
                            "#92A1C6",
                            "#146A7C",
                            "#F0AB3D",
                            "#C271B4",
                            "#C20D90",
                          ]}
                        />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 flex items-center">
                          <span className="font-medium text-gray-300">
                            User ID:
                          </span>
                          <CopyText
                            text={sessionDetails.user_id}
                            maxLength={24}
                            className="inline-flex ml-2"
                          />
                        </div>
                        <div className="text-sm text-gray-400 flex items-center">
                          <span className="font-medium text-gray-300">
                            Session ID:
                          </span>
                          <CopyText
                            text={sessionDetails.session_id}
                            maxLength={20}
                            className="inline-flex ml-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {sessionDetails?.language && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="font-medium text-gray-300 min-w-[80px]">
                          Language:
                        </span>
                        <span className="text-gray-400">
                          {sessionDetails.language
                            ? getLanguageName(sessionDetails.language)
                            : "N/A"}
                        </span>
                      </div>
                    )}

                    {sessionDetails?.country && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-300 min-w-[80px]">
                          Location:
                        </span>
                        <div className="flex items-center gap-1 text-gray-400">
                          <CountryFlag country={sessionDetails.country} />
                          <span>{getCountryName(sessionDetails.country)}</span>
                          {sessionDetails.region && (
                            <span>({sessionDetails.region})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Device Information */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-300 border-b border-neutral-800 pb-2">
                  Device Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-300 min-w-[80px]">
                      Device:
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      {sessionDetails?.device_type === "Desktop" && (
                        <Monitor className="w-4 h-4" />
                      )}
                      {sessionDetails?.device_type === "Mobile" && (
                        <Smartphone className="w-4 h-4" />
                      )}
                      {sessionDetails?.device_type === "Tablet" && (
                        <Tablet className="w-4 h-4" />
                      )}
                      <span>{sessionDetails?.device_type || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-300 min-w-[80px]">
                      Browser:
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Browser browser={sessionDetails?.browser || "Unknown"} />
                      <span>
                        {sessionDetails?.browser || "Unknown"}
                        {sessionDetails?.browser_version && (
                          <span className="ml-1">
                            v{sessionDetails.browser_version}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-300 min-w-[80px]">
                      OS:
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <OperatingSystem
                        os={sessionDetails?.operating_system || ""}
                      />
                      <span>
                        {sessionDetails?.operating_system || "Unknown"}
                        {sessionDetails?.operating_system_version && (
                          <span className="ml-1">
                            {sessionDetails.operating_system_version}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {sessionDetails?.screen_width &&
                  sessionDetails?.screen_height ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-300 min-w-[80px]">
                        Screen:
                      </span>
                      <span className="text-gray-400">
                        {sessionDetails.screen_width} ×{" "}
                        {sessionDetails.screen_height}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="py-4 text-center text-gray-400">No data available</div>
      )}
    </div>
  );
}
