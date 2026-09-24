"use client";

import { useExtracted } from "next-intl";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Event } from "../../../../../api/analytics/endpoints";
import { EVENT_TYPE_CONFIG } from "../../../../../lib/events";
import { EventTypeFilter } from "../../../../../components/EventTypeFilter";
import { NothingFound } from "../../../../../components/NothingFound";
import { ErrorState } from "../../../../../components/ErrorState";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { EventDetailsSheet } from "./EventDetailsSheet";
import { EventRow } from "./EventRow";
import { RealtimeToggle } from "./RealtimeToggle";
import { useEventLogState } from "./useEventLogState";

const ALL_EVENT_TYPES = new Set(EVENT_TYPE_CONFIG.map((c) => c.value as string));

export function EventLog() {
  const t = useExtracted();
  const { site } = useParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(ALL_EVENT_TYPES);

  const handleToggleType = useCallback((type: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const {
    isRealtime,
    toggleRealtime,
    allEvents,
    unfilteredEvents,
    isLoading,
    isError,
    isFetched,
    scrollElement,
    scrollAreaCallbackRef,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLive,
    bufferedCount,
    flushAndScrollToTop,
  } = useEventLogState({ visibleTypes });

  const rowVirtualizer = useVirtualizer({
    count: allEvents.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 28,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // --- Infinite scroll trigger ---
  const lastItem = virtualItems[virtualItems.length - 1];
  if (
    lastItem &&
    lastItem.index >= allEvents.length - 5 &&
    hasNextPage &&
    !isFetchingNextPage &&
    !isLoading
  ) {
    fetchNextPage();
  }

  const showBody = !isLoading && !isError && allEvents.length > 0;

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <RealtimeToggle isRealtime={isRealtime} onToggle={toggleRealtime} />
        {!isLoading && (
          <EventTypeFilter visibleTypes={visibleTypes} onToggle={handleToggleType} events={unfilteredEvents} />
        )}
      </div>

      <div className="relative">
        {/* New events indicator */}
        {isRealtime && !isLive && bufferedCount > 0 && (
          <button
            onClick={flushAndScrollToTop}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-accent-400 dark:bg-accent-600 text-white text-xs font-medium shadow-lg hover:bg-accent-300 dark:hover:bg-accent-500 transition-colors cursor-pointer"
          >
            {t("{bufferedCount} new events", { bufferedCount: String(bufferedCount) })}
          </button>
        )}

        <ScrollArea
          className="h-[90vh] border border-neutral-100 dark:border-neutral-800 rounded-lg"
          ref={scrollAreaCallbackRef}
        >
          <div className="relative h-full pr-2 font-mono text-[11px] leading-4">
            <div className="sticky top-0 z-20 bg-neutral-50/95 dark:bg-neutral-850/95 backdrop-blur border-b border-neutral-100 dark:border-neutral-800">
              <div className="grid grid-cols-[28px_145px_180px_100px_1fr_1fr] px-2 py-1.5 uppercase tracking-wide text-[10px] text-neutral-500 dark:text-neutral-400">
                <div></div>
                <div>{t("Timestamp")}</div>
                <div>{t("User")}</div>
                <div>{t("Device Info")}</div>
                <div>{t("Page")}</div>
                <div>{t("Data")}</div>
              </div>
            </div>

            {isLoading && (
              <div>
                {Array.from({ length: 24 }).map((_, index) => (
                  <EventLogItemSkeleton key={index} showProperties={index % 3 === 0} />
                ))}
              </div>
            )}

            {isError && (
              <ErrorState
                title={t("Failed to load events")}
                message={t("There was a problem fetching the events. Please try again later.")}
              />
            )}

            {isFetched && !isError && allEvents.length === 0 && (
              <NothingFound
                title={t("No events found")}
                description={t("Try a different date range or filter")}
              />
            )}

            {showBody && (
              <>
                <div className="relative">
                  <div
                    style={{
                      height: rowVirtualizer.getTotalSize(),
                      position: "relative",
                    }}
                  >
                    {virtualItems.map((virtualRow) => {
                      const event = allEvents[virtualRow.index];
                      if (!event) return null;

                      return (
                        <div
                          key={`${event.timestamp}-${virtualRow.index}`}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <EventRow
                            event={event}
                            site={site as string}
                            onClick={(selected) => {
                              setSelectedEvent(selected);
                              setSheetOpen(true);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isFetchingNextPage && (
                  <div className="py-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <EventLogItemSkeleton key={`next-page-${index}`} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <EventDetailsSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedEvent(null);
        }}
        event={selectedEvent}
        site={site as string}
      />
    </>
  );
}

function EventLogItemSkeleton({ showProperties }: { showProperties?: boolean }) {
  return (
    <div className="grid grid-cols-[28px_145px_180px_100px_1fr_1fr] border-b border-neutral-100 dark:border-neutral-800 px-2 py-1">
      <div className="flex items-center justify-center">
        <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
      <div className="flex items-center px-2">
        <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 px-2">
        <div className="h-[18px] w-[18px] rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
      <div className="flex items-center gap-1 px-2">
        <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
      <div className="flex items-center px-2">
        <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      </div>
      <div className="flex items-center px-2">
        {showProperties && (
          <div className="h-3 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        )}
      </div>
    </div>
  );
}
