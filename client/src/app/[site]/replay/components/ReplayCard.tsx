import { getTimezone } from "@/lib/store";
import { Clock, MousePointerClick, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
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
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { cn, formatter, getUserDisplayName } from "../../../../lib/utils";
import { useShallow } from "zustand/react/shallow";
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

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function cleanUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "") || "/";
}

export function ReplayCard({ replay, onSelect }: { replay: SessionReplayListItem; onSelect?: () => void }) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
  const { sessionId, setSessionId, resetPlayerState } = useReplayStore(
    useShallow(s => ({
      sessionId: s.sessionId,
      setSessionId: s.setSessionId,
      resetPlayerState: s.resetPlayerState,
    }))
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const deleteSessionReplay = useDeleteSessionReplay();
  const startTime = DateTime.fromSQL(replay.start_time, { zone: "utc" }).setZone(getTimezone());
  const duration = replay.duration_ms ? Math.ceil(replay.duration_ms / 1000) : null;
  const isSelected = sessionId === replay.session_id;

  const handleDelete = async () => {
    try {
      await deleteSessionReplay.mutateAsync({ sessionId: replay.session_id });
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
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={cn(
        "relative w-full px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer transition-colors group outline-none",
        "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
        "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600",
        isSelected && "bg-neutral-100 dark:bg-neutral-800/70"
      )}
      onClick={() => {
        setSessionId(replay.session_id);
        onSelect?.();
      }}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSessionId(replay.session_id);
          onSelect?.();
        }
      }}
    >
      {/* Current-selection indicator: a single emerald dot (the action/current accent) */}
      {isSelected && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-accent-500" />
      )}

      {/* User + delete */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Avatar
          size={18}
          id={replay.user_id}
          lastActiveTime={replay.end_time ? DateTime.fromSQL(replay.end_time, { zone: "utc" }) : undefined}
        />
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate min-w-0">
          {getUserDisplayName(replay)}
        </span>
        {replay.identified_user_id && <IdentifiedBadge traits={replay.traits} userId={replay.identified_user_id} />}

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("Delete Session Replay")}
              className="ml-auto -mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-6 w-6 p-0 text-neutral-500 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
              onClick={e => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={e => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete Session Replay")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "Are you sure you want to delete this session replay? This action cannot be undone and will permanently remove the replay data."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={e => e.stopPropagation()}>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleteSessionReplay.isPending}
              >
                {deleteSessionReplay.isPending ? t("Deleting...") : t("Delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Page path */}
      <div className="text-xs text-neutral-900 dark:text-neutral-200 truncate mb-2" title={replay.page_url}>
        {cleanUrl(replay.page_url)}
      </div>

      {/* Meta row: environment icons + timing */}
      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
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
        <div className="ml-auto flex items-center gap-2 text-[11px] tabular-nums">
          <span className="flex items-center gap-1" title={t("{count} events", { count: formatter(replay.event_count) })}>
            <MousePointerClick className="w-3 h-3" />
            {formatter(replay.event_count)}
          </span>
          {duration !== null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">{formatRelative(startTime)}</div>
    </div>
  );
}

export function ReplayCardSkeleton() {
  return (
    <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Skeleton className="h-[18px] w-[18px] rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-40 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
      <Skeleton className="h-2.5 w-16 mt-2" />
    </div>
  );
}
