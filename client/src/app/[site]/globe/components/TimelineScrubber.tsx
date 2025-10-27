import { debounce } from "lodash";
import { AlertTriangle, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TimelineSlider } from "../../../../components/ui/timeline-slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import { useTimelineStore, useActiveSessions } from "../timelineStore";
import { formatTimelineTime, generateTimeWindows, getSessionCountsPerWindow } from "../timelineUtils";
import { MAX_PAGES, PAGE_SIZE } from "../3d/hooks/timelineLayer/timelineLayerConstants";

export function TimelineScrubber() {
  const { currentTime, timeRange, windowSize, setCurrentTime, allSessions, isLoading, hasMoreData } =
    useTimelineStore();
  const activeSessions = useActiveSessions();
  const [isPlaying, setIsPlaying] = useState(false);
  const [localSliderIndex, setLocalSliderIndex] = useState(0);
  const [displayedCounts, setDisplayedCounts] = useState<number[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Generate time windows for the slider
  const timeWindows = useMemo(() => {
    if (!timeRange) return [];
    const timeWindows = generateTimeWindows(timeRange.start, timeRange.end, windowSize);
    return timeWindows;
  }, [timeRange, windowSize]);

  // Get current window index from store
  const currentIndex = useMemo(() => {
    if (!currentTime || timeWindows.length === 0) return 0;
    const index = timeWindows.findIndex(w => w.equals(currentTime));
    return index >= 0 ? index : 0;
  }, [currentTime, timeWindows]);

  // Sync local slider index with store (on initial load and during playback)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      setLocalSliderIndex(currentIndex);
      isInitialMount.current = false;
    } else if (isPlaying) {
      setLocalSliderIndex(currentIndex);
    }
  }, [currentIndex, isPlaying]);

  // Create debounced update function
  const debouncedUpdateTime = useRef(
    debounce((index: number, windows: ReturnType<typeof generateTimeWindows>) => {
      if (windows[index]) {
        setCurrentTime(windows[index]);
      }
    }, 100)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateTime.cancel();
    };
  }, [debouncedUpdateTime]);

  // Handle slider change - update local state immediately, debounce the expensive update
  const handleSliderChange = useCallback(
    (value: number[]) => {
      const index = value[0];
      setLocalSliderIndex(index);
      debouncedUpdateTime(index, timeWindows);
    },
    [timeWindows, debouncedUpdateTime]
  );

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || timeWindows.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= timeWindows.length) {
        // Loop back to start
        setCurrentTime(timeWindows[0]);
        setIsPlaying(false);
      } else {
        setCurrentTime(timeWindows[nextIndex]);
      }
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, timeWindows, setCurrentTime]);

  // Get the display time based on local slider position
  const displayTime = useMemo(() => {
    return timeWindows[localSliderIndex] || currentTime;
  }, [timeWindows, localSliderIndex, currentTime]);

  // Debounced function to calculate session counts
  const debouncedCalculateCounts = useRef(
    debounce((windows: ReturnType<typeof generateTimeWindows>, sessions: typeof allSessions, size: number) => {
      if (windows.length === 0 || sessions.length === 0) {
        setDisplayedCounts([]);
        setIsCalculating(false);
        return;
      }
      const counts = getSessionCountsPerWindow(sessions, windows, size);
      setDisplayedCounts(counts);
      setIsCalculating(false);
    }, 200)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedCalculateCounts.cancel();
    };
  }, [debouncedCalculateCounts]);

  // Reset to start time when window size changes
  const prevWindowSizeRef = useRef(windowSize);
  useEffect(() => {
    if (prevWindowSizeRef.current !== windowSize && timeWindows.length > 0) {
      setCurrentTime(timeWindows[0]);
      setLocalSliderIndex(0);
    }
    prevWindowSizeRef.current = windowSize;
  }, [windowSize, timeWindows, setCurrentTime]);

  // Trigger calculation when dependencies change
  useEffect(() => {
    if (timeWindows.length > 0 && allSessions.length > 0) {
      setIsCalculating(true);
      debouncedCalculateCounts(timeWindows, allSessions, windowSize);
    } else {
      setDisplayedCounts([]);
      setIsCalculating(false);
    }
  }, [timeWindows, allSessions, windowSize, debouncedCalculateCounts]);

  // Get max count for scaling the histogram
  const maxCount = useMemo(() => {
    return displayedCounts.length > 0 ? Math.max(...displayedCounts, 1) : 1;
  }, [displayedCounts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 h-[70px] w-full">
        <div className="w-4 h-4 border-2 border-neutral-600 border-t-accent-500 rounded-full animate-spin" />
        <span>Loading sessions...</span>
      </div>
    );
  }

  if (!timeRange || timeWindows.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col">
      {/* Session histogram */}
      <div className="w-full h-8 flex items-end gap-[1px] relative">
        {isCalculating && displayedCounts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-neutral-600 border-t-accent-500 rounded-full animate-spin" />
          </div>
        )}
        {displayedCounts.map((count, index) => {
          const heightPercentage = (count / maxCount) * 100;
          const isActive = index === localSliderIndex;

          return (
            <div
              key={index}
              style={{
                height: `${heightPercentage}%`,
                backgroundColor: isActive ? "hsl(var(--accent-600))" : "rgba(100, 100, 100, 0.5)",
                minHeight: count > 0 ? "2px" : "0px",
                opacity: isCalculating ? 0.5 : 1,
              }}
              className="flex-1 transition-all duration-150 cursor-pointer"
              title={`${count} session${count !== 1 ? "s" : ""}`}
              onClick={() => {
                setLocalSliderIndex(index);
                if (timeWindows[index]) {
                  setCurrentTime(timeWindows[index]);
                }
              }}
            />
          );
        })}
      </div>
      <TimelineSlider value={[localSliderIndex]} max={timeWindows.length - 1} onValueChange={handleSliderChange} />

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 bg-neutral-800/50 pr-2.5 pl-1 rounded-full">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-neutral-100" /> : <Play className="w-4 h-4 text-neutral-100" />}
          </button>
          <span className="text-xs text-neutral-100">
            {displayTime ? formatTimelineTime(displayTime, windowSize) : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 bg-neutral-800/50 px-2.5 py-1 rounded-full">
          <div className="text-xs text-neutral-100 flex items-center gap-1 whitespace-nowrap">
            <span className="font-bold text-accent-400">
              {activeSessions.length.toLocaleString()} / {allSessions.length.toLocaleString()}
            </span>{" "}
            sessions
            {hasMoreData && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Showing only the first {(MAX_PAGES * PAGE_SIZE).toLocaleString()} sessions. More data may be
                      available.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
