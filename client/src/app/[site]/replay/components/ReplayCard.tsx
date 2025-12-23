import { getTimezone } from "@/lib/store";
import { Clock, MousePointerClick, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { useDeleteSessionReplay } from "../../../../api/analytics/hooks/sessionReplay/useDeleteSessionReplay";
import { Avatar } from "../../../../components/Avatar";
import { IdentifiedBadge } from "../../../../components/IdentifiedBadge";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "../../../../components/TooltipIcons/TooltipIcons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../components/ui/alert-dialog";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { cn, formatter, getUserDisplayName } from "../../../../lib/utils";
import { useReplayStore } from "@/components/replay/replayStore";

interface SessionReplayListItem {
  session_id: string;
  user_id: string;
  identified_user_id: string;
  traits: Record<string, unknown> | null;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  page_url: string;
  event_count: number;
  country: string;
  region: string;
  city: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  device_type: string;
  screen_width: number;
  screen_height: number;
}

export function ReplayCard({ replay }: { replay: SessionReplayListItem }) {
  const { sessionId, setSessionId, resetPlayerState } = useReplayStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const deleteSessionReplay = useDeleteSessionReplay();
  const startTime = DateTime.fromSQL(replay.start_time, {
    zone: "utc",
  }).setZone(getTimezone());
  const duration = replay.duration_ms ? Math.ceil(replay.duration_ms / 1000) : null;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleDelete = async () => {
    try {
      await deleteSessionReplay.mutateAsync({ sessionId: replay.session_id });

      // If the deleted replay was selected, reset the player
      if (sessionId === replay.session_id) {
        resetPlayerState();
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete session replay:", error);
    }
  };

  return (
    <div
      className={cn(
        "border-b border-neutral-100 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer w-[200px] group relative",
        sessionId === replay.session_id && "bg-neutral-100 dark:bg-neutral-800/80"
      )}
      onClick={() => {
        setSessionId(replay.session_id);
      }}
    >
      {/* User info row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Avatar
          size={16}
          id={replay.user_id}
          lastActiveTime={replay.end_time ? DateTime.fromSQL(replay.end_time, { zone: "utc" }) : undefined}
        />
        <span className="text-xs text-neutral-700 dark:text-neutral-200 truncate max-w-[100px]">
          {getUserDisplayName(replay)}
        </span>
        {replay.identified_user_id && <IdentifiedBadge traits={replay.traits} />}
      </div>

      <div className="flex items-center gap-2 mb-1">
        <div className="text-xs text-neutral-600 dark:text-neutral-400">{startTime.toRelative()}</div>
        {duration && (
          <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 text-xs">
            <Clock className="w-3 h-3" />
            {formatDuration(duration)}
          </div>
        )}

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-400"
              onClick={e => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={e => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Session Replay</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this session replay? This action cannot be undone and will permanently
                remove the replay data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={e => e.stopPropagation()}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleteSessionReplay.isPending}
              >
                {deleteSessionReplay.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="text-xs text-neutral-900 dark:text-neutral-200 truncate mb-2">
        {replay.page_url.replace("https://", "").replace("http://", "").replace("www.", "")}
      </div>

      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <CountryFlagTooltipIcon country={replay.country} city={replay.city} region={replay.region} />
        <BrowserTooltipIcon browser={replay.browser} browser_version={replay.browser_version} />
        <OperatingSystemTooltipIcon
          operating_system={replay.operating_system}
          operating_system_version={replay.operating_system_version}
        />
        <DeviceTypeTooltipIcon
          device_type={replay.device_type}
          screen_width={replay.screen_width}
          screen_height={replay.screen_height}
        />

        <Badge
          variant="outline"
          className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
        >
          <MousePointerClick className="w-4 h-4 text-amber-500" />
          <span>{formatter(replay.event_count)}</span>
        </Badge>
      </div>
    </div>
  );
}

export function ReplayCardSkeleton() {
  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors">
      {/* Time and duration row */}
      <div className="flex items-center gap-2 mb-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>

      {/* URL row */}
      <div className="mb-2">
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Icons and event count row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-6 w-12 rounded" />
      </div>
    </div>
  );
}
