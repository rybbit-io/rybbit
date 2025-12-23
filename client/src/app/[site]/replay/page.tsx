"use client";

import { useMeasure, useWindowSize } from "@uidotdev/usehooks";
import { useGetSessionReplays } from "../../../api/analytics/hooks/sessionReplay/useGetSessionReplays";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SESSION_REPLAY_PAGE_FILTERS } from "../../../lib/filterGroups";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EnableSessionReplay } from "./components/EnableSessionReplay";
import { ReplayList } from "./components/ReplayList";
import { ReplayPlayer } from "@/components/replay/player/ReplayPlayer";
import { NothingFound } from "../../../components/NothingFound";
import { ReplayBreadcrumbs } from "@/components/replay/ReplayBreadcrumbs";
import { useReplayStore } from "@/components/replay/replayStore";
import { Video } from "lucide-react";

export default function SessionReplayPage() {
  useSetPageTitle("Rybbit · Session Replay");

  const { minDuration } = useReplayStore();

  const { data, isLoading } = useGetSessionReplays({ minDuration });

  const hasNoReplays = !isLoading && !data?.pages[0].data?.length;

  const [ref, { width: resolvedWidth }] = useMeasure();
  const { height: windowHeight } = useWindowSize();

  return (
    <DisabledOverlay message="Replay" featurePath="replay" requiredPlan="pro">
      <div className="p-2 md:p-4 max-w-[2000px] mx-auto flex flex-col gap-1 h-dvh overflow-hidden">
        <SubHeader availableFilters={SESSION_REPLAY_PAGE_FILTERS} />
        <EnableSessionReplay />
        {hasNoReplays ? (
          <NothingFound
            icon={<Video className="w-10 h-10" />}
            title={"No session replays found"}
            description={"Replays will appear here once session replay is enabled."}
          />
        ) : (
          <div className="grid grid-cols-[200px_1fr_300px] gap-3 flex-1 min-h-0">
            <ReplayList />
            <div ref={ref} className="w-[calc(min(100vw, 2000px)-780px)] h-full overflow-hidden">
              {resolvedWidth && windowHeight && <ReplayPlayer width={resolvedWidth} height={windowHeight - 76} />}
            </div>
            <div className="h-[calc(100vh-133px)]">
              <ReplayBreadcrumbs />
            </div>
          </div>
        )}
      </div>
    </DisabledOverlay>
  );
}
