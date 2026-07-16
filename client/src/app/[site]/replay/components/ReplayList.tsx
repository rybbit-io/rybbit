import { useEffect, useMemo } from "react";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Loader2, Video } from "lucide-react";
import { useExtracted } from "next-intl";
import { NothingFound } from "../../../../components/NothingFound";
import { ReplayCard, ReplayCardSkeleton } from "./ReplayCard";
import { useGetSessionReplays } from "../../../../api/analytics/hooks/sessionReplay/useGetSessionReplays";
import { SessionReplayListItem } from "../../../../api/analytics/endpoints";
import { useShallow } from "zustand/react/shallow";
import { useReplayStore } from "@/components/replay/replayStore";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Input } from "../../../../components/ui/input";
import { cn, formatter } from "../../../../lib/utils";

export function ReplayList({ onSelect }: { onSelect?: () => void }) {
  const t = useExtracted();
  const { sessionId, setSessionId, minDuration, setMinDuration } = useReplayStore(
    useShallow(s => ({
      sessionId: s.sessionId,
      setSessionId: s.setSessionId,
      minDuration: s.minDuration,
      setMinDuration: s.setMinDuration,
    }))
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetSessionReplays({
    minDuration,
  });

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const flattenedData = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount;

  useEffect(() => {
    if (flattenedData.length > 0 && !sessionId) {
      setSessionId(flattenedData[0].session_id);
    }
  }, [flattenedData]);

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-center text-xs text-red-500">
        {t("Couldn't load replays.")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 shrink-0">
        <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {isLoading ? (
            t("Replays")
          ) : (
            <>
              <span className="tabular-nums">{formatter(totalCount ?? flattenedData.length)}</span>{" "}
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                {totalCount === 1 ? t("replay") : t("replays")}
              </span>
            </>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="hidden sm:inline">{t("Min")}</span>
          <Input
            type="number"
            min={0}
            value={minDuration}
            inputSize="sm"
            onChange={e => setMinDuration(Math.max(0, Number(e.target.value)))}
            className="w-14 text-center"
            aria-label={t("Min Duration")}
          />
          <span>{t("s")}</span>
        </label>
      </div>

      {/* List */}
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* [&>div]:!block forces Radix's display:table viewport wrapper to block so card truncate is bounded */}
        <ScrollArea className="h-full" viewportClassName="[&>div]:!block">

          {isLoading ? (
            Array.from({ length: 20 }).map((_, index) => <ReplayCardSkeleton key={`loading-${index}`} />)
          ) : flattenedData.length === 0 ? (
            <NothingFound
              icon={<Video className="w-10 h-10" />}
              title={t("No session replays found")}
              description={t("Try a different date range or filter")}
            />
          ) : (
            <>
              {flattenedData.map((replay: SessionReplayListItem, index) => (
                <ReplayCard key={`${replay.session_id}-${index}`} replay={replay} onSelect={onSelect} />
              ))}

              <div ref={ref} className={cn("flex justify-center py-3", !hasNextPage && "py-2")}>
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("Loading more replays...")}
                  </div>
                )}
                {!hasNextPage && !isFetchingNextPage && flattenedData.length > 0 && (
                  <div className="text-neutral-400 dark:text-neutral-600 text-[11px]">{t("All replays loaded")}</div>
                )}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
