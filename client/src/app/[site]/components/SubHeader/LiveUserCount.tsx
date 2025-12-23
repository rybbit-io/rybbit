import NumberFlow from "@number-flow/react";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Rewind } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useGetLiveUserCount } from "../../../../api/analytics/hooks/useGetLiveUserCount";
import { useGetSessionsInfinite } from "../../../../api/analytics/hooks/useGetUserSessions";
import { NothingFound } from "../../../../components/NothingFound";
import { SessionCard, SessionCardSkeleton } from "../../../../components/Sessions/SessionCard";
import { Button } from "../../../../components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "../../../../components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ScrollArea } from "../../../../components/ui/scroll-area";

export function LiveUserCount() {
  const { data } = useGetLiveUserCount(5);

  const {
    data: sessionsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetSessionsInfinite({
    timeOverride: {
      mode: "past-minutes",
      pastMinutesStart: 5,
      pastMinutesEnd: 0,
    },
    limit: 25,
    refetchInterval: 10000,
  });

  // Use the intersection observer hook
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const sessions = useMemo(() => {
    if (!sessionsData) return [];
    return sessionsData.pages.flatMap(page => page.data || []);
  }, [sessionsData]);

  // Fetch next page when intersection observer detects the target is visible
  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  return (
    <Drawer>
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button className="h-8" variant="ghost">
              <div className="flex items-center gap-1 text-base text-neutral-700 dark:text-neutral-200 cursor-pointer">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                </span>
                <span className="text-sm text-neutral-700 dark:text-neutral-200 ml-1 font-medium">
                  {<NumberFlow respectMotionPreference={false} value={data?.count ?? 0} />}
                </span>
              </div>
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Users online in past 5 minutes</p>
        </TooltipContent>
      </Tooltip>
      <DrawerContent>
        <VisuallyHidden>
          <DrawerHeader>
            <DrawerTitle>Users online in past 5 minutes</DrawerTitle>
          </DrawerHeader>
        </VisuallyHidden>
        <ScrollArea
          className="h-[75vh]"
          maskClassName="before:from-white dark:before:from-neutral-950 after:from-white dark:after:from-neutral-950"
        >
          <div className="space-y-3 p-2 md:p-4 ">
            {isLoading ? (
              <SessionCardSkeleton count={5} />
            ) : sessions.length === 0 ? (
              <NothingFound
                icon={<Rewind className="w-10 h-10" />}
                title="No sessions found"
                description="No users online in the past 5 minutes"
              />
            ) : (
              <>
                {sessions.map((session, index) => (
                  <SessionCard key={`${session.session_id}-${index}`} session={session} />
                ))}
                {/* Infinite scroll sentinel */}
                <div ref={ref} className="space-y-3">
                  {isFetchingNextPage && <SessionCardSkeleton count={3} />}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
