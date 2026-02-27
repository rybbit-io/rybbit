import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useGetSessionDetailsInfinite } from "../../../api/analytics/hooks/useGetUserSessions";
import { GetSessionsResponse, SessionEvent } from "../../../api/analytics/endpoints";
import { Button } from "../../ui/button";
import { SessionDetailsTimelineSkeleton } from "./SessionDetailsTimelineSkeleton";
import { SessionInfoTab } from "./SessionInfoTab";
import { TimelineTab } from "./TimelineTab";

interface SessionDetailsProps {
  session: GetSessionsResponse[number];
  userId?: string;
  highlightedEventTimestamp?: number;
}

export function SessionDetails({ session, userId, highlightedEventTimestamp }: SessionDetailsProps) {
  const {
    data: sessionDetailsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetSessionDetailsInfinite(session.session_id);
  const { site } = useParams();
  const t = useExtracted();

  // Flatten all events into a single array
  const allEvents = useMemo(() => {
    if (!sessionDetailsData?.pages) return [];
    return sessionDetailsData.pages.flatMap((page) => page.data?.events || []);
  }, [sessionDetailsData?.pages]);

  // Get session details from the first page
  const sessionDetails = sessionDetailsData?.pages[0]?.data?.session;

  // Event type filter state
  const [visibleEventTypes, setVisibleEventTypes] = useState<Set<string>>(
    new Set([
      "pageview",
      "custom_event",
      "outbound",
      "button_click",
      "copy",
      "form_submit",
      "input_change",
    ])
  );

  const toggleEventType = (type: string) => {
    setVisibleEventTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // Filter events based on visible types
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event: SessionEvent) =>
      visibleEventTypes.has(event.type)
    );
  }, [allEvents, visibleEventTypes]);

  const isIdentified = !!session.identified_user_id;

  return (
    <div className="px-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-850">
      {isLoading ? (
        <SessionDetailsTimelineSkeleton
          itemCount={session.pageviews + session.events}
        />
      ) : error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            {t("Error loading session details. Please try again.")}
          </AlertDescription>
        </Alert>
      ) : sessionDetailsData?.pages[0]?.data ? (
        <Tabs defaultValue="timeline" className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="timeline">{t("Timeline")}</TabsTrigger>
              <TabsTrigger value="info">{t("Session Info")}</TabsTrigger>
            </TabsList>
            {!userId && (
              <Link
                href={`/${site}/user/${encodeURIComponent(
                  isIdentified ? session.identified_user_id : session.user_id
                )}`}
              >
                <Button size={"sm"} variant={"success"}>
                  {t("View User")} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          <TabsContent value="timeline">
            <TimelineTab
              highlightedEventTimestamp={highlightedEventTimestamp}
              allEvents={allEvents}
              filteredEvents={filteredEvents}
              visibleEventTypes={visibleEventTypes}
              onToggleEventType={toggleEventType}
              sessionEnd={sessionDetails?.session_end}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              totalEvents={sessionDetailsData.pages[0]?.data?.pagination?.total ?? 0}
            />
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            {sessionDetails && (
              <SessionInfoTab
                session={session}
                sessionDetails={sessionDetails}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="py-4 text-center text-neutral-400">
          {t("No data available")}
        </div>
      )}
    </div>
  );
}
