import {
  AlertTriangle,
  ArrowRight,
  Brush,
  Camera,
  Eye,
  FileCode,
  FileEdit,
  FileText,
  Flag,
  Globe,
  Keyboard,
  Maximize2,
  Mouse,
  MousePointer,
  MousePointer2,
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
import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useShallow } from "zustand/react/shallow";
import { useGetSessionReplayEvents } from "@/api/analytics/hooks/sessionReplay/useGetSessionReplayEvents";
import { Avatar } from "@/components/Avatar";
import { IdentifiedBadge } from "@/components/IdentifiedBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreeDotLoader } from "@/components/Loaders";
import { getTimezone } from "@/lib/store";
import { cn, getUserDisplayName } from "@/lib/utils";
import { useReplayStore } from "./replayStore";
import {
  getMeaningfulEvents,
  getTechnicalGroups,
  type EventSeverity,
  type MeaningfulEvent,
  type MeaningfulKind,
  type TechnicalGroup,
} from "./replayEvents";
import { useExtracted } from "next-intl";

const SEVERITY_COLOR: Record<EventSeverity, string> = {
  default: "text-neutral-500 dark:text-neutral-400",
  info: "text-blue-500 dark:text-blue-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-500 dark:text-red-400",
};

// Distinct color per event kind so the timeline is scannable at a glance.
const KIND_COLOR: Record<MeaningfulKind, string> = {
  "session-start": "text-emerald-500 dark:text-emerald-400",
  navigation: "text-blue-500 dark:text-blue-400",
  click: "text-violet-500 dark:text-violet-400",
  dblclick: "text-violet-500 dark:text-violet-400",
  rightclick: "text-fuchsia-500 dark:text-fuchsia-400",
  rageclick: "text-red-500 dark:text-red-400",
  input: "text-amber-500 dark:text-amber-400",
  resize: "text-cyan-500 dark:text-cyan-400",
  console: "text-blue-500 dark:text-blue-400",
};

function meaningfulColor(event: MeaningfulEvent): string {
  // Console color follows severity (error/warn/log); everything else by kind.
  return event.kind === "console" ? SEVERITY_COLOR[event.severity] : KIND_COLOR[event.kind];
}

// Technical (raw rrweb) colors. The noisy majority (mutations, mouse moves) stay
// muted; the events a developer actually scans for get color.
const TECH_SOURCE_COLOR: Record<number, string> = {
  0: "text-neutral-500 dark:text-neutral-400", // Mutation
  1: "text-neutral-500 dark:text-neutral-400", // Mouse Move
  2: "text-violet-500 dark:text-violet-400", // Mouse Interaction
  3: "text-sky-500 dark:text-sky-400", // Scroll
  4: "text-cyan-500 dark:text-cyan-400", // Viewport Resize
  5: "text-amber-500 dark:text-amber-400", // Input
  11: "text-blue-500 dark:text-blue-400", // Log
};
const TECH_TYPE_COLOR: Record<number, string> = {
  0: "text-blue-500 dark:text-blue-400", // DOMContentLoaded
  1: "text-emerald-500 dark:text-emerald-400", // Load
  2: "text-fuchsia-500 dark:text-fuchsia-400", // Full Snapshot
  4: "text-cyan-500 dark:text-cyan-400", // Meta
  5: "text-pink-500 dark:text-pink-400", // Custom
  6: "text-indigo-500 dark:text-indigo-400", // Plugin
};

function technicalColor(group: TechnicalGroup): string {
  if (group.type === 3 && group.source !== undefined) {
    return TECH_SOURCE_COLOR[group.source] ?? "text-neutral-500 dark:text-neutral-400";
  }
  return TECH_TYPE_COLOR[group.type] ?? "text-neutral-500 dark:text-neutral-400";
}

function meaningfulIcon(kind: MeaningfulKind, severity: EventSeverity) {
  switch (kind) {
    case "session-start":
      return Flag;
    case "navigation":
      return ArrowRight;
    case "click":
      return MousePointerClick;
    case "dblclick":
      return MousePointerClick;
    case "rightclick":
      return MousePointer2;
    case "rageclick":
      return MousePointerClick;
    case "input":
      return Keyboard;
    case "resize":
      return Maximize2;
    case "console":
      return severity === "error" ? AlertTriangle : Terminal;
    default:
      return Globe;
  }
}

// Technical (raw rrweb) icon selection, keyed by incremental source / event type.
const INCREMENTAL_ICONS: Record<number, typeof Globe> = {
  0: FileEdit,
  1: Mouse,
  2: MousePointerClick,
  3: ScrollText,
  4: Maximize2,
  5: Keyboard,
  6: Smartphone,
  7: Play,
  8: Palette,
  9: Brush,
  10: Type,
  11: Terminal,
  12: Move,
  13: PaintBucket,
  14: TextSelect,
  15: FileCode,
};
const TYPE_ICONS: Record<number, typeof Globe> = {
  0: FileText,
  2: Camera,
  4: Eye,
  5: Sparkles,
  6: Puzzle,
};

function technicalIcon(group: TechnicalGroup) {
  if (group.type === 3 && group.source !== undefined) return INCREMENTAL_ICONS[group.source] ?? MousePointer;
  return TYPE_ICONS[group.type] ?? Globe;
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 h-full min-h-0">{children}</div>;
}

export function ReplayBreadcrumbs() {
  const t = useExtracted();
  const params = useParams();
  const siteId = Number(params.site);
  const [showTechnical, setShowTechnical] = useState(false);
  const { sessionId, player, setCurrentTime } = useReplayStore(
    useShallow(s => ({
      sessionId: s.sessionId,
      player: s.player,
      setCurrentTime: s.setCurrentTime,
    }))
  );

  const { data, isLoading, error } = useGetSessionReplayEvents(siteId, sessionId);

  const meaningful = useMemo(() => getMeaningfulEvents(data?.events), [data?.events]);
  const technical = useMemo(() => getTechnicalGroups(data?.events), [data?.events]);

  const handleSeek = useCallback(
    (offset: number) => {
      if (!player) return;
      player.goto(offset);
      setCurrentTime(offset);
    },
    [player, setCurrentTime]
  );

  // Resolve labels here, where `t` is the real useExtracted() binding, so the
  // strings are picked up by the message extractor (a `t` passed as a prop is not).
  const labelFor = (event: MeaningfulEvent): string => {
    switch (event.kind) {
      case "session-start":
        return t("Session started");
      case "navigation":
        return t("Navigated");
      case "click":
        return t("Clicked");
      case "dblclick":
        return t("Double-clicked");
      case "rightclick":
        return t("Right-clicked");
      case "rageclick":
        return t("Rage click");
      case "input":
        return t("Typed in a field");
      case "resize":
        return t("Resized window");
      case "console":
        return event.severity === "error"
          ? t("Console error")
          : event.severity === "warn"
            ? t("Console warning")
            : t("Console log");
      default:
        return t("Event");
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowCount = showTechnical ? technical.length : meaningful.length;
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 16,
  });

  if (error) {
    return (
      <PanelShell>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-center text-xs text-red-500">
          {t("Couldn't load this session's events.")}
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      {/* User header */}
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-2 p-2 text-xs text-neutral-900 dark:text-neutral-200 shrink-0">
        {isLoading || !data ? (
          <>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-7 w-20" />
          </>
        ) : (
          <UserHeader data={data} siteId={siteId} />
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-2 p-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            {isLoading || !data
              ? t("Timeline")
              : showTechnical
                ? t("{count} groups", { count: String(technical.length) })
                : t("{count} key events", { count: String(meaningful.length) })}
          </div>
          <div
            className="flex items-center rounded-md border border-neutral-150 dark:border-neutral-800 p-0.5 text-xs shrink-0"
            role="tablist"
            aria-label={t("Event detail level")}
          >
            <button
              role="tab"
              aria-selected={!showTechnical}
              onClick={() => setShowTechnical(false)}
              className={cn(
                "rounded px-2 py-0.5 transition-colors",
                !showTechnical
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              )}
            >
              {t("Key")}
            </button>
            <button
              role="tab"
              aria-selected={showTechnical}
              onClick={() => setShowTechnical(true)}
              className={cn(
                "rounded px-2 py-0.5 transition-colors",
                showTechnical
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              )}
            >
              {t("All")}
            </button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-1 items-center justify-center">
            <ThreeDotLoader />
          </div>
        ) : rowCount === 0 ? (
          <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-neutral-500">
            {showTechnical ? t("No events recorded.") : t("No key interactions in this session.")}
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-auto rounded-b-lg">
            <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
              {virtualizer.getVirtualItems().map(row => {
                if (showTechnical) {
                  const group = technical[row.index];
                  return (
                    <TechnicalRow
                      key={row.key}
                      group={group}
                      virtualRow={row}
                      measure={virtualizer.measureElement}
                      onSeek={handleSeek}
                    />
                  );
                }
                const event = meaningful[row.index];
                return (
                  <MeaningfulRow
                    key={row.key}
                    event={event}
                    label={labelFor(event)}
                    virtualRow={row}
                    measure={virtualizer.measureElement}
                    onSeek={handleSeek}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

function UserHeader({ data, siteId }: { data: any; siteId: number }) {
  const t = useExtracted();
  const isIdentified = !!data.metadata.identified_user_id;
  const userLink = isIdentified
    ? `/${siteId}/user/${encodeURIComponent(data.metadata.identified_user_id)}`
    : `/${siteId}/user/${encodeURIComponent(data.metadata.user_id)}`;

  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <Avatar
          id={data.metadata.user_id}
          size={24}
          lastActiveTime={
            data.metadata.end_time
              ? DateTime.fromSQL(data.metadata.end_time, { zone: "utc" }).setZone(getTimezone())
              : undefined
          }
        />
        <span className="truncate">{getUserDisplayName(data.metadata)}</span>
        {isIdentified && <IdentifiedBadge traits={data.metadata.traits} userId={data.metadata.identified_user_id} />}
      </div>
      <Link href={userLink} className="shrink-0">
        <Button size="sm">{t("View User")}</Button>
      </Link>
    </>
  );
}

function rowClass(extra?: string) {
  return cn(
    "absolute left-0 right-0 flex items-center gap-2.5 px-2.5 border-b border-neutral-100 dark:border-neutral-800",
    "hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group",
    extra
  );
}

function MeaningfulRow({
  event,
  label,
  virtualRow,
  measure,
  onSeek,
}: {
  event: MeaningfulEvent;
  label: string;
  virtualRow: VirtualItem;
  measure: (node: Element | null) => void;
  onSeek: (offset: number) => void;
}) {
  const Icon = meaningfulIcon(event.kind, event.severity);
  const color = meaningfulColor(event);

  return (
    <div
      data-index={virtualRow.index}
      ref={measure}
      className={rowClass("py-2")}
      style={{ top: `${virtualRow.start}px` }}
      onClick={() => onSeek(event.offset)}
    >
      <span className="w-9 shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {Duration.fromMillis(event.offset).toFormat("mm:ss")}
      </span>
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-200">{label}</span>
          {event.count > 1 && (
            <span className="shrink-0 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
              ×{event.count}
            </span>
          )}
        </div>
        {event.detail && (
          <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{event.detail}</div>
        )}
      </div>
    </div>
  );
}

function TechnicalRow({
  group,
  virtualRow,
  measure,
  onSeek,
}: {
  group: TechnicalGroup;
  virtualRow: VirtualItem;
  measure: (node: Element | null) => void;
  onSeek: (offset: number) => void;
}) {
  const Icon = technicalIcon(group);
  const color = technicalColor(group);
  const durationMs = group.endOffset - group.offset;

  return (
    <div
      data-index={virtualRow.index}
      ref={measure}
      className={rowClass("py-2")}
      style={{ top: `${virtualRow.start}px` }}
      onClick={() => onSeek(group.offset)}
    >
      <span className="w-9 shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {Duration.fromMillis(group.offset).toFormat("mm:ss")}
      </span>
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-200">{group.label}</div>
        {group.count > 1 && durationMs > 0 && (
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {Duration.fromMillis(durationMs).toFormat("s.SSS")}s
          </div>
        )}
      </div>
      {group.count > 1 && (
        <span className="shrink-0 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[11px] tabular-nums text-neutral-600 dark:text-neutral-400">
          {group.count}
        </span>
      )}
    </div>
  );
}

