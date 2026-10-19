import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Rewind } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { FlashNumber } from "@/components/interior/value-flash";
import { useStore } from "@/lib/store";
import { useGetLiveUserCount } from "../../../../api/analytics/hooks/useGetLiveUserCount";
import { LIVE_SESSIONS_POLL_MS, useGetLiveSessions } from "../../../../api/analytics/hooks/useGetUserSessions";
import { ErrorState } from "../../../../components/ErrorState";
import { NothingFound } from "../../../../components/NothingFound";
import { SessionCard, SessionCardSkeleton } from "../../../../components/Sessions/SessionCard";
import { Button } from "../../../../components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "../../../../components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { useLiveSessionsForFirstVisitor } from "../Header/firstPageview";

export function LiveUserCount() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const { data, isFetching } = useGetLiveUserCount(5);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const keepLive = useLiveSessionsForFirstVisitor(site);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setOpenedAt(Date.now());
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      {keepLive && !open && <KeepLiveSessionsPolling />}
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button className="h-8" variant="ghost">
              <div className="flex items-center gap-1 text-base text-neutral-700 dark:text-neutral-200 cursor-pointer">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                </span>
                <span className="text-sm text-neutral-700 dark:text-neutral-200 ml-1 font-medium tabular-nums">
                  {data ? (
                    // Flashes when a poll moves the count; never on first paint or when the site changes.
                    <FlashNumber value={data.count} resetKey={site} fetching={isFetching} />
                  ) : (
                    // Not "0": nothing is known yet (loading, or the request failed).
                    <span className="text-neutral-400 dark:text-neutral-500">–</span>
                  )}
                </span>
              </div>
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("Users online in past 5 minutes")}</p>
        </TooltipContent>
      </Tooltip>
      <DrawerContent>
        <VisuallyHidden>
          <DrawerHeader>
            <DrawerTitle>{t("Users online in past 5 minutes")}</DrawerTitle>
          </DrawerHeader>
        </VisuallyHidden>
        {/* Keyed by opening: every opening mounts a fresh list, even one mid exit animation. */}
        <LiveSessionsList key={openedAt} openedAt={openedAt} />
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Keeps the list polling with the drawer closed, for a site useLiveSessionsForFirstVisitor holds live.
 * Not stale until the next poll is due, so taking over from a closing drawer doesn't refetch.
 */
function KeepLiveSessionsPolling() {
  useGetLiveSessions(LIVE_SESSIONS_POLL_MS);
  return null;
}

/**
 * Mounted only while the drawer is open, so the list polls (and pages) only while someone can see it.
 * Stale on every mount, so opening refetches. The drawer unmounts it once its exit animation ends, and
 * that cancels a refetch still walking the loaded pages.
 */
function LiveSessionsList({ openedAt }: { openedAt: number }) {
  const t = useExtracted();
  const {
    data,
    dataUpdatedAt,
    fetchStatus,
    isError,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetLiveSessions(0);

  // Use the intersection observer hook
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const sessions = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page || []);
  }, [data]);

  // Fetch next page when intersection observer detects the target is visible
  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  // Cached rows are from before this opening until one of its fetches succeeds: show the skeleton while
  // that is in flight (or paused offline), and an error if it failed, never the old rows.
  const refreshed = dataUpdatedAt >= openedAt;

  return (
    <ScrollArea
      className="h-[75vh]"
      maskClassName="before:from-white dark:before:from-neutral-950 after:from-white dark:after:from-neutral-950"
    >
      <div className="space-y-3 p-2 md:p-4 overflow-x-hidden">
        {!refreshed && isError && fetchStatus === "idle" ? (
          <ErrorState title="" message="" refetch={() => void refetch()} />
        ) : !refreshed ? (
          <SessionCardSkeleton count={5} />
        ) : sessions.length === 0 ? (
          <NothingFound
            icon={<Rewind className="w-10 h-10" />}
            title={t("No sessions found")}
            description={t("No users online in the past 5 minutes")}
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
  );
}
