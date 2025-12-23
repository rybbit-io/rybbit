import { useEffect, useMemo } from "react";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Loader2, Video } from "lucide-react";
import { NothingFound } from "../../../../components/NothingFound";
import { ReplayCard, ReplayCardSkeleton } from "./ReplayCard";
import { useGetSessionReplays } from "../../../../api/analytics/hooks/sessionReplay/useGetSessionReplays";
import { SessionReplayListItem } from "../../../../api/analytics/endpoints";
import { useReplayStore } from "@/components/replay/replayStore";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Input } from "../../../../components/ui/input";

export function ReplayList() {
  const { sessionId, setSessionId, minDuration, setMinDuration } = useReplayStore();

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetSessionReplays({
    minDuration,
  });

  // Use the intersection observer hook for infinite scroll
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px", // Load more when user is 200px from the bottom
  });

  const flattenedData = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  useEffect(() => {
    if (flattenedData.length > 0 && !sessionId) {
      setSessionId(flattenedData[0].session_id);
    }
  }, [flattenedData]);

  // Fetch next page when intersection observer detects the target is visible
  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  if (error) {
    return <div className="text-red-500 p-4">Error: {(error as Error).message}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
        <div className="flex items-center gap-2 p-2">
          <div className="text-xs text-neutral-600 dark:text-neutral-400">Min Duration</div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={minDuration}
              inputSize="sm"
              onChange={e => setMinDuration(Number(e.target.value))}
              className="w-16"
            />
            <div className="text-xs text-neutral-600 dark:text-neutral-400">s</div>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 flex flex-col">
        <ScrollArea className="h-[calc(100vh-130px)] rounded-lg">
          {isLoading ? (
            Array.from({ length: 20 }).map((_, index) => <ReplayCardSkeleton key={`loading-${index}`} />)
          ) : flattenedData.length === 0 ? (
            <NothingFound
              icon={<Video className="w-10 h-10" />}
              title={"No session replays found"}
              description={"Try a different date range or filter"}
            />
          ) : (
            <>
              {flattenedData.map((replay: SessionReplayListItem, index) => (
                <ReplayCard key={`${replay.session_id}-${index}`} replay={replay} />
              ))}

              {/* Infinite scroll anchor and loading indicator */}
              <div ref={ref} className="py-3 flex justify-center">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more replays...
                  </div>
                )}
                {!hasNextPage && !isFetchingNextPage && flattenedData.length > 0 && (
                  <div className="text-neutral-500 dark:text-neutral-500 text-xs">All replays loaded</div>
                )}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
