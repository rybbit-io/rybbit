import {
  Brush,
  Camera,
  Eye,
  FileCode,
  FileEdit,
  FileText,
  Globe,
  Keyboard,
  Loader2,
  Maximize2,
  Mouse,
  MousePointer,
  MousePointerClick,
  Move,
  PaintBucket,
  Palette,
  Play,
  Puzzle,
  ScrollText,
  Smartphone,
  Sparkles,
  Terminal,
  TextSelect,
  Type,
} from "lucide-react";
import { DateTime, Duration } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useGetSessionReplayEvents } from "@/api/analytics/hooks/sessionReplay/useGetSessionReplayEvents";
import { Avatar } from "@/components/Avatar";
import { IdentifiedBadge } from "@/components/IdentifiedBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimezone } from "@/lib/store";
import { cn, getUserDisplayName } from "@/lib/utils";
import { useReplayStore } from "./replayStore";

// Event type mapping based on rrweb event types
const EVENT_TYPE_INFO = {
  "0": { name: "DOMContentLoaded", icon: FileText, color: "text-blue-400" },
  "1": { name: "Load", icon: Loader2, color: "text-green-400" },
  "2": { name: "Full Snapshot", icon: Camera, color: "text-purple-400" },
  "3": { name: "Incremental", icon: MousePointer, color: "text-yellow-400" },
  "4": { name: "Meta", icon: Eye, color: "text-cyan-400" },
  "5": { name: "Custom", icon: Sparkles, color: "text-pink-400" },
  "6": { name: "Plugin", icon: Puzzle, color: "text-indigo-400" },
};

// Incremental snapshot types (type 3 subtypes)
const INCREMENTAL_TYPES = {
  0: "Mutation",
  1: "Mouse Move",
  2: "Mouse Interaction",
  3: "Scroll",
  4: "Viewport Resize",
  5: "Input",
  6: "Touch Move",
  7: "Media Interaction",
  8: "Style Sheet Rule",
  9: "Canvas Mutation",
  10: "Font",
  11: "Log",
  12: "Drag",
  13: "Style Declaration",
  14: "Selection",
  15: "Adopted Style Sheet",
};

const getEventDescription = (event: any) => {
  const eventTypeStr = String(event.type);
  const eventInfo = EVENT_TYPE_INFO[eventTypeStr as keyof typeof EVENT_TYPE_INFO] || {
    name: `Unknown (${eventTypeStr})`,
    icon: Globe,
    color: "text-neutral-400",
  };

  // For incremental snapshots, get more detail
  if (eventTypeStr === "3" && event.data?.source !== undefined) {
    const incrementalType = INCREMENTAL_TYPES[event.data.source as keyof typeof INCREMENTAL_TYPES] || "Unknown";
    return `${incrementalType}`;
  }

  // For meta events, show URL if available
  if (eventTypeStr === "4" && event.data?.href) {
    const url = event.data.href;
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  return eventInfo.name;
};

const getEventIcon = (event: any) => {
  const eventTypeStr = String(event.type);
  const eventInfo = EVENT_TYPE_INFO[eventTypeStr as keyof typeof EVENT_TYPE_INFO];

  // Special icons for specific incremental snapshot types
  if (eventTypeStr === "3" && event.data?.source !== undefined) {
    switch (event.data.source) {
      case 0:
        return FileEdit; // Mutation
      case 1:
        return Mouse; // Mouse Move
      case 2:
        return MousePointerClick; // Mouse Interaction
      case 3:
        return ScrollText; // Scroll
      case 4:
        return Maximize2; // Viewport Resize
      case 5:
        return Keyboard; // Input
      case 6:
        return Smartphone; // Touch Move
      case 7:
        return Play; // Media Interaction
      case 8:
        return Palette; // Style Sheet Rule
      case 9:
        return Brush; // Canvas Mutation
      case 10:
        return Type; // Font
      case 11:
        return Terminal; // Log
      case 12:
        return Move; // Drag
      case 13:
        return PaintBucket; // Style Declaration
      case 14:
        return TextSelect; // Selection
      case 15:
        return FileCode; // Adopted Style Sheet
      default:
        return MousePointer; // Fallback
    }
  }

  return eventInfo?.icon || Globe;
};

const getEventColor = (event: any) => {
  const eventTypeStr = String(event.type);
  const eventInfo = EVENT_TYPE_INFO[eventTypeStr as keyof typeof EVENT_TYPE_INFO];
  return eventInfo?.color || "text-neutral-400";
};

export function ReplayBreadcrumbs() {
  const params = useParams();
  const siteId = Number(params.site);
  const { sessionId, player, setCurrentTime } = useReplayStore();

  const { data, isLoading, error } = useGetSessionReplayEvents(siteId, sessionId);

  // Group consecutive events of the same type
  const groupedEvents = useMemo(() => {
    if (!data?.events) return [];

    const groups: Array<{
      events: any[];
      type: string;
      subType?: number;
      startTime: number;
      endTime: number;
      count: number;
    }> = [];

    let currentGroup: (typeof groups)[0] | null = null;

    data.events.forEach(event => {
      const eventTypeStr = String(event.type);
      const subType = eventTypeStr === "3" ? event.data?.source : undefined;

      // Check if this event should be grouped with the previous one
      const shouldGroup =
        currentGroup &&
        currentGroup.type === eventTypeStr &&
        currentGroup.subType === subType &&
        // Only group incremental events (type 3) and certain subtypes
        eventTypeStr === "3";

      if (shouldGroup && currentGroup) {
        // Add to current group
        currentGroup.events.push(event);
        currentGroup.endTime = event.timestamp;
        currentGroup.count++;
      } else {
        // Start a new group
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          events: [event],
          type: eventTypeStr,
          subType,
          startTime: event.timestamp,
          endTime: event.timestamp,
          count: 1,
        };
      }
    });

    // Don't forget the last group
    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [data?.events]);

  const firstTimestamp = data?.events[0]?.timestamp;

  const getTime = (timestamp: number) => {
    return timestamp - (firstTimestamp ?? 0);
  };

  const handleEventClick = (timestamp: number) => {
    if (!player || !firstTimestamp) return;

    const timeInMs = timestamp - firstTimestamp;
    const timeInSeconds = timeInMs / 1000;

    // Seek to the specific time
    player.goto(timeInMs);
    setCurrentTime(timeInSeconds);
  };

  if (isLoading || !data?.events) {
    return (
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-4 flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-600 dark:text-neutral-400" />
      </div>
    );
  }

  const getGroupDescription = (group: (typeof groupedEvents)[0]) => {
    const firstEvent = group.events[0];
    const baseDescription = getEventDescription(firstEvent);

    if (group.count > 1) {
      return `${baseDescription} (×${group.count})`;
    }

    return baseDescription;
  };

  const handleGroupClick = (group: (typeof groupedEvents)[0]) => {
    // Jump to the middle of the group
    const middleIndex = Math.floor(group.events.length / 2);
    const middleEvent = group.events[middleIndex];
    handleEventClick(middleEvent.timestamp);
  };

  // Calculate display name based on identification status
  const isIdentified = !!data.metadata.identified_user_id;
  const userLink = isIdentified
    ? `/${siteId}/user/${data.metadata.identified_user_id}`
    : `/${siteId}/user/${data.metadata.user_id}`;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-2 p-2 text-xs text-neutral-900 dark:text-neutral-200">
        <div className="flex items-center gap-2">
          <Avatar
            id={data.metadata.user_id}
            size={24}
            lastActiveTime={
              data.metadata.end_time ? DateTime.fromSQL(data.metadata.end_time, { zone: "utc" }).setZone(getTimezone()) : undefined
            }
          />
          <span className="truncate max-w-[120px]">{getUserDisplayName(data.metadata)}</span>
          {isIdentified && <IdentifiedBadge traits={data.metadata.traits} />}
        </div>
        <Link href={userLink} className="flex items-center gap-2">
          <Button size="sm">View User</Button>
        </Link>
      </div>
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 flex flex-col h-full bg-white dark:bg-neutral-900">
        <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
          {data.events.length} events captured ({groupedEvents.length} groups)
        </div>
        <ScrollArea className="flex-1 rounded-lg">
          {groupedEvents.map((group, index) => {
            const firstEvent = group.events[0];
            const Icon = getEventIcon(firstEvent);
            const color = getEventColor(firstEvent);
            const description = getGroupDescription(group);
            const startTimeMs = getTime(group.startTime);
            const endTimeMs = getTime(group.endTime);
            const durationMs = endTimeMs - startTimeMs;

            return (
              <div
                key={`${group.startTime}-${index}`}
                className={cn(
                  "p-2 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer",
                  "flex items-center gap-2 group"
                )}
                onClick={() => handleGroupClick(group)}
              >
                <div className="text-xs text-neutral-600 dark:text-neutral-400 w-10">
                  {Duration.fromMillis(startTimeMs).toFormat("mm:ss")}
                </div>
                <Icon className={cn("w-4 h-4 shrink-0", color)} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-neutral-900 dark:text-neutral-200 font-medium truncate">
                    {description}
                  </div>
                  {group.count > 1 && durationMs > 0 && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                      {Duration.fromMillis(durationMs).toFormat("s.SSS")}s duration
                    </div>
                  )}
                </div>
                {group.count > 5 && (
                  <div className="text-xs text-neutral-700 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    {group.count}
                  </div>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </div>
  );
}
