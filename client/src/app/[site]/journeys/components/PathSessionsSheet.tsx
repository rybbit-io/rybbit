"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { JourneyShape, useJourneySessions } from "@/api/analytics/hooks/useGetJourneys";
import { ErrorState } from "@/components/ErrorState";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { SessionsList } from "@/components/Sessions/SessionsList";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useReplayAvailable } from "@/hooks/useReplayAvailable";
import { PathChips } from "./PathChips";

const PAGE_SIZE = 25;

export interface PathSessionsTarget {
  path: string[];
  /** How many sessions the path's row counts, shown next to the title. */
  count?: number;
  replaysOnly: boolean;
}

type ReplayFilter = "all" | "replays";

function PathSessions({ target, shape }: { target: PathSessionsTarget; shape: JourneyShape }) {
  const t = useExtracted();
  const replayAvailable = useReplayAvailable();
  const [replayFilter, setReplayFilter] = useState<ReplayFilter>(target.replaysOnly ? "replays" : "all");
  const [page, setPage] = useState(1);
  // Only reachable where replay is available: the Replays pivot and the toggle below are hidden otherwise.
  const replaysOnly = replayFilter === "replays";

  // One row more than a page: its presence is how the list knows there is a next page.
  const { data, isLoading, error, refetch } = useJourneySessions({
    ...shape,
    path: target.path,
    replaysOnly,
    page,
    limit: PAGE_SIZE + 1,
  });
  const sessions = data ?? [];

  return (
    <>
      <SheetHeader className="gap-2 space-y-0 border-b border-neutral-100 px-4 py-3 pr-12 text-left dark:border-neutral-800">
        <SheetTitle className="text-base">
          {target.count === undefined
            ? t("Sessions on this path")
            : t("{count} sessions on this path", { count: target.count.toLocaleString() })}
        </SheetTitle>
        <SheetDescription asChild>
          <div>
            <PathChips path={target.path} />
          </div>
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {error ? (
          <ErrorState title={t("Failed to load sessions")} message={error.message} refetch={refetch} />
        ) : (
          <SessionsList
            sessions={sessions.slice(0, PAGE_SIZE)}
            isLoading={isLoading}
            page={page}
            onPageChange={setPage}
            hasNextPage={sessions.length > PAGE_SIZE}
            hasPrevPage={page > 1}
            pageSize={PAGE_SIZE}
            emptyMessage={
              replaysOnly
                ? t("None of the sessions on this path has a replay.")
                : t("No sessions took this path in the selected period.")
            }
            headerElement={
              replayAvailable || replaysOnly ? (
                <SegmentedControl
                  size="sm"
                  aria-label={t("Which sessions to list")}
                  value={replayFilter}
                  onValueChange={value => {
                    setReplayFilter(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: t("All sessions") },
                    { value: "replays", label: t("With a replay") },
                  ]}
                />
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
}

/**
 * The sessions behind one path, listed in place. A path cannot be written as
 * filters, so this is where its Sessions and Replays pivots lead instead of the
 * Sessions and Replay pages.
 */
export function PathSessionsSheet({
  target,
  shape,
  onClose,
}: {
  target: PathSessionsTarget | null;
  /** The options the path was fetched with; the server derives the sessions from the same ones. */
  shape: JourneyShape;
  onClose: () => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-neutral-150 p-0 sm:max-w-3xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Keyed by path so the page and the replay filter start over for another path. */}
        {target && <PathSessions key={JSON.stringify(target)} target={target} shape={shape} />}
      </SheetContent>
    </Sheet>
  );
}
