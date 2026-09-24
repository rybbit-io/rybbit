import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event } from "../../../../../api/analytics/endpoints";
import {
  useGetEventsCursor,
  useNewEventsPoll,
} from "../../../../../api/analytics/hooks/events/useGetEvents";
import { getEventKey } from "./eventLogUtils";

const MAX_EVENTS = 10_000;
const PAGE_SIZE = 100;

export function useEventLogState(options: {
  visibleTypes: Set<string>;
} = { visibleTypes: new Set() }) {
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

  // --- Scroll refs ---
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  );
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
  const cursorEvents = useMemo(
    () => cursorData?.pages.flatMap((p) => p.data) ?? [],
    [cursorData]
  );

  // --- Combined event list ---
  const mergedEvents = useMemo(() => {
    if (prependedEvents.length === 0) return cursorEvents;
    return [...prependedEvents, ...cursorEvents].slice(0, MAX_EVENTS);
  }, [prependedEvents, cursorEvents]);

  // --- Client-side type filter ---
  const { visibleTypes } = options;
  const allEvents = useMemo(() => {
    if (visibleTypes.size === 0) return mergedEvents;
    return mergedEvents.filter((ev) => visibleTypes.has(ev.type));
  }, [mergedEvents, visibleTypes]);

  // --- Rebuild seenKeys + set latestTimestamp when cursor data changes ---
  useEffect(() => {
    seenKeysRef.current = new Set(cursorEvents.map(getEventKey));
    for (const ev of prependedEvents) {
      seenKeysRef.current.add(getEventKey(ev));
    }
    if (cursorEvents.length > 0 && !latestTimestampRef.current) {
      latestTimestampRef.current = cursorEvents[0].timestamp;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorEvents]);

  // --- Poll query (realtime only) ---
  const getSinceTimestamp = useCallback(
    () => latestTimestampRef.current,
    []
  );
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
    if (
      !latestTimestampRef.current ||
      newestTs > latestTimestampRef.current
    ) {
      latestTimestampRef.current = newestTs;
    }

    if (isLiveRef.current) {
      setPrependedEvents((prev) => {
        const combined = [...newEvents, ...prev];
        if (combined.length + cursorEvents.length > MAX_EVENTS) {
          return combined.slice(0, MAX_EVENTS - cursorEvents.length);
        }
        return combined;
      });
    } else {
      bufferedEventsRef.current = [
        ...newEvents,
        ...bufferedEventsRef.current,
      ];
      setBufferedCount((c) => c + newEvents.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollData]);

  // --- Reset on mode toggle ---
  useEffect(() => {
    setPrependedEvents([]);
    seenKeysRef.current.clear();
    latestTimestampRef.current = null;
    bufferedEventsRef.current = [];
    setBufferedCount(0);
    setIsLive(true);
  }, [isRealtime]);

  // --- Callback ref: capture viewport whenever ScrollArea mounts ---
  const scrollAreaCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const viewport = node.querySelector<HTMLDivElement>(
          '[data-slot="scroll-area-viewport"]'
        );
        if (viewport) {
          viewportRef.current = viewport;
          setScrollElement(viewport);
        }
      } else {
        viewportRef.current = null;
        setScrollElement(null);
      }
    },
    []
  );

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
          setPrependedEvents((prev) => [...buffered, ...prev]);
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
      setPrependedEvents((prev) => [...buffered, ...prev]);
    }

    viewport.scrollTop = 0;
  }, []);

  const toggleRealtime = useCallback(() => {
    setIsRealtime((prev) => !prev);
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
  };
}
