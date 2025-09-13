"use client";

import { useMeasure } from "@uidotdev/usehooks";
import { useGetSessionReplays } from "../../../api/analytics/sessionReplay/useGetSessionReplays";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SESSION_REPLAY_PAGE_FILTERS } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EnableSessionReplay } from "./components/EnableSessionReplay";
import { ReplayList } from "./components/ReplayList";
import { ReplayPlayer } from "./components/player/ReplayPlayer";
import { NothingFound } from "../../../components/NothingFound";
import { ReplayBreadcrumbs } from "./components/ReplayBreadcrumbs";
import { useReplayStore } from "./components/replayStore";
import { Video } from "lucide-react";

export default function SessionReplayPage() {
  useSetPageTitle("Rybbit · Session Replay");

  const { minDuration } = useReplayStore();

  const { data, isLoading } = useGetSessionReplays({ minDuration });

  const hasNoReplays = !isLoading && !data?.pages[0].data?.length;

  const [ref, { height: resolvedHeight, width: resolvedWidth }] = useMeasure();

  return (
    <DisabledOverlay message="Replay" featurePath="replay">
      <div className="p-2 md:p-4 max-w-[2000px] mx-auto flex flex-col gap-1 overflow-y-hidden">
        <SubHeader availableFilters={SESSION_REPLAY_PAGE_FILTERS} />
        <EnableSessionReplay />
        {hasNoReplays ? (
          <NothingFound
            icon={<Video className="w-10 h-10" />}
            title={"No session replays found"}
            description={"Replays will appear here once session replay is enabled."}
          />
        ) : (
          <div className="grid grid-cols-[200px_1fr_300px] gap-3">
            <ReplayList />
            <div ref={ref} className="w-[calc(min(100vw, 2000px)-780px)]">
              {resolvedWidth && resolvedHeight && <ReplayPlayer width={resolvedWidth} height={resolvedHeight - 1} />}
            </div>
            <ReplayBreadcrumbs />
          </div>
        )}
      </div>
    </DisabledOverlay>
  );
}
