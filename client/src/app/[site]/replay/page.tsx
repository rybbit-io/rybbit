"use client";

import { useMeasure, useMediaQuery } from "@uidotdev/usehooks";
import { Video } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGetSessionReplays } from "../../../api/analytics/hooks/sessionReplay/useGetSessionReplays";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { NothingFound } from "../../../components/NothingFound";
import { ReplayBreadcrumbs } from "@/components/replay/ReplayBreadcrumbs";
import { ReplayPlayer } from "@/components/replay/player/ReplayPlayer";
import { ReplayDrawer } from "@/components/Sessions/ReplayDrawer";
import { useReplayStore } from "@/components/replay/replayStore";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SESSION_REPLAY_PAGE_FILTERS } from "../../../lib/filterGroups";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EnableSessionReplay } from "./components/EnableSessionReplay";
import { ReplayList } from "./components/ReplayList";
import { useAppEnv } from "../../../hooks/useIsProduction";

export default function SessionReplayPage() {
  const t = useExtracted();
  useSetPageTitle("Session Replay");
  const appEnv = useAppEnv();
  if (appEnv === "demo") return null;

  const { minDuration, sessionId } = useReplayStore(
    useShallow(s => ({ minDuration: s.minDuration, sessionId: s.sessionId }))
  );

  const { data, isLoading, error } = useGetSessionReplays({ minDuration });
  // The list stays mounted even when empty: it holds the Min duration input, and
  // a site whose recordings are all shorter than the default would otherwise
  // have no way to lower it. Errors are shown by the list itself.
  const hasNoReplays = !isLoading && !error && !data?.pages[0].data?.length;

  // On narrow screens the player can't sit beside the list, so selecting a
  // replay opens the fullscreen drawer (player + timeline) instead.
  const isCompact = useMediaQuery("(max-width: 767px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [playerRef, { width: playerWidth, height: playerHeight }] = useMeasure();

  return (
    <DisabledOverlay message="Replay" featurePath="replay" requiredPlan="pro">
      <div className="flex flex-col h-dvh overflow-hidden p-2 md:p-4 gap-3 max-w-[2000px] mx-auto">
        <div className="shrink-0">
          <SubHeader availableFilters={SESSION_REPLAY_PAGE_FILTERS} />
        </div>
        {/* Renders null in the common case, so it adds no flex gap. */}
        <EnableSessionReplay />

        <div className="flex gap-3 flex-1 min-h-0">
          {/* List */}
          <div className="w-full md:w-[200px] lg:w-[210px] shrink-0 min-h-0">
            <ReplayList onSelect={isCompact ? () => setMobileOpen(true) : undefined} />
          </div>

          {hasNoReplays ? (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <NothingFound
                icon={<Video className="w-10 h-10" />}
                title={t("No session replays found")}
                description={t("Replays will appear here once session replay is enabled.")}
              />
            </div>
          ) : (
            <>
              {/* Player */}
              <div ref={playerRef} className="hidden md:block flex-1 min-w-0 overflow-hidden">
                {playerWidth && playerHeight ? <ReplayPlayer width={playerWidth} height={playerHeight} /> : null}
              </div>

              {/* Timeline */}
              <div className="hidden xl:block w-[300px] shrink-0 min-h-0">
                <ReplayBreadcrumbs />
              </div>
            </>
          )}
        </div>

        {isCompact && <ReplayDrawer sessionId={sessionId} open={mobileOpen} onOpenChange={setMobileOpen} />}
      </div>
    </DisabledOverlay>
  );
}
