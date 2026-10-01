"use client";

import debounce from "lodash/debounce";
import { Pause, Play, TriangleAlert, X } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useGetAnnotations } from "../../../../api/analytics/hooks/useAnnotations";
import { ControlButton } from "../../../../components/site/ControlButton";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { hour12 } from "../../../../lib/dateTimeUtils";
import { useStore } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { useGlobeStore } from "../globeStore";
import type { GlobeReplay } from "../hooks/useGlobeReplay";
import { REPLAY_MAX_SESSIONS } from "../hooks/useReplaySessions";
import { REPLAY_SPEEDS, useTimelineStore } from "../timelineStore";
import { formatTimelineTime, WINDOW_SIZE_OPTIONS } from "../timelineUtils";

// How long each window stays on the map at 1×.
const STEP_MS = 500;
// Past this many annotations the labels would collide; only the markers are drawn.
const MAX_ANNOTATION_LABELS = 4;
const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface ScrubberProps {
  replay: GlobeReplay;
  /** The window under the pointer while dragging, ahead of the map catching up. */
  displayIndex: number;
  onPreview: (index: number | null) => void;
  onCommit: (index: number | null) => void;
}

/**
 * The period as a row of columns, one per window, as tall as the window was
 * busy. Click or drag to put a window on the map; arrow keys step through
 * them and Escape returns to the whole period.
 */
function Scrubber({ replay, displayIndex, onPreview, onCommit }: ScrubberProps) {
  const t = useExtracted();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const { counts, windows, windowSize } = replay;
  const max = useMemo(() => counts.reduce((highest, count) => Math.max(highest, count), 0), [counts]);

  // Dragging across the bar would otherwise redraw the map for every window
  // passed. The debounced call outlives renders, so it reads the handler from a ref.
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  });
  const commitSoon = useMemo(() => debounce((index: number) => onCommitRef.current(index), 100), []);
  useEffect(() => () => commitSoon.cancel(), [commitSoon]);

  const indexAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp(Math.floor(((clientX - rect.left) / rect.width) * windows.length), 0, windows.length - 1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (windows.length === 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const index = indexAt(event.clientX);
    onPreview(index);
    commitSoon(index);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const index = indexAt(event.clientX);
    onPreview(index);
    commitSoon(index);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    commitSoon.cancel();
    onCommit(indexAt(event.clientX));
    onPreview(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = windows.length - 1;
    const steps: Record<string, number | null> = {
      ArrowRight: clamp(displayIndex + 1, 0, last),
      ArrowLeft: clamp(displayIndex - 1, 0, last),
      Home: 0,
      End: last,
      Escape: null,
    };
    if (!(event.key in steps) || windows.length === 0) return;
    event.preventDefault();
    onCommit(steps[event.key]);
  };

  const current = displayIndex >= 0 ? windows[displayIndex] : null;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={t("Replay position")}
      aria-valuemin={0}
      aria-valuemax={Math.max(windows.length - 1, 0)}
      aria-valuenow={Math.max(displayIndex, 0)}
      aria-valuetext={current ? formatTimelineTime(current, windowSize) : t("Whole period")}
      className="relative flex h-7 cursor-pointer touch-none items-end rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
      style={{ gap: windows.length > 200 ? 0 : 1 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {replay.countsLoading && counts.length === 0 ? (
        <Skeleton className="h-full w-full rounded-sm" />
      ) : (
        windows.map((window, index) => {
          const count = counts[index] ?? 0;
          const active = index === displayIndex;
          return (
            <div
              key={window.toMillis()}
              className={cn("min-w-0 flex-1 rounded-[1px]", active ? "bg-dataviz" : "bg-dataviz/50")}
              style={{
                height: `${max > 0 ? Math.max(6, (count / max) * 100) : 6}%`,
                // With a window on the map the rest step back, so the one in play stands out.
                opacity: displayIndex >= 0 && !active ? 0.55 : 1,
              }}
              title={`${formatTimelineTime(window, windowSize)}: ${
                count === 1
                  ? t("{count} session started", { count: "1" })
                  : t("{count} sessions started", { count: count.toLocaleString() })
              }`}
            />
          );
        })
      )}
      {displayIndex >= 0 && windows.length > 0 && (
        // The playhead: columns get too thin to tell the one in play by its fill alone.
        <span
          className="pointer-events-none absolute -bottom-0.5 -top-0.5 w-0.5 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-neutral-50"
          style={{ left: `${((displayIndex + 0.5) / windows.length) * 100}%` }}
        />
      )}
    </div>
  );
}

function Annotations({ start, end }: { start: DateTime; end: DateTime }) {
  const site = useStore(state => state.site);
  const { data } = useGetAnnotations(site);
  const span = end.toMillis() - start.toMillis();

  const marks = (data ?? []).flatMap(annotation => {
    const at = DateTime.fromISO(annotation.date).toMillis();
    const position = (at - start.toMillis()) / span;
    return Number.isFinite(position) && position >= 0 && position <= 1 ? [{ annotation, position }] : [];
  });
  if (marks.length === 0) return null;

  const labelled = marks.length <= MAX_ANNOTATION_LABELS;

  return (
    <>
      {marks.map(({ annotation, position }) => (
        <div
          key={annotation.annotationId}
          className="pointer-events-none absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${(position * 100).toFixed(2)}%`, top: labelled ? -15 : -3 }}
        >
          {labelled && (
            <span
              className="pointer-events-auto max-w-28 truncate rounded-sm bg-neutral-100 px-1 text-[10px] leading-[14px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              title={annotation.description ? `${annotation.title}: ${annotation.description}` : annotation.title}
            >
              {annotation.title}
            </span>
          )}
          <span className="w-px flex-1 bg-neutral-400 dark:bg-neutral-500" title={annotation.title} />
        </div>
      ))}
    </>
  );
}

/**
 * Time, as its own control under the map: the selected period cut into
 * windows, with how busy each was. At rest the map shows the whole period;
 * playing or scrubbing puts one window on it, in every breakdown.
 */
export function ReplayBar({ replay, className }: { replay: GlobeReplay; className?: string }) {
  const t = useExtracted();
  const breakdown = useGlobeStore(state => state.breakdown);
  const setCurrentTime = useTimelineStore(state => state.setCurrentTime);
  const setManualWindowSize = useTimelineStore(state => state.setManualWindowSize);
  const speed = useTimelineStore(state => state.speed);
  const setSpeed = useTimelineStore(state => state.setSpeed);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const { range, windows, windowSize, index } = replay;
  const displayIndex = previewIndex ?? index;
  // The sessions breakdown always has a window on the map, so it has no whole period to return to.
  const keepsWindow = breakdown === "sessions";

  const goTo = (target: number | null) => {
    const window = target === null ? null : windows[target];
    setCurrentTime(window ? window.toMillis() : null);
  };

  // Advance one window per step while playing, once the sessions are there to show.
  useEffect(() => {
    if (!isPlaying || replay.sessionsLoading || windows.length === 0) return;

    const timer = setTimeout(() => {
      const next = index + 1;
      if (next >= windows.length) {
        setIsPlaying(false);
        setCurrentTime(null);
      } else {
        setCurrentTime(windows[next].toMillis());
      }
    }, STEP_MS / speed);

    return () => clearTimeout(timer);
  }, [isPlaying, replay.sessionsLoading, windows, index, speed, setCurrentTime]);

  const togglePlay = () => {
    if (!isPlaying && index === -1 && windows.length > 0) setCurrentTime(windows[0].toMillis());
    setIsPlaying(!isPlaying);
  };

  if (!range) {
    return (
      <div
        className={cn(
          "flex h-[76px] items-center border-t border-neutral-100 bg-white px-4 text-xs text-neutral-500 dark:border-neutral-850 dark:bg-neutral-900 dark:text-neutral-400",
          className
        )}
      >
        {replay.countsLoading ? <Skeleton className="h-7 w-full rounded-sm" /> : t("Nothing to replay in this period")}
      </div>
    );
  }

  const spanHours = range.end.diff(range.start, "hours").hours;
  const formatEdge = (time: DateTime) => time.toFormat(spanHours > 48 ? "MMM d" : hour12 ? "h:mm a" : "HH:mm");
  // The period's end is exclusive: a month ends on its last day, not on the next month's first.
  const lastInstant = range.end.minus({ milliseconds: 1 });
  const periodLabel =
    spanHours > 48 && !range.start.hasSame(lastInstant, "day")
      ? `${formatEdge(range.start)} – ${formatEdge(lastInstant)}`
      : spanHours > 48
        ? formatEdge(range.start)
        : `${range.start.toFormat("MMM d")}, ${formatEdge(range.start)} – ${formatEdge(range.end)}`;

  const current = displayIndex >= 0 ? windows[displayIndex] : null;
  const windowLabel = WINDOW_SIZE_OPTIONS.find(option => option.value === windowSize)?.label ?? `${windowSize}m`;

  const status = !current
    ? t("Whole period")
    : replay.sessionsLoading
      ? t("Loading sessions…")
      : replay.sessionsError
        ? t("Sessions could not be loaded")
        : t("{active} of {total} sessions", {
            active: replay.activeSessions.length.toLocaleString(),
            total: replay.sessions.length.toLocaleString(),
          });
  const statusHint =
    current && !replay.sessionsLoading && !replay.sessionsError
      ? t("Sessions active in this {window} window, of those loaded for the period", { window: windowLabel })
      : undefined;

  return (
    // The bar lays itself out by its own width, not the viewport's: beside the
    // list it can be narrow on a wide screen, and then the histogram takes a row of its own.
    <div
      className={cn(
        "@container border-t border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 @3xl:h-[76px] @3xl:flex-nowrap @3xl:px-4 @3xl:py-0">
        <div className="flex min-w-0 shrink-0 items-center gap-2 @3xl:w-56">
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={isPlaying ? t("Pause") : t("Play the period")}
            onClick={togglePlay}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {current ? formatTimelineTime(current, windowSize) : periodLabel}
            </div>
            <div className="flex items-center gap-1 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
              <span className="truncate" title={statusHint}>
                {status}
              </span>
              {current && replay.hasMoreData && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TriangleAlert className="h-3 w-3 shrink-0 text-yellow-600 dark:text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("The replay loads the first {count} sessions of the period. This period has more.", {
                      count: REPLAY_MAX_SESSIONS.toLocaleString(),
                    })}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {index >= 0 && !keepsWindow && (
            <Button
              type="button"
              variant="ghost"
              size="smIcon"
              className="h-6 w-6 shrink-0 text-neutral-500 dark:text-neutral-400"
              aria-label={t("Show the whole period")}
              title={t("Show the whole period")}
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* On a narrow screen this is the second row: the top margin leaves room for annotation labels. */}
        <div className="order-last mt-2.5 w-full min-w-0 @3xl:order-none @3xl:mt-0 @3xl:w-auto @3xl:flex-1">
          <div className="relative">
            <Scrubber replay={replay} displayIndex={displayIndex} onPreview={setPreviewIndex} onCommit={goTo} />
            <Annotations start={range.start} end={range.end} />
          </div>
          <div className="relative mt-1 h-3.5 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
            {AXIS_TICKS.map(fraction => (
              <span
                key={fraction}
                className={cn(
                  "absolute whitespace-nowrap",
                  fraction === 1 ? "-translate-x-full" : fraction > 0 && "-translate-x-1/2"
                )}
                style={{ left: `${fraction * 100}%` }}
              >
                {formatEdge(
                  fraction === 1
                    ? lastInstant
                    : range.start.plus({ milliseconds: range.end.diff(range.start).milliseconds * fraction })
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 @3xl:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ControlButton label={t("Window")} value={windowLabel} className="h-7 px-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={String(windowSize)}
                onValueChange={value => setManualWindowSize(Number(value))}
              >
                {replay.windowOptions.map(option => (
                  <DropdownMenuRadioItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ControlButton label={t("Speed")} value={`${speed}×`} className="h-7 px-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={String(speed)}
                onValueChange={value => {
                  const picked = REPLAY_SPEEDS.find(candidate => String(candidate) === value);
                  if (picked) setSpeed(picked);
                }}
              >
                {REPLAY_SPEEDS.map(candidate => (
                  <DropdownMenuRadioItem key={candidate} value={String(candidate)}>
                    {candidate}×
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
