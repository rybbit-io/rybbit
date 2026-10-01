"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { NewItemsPill } from "@/components/interior/new-items-pill";
import { Event } from "../../../../../api/analytics/endpoints";
import { ErrorState } from "../../../../../components/ErrorState";
import { NothingFound } from "../../../../../components/NothingFound";
import { ToggleChip } from "../../../../../components/ToggleChip";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { EVENT_TYPE_CONFIG } from "../../../../../lib/events";
import { useStore } from "../../../../../lib/store";
import { cn, getUserDisplayName } from "../../../../../lib/utils";
import { EventTypeMark, useEventTypeLabels } from "../EventTypeMark";
import { EventDetailsSheet } from "./EventDetailsSheet";
import { getEventKey, matchesEventSearch } from "./eventLogUtils";
import { EVENT_LOG_GRID, EVENT_LOG_ROW_HEIGHT, EVENT_LOG_WIDE, EVENT_LOG_WIDEST, EventRow } from "./EventRow";
import { RealtimeToggle } from "./RealtimeToggle";
import { useEventLogState } from "./useEventLogState";

const ALL_EVENT_TYPES = new Set(EVENT_TYPE_CONFIG.map(c => c.value as string));

export function EventLog() {
  const t = useExtracted();
  const { site } = useParams<{ site: string }>();
  const privateKey = useStore(state => state.privateKey);
  const { singular: typeLabels } = useEventTypeLabels();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(ALL_EVENT_TYPES);
  const [search, setSearch] = useState("");

  const handleToggleType = useCallback((type: string) => {
    setVisibleTypes(prev => {
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
    arrivals,
  } = useEventLogState({ visibleTypes });

  // The search reads the rows already loaded: name, type, properties, page and user.
  const query = search.trim().toLowerCase();
  const events = useMemo(() => {
    if (!query) return allEvents;
    return allEvents.filter(event =>
      matchesEventSearch(
        event,
        query,
        typeLabels[event.type] ?? "",
        getUserDisplayName({
          identified_user_id: event.identified_user_id || undefined,
          user_id: event.user_id,
          traits: event.traits,
        })
      )
    );
    // typeLabels is rebuilt every render; its content only changes with the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, query]);

  const jumpToNewEvents = () => {
    flushAndScrollToTop();
    // The pill unmounts with the click; keep keyboard focus in the list instead of dropping it on <body>.
    scrollElement?.focus({ preventScroll: true });
  };

  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => EVENT_LOG_ROW_HEIGHT,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // --- Infinite scroll trigger ---
  // Not while searching: a search that matches little would otherwise pull page after page of
  // history to fill the list. The footer offers the next page instead.
  const lastItem = virtualItems[virtualItems.length - 1];
  if (!query && lastItem && lastItem.index >= events.length - 5 && hasNextPage && !isFetchingNextPage && !isLoading) {
    fetchNextPage();
  }

  const showBody = !isLoading && !isError && events.length > 0;

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 pb-2 pt-3 md:px-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-base font-semibold leading-none tracking-tight">{t("Event log")}</h2>
            <RealtimeToggle isRealtime={isRealtime} onToggle={toggleRealtime} />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {isRealtime
                ? t("Newest first, checks every 2 seconds. Scroll down to pause.")
                : t("Newest first, within the selected period.")}
            </span>
          </div>
          <div className="w-full sm:w-64">
            <Input
              isSearch
              inputSize="sm"
              className="h-8"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t("Search name, property or user")}
              aria-label={t("Search name, property or user")}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-3 md:px-4">
          {EVENT_TYPE_CONFIG.map(option => (
            <ToggleChip
              key={option.value}
              isSelected={visibleTypes.has(option.value)}
              onClick={() => handleToggleType(option.value)}
              indicator={<EventTypeMark type={option.value} className="h-3 w-3" />}
              label={typeLabels[option.value] ?? option.label}
            />
          ))}
        </div>

        <div className="@container relative border-t border-neutral-100 dark:border-neutral-800">
          {/* Events that arrived while scrolled away from the top wait in a buffer; the pill brings them in. */}
          <NewItemsPill
            className="top-10"
            count={isRealtime && !isLive ? bufferedCount : 0}
            onJump={jumpToNewEvents}
            describe={count => t("{count, plural, one {# new event} other {# new events}}", { count })}
            label={(count, ticker) =>
              t.rich("{count, plural, one {<ticker>#</ticker> new event} other {<ticker>#</ticker> new events}}", {
                count,
                ticker: () => ticker,
              })
            }
          />

          <ScrollArea className="h-[70vh] min-h-[360px]" ref={scrollAreaCallbackRef}>
            <div className="relative h-full">
              <div
                className={cn(
                  EVENT_LOG_GRID,
                  "sticky top-0 z-20 h-8 border-b border-neutral-100 bg-neutral-50 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-400"
                )}
              >
                <span>{t("Time")}</span>
                <span>{t("Event")}</span>
                <span className={EVENT_LOG_WIDE}>{t("Properties")}</span>
                <span>{t("User")}</span>
                <span className={EVENT_LOG_WIDEST}>{t("Page")}</span>
                <span className={EVENT_LOG_WIDE}>{t("Device")}</span>
              </div>

              {isLoading && (
                <div>
                  {Array.from({ length: 16 }).map((_, index) => (
                    <EventLogRowSkeleton key={index} wide={index % 3 === 0} />
                  ))}
                </div>
              )}

              {isError && (
                <ErrorState
                  title={t("Failed to load events")}
                  message={t("There was a problem fetching the events. Please try again later.")}
                />
              )}

              {isFetched && !isError && events.length === 0 && (
                <NothingFound
                  title={t("No events found")}
                  description={
                    query
                      ? t('None of the {count} loaded events match "{search}".', {
                          count: allEvents.length.toLocaleString(),
                          search: search.trim(),
                        })
                      : unfilteredEvents.length > 0
                        ? t("No loaded events are of the selected types.")
                        : t("Try a different date range or filter")
                  }
                />
              )}

              {showBody && (
                <>
                  <div
                    style={{
                      height: rowVirtualizer.getTotalSize(),
                      position: "relative",
                    }}
                  >
                    {virtualItems.map(virtualRow => {
                      const event = events[virtualRow.index];
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
                            site={site}
                            privateKey={privateKey}
                            typeLabel={typeLabels[event.type] ?? typeLabels.custom_event}
                            arrivedAt={arrivals.size ? arrivals.get(getEventKey(event)) : undefined}
                            onClick={selected => {
                              setSelectedEvent(selected);
                              setSheetOpen(true);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {isFetchingNextPage && (
                    <div>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <EventLogRowSkeleton key={`next-page-${index}`} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {query && !isLoading && !isError && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <span>
              {t("{matches} of the {count} loaded events match. The search does not reach older events.", {
                matches: events.length.toLocaleString(),
                count: allEvents.length.toLocaleString(),
              })}
            </span>
            {hasNextPage && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                loading={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {t("Load older events")}
              </Button>
            )}
          </div>
        )}
      </Card>

      <EventDetailsSheet
        open={sheetOpen}
        onOpenChange={open => {
          setSheetOpen(open);
          if (!open) setSelectedEvent(null);
        }}
        event={selectedEvent}
        site={site}
      />
    </>
  );
}

function EventLogRowSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className={cn(EVENT_LOG_GRID, "h-8 border-b border-neutral-100 dark:border-neutral-800")}>
      <Skeleton className="h-3 w-14 rounded" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <div className={EVENT_LOG_WIDE}>{wide && <Skeleton className="h-3 w-48 rounded" />}</div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-[18px] w-[18px] rounded-full" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <div className={EVENT_LOG_WIDEST}>
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <div className={cn(EVENT_LOG_WIDE, "items-center gap-1")}>
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3.5 w-3.5 rounded" />
      </div>
    </div>
  );
}
