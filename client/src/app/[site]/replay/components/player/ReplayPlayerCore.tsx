import { useReplayPlayer } from "./hooks/useReplayPlayer";
import { ReplayPlayerOverlay } from "./ReplayPlayerOverlay";

interface ReplayPlayerCoreProps {
  data: { events: any[] } | undefined;
  width: number;
  height: number;
  onPlayPause: () => void;
  isPlaying: boolean;
}

export function ReplayPlayerCore({ data, width, height, onPlayPause, isPlaying }: ReplayPlayerCoreProps) {
  const { playerContainerRef } = useReplayPlayer({ data, width, height });

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden relative">
      <div
        ref={playerContainerRef}
        className="w-full bg-black shadow-2xl [&_.rr-player]:bg-black!"
        style={{
          position: "relative",
        }}
      />

      <ReplayPlayerOverlay onPlayPause={onPlayPause} isPlaying={isPlaying} />
    </div>
  );
}
