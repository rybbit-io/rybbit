"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGetEventsInfinite } from "../../../../api/analytics/hooks/events/useGetEvents";
import { NothingFound } from "../../../../components/NothingFound";
import { formatter } from "../../../../lib/utils";
import { EventLogItem, EventLogItemSkeleton } from "./EventLogItem";
import { ErrorState } from "../../../../components/ErrorState";
import { ScrollArea } from "../../../../components/ui/scroll-area";

export function EventLog() {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch events with infinite scrolling
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetEventsInfinite({
    pageSize: 100,
  });

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!loadMoreRef.current || !containerRef.current || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const container = containerRef.current;
    const loadMoreElement = loadMoreRef.current;
    const containerRect = container.getBoundingClientRect();
    const loadMoreRect = loadMoreElement.getBoundingClientRect();

    // Check if the load more element is visible in the viewport
    if (loadMoreRect.top <= containerRect.bottom + 100) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Set up scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Flatten all pages of data
  const allEvents = data?.pages.flatMap(page => page.data) || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 100 }).map((_, index) => (
          <EventLogItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load events"
        message="There was a problem fetching the events. Please try again later."
      />
    );
  }

  if (allEvents.length === 0) {
    return <NothingFound title={"No events found"} description={"Try a different date range or filter"} />;
  }

  return (
    <ScrollArea className="h-[80vh]">
      <div ref={containerRef} className="h-full pr-2">
        {allEvents.map((event, index) => (
          <EventLogItem key={`${event.timestamp}-${index}`} event={event} />
        ))}

        {/* Loading state for next page */}
        {hasNextPage && (
          <div className="py-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <EventLogItemSkeleton key={`next-page-${index}`} />
            ))}
          </div>
        )}

        {/* Invisible element for scroll detection */}
        {hasNextPage && <div ref={loadMoreRef} className="h-1" />}
      </div>
      {/* Pagination info */}
      {data?.pages[0]?.pagination && (
        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-2">
          Showing {allEvents.length} of {formatter(data.pages[0].pagination.total)} events
        </div>
      )}
    </ScrollArea>
  );
}
