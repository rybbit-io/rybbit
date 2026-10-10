import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Arrivals, NO_ARRIVALS, recordArrivals } from "@/components/interior/use-arrival-highlight";
import { Event } from "../../../../../api/analytics/endpoints";
import { useGetEventsCursor, useNewEventsPoll } from "../../../../../api/analytics/hooks/events/useGetEvents";
import { useStore } from "../../../../../lib/store";
import { getEventKey } from "./eventLogUtils";

const MAX_EVENTS = 10_000;
const PAGE_SIZE = 100;

export function useEventLogState(
  options: {
    visibleTypes: Set<string>;
  } = { visibleTypes: new Set() }
) {
  // --- Mode state ---
  const [isRealtime, setIsRealtime] = useState(true);

  // --- Prepended events from polling (realtime mode) ---
  const [prependedEvents, setPrependedEvents] = useState<Event[]>([]);
  const seenKeysRef = useRef(new Set<string>());
  const latestTimestampRef = useRef<string | null>(null);

  // --- Pause / buffer state ---
  const [isLive, setIsLive] = useState(true);
  const isLiveRef = useRef(true);
  isLiveRef.current = isLive;
  const isRealtimeRef = useRef(true);
  isRealtimeRef.current = isRealtime;
  const bufferedEventsRef = useRef<Event[]>([]);
  const [bufferedCount, setBufferedCount] = useState(0);

  // --- Rows that just entered the list (event key → arrival time), for a brief highlight ---
  const [arrivals, setArrivals] = useState<Arrivals>(NO_ARRIVALS);
  const markArrived = useCallback((events: Event[]) => {
    const now = performance.now();
    const keys = events.map(getEventKey);
    setArrivals(prev => recordArrivals(prev, keys, now));
  }, []);

  // --- Scroll refs ---
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // --- Cursor query (both modes) ---
  const {
    data: cursorData,
    isLoading,
    isError,
    isFetched,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetEventsCursor({ isRealtime, pageSize: PAGE_SIZE });

  // --- Derive cursor events from query data ---
  const cursorEvents = useMemo(() => cursorData?.pages.flatMap(p => p.data) ?? [], [cursorData]);

  // --- Combined event list ---
  // The cursor query refetches (staleTime 0, window refocus) and then returns events that already
  // arrived live, so drop those from the prepended rows.
  const mergedEvents = useMemo(() => {
    if (prependedEvents.length === 0) return cursorEvents;
    const cursorKeys = new Set(cursorEvents.map(getEventKey));
    const liveOnly = prependedEvents.filter(ev => !cursorKeys.has(getEventKey(ev)));
    return [...liveOnly, ...cursorEvents].slice(0, MAX_EVENTS);
  }, [prependedEvents, cursorEvents]);

  // --- Client-side type filter ---
  const { visibleTypes } = options;
  const allEvents = useMemo(() => {
    if (visibleTypes.size === 0) return mergedEvents;
    return mergedEvents.filter(ev => visibleTypes.has(ev.type));
  }, [mergedEvents, visibleTypes]);

  // --- Reset key: live rows were fetched for one mode, site and filter set ---
  // Filters are compared by content: URL hydration re-sets an equal array on date changes.
  const site = useStore(state => state.site);
  const filtersKey = useStore(state => JSON.stringify(state.filters));
  const resetKey = `${isRealtime}|${site}|${filtersKey}`;
  const resetKeyRef = useRef(resetKey);

  // --- Rebuild seenKeys + set latestTimestamp when cursor data changes, resetting live state first on a new key ---
  // One effect, so a reset always re-seeds the poll cursor from the rows on screen and never re-adds the
  // keys of live rows it just discarded.
  useEffect(() => {
    const isReset = resetKeyRef.current !== resetKey;
    resetKeyRef.current = resetKey;
    if (isReset) {
      setPrependedEvents([]);
      latestTimestampRef.current = null;
      bufferedEventsRef.current = [];
      setBufferedCount(0);
      setIsLive(true);
      setArrivals(prev => (prev.size ? NO_ARRIVALS : prev));
    }

    seenKeysRef.current = new Set(cursorEvents.map(getEventKey));
    if (!isReset) {
      for (const ev of prependedEvents) {
        seenKeysRef.current.add(getEventKey(ev));
      }
    }
    if (cursorEvents.length > 0 && !latestTimestampRef.current) {
      latestTimestampRef.current = cursorEvents[0].timestamp;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorEvents, resetKey]);

  // --- Poll query (realtime only) ---
  const getSinceTimestamp = useCallback(() => latestTimestampRef.current, []);
  const { data: pollData } = useNewEventsPoll({
    getSinceTimestamp,
    enabled: isRealtime,
  });

  // --- Handle poll results (realtime only) ---
  useEffect(() => {
    if (!isRealtime || !pollData?.data?.length) return;

    const incoming = pollData.data;
    const newEvents: Event[] = [];
    for (const ev of incoming) {
      const key = getEventKey(ev);
      if (!seenKeysRef.current.has(key)) {
        seenKeysRef.current.add(key);
        newEvents.push(ev);
      }
    }
    if (newEvents.length === 0) return;

    // Update latest timestamp
    const newestTs = newEvents[0].timestamp;
    if (!latestTimestampRef.current || newestTs > latestTimestampRef.current) {
      latestTimestampRef.current = newestTs;
    }

    if (isLiveRef.current) {
      setPrependedEvents(prev => {
        const combined = [...newEvents, ...prev];
        if (combined.length + cursorEvents.length > MAX_EVENTS) {
          return combined.slice(0, MAX_EVENTS - cursorEvents.length);
        }
        return combined;
      });
      markArrived(newEvents);
    } else {
      bufferedEventsRef.current = [...newEvents, ...bufferedEventsRef.current];
      setBufferedCount(c => c + newEvents.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollData]);

  // --- Callback ref: capture viewport whenever ScrollArea mounts ---
  const scrollAreaCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const viewport = node.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        // Focus lands here after a jump to new events (the pill leaves with the click).
        // -1 makes it focusable from script without adding a tab stop.
        if (!viewport.hasAttribute("tabindex")) viewport.tabIndex = -1;
        viewportRef.current = viewport;
        setScrollElement(viewport);
      }
    } else {
      viewportRef.current = null;
      setScrollElement(null);
    }
  }, []);

  // --- Scroll listener for auto-pause/resume ---
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      if (!isRealtimeRef.current) return;
      const atTop = viewport.scrollTop < 50;
      if (atTop && !isLiveRef.current) {
        setIsLive(true);
        if (bufferedEventsRef.current.length > 0) {
          const buffered = bufferedEventsRef.current;
          bufferedEventsRef.current = [];
          setBufferedCount(0);
          setPrependedEvents(prev => [...buffered, ...prev]);
          markArrived(buffered);
        }
      } else if (!atTop && isLiveRef.current) {
        setIsLive(false);
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [scrollElement]);

  // --- Flush buffer + scroll to top ---
  const flushAndScrollToTop = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const buffered = bufferedEventsRef.current;
    bufferedEventsRef.current = [];
    setBufferedCount(0);
    setIsLive(true);

    if (buffered.length > 0) {
      setPrependedEvents(prev => [...buffered, ...prev]);
      markArrived(buffered);
    }

    viewport.scrollTop = 0;
  }, [markArrived]);

  const toggleRealtime = useCallback(() => {
    setIsRealtime(prev => !prev);
  }, []);

  return {
    // Mode
    isRealtime,
    toggleRealtime,

    // Data
    allEvents,
    unfilteredEvents: mergedEvents,
    isLoading,
    isError,
    isFetched,

    // Virtualizer support
    scrollElement,
    scrollAreaCallbackRef,

    // Infinite scroll
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    // Pause / buffer
    isLive,
    bufferedCount,
    flushAndScrollToTop,

    // Arrival highlight
    arrivals,
  };
}
