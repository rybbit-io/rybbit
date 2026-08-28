import type { SessionReplayEvent } from "@/api/analytics/endpoints";
import { useShallow } from "zustand/react/shallow";

import { useReplayStore } from "../replayStore";
import { useReplayPlayer } from "./hooks/useReplayPlayer";
import { ReplayPlayerOverlay } from "./ReplayPlayerOverlay";

interface ReplayPlayerCoreProps {
  data: { events: SessionReplayEvent[] } | undefined;
  width: number;
  height: number;
}

export function ReplayPlayerCore({ data, width, height }: ReplayPlayerCoreProps) {
  const { playerContainerRef } = useReplayPlayer({ data, width, height });
  const { isPlaying, togglePlayback } = useReplayStore(
    useShallow(state => ({ isPlaying: state.isPlaying, togglePlayback: state.togglePlayback }))
  );

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden relative">
      <div
        ref={playerContainerRef}
        className="w-full bg-black shadow-2xl [&_.rr-player]:bg-black!"
        style={{
          position: "relative",
        }}
      />

      <ReplayPlayerOverlay onPlayPause={togglePlayback} isPlaying={isPlaying} />
    </div>
  );
}
